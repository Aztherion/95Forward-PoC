import { eq } from "drizzle-orm";
import { prospects, withTenant, type Database } from "@95forward/db";
import { buildToolset } from "../tools";
import { runTask } from "../loop";
import { MockEmbeddingProvider } from "../provider/embedding";
import { MockModelProvider, textResponse, toolUseResponse } from "../provider/model";
import { SeededResearchProvider } from "../provider/research";
import { SeededDiscoveryProvider } from "../provider/discovery";
import type { CallerContext, Providers } from "../types";

export interface FollowUpDraftPayload {
  tenantId: string;
  userId: string;
  prospectId: string;
}

export interface FollowUpDraftContext {
  db: Database;
  liveProviders?: Providers;
}

const FOLLOW_UP_POINTS = [
  "Thank them for the candid conversation about Bolivia.",
  "Reflect their interest in a measurable, multi-year commitment.",
  "Confirm the next step: briefing materials on the way this week.",
];

function scriptedProviders(constituentId: string): Providers {
  return {
    model: MockModelProvider.scripted({
      draft_follow_up: [
        toolUseResponse("retrieve", { query: "the visit notes and outcome" }),
        toolUseResponse("draft_text", {
          kind: "follow_up",
          constituentId,
          points: FOLLOW_UP_POINTS,
        }),
        textResponse("Drafted for your review."),
      ],
    }),
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
    discovery: new SeededDiscoveryProvider(),
  };
}

// Durable follow-up-draft job (Initiative 11): moves the I10 on-debrief synchronous draft onto the
// queue. The draft still lands as the I6 "draft" copilot_proposal artifact (written by the
// draft_text tool inside runTask, scoped to the prospect's constituent). The draft_24h_followups
// toggle is checked at enqueue time, so reaching this handler already means drafting is enabled.
export async function runFollowUpDraftJob(
  payload: FollowUpDraftPayload,
  ctx: FollowUpDraftContext,
): Promise<void> {
  const { db } = ctx;
  const { tenantId, userId, prospectId } = payload;

  const constituentId = await withTenant(db, tenantId, async (tx) => {
    const rows = await tx
      .select({ constituentId: prospects.constituentId })
      .from(prospects)
      .where(eq(prospects.id, prospectId))
      .limit(1);
    return rows[0]?.constituentId ?? null;
  });
  if (constituentId === null) return;

  const caller: CallerContext = { id: userId, tenantId, role: "gift_officer" };
  const providers = ctx.liveProviders ?? scriptedProviders(constituentId);

  await runTask({
    providers,
    taskType: "draft_follow_up",
    tools: buildToolset(),
    caller,
    db,
    userContent: `draft_follow_up for prospect ${prospectId}.`,
  });
}

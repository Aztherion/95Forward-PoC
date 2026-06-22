"use server";

import { revalidatePath } from "next/cache";
import {
  buildToolset,
  createProviders,
  MockEmbeddingProvider,
  MockModelProvider,
  runTask,
  SeededDiscoveryProvider,
  SeededResearchProvider,
  textResponse,
  toolUseResponse,
  type Providers,
} from "@95forward/ai";
import { getEnv, type CurrentUser } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { getAppDb } from "@/server/db";

type Caller = Pick<CurrentUser, "id" | "tenantId" | "role">;

function callerOf(user: CurrentUser): Caller {
  return { id: user.id, tenantId: user.tenantId, role: user.role };
}

function rationaleProviders(fundingInitiativeId: string): Providers {
  const model = MockModelProvider.scripted({
    draft_funding_initiative_rationale: [
      toolUseResponse("retrieve", { query: "the initiative's mission, frame, and goal" }),
      toolUseResponse("propose_funding_initiative_rationale", {
        fundingInitiativeId,
        story:
          "A multi-year commitment to bring an entire region to full, self-sustaining water coverage — Everyone, Forever. Your gift moves a district past the milestone where services last without us.",
        rationale:
          "Grounded in the initiative's frame and goal; framed as a concrete, donor-centric case for support.",
      }),
      textResponse("Drafted a funding rationale for your review."),
    ],
  });
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
    discovery: new SeededDiscoveryProvider(),
  };
}

export async function runInitiativeRationaleAction(formData: FormData): Promise<void> {
  let initiativeId: string | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const raw = formData.get("fundingInitiativeId");
    if (typeof raw !== "string" || raw.length === 0) return;
    initiativeId = raw;

    const providers =
      getEnv().AI_MODE === "live" ? createProviders(getEnv()) : rationaleProviders(raw);
    await runTask({
      providers,
      taskType: "draft_funding_initiative_rationale",
      tools: buildToolset(),
      caller: callerOf(user),
      db: getAppDb(),
      userContent: `draft_funding_initiative_rationale for initiative ${raw}.`,
    });
  } catch (error) {
    console.error("[initiatives] runInitiativeRationaleAction failed", error);
  } finally {
    if (initiativeId) revalidatePath(`/95-forward/initiatives/${initiativeId}`);
  }
}

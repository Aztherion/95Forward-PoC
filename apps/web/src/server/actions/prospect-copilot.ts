"use server";

import { revalidatePath } from "next/cache";
import {
  buildToolset,
  createProviders,
  MockEmbeddingProvider,
  MockModelProvider,
  runTask,
  SeededResearchProvider,
  textResponse,
  toolUseResponse,
  type Providers,
} from "@95forward/ai";
import { getEnv } from "@95forward/shared";
import type { CurrentUser } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { getAppDb } from "@/server/db";

type Caller = Pick<CurrentUser, "id" | "tenantId" | "role">;

function callerOf(user: CurrentUser): Caller {
  return { id: user.id, tenantId: user.tenantId, role: user.role };
}

// rating MUST be 1-5: the QPI engine multiplies each dimension's 1-5 rating by its weight. The
// script only stages a pending proposal — nothing is applied without approval.
function qpiProviders(prospectId: string): Providers {
  const model = MockModelProvider.scripted({
    propose_qpi: [
      toolUseResponse("retrieve", {
        query: "recent major gifts and relationship history",
      }),
      toolUseResponse("propose_qpi", {
        prospectId,
        dimension: "capacity",
        rating: 5,
        rationale:
          "Foundation assets near $40M with $1.2M granted to peer water orgs last cycle — can give at the top level.",
        source: "IRS 990-PF · 2024",
      }),
      textResponse("Proposed a QPI capacity assessment for your review."),
    ],
  });
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
  };
}

function buildProviders(prospectId: string): Providers {
  const env = getEnv();
  if (env.AI_MODE === "live") {
    return createProviders(env);
  }
  return qpiProviders(prospectId);
}

export async function runProspectQpiAction(formData: FormData): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const prospectId = formData.get("prospectId");
    if (typeof prospectId !== "string" || prospectId.length === 0) return;

    await runTask({
      providers: buildProviders(prospectId),
      taskType: "propose_qpi",
      tools: buildToolset(),
      caller: callerOf(user),
      db: getAppDb(),
      userContent: `propose_qpi for prospect ${prospectId}.`,
    });
  } catch (error) {
    console.error("[prospects] runProspectQpiAction failed", error);
  } finally {
    const id = formData.get("prospectId");
    if (typeof id === "string" && id.length > 0) {
      revalidatePath(`/95-forward/prospects/${id}`);
    }
  }
}

"use server";

import { revalidatePath } from "next/cache";
import {
  approveProposal,
  buildToolset,
  createProviders,
  dismissProposal,
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
import { getDemoSubject } from "@/server/data/copilot";

const LAB_PATH = "/95-forward/copilot-lab";

type Caller = Pick<CurrentUser, "id" | "tenantId" | "role">;

function callerOf(user: CurrentUser): Caller {
  return { id: user.id, tenantId: user.tenantId, role: user.role };
}

function qpiProviders(prospectId: string): Providers {
  const model = MockModelProvider.scripted({
    propose_qpi: [
      toolUseResponse("retrieve", {
        query: "recent major gifts and relationship history",
      }),
      toolUseResponse("propose_qpi", {
        prospectId,
        dimension: "capacity",
        rating: 78,
        rationale: "Foundation assets near $40M with $1.2M granted to peer water orgs last cycle.",
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

function draftProviders(constituentId: string): Providers {
  const model = MockModelProvider.scripted({
    draft_outreach: [
      toolUseResponse("retrieve", {
        query: "relationship history and recent activity",
        subjectType: "constituent",
        subjectId: constituentId,
      }),
      toolUseResponse("draft_text", {
        kind: "intro email",
        constituentId,
        points: [
          "Thank them for their leadership grant last cycle",
          "Invite them to a Water For People site visit this quarter",
        ],
      }),
      textResponse("Drafted a short outreach note for your review."),
    ],
  });
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
  };
}

function buildProviders(taskProviders: () => Providers): Providers {
  const env = getEnv();
  if (env.AI_MODE === "live") {
    return createProviders(env);
  }
  return taskProviders();
}

export async function runCopilotAction(_formData: FormData): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const caller = callerOf(user);
    const db = getAppDb();
    const subject = await getDemoSubject(user.tenantId);
    if (!subject) return;

    const tools = buildToolset();

    await runTask({
      providers: buildProviders(() => qpiProviders(subject.prospectId)),
      taskType: "propose_qpi",
      tools,
      caller,
      db,
      userContent: `Run propose_qpi for prospect ${subject.prospectId} (${subject.constituentName}).`,
    });

    await runTask({
      providers: buildProviders(() => draftProviders(subject.constituentId)),
      taskType: "draft_outreach",
      tools,
      caller,
      db,
      userContent: `Run draft_outreach for constituent ${subject.constituentId} (${subject.constituentName}).`,
    });
  } catch (error) {
    console.error("[copilot-lab] runCopilotAction failed", error);
  } finally {
    revalidatePath(LAB_PATH);
  }
}

export async function approveProposalAction(formData: FormData): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const id = formData.get("id");
    if (typeof id !== "string" || id.length === 0) return;
    await approveProposal(getAppDb(), callerOf(user), id);
  } catch (error) {
    console.error("[copilot-lab] approveProposalAction failed", error);
  } finally {
    revalidatePath(LAB_PATH);
  }
}

export async function dismissProposalAction(formData: FormData): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const id = formData.get("id");
    if (typeof id !== "string" || id.length === 0) return;
    await dismissProposal(getAppDb(), callerOf(user), id);
  } catch (error) {
    console.error("[copilot-lab] dismissProposalAction failed", error);
  } finally {
    revalidatePath(LAB_PATH);
  }
}

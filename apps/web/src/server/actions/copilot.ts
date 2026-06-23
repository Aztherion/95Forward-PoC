"use server";

import { revalidatePath } from "next/cache";
import {
  approveProposal,
  buildToolset,
  createProviders,
  dismissProposal,
  reviewResearchJobForProposal,
  MockEmbeddingProvider,
  MockModelProvider,
  runTask,
  SeededDiscoveryProvider,
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
import type { CopilotActionState } from "@/components/copilot/copilot-action-state";

const LAB_PATH = "/95-forward/copilot-lab";

type Caller = Pick<CurrentUser, "id" | "tenantId" | "role">;

function callerOf(user: CurrentUser): Caller {
  return { id: user.id, tenantId: user.tenantId, role: user.role };
}

// After a research-originated proposal is decided, advance its research job to reviewed once none of
// its proposals remain pending. The job is derived from the proposal's origin_key, so non-research
// proposals are a no-op and the shared I6 approve/dismiss path stays unchanged.
async function maybeReviewResearchJob(caller: Caller, proposalId: string): Promise<void> {
  await reviewResearchJobForProposal(getAppDb(), caller, proposalId);
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
        rating: 5,
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
    discovery: new SeededDiscoveryProvider(),
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
    discovery: new SeededDiscoveryProvider(),
  };
}

function buildProviders(taskProviders: () => Providers): Providers {
  const env = getEnv();
  if (env.AI_MODE === "live") {
    return createProviders(env);
  }
  return taskProviders();
}

export async function runCopilotAction(
  _prev: CopilotActionState,
  _formData: FormData,
): Promise<CopilotActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has expired — sign in again." };
    const caller = callerOf(user);
    const db = getAppDb();
    const subject = await getDemoSubject(user.tenantId);
    if (!subject) return { ok: false, error: "No seeded prospect to work with." };

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
    return { ok: true };
  } catch (error) {
    console.error("[copilot-lab] runCopilotAction failed", error);
    return { ok: false, error: "The copilot could not finish — please try again." };
  } finally {
    revalidatePath(LAB_PATH);
  }
}

function revalidateProposalViews(formData: FormData): void {
  revalidatePath(LAB_PATH);
  const prospectId = formData.get("prospectId");
  if (typeof prospectId === "string" && prospectId.length > 0) {
    revalidatePath(`/95-forward/prospects/${prospectId}`);
  }
  const fundingInitiativeId = formData.get("fundingInitiativeId");
  if (typeof fundingInitiativeId === "string" && fundingInitiativeId.length > 0) {
    revalidatePath(`/95-forward/initiatives/${fundingInitiativeId}`);
  }
}

export async function approveProposalAction(formData: FormData): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const id = formData.get("id");
    if (typeof id !== "string" || id.length === 0) return;
    const caller = callerOf(user);
    await approveProposal(getAppDb(), caller, id);
    await maybeReviewResearchJob(caller, id);
  } catch (error) {
    console.error("[copilot-lab] approveProposalAction failed", error);
  } finally {
    revalidateProposalViews(formData);
  }
}

export async function dismissProposalAction(formData: FormData): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const id = formData.get("id");
    if (typeof id !== "string" || id.length === 0) return;
    const caller = callerOf(user);
    await dismissProposal(getAppDb(), caller, id);
    await maybeReviewResearchJob(caller, id);
  } catch (error) {
    console.error("[copilot-lab] dismissProposalAction failed", error);
  } finally {
    revalidateProposalViews(formData);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import {
  candidateDecisionInputSchema,
  findIntroductionsInputSchema,
  promoteCandidateInputSchema,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { createDiscoveryTask } from "@/server/data/discovery";
import {
  decideCandidate,
  promoteCandidate,
  resetCandidateForResearch,
} from "@/server/data/discovery-mutations";
import { markDiscoveryReviewedForCandidate } from "@/server/data/discovery-review";
import { enqueueDiscovery } from "@/server/jobs";

const CANDIDATES_PATH = "/95-forward/prospects/candidates";

function optional(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// Find introductions (connector × initiative): create the discovery_tasks row (status queued) so the
// tray shows it immediately, then enqueue the job. tenantId/userId come from getCurrentUser(), never
// from client input.
export async function findIntroductionsAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const parsed = findIntroductionsInputSchema.safeParse({
    fundingInitiativeId: formData.get("fundingInitiativeId"),
    connectorConstituentId: optional(formData.get("connectorConstituentId")),
    connectorExternalName: optional(formData.get("connectorExternalName")),
  });
  if (!parsed.success) return;

  const discoveryTaskId = await createDiscoveryTask(user.tenantId, {
    fundingInitiativeId: parsed.data.fundingInitiativeId,
    connectorConstituentId: parsed.data.connectorConstituentId ?? null,
    connectorExternalName: parsed.data.connectorExternalName ?? null,
    requestedByUserId: user.id,
  });
  await enqueueDiscovery(user.tenantId, user.id, discoveryTaskId);
  revalidatePath(CANDIDATES_PATH);
  revalidatePath("/95-forward/today");
}

export async function decideCandidateAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const parsed = candidateDecisionInputSchema.safeParse({
    candidateId: formData.get("candidateId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return;
  await decideCandidate(user.tenantId, parsed.data);
  // A dismissal can complete the batch — re-check the ready -> reviewed transition.
  if (parsed.data.decision === "dismissed") {
    await markDiscoveryReviewedForCandidate(user.tenantId, parsed.data.candidateId);
  }
  revalidatePath(CANDIDATES_PATH);
}

export async function promoteCandidateAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const parsed = promoteCandidateInputSchema.safeParse({
    candidateId: formData.get("candidateId"),
  });
  if (!parsed.success) return;
  await promoteCandidate(user.tenantId, parsed.data.candidateId);
  await markDiscoveryReviewedForCandidate(user.tenantId, parsed.data.candidateId);
  revalidatePath(CANDIDATES_PATH);
  revalidatePath("/95-forward/prospects");
}

// "Keep researching": reset the candidate to suggested (evidence refresh) and re-enqueue the
// discovery job for its batch so the worker refreshes its evidence. Not an I11 research job — see
// resetCandidateForResearch for why (off-MPL invariant).
export async function keepResearchingCandidateAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const parsed = promoteCandidateInputSchema.safeParse({
    candidateId: formData.get("candidateId"),
  });
  if (!parsed.success) return;
  const discoveryTaskId = await resetCandidateForResearch(user.tenantId, parsed.data.candidateId);
  if (discoveryTaskId === null) return;
  await enqueueDiscovery(user.tenantId, user.id, discoveryTaskId);
  revalidatePath(CANDIDATES_PATH);
}

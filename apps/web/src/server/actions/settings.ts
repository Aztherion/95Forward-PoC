"use server";

import { revalidatePath } from "next/cache";
import {
  copilotTogglesInputSchema,
  QPI_DEFAULT_WEIGHTS,
  qpiWeightsInputSchema,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { updateCopilotToggles, updateTenantWeights } from "@/server/data/settings";

export interface FormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

function fieldErrorsFrom(flattened: Record<string, string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flattened)) {
    if (messages && messages[0]) out[key] = messages[0];
  }
  return out;
}

function readWeight(formData: FormData, name: string): number {
  return Number(formData.get(name));
}

export async function saveQpiWeightsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = qpiWeightsInputSchema.safeParse({
    capacity: readWeight(formData, "capacity"),
    relationship: readWeight(formData, "relationship"),
    timing: readWeight(formData, "timing"),
    gift_history: readWeight(formData, "gift_history"),
    philanthropy: readWeight(formData, "philanthropy"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateTenantWeights(user.tenantId, parsed.data);
  revalidatePath("/settings");
  return { ok: true };
}

export async function resetWeightsAction(): Promise<FormState> {
  const user = await requireUser();
  await updateTenantWeights(user.tenantId, { ...QPI_DEFAULT_WEIGHTS });
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveCopilotTogglesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = copilotTogglesInputSchema.safeParse({
    researchPublicSources: formData.get("research_public_sources") === "on",
    proposeQpiUpdatesAutomatically: formData.get("propose_qpi_updates_automatically") === "on",
    draft24hFollowups: formData.get("draft_24h_followups") === "on",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateCopilotToggles(user.tenantId, {
    research_public_sources: parsed.data.researchPublicSources,
    propose_qpi_updates_automatically: parsed.data.proposeQpiUpdatesAutomatically,
    draft_24h_followups: parsed.data.draft24hFollowups,
  });
  revalidatePath("/settings");
  return { ok: true };
}

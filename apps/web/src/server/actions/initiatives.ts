"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cultivationAssociationInputSchema, fundingInitiativeInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import {
  attachProspectToInitiative,
  createInitiative,
  detachProspectFromInitiative,
} from "@/server/data/initiative-mutations";

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

function optionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function createInitiativeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const goalRaw = formData.get("goalAmountDollars");
  const goalAmountCents =
    typeof goalRaw === "string" && goalRaw.trim() !== ""
      ? Math.round(Number(goalRaw) * 100)
      : undefined;
  const parsed = fundingInitiativeInputSchema.safeParse({
    name: formData.get("name"),
    frame: formData.get("frame"),
    story: optionalText(formData.get("story")),
    goalAmountCents:
      goalAmountCents !== undefined && Number.isFinite(goalAmountCents)
        ? goalAmountCents
        : undefined,
    timelineStart: optionalText(formData.get("timelineStart")),
    timelineEnd: optionalText(formData.get("timelineEnd")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  const id = await createInitiative(user.tenantId, parsed.data);
  revalidatePath("/95-forward/initiatives");
  redirect(`/95-forward/initiatives/${id}`);
}

export async function attachProspectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = cultivationAssociationInputSchema.safeParse({
    fundingInitiativeId: formData.get("fundingInitiativeId"),
    prospectId: formData.get("prospectId"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await attachProspectToInitiative(user.tenantId, parsed.data);
  revalidatePath(`/95-forward/initiatives/${parsed.data.fundingInitiativeId}`);
  return { ok: true };
}

export async function detachProspectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = cultivationAssociationInputSchema.safeParse({
    fundingInitiativeId: formData.get("fundingInitiativeId"),
    prospectId: formData.get("prospectId"),
  });
  if (!parsed.success) return;
  await detachProspectFromInitiative(user.tenantId, parsed.data);
  revalidatePath(`/95-forward/initiatives/${parsed.data.fundingInitiativeId}`);
}

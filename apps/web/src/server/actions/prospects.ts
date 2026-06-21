"use server";

import { revalidatePath } from "next/cache";
import {
  naturalPartnerInputSchema,
  qpiOverrideInputSchema,
  rmAssignInputSchema,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import {
  addNaturalPartner,
  assignRm,
  overrideQpiAssessment,
  removeNaturalPartner,
} from "@/server/data/prospect-mutations";

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

export async function overrideQpiAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const isUnknown = formData.get("isUnknown") === "on";
  const ratingRaw = formData.get("rating");
  const rating =
    typeof ratingRaw === "string" && ratingRaw.trim() !== "" ? Number(ratingRaw) : undefined;
  const parsed = qpiOverrideInputSchema.safeParse({
    prospectId: formData.get("prospectId"),
    dimension: formData.get("dimension"),
    isUnknown,
    rating: isUnknown ? undefined : rating,
    rationale: optionalText(formData.get("rationale")),
    source: optionalText(formData.get("source")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await overrideQpiAssessment(user.tenantId, user.id, parsed.data);
  revalidatePath("/95-forward/prospects");
  revalidatePath(`/95-forward/prospects/${parsed.data.prospectId}`);
  return { ok: true };
}

export async function assignRmAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = rmAssignInputSchema.safeParse({
    prospectId: formData.get("prospectId"),
    rmUserId: optionalText(formData.get("rmUserId")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await assignRm(user.tenantId, parsed.data);
  revalidatePath("/95-forward/prospects");
  revalidatePath(`/95-forward/prospects/${parsed.data.prospectId}`);
  return { ok: true };
}

export async function addNaturalPartnerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = naturalPartnerInputSchema.safeParse({
    prospectId: formData.get("prospectId"),
    userId: optionalText(formData.get("userId")),
    constituentId: optionalText(formData.get("constituentId")),
    externalName: optionalText(formData.get("externalName")),
    role: optionalText(formData.get("role")),
    warmPathNote: optionalText(formData.get("warmPathNote")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await addNaturalPartner(user.tenantId, parsed.data);
  revalidatePath(`/95-forward/prospects/${parsed.data.prospectId}`);
  return { ok: true };
}

export async function removeNaturalPartnerAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  const prospectId = formData.get("prospectId");
  if (typeof id !== "string" || typeof prospectId !== "string") return;
  await removeNaturalPartner(user.tenantId, id);
  revalidatePath(`/95-forward/prospects/${prospectId}`);
}

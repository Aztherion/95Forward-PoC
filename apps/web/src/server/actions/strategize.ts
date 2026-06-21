"use server";

import { revalidatePath } from "next/cache";
import {
  knowledgeBaseFieldInputSchema,
  prospectStrategyFieldInputSchema,
  relationshipMapEntryInputSchema,
  researchGapInputSchema,
  researchGapResolveInputSchema,
  visitPlanInputSchema,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import {
  addRelationshipMapEntry,
  addResearchGap,
  createVisitPlan,
  removeRelationshipMapEntry,
  resolveResearchGap,
  updateKnowledgeBaseField,
  updateStrategyField,
} from "@/server/data/strategize-mutations";

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

function revalidateProspect(prospectId: string): void {
  revalidatePath(`/95-forward/prospects/${prospectId}`);
}

export async function updateKnowledgeBaseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = knowledgeBaseFieldInputSchema.safeParse({
    prospectId: formData.get("prospectId"),
    field: formData.get("field"),
    value: optionalText(formData.get("value")),
    source: optionalText(formData.get("source")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateKnowledgeBaseField(user.tenantId, parsed.data);
  revalidateProspect(parsed.data.prospectId);
  return { ok: true };
}

export async function addResearchGapAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = researchGapInputSchema.safeParse({
    prospectId: formData.get("prospectId"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await addResearchGap(user.tenantId, parsed.data);
  revalidateProspect(parsed.data.prospectId);
  return { ok: true };
}

export async function resolveResearchGapAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const prospectId = formData.get("prospectId");
  const parsed = researchGapResolveInputSchema.safeParse({
    gapId: formData.get("gapId"),
    status: formData.get("status"),
  });
  if (!parsed.success || typeof prospectId !== "string") return;
  await resolveResearchGap(user.tenantId, parsed.data);
  revalidateProspect(prospectId);
}

export async function updateStrategyAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = prospectStrategyFieldInputSchema.safeParse({
    prospectId: formData.get("prospectId"),
    field: formData.get("field"),
    value: optionalText(formData.get("value")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateStrategyField(user.tenantId, parsed.data);
  revalidateProspect(parsed.data.prospectId);
  return { ok: true };
}

export async function createVisitPlanAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = visitPlanInputSchema.safeParse({
    prospectId: formData.get("prospectId"),
    goal: formData.get("goal"),
    discoveryQuestions: optionalText(formData.get("discoveryQuestions")),
    team: optionalText(formData.get("team")),
    locationType: optionalText(formData.get("locationType")),
    engagementToolNote: optionalText(formData.get("engagementToolNote")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await createVisitPlan(user.tenantId, parsed.data);
  revalidateProspect(parsed.data.prospectId);
  return { ok: true };
}

export async function addRelationshipMapEntryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = relationshipMapEntryInputSchema.safeParse({
    prospectId: formData.get("prospectId"),
    name: formData.get("name"),
    role: optionalText(formData.get("role")),
    decisionPower: optionalText(formData.get("decisionPower")),
    warmPathNote: optionalText(formData.get("warmPathNote")),
    source: optionalText(formData.get("source")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await addRelationshipMapEntry(user.tenantId, parsed.data);
  revalidateProspect(parsed.data.prospectId);
  return { ok: true };
}

export async function removeRelationshipMapEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("entryId");
  const prospectId = formData.get("prospectId");
  if (typeof id !== "string" || typeof prospectId !== "string") return;
  await removeRelationshipMapEntry(user.tenantId, id);
  revalidateProspect(prospectId);
}

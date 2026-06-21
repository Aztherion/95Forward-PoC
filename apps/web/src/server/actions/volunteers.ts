"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { volunteerHoursInputSchema, volunteerOpportunityInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import {
  createOpportunity,
  deleteHours,
  deleteOpportunity,
  logHours,
  markConstituentVolunteer,
  updateOpportunity,
} from "@/server/data/volunteers";

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

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readOpportunityForm(formData: FormData) {
  const capacityRaw = text(formData, "capacity");
  const capacity = capacityRaw === undefined ? undefined : Number.parseInt(capacityRaw, 10);

  return {
    name: text(formData, "name"),
    startsAt: text(formData, "startsAt"),
    location: text(formData, "location"),
    capacity: Number.isNaN(capacity) ? undefined : capacity,
    description: text(formData, "description"),
  };
}

export async function createOpportunityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = volunteerOpportunityInputSchema.safeParse(readOpportunityForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  const id = await createOpportunity(user.tenantId, parsed.data);
  revalidatePath("/volunteers/opportunities");
  redirect(`/volunteers/opportunities/${id}`);
}

export async function updateOpportunityAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = volunteerOpportunityInputSchema.safeParse(readOpportunityForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateOpportunity(user.tenantId, id, parsed.data);
  revalidatePath("/volunteers/opportunities");
  revalidatePath(`/volunteers/opportunities/${id}`);
  redirect(`/volunteers/opportunities/${id}`);
}

export async function deleteOpportunityAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteOpportunity(user.tenantId, id);
  revalidatePath("/volunteers/opportunities");
  redirect("/volunteers/opportunities");
}

export async function logHoursAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const hoursRaw = text(formData, "hours");
  const hours = hoursRaw === undefined ? Number.NaN : Number.parseFloat(hoursRaw);

  const parsed = volunteerHoursInputSchema.safeParse({
    constituentId: text(formData, "constituentId"),
    opportunityId: text(formData, "opportunityId"),
    hours: Number.isNaN(hours) ? undefined : hours,
    loggedDate: text(formData, "loggedDate"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }

  await logHours(user.tenantId, parsed.data);
  revalidatePath("/volunteers/roster");
  revalidatePath(`/volunteers/opportunities/${parsed.data.opportunityId}`);
  return { ok: true };
}

export async function deleteHoursAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const opportunityId = await deleteHours(user.tenantId, id);
  revalidatePath("/volunteers/roster");
  if (opportunityId) revalidatePath(`/volunteers/opportunities/${opportunityId}`);
}

export async function markVolunteerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const constituentId = text(formData, "constituentId");
  if (!constituentId) {
    return { ok: false, fieldErrors: { constituentId: "Select a constituent" } };
  }
  await markConstituentVolunteer(user.tenantId, constituentId);
  revalidatePath("/volunteers/roster");
  return { ok: true };
}

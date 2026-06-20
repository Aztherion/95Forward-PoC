"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  constituentInputSchema,
  interactionInputSchema,
  relationshipInputSchema,
  tagInputSchema,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import {
  addInteraction,
  addRelationship,
  addTagToConstituent,
  archiveOrDeleteConstituent,
  createConstituent,
  deleteInteraction,
  deleteRelationship,
  removeTagFromConstituent,
  updateConstituent,
  updateInteraction,
} from "@/server/data/constituents";

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

function readConstituentForm(formData: FormData) {
  const checkbox = (name: string) => formData.get(name) === "on";
  const text = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };
  return {
    type: text("type"),
    displayName: (formData.get("displayName") as string | null) ?? "",
    firstName: text("firstName"),
    lastName: text("lastName"),
    organizationName: text("organizationName"),
    email: text("email"),
    phone: text("phone"),
    addressLine1: text("addressLine1"),
    addressLine2: text("addressLine2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postalCode"),
    country: text("country"),
    prospectStatus: text("prospectStatus") ?? "none",
    assignedUserId: text("assignedUserId"),
    boardMember: checkbox("boardMember"),
    volunteer: checkbox("volunteer"),
    wavemakerMonthly: checkbox("wavemakerMonthly"),
    legacy: checkbox("legacy"),
  };
}

export async function createConstituentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = constituentInputSchema.safeParse(readConstituentForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  const id = await createConstituent(user.tenantId, parsed.data);
  revalidatePath("/constituents");
  revalidatePath(`/constituents/${id}`);
  redirect(`/constituents/${id}`);
}

export async function updateConstituentAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = constituentInputSchema.safeParse(readConstituentForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateConstituent(user.tenantId, id, parsed.data);
  revalidatePath("/constituents");
  revalidatePath(`/constituents/${id}`);
  redirect(`/constituents/${id}`);
}

export async function archiveConstituentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await archiveOrDeleteConstituent(user.tenantId, id);
  revalidatePath("/constituents");
  redirect("/constituents");
}

export async function addInteractionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = interactionInputSchema.safeParse({
    constituentId: formData.get("constituentId"),
    type: formData.get("type"),
    occurredAt: formData.get("occurredAt"),
    summary: (formData.get("summary") as string | null)?.trim() || undefined,
    ownerUserId: (formData.get("ownerUserId") as string | null) || undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await addInteraction(user.tenantId, parsed.data);
  revalidatePath(`/constituents/${parsed.data.constituentId}`);
  return { ok: true };
}

export async function updateInteractionAction(
  interactionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = interactionInputSchema.safeParse({
    constituentId: formData.get("constituentId"),
    type: formData.get("type"),
    occurredAt: formData.get("occurredAt"),
    summary: (formData.get("summary") as string | null)?.trim() || undefined,
    ownerUserId: (formData.get("ownerUserId") as string | null) || undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateInteraction(user.tenantId, interactionId, parsed.data);
  revalidatePath(`/constituents/${parsed.data.constituentId}`);
  return { ok: true };
}

export async function deleteInteractionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const interactionId = formData.get("interactionId");
  const constituentId = formData.get("constituentId");
  if (typeof interactionId !== "string" || typeof constituentId !== "string") return;
  await deleteInteraction(user.tenantId, interactionId);
  revalidatePath(`/constituents/${constituentId}`);
}

export async function addRelationshipAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = relationshipInputSchema.safeParse({
    fromConstituentId: formData.get("fromConstituentId"),
    toConstituentId: (formData.get("toConstituentId") as string | null) || undefined,
    externalName: (formData.get("externalName") as string | null)?.trim() || undefined,
    type: formData.get("type"),
    note: (formData.get("note") as string | null)?.trim() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await addRelationship(user.tenantId, parsed.data);
  revalidatePath(`/constituents/${parsed.data.fromConstituentId}`);
  return { ok: true };
}

export async function deleteRelationshipAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const relationshipId = formData.get("relationshipId");
  const constituentId = formData.get("constituentId");
  if (typeof relationshipId !== "string" || typeof constituentId !== "string") return;
  await deleteRelationship(user.tenantId, relationshipId);
  revalidatePath(`/constituents/${constituentId}`);
}

export async function addTagAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = tagInputSchema.safeParse({
    constituentId: formData.get("constituentId"),
    tagId: (formData.get("tagId") as string | null) || undefined,
    newTagName: (formData.get("newTagName") as string | null)?.trim() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await addTagToConstituent(
    user.tenantId,
    parsed.data.constituentId,
    parsed.data.tagId,
    parsed.data.newTagName,
  );
  revalidatePath(`/constituents/${parsed.data.constituentId}`);
  return { ok: true };
}

export async function removeTagAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const constituentId = formData.get("constituentId");
  const tagId = formData.get("tagId");
  if (typeof constituentId !== "string" || typeof tagId !== "string") return;
  await removeTagFromConstituent(user.tenantId, constituentId, tagId);
  revalidatePath(`/constituents/${constituentId}`);
}

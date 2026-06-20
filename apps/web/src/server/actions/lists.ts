"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  SAVED_LIST_RECORD_TYPES,
  savedListInputSchema,
  savedListDefinitionSchema,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { createSavedList, deleteSavedList } from "@/server/data/lists";

export interface SaveViewState {
  ok?: boolean;
  error?: string;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function saveConstituentViewAction(
  _prev: SaveViewState,
  formData: FormData,
): Promise<SaveViewState> {
  const user = await requireUser();
  const name = formData.get("name");
  const definitionRaw = formData.get("definition");
  if (typeof definitionRaw !== "string") {
    return { ok: false, error: "Could not read the current view." };
  }

  let parsedDefinition: unknown;
  try {
    parsedDefinition = JSON.parse(definitionRaw);
  } catch {
    return { ok: false, error: "Could not read the current view." };
  }

  const definition = savedListDefinitionSchema.safeParse(parsedDefinition);
  if (!definition.success) {
    return { ok: false, error: "The view filters could not be saved." };
  }

  const parsed = savedListInputSchema.safeParse({
    name,
    recordType: "constituent",
    definition: definition.data,
  });
  if (!parsed.success) {
    return { ok: false, error: "Name the view before saving." };
  }

  try {
    await createSavedList(user.tenantId, parsed.data, user.id);
  } catch {
    return { ok: false, error: "A view with that name already exists." };
  }
  revalidatePath("/constituents");
  return { ok: true };
}

export async function deleteConstituentViewAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteSavedList(user.tenantId, id);
  revalidatePath("/constituents");
}

export interface SaveListState {
  error?: string;
}

export async function saveListAction(
  _prev: SaveListState,
  formData: FormData,
): Promise<SaveListState> {
  const user = await requireUser();
  const name = formData.get("name");
  const recordTypeRaw = formData.get("recordType");
  const definitionRaw = formData.get("definition");

  if (
    typeof recordTypeRaw !== "string" ||
    !(SAVED_LIST_RECORD_TYPES as readonly string[]).includes(recordTypeRaw)
  ) {
    return { error: "Pick a record type for the list." };
  }
  if (typeof definitionRaw !== "string") {
    return { error: "Could not read the list filters." };
  }

  let parsedDefinition: unknown;
  try {
    parsedDefinition = JSON.parse(definitionRaw);
  } catch {
    return { error: "Could not read the list filters." };
  }

  const definition = savedListDefinitionSchema.safeParse(parsedDefinition);
  if (!definition.success) {
    return { error: "The list filters could not be saved." };
  }

  const parsed = savedListInputSchema.safeParse({
    name,
    recordType: recordTypeRaw,
    definition: definition.data,
  });
  if (!parsed.success) {
    return { error: "Name the list before saving." };
  }

  let createdId: string;
  try {
    const created = await createSavedList(user.tenantId, parsed.data, user.id);
    createdId = created.id;
  } catch {
    return { error: "A list with that name already exists." };
  }
  revalidatePath("/lists");
  redirect(`/lists/${createdId}`);
}

export async function deleteSavedListAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteSavedList(user.tenantId, id);
  revalidatePath("/lists");
}

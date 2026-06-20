"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  savedListDefinitionSchema,
  segmentInputSchema,
  type SegmentInput,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { validateFilters } from "@/lib/list-fields";
import { createSegment, deleteSegment, updateSegment } from "@/server/data/segments";

export interface FormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

interface ReadResult {
  values?: SegmentInput;
  error?: FormState;
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

function readSegmentForm(formData: FormData): ReadResult {
  const text = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const definitionRaw = formData.get("definition");
  if (typeof definitionRaw !== "string") {
    return { error: { ok: false, error: "Could not read the segment filters." } };
  }

  let parsedDefinition: unknown;
  try {
    parsedDefinition = JSON.parse(definitionRaw);
  } catch {
    return { error: { ok: false, error: "Could not read the segment filters." } };
  }

  const definition = savedListDefinitionSchema.safeParse(parsedDefinition);
  if (!definition.success) {
    return { error: { ok: false, error: "The segment filters could not be saved." } };
  }

  const sanitized = {
    filters: validateFilters("constituent", definition.data.filters ?? []),
    search: definition.data.search,
    sort: definition.data.sort,
  };

  const parsed = segmentInputSchema.safeParse({
    name: text("name"),
    description: text("description"),
    definition: sanitized,
  });
  if (!parsed.success) {
    return {
      error: { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) },
    };
  }
  return { values: parsed.data };
}

export async function createSegmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const { values, error } = readSegmentForm(formData);
  if (!values) return error ?? { ok: false, error: "Could not save the segment." };
  await createSegment(user.tenantId, values);
  revalidatePath("/marketing/segments");
  redirect("/marketing/segments");
}

export async function updateSegmentAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const { values, error } = readSegmentForm(formData);
  if (!values) return error ?? { ok: false, error: "Could not save the segment." };
  await updateSegment(user.tenantId, id, values);
  revalidatePath("/marketing/segments");
  revalidatePath(`/marketing/segments/${id}`);
  redirect("/marketing/segments");
}

export async function deleteSegmentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteSegment(user.tenantId, id);
  revalidatePath("/marketing/segments");
  redirect("/marketing/segments");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { namedRefInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { createNamedRef, updateNamedRef, type RevenueEntity } from "@/server/data/revenue-config";

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

const ENTITY_PATH: Record<RevenueEntity, string> = {
  fund: "/revenue/funds",
  campaign: "/revenue/campaigns",
  appeal: "/revenue/appeals",
};

function readNamedRefForm(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };
  return {
    name: (formData.get("name") as string | null) ?? "",
    code: text("code"),
    startDate: text("startDate"),
    endDate: text("endDate"),
  };
}

export async function createNamedRefAction(
  entity: RevenueEntity,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = namedRefInputSchema.safeParse(readNamedRefForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await createNamedRef(user.tenantId, entity, parsed.data);
  revalidatePath(ENTITY_PATH[entity]);
  revalidatePath("/revenue");
  redirect(ENTITY_PATH[entity]);
}

export async function updateNamedRefAction(
  entity: RevenueEntity,
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = namedRefInputSchema.safeParse(readNamedRefForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateNamedRef(user.tenantId, entity, id, parsed.data);
  revalidatePath(ENTITY_PATH[entity]);
  revalidatePath("/revenue");
  redirect(ENTITY_PATH[entity]);
}

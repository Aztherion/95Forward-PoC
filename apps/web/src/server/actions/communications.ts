"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { communicationInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { scheduledDateToTimestamp } from "@/lib/marketing-format";
import {
  createCommunication,
  deleteCommunication,
  scheduleCommunication,
  sendCommunicationNow,
  updateCommunication,
} from "@/server/data/communications";

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

function readCommunicationForm(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  return {
    name: text("name"),
    channel: text("channel"),
    segmentId: text("segmentId"),
    subject: text("subject"),
    body: text("body"),
    status: text("status") ?? "draft",
    scheduledAt: text("scheduledAt"),
  };
}

export async function createCommunicationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = communicationInputSchema.safeParse(readCommunicationForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  const id = await createCommunication(user.tenantId, parsed.data);
  revalidatePath("/marketing/communications");
  redirect(`/marketing/communications/${id}`);
}

export async function updateCommunicationAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = communicationInputSchema.safeParse(readCommunicationForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateCommunication(user.tenantId, id, parsed.data);
  revalidatePath("/marketing/communications");
  revalidatePath(`/marketing/communications/${id}`);
  redirect(`/marketing/communications/${id}`);
}

export async function deleteCommunicationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteCommunication(user.tenantId, id);
  revalidatePath("/marketing/communications");
  redirect("/marketing/communications");
}

export async function sendCommunicationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await sendCommunicationNow(user.tenantId, id);
  revalidatePath("/marketing/communications");
  revalidatePath(`/marketing/communications/${id}`);
}

export async function scheduleCommunicationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const scheduledRaw = formData.get("scheduledAt");
  const scheduledAt =
    typeof scheduledRaw === "string" ? scheduledDateToTimestamp(scheduledRaw.trim()) : null;
  if (!scheduledAt) {
    redirect(`/marketing/communications/${id}?schedule=missing-date`);
  }
  await scheduleCommunication(user.tenantId, id, scheduledAt);
  revalidatePath("/marketing/communications");
  revalidatePath(`/marketing/communications/${id}`);
  redirect(`/marketing/communications/${id}`);
}

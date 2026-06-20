"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eventInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { dollarsToCents } from "@/lib/gift-params";
import { createEvent, deleteEvent, updateEvent } from "@/server/data/events";

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

function readEventForm(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const capacityRaw = text("capacity");
  const capacity = capacityRaw === undefined ? undefined : Number.parseInt(capacityRaw, 10);

  const goalRaw = text("goalAmount");
  const goalAmountCents = goalRaw === undefined ? undefined : dollarsToCents(goalRaw);

  return {
    name: text("name"),
    eventType: text("eventType") ?? "other",
    startsAt: text("startsAt"),
    endsAt: text("endsAt"),
    location: text("location"),
    capacity,
    goalAmountCents,
    description: text("description"),
  };
}

export async function createEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = readEventForm(formData);
  if (values.goalAmountCents === null) {
    return { ok: false, fieldErrors: { goalAmountCents: "Enter a valid dollar amount" } };
  }
  const parsed = eventInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  const id = await createEvent(user.tenantId, parsed.data);
  revalidatePath("/events");
  redirect(`/events/${id}`);
}

export async function updateEventAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const values = readEventForm(formData);
  if (values.goalAmountCents === null) {
    return { ok: false, fieldErrors: { goalAmountCents: "Enter a valid dollar amount" } };
  }
  const parsed = eventInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateEvent(user.tenantId, id, parsed.data);
  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteEvent(user.tenantId, id);
  revalidatePath("/events");
  redirect("/events");
}

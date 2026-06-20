"use server";

import { revalidatePath } from "next/cache";
import { REGISTRATION_STATUSES, registrationInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { dollarsToCents } from "@/lib/gift-params";
import {
  createRegistration,
  setRegistrationStatus,
  toggleRegistrationAttended,
} from "@/server/data/registrations";

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

type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

function isRegistrationStatus(value: unknown): value is RegistrationStatus {
  return typeof value === "string" && (REGISTRATION_STATUSES as readonly string[]).includes(value);
}

export async function createRegistrationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const text = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const guestRaw = text("guestCount");
  const guestCount = guestRaw === undefined ? 0 : Number.parseInt(guestRaw, 10);

  const feeRaw = text("fee");
  const feeAmountCents = feeRaw === undefined ? undefined : dollarsToCents(feeRaw);
  if (feeAmountCents === null) {
    return { ok: false, fieldErrors: { feeAmountCents: "Enter a valid dollar amount" } };
  }

  const parsed = registrationInputSchema.safeParse({
    eventId: text("eventId"),
    constituentId: text("constituentId"),
    status: text("status") ?? "registered",
    guestCount,
    feeAmountCents,
    attended: false,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }

  await createRegistration(user.tenantId, parsed.data);
  revalidatePath(`/events/${parsed.data.eventId}`);
  return { ok: true };
}

export async function toggleAttendedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const eventId = await toggleRegistrationAttended(user.tenantId, id);
  if (eventId) revalidatePath(`/events/${eventId}`);
}

export async function setRegistrationStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || !isRegistrationStatus(status)) return;
  const eventId = await setRegistrationStatus(user.tenantId, id, status);
  if (eventId) revalidatePath(`/events/${eventId}`);
}

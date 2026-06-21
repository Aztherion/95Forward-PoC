"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { membershipInputSchema, membershipTierInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { dollarsToCents } from "@/lib/gift-params";
import { todayIso } from "@/lib/membership-params";
import {
  createMembership,
  createTier,
  deleteMembership,
  deleteTier,
  renewMembership,
  updateMembership,
  updateTier,
} from "@/server/data/memberships";

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

function readTierForm(formData: FormData) {
  const levelRaw = text(formData, "level");
  const level = levelRaw === undefined ? undefined : Number.parseInt(levelRaw, 10);

  const duesRaw = text(formData, "dues");
  const amountCents = duesRaw === undefined ? undefined : dollarsToCents(duesRaw);

  return {
    name: text(formData, "name"),
    level,
    amountCents,
    benefits: text(formData, "benefits"),
  };
}

export async function createTierAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = readTierForm(formData);
  if (values.amountCents === null) {
    return { ok: false, fieldErrors: { amountCents: "Enter a valid dollar amount" } };
  }
  const parsed = membershipTierInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await createTier(user.tenantId, parsed.data);
  revalidatePath("/memberships/tiers");
  redirect("/memberships/tiers");
}

export async function updateTierAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const values = readTierForm(formData);
  if (values.amountCents === null) {
    return { ok: false, fieldErrors: { amountCents: "Enter a valid dollar amount" } };
  }
  const parsed = membershipTierInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateTier(user.tenantId, id, parsed.data);
  revalidatePath("/memberships/tiers");
  redirect("/memberships/tiers");
}

export async function deleteTierAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteTier(user.tenantId, id);
  revalidatePath("/memberships/tiers");
  revalidatePath("/memberships/members");
  redirect("/memberships/tiers");
}

function readMembershipForm(formData: FormData) {
  return {
    constituentId: text(formData, "constituentId"),
    tierId: text(formData, "tierId"),
    status: text(formData, "status") ?? "active",
    startDate: text(formData, "startDate"),
    renewalDate: text(formData, "renewalDate"),
  };
}

export async function createMembershipAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = membershipInputSchema.safeParse(readMembershipForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  const id = await createMembership(user.tenantId, parsed.data);
  revalidatePath("/memberships/members");
  redirect(`/memberships/members/${id}`);
}

export async function updateMembershipAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = membershipInputSchema.safeParse(readMembershipForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateMembership(user.tenantId, id, parsed.data);
  revalidatePath("/memberships/members");
  revalidatePath(`/memberships/members/${id}`);
  redirect(`/memberships/members/${id}`);
}

export async function deleteMembershipAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteMembership(user.tenantId, id);
  revalidatePath("/memberships/members");
  redirect("/memberships/members");
}

export async function renewMembershipAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await renewMembership(user.tenantId, id, todayIso());

  const redirectTo = formData.get("redirectTo");
  const safePath =
    typeof redirectTo === "string" && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/memberships/renewals";
  revalidatePath("/memberships/members");
  revalidatePath("/memberships/renewals");
  if (safePath !== "/memberships/renewals") revalidatePath(safePath);
  redirect(safePath);
}

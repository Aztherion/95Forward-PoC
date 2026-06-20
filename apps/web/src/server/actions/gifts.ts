"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { giftInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { dollarsToCents } from "@/lib/gift-params";
import { createGift, deleteGift, setGiftReceiptStatus, updateGift } from "@/server/data/gifts";

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

function readGiftForm(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const amountRaw = text("amount");
  const amountCents = amountRaw === undefined ? undefined : dollarsToCents(amountRaw);

  return {
    constituentId: text("constituentId"),
    amountCents,
    giftDate: text("giftDate"),
    giftType: text("giftType"),
    fundId: text("fundId"),
    campaignId: text("campaignId"),
    appealId: text("appealId"),
    designation: text("designation"),
    receiptStatus: text("receiptStatus") ?? "unreceipted",
  };
}

export async function createGiftAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = readGiftForm(formData);
  if (values.amountCents === null) {
    return { ok: false, fieldErrors: { amountCents: "Enter a valid dollar amount" } };
  }
  const parsed = giftInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await createGift(user.tenantId, parsed.data);
  revalidatePath("/revenue");
  revalidatePath(`/constituents/${parsed.data.constituentId}`);
  redirect("/revenue");
}

export async function updateGiftAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const values = readGiftForm(formData);
  if (values.amountCents === null) {
    return { ok: false, fieldErrors: { amountCents: "Enter a valid dollar amount" } };
  }
  const parsed = giftInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateGift(user.tenantId, id, parsed.data);
  revalidatePath("/revenue");
  revalidatePath(`/revenue/${id}`);
  revalidatePath(`/constituents/${parsed.data.constituentId}`);
  redirect(`/revenue/${id}`);
}

export async function deleteGiftAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const constituentId = await deleteGift(user.tenantId, id);
  revalidatePath("/revenue");
  if (constituentId) revalidatePath(`/constituents/${constituentId}`);
  redirect("/revenue");
}

export async function markReceiptedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const constituentId = await setGiftReceiptStatus(user.tenantId, id, "receipted");
  revalidatePath("/revenue");
  revalidatePath(`/revenue/${id}`);
  if (constituentId) revalidatePath(`/constituents/${constituentId}`);
}

export async function markUnreceiptedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const constituentId = await setGiftReceiptStatus(user.tenantId, id, "unreceipted");
  revalidatePath("/revenue");
  revalidatePath(`/revenue/${id}`);
  if (constituentId) revalidatePath(`/constituents/${constituentId}`);
}

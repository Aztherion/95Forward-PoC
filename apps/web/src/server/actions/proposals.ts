"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { proposalInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { dollarsToCents } from "@/lib/gift-params";
import { createProposal, deleteProposal, updateProposal } from "@/server/data/proposals";

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

interface ReadResult {
  values: {
    constituentId: string | undefined;
    purpose: string | undefined;
    amountCents: number | undefined;
    status: string;
    deadline: string | undefined;
  };
  fieldErrors: Record<string, string>;
}

function readProposalForm(formData: FormData): ReadResult {
  const text = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const fieldErrors: Record<string, string> = {};

  const amountRaw = text("amount");
  let amountCents: number | undefined;
  if (amountRaw !== undefined) {
    const cents = dollarsToCents(amountRaw);
    if (cents === null) {
      fieldErrors.amountCents = "Enter a valid dollar amount";
    } else {
      amountCents = cents;
    }
  }

  return {
    values: {
      constituentId: text("constituentId"),
      purpose: text("purpose"),
      amountCents,
      status: text("status") ?? "draft",
      deadline: text("deadline"),
    },
    fieldErrors,
  };
}

export async function createProposalAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const { values, fieldErrors } = readProposalForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const parsed = proposalInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await createProposal(user.tenantId, parsed.data);
  revalidatePath("/major-giving/proposals");
  revalidatePath(`/constituents/${parsed.data.constituentId}`);
  redirect("/major-giving/proposals");
}

export async function updateProposalAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const { values, fieldErrors } = readProposalForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const parsed = proposalInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateProposal(user.tenantId, id, parsed.data);
  revalidatePath("/major-giving/proposals");
  revalidatePath(`/major-giving/proposals/${id}`);
  revalidatePath(`/constituents/${parsed.data.constituentId}`);
  redirect(`/major-giving/proposals/${id}`);
}

export async function deleteProposalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const constituentId = await deleteProposal(user.tenantId, id);
  revalidatePath("/major-giving/proposals");
  if (constituentId) revalidatePath(`/constituents/${constituentId}`);
  redirect("/major-giving/proposals");
}

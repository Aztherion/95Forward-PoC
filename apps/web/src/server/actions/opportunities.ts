"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { opportunityInputSchema } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { dollarsToCents } from "@/lib/gift-params";
import {
  createOpportunity,
  deleteOpportunity,
  updateOpportunity,
} from "@/server/data/opportunities";

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
    stage: string | undefined;
    askAmountCents: number | undefined;
    expectedAmountCents: number | undefined;
    expectedCloseDate: string | undefined;
    likelihoodPct: number | undefined;
    ownerUserId: string | undefined;
  };
  fieldErrors: Record<string, string>;
}

function readOpportunityForm(formData: FormData): ReadResult {
  const text = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const fieldErrors: Record<string, string> = {};

  const askRaw = text("askAmount");
  let askAmountCents: number | undefined;
  if (askRaw !== undefined) {
    const cents = dollarsToCents(askRaw);
    if (cents === null) {
      fieldErrors.askAmountCents = "Enter a valid dollar amount";
    } else {
      askAmountCents = cents;
    }
  }

  const expectedRaw = text("expectedAmount");
  let expectedAmountCents: number | undefined;
  if (expectedRaw !== undefined) {
    const cents = dollarsToCents(expectedRaw);
    if (cents === null) {
      fieldErrors.expectedAmountCents = "Enter a valid dollar amount";
    } else {
      expectedAmountCents = cents;
    }
  }

  const likelihoodRaw = text("likelihoodPct");
  let likelihoodPct: number | undefined;
  if (likelihoodRaw !== undefined) {
    const parsed = Number.parseInt(likelihoodRaw, 10);
    if (!Number.isFinite(parsed)) {
      fieldErrors.likelihoodPct = "Enter a whole number from 0 to 100";
    } else {
      likelihoodPct = parsed;
    }
  }

  return {
    values: {
      constituentId: text("constituentId"),
      stage: text("stage"),
      askAmountCents,
      expectedAmountCents,
      expectedCloseDate: text("expectedCloseDate"),
      likelihoodPct,
      ownerUserId: text("ownerUserId"),
    },
    fieldErrors,
  };
}

export async function createOpportunityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const { values, fieldErrors } = readOpportunityForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const parsed = opportunityInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await createOpportunity(user.tenantId, parsed.data);
  revalidatePath("/major-giving/opportunities");
  revalidatePath("/major-giving/portfolio");
  revalidatePath(`/constituents/${parsed.data.constituentId}`);
  redirect("/major-giving/opportunities");
}

export async function updateOpportunityAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const { values, fieldErrors } = readOpportunityForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const parsed = opportunityInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await updateOpportunity(user.tenantId, id, parsed.data);
  revalidatePath("/major-giving/opportunities");
  revalidatePath(`/major-giving/opportunities/${id}`);
  revalidatePath("/major-giving/portfolio");
  revalidatePath(`/constituents/${parsed.data.constituentId}`);
  redirect(`/major-giving/opportunities/${id}`);
}

export async function deleteOpportunityAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const constituentId = await deleteOpportunity(user.tenantId, id);
  revalidatePath("/major-giving/opportunities");
  revalidatePath("/major-giving/portfolio");
  if (constituentId) revalidatePath(`/constituents/${constituentId}`);
  redirect("/major-giving/opportunities");
}

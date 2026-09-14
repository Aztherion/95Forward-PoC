"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  changeAmount,
  confirmOpportunityMilestone,
  logWhatHappened,
  moveCloseDate,
} from "@/server/data/opportunity-detail";

export interface OpportunityFormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Every write on this screen revalidates The Board as well as the record.
 *
 * That is the product's central claim made mechanical: confirm a milestone and qualification
 * recomputes, the headline metric moves, and the queue re-ranks. If the board were left stale the
 * claim would be true of the database and false of the screen.
 */
function revalidateAll(opportunityId: string): void {
  revalidatePath(`/95-forward/opportunities/${opportunityId}`);
  revalidatePath("/95-forward/board");
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return { userId: user.id, name: user.name, tenantId: user.tenantId };
}

function text(formData: FormData, name: string): string | null {
  const raw = formData.get(name);
  if (raw === null) return null;
  const value = String(raw).trim();
  return value === "" ? null : value;
}

/**
 * Confirm or un-confirm one milestone.
 *
 * `prospectSourced` is submitted, not inferred. A they-said milestone is only they-said if the
 * prospect actually said it, and the form asks; inferring it from the milestone's own `source`
 * would make the field a tautology and the event log worthless as evidence.
 */
export async function confirmMilestoneAction(
  _prev: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const opportunityId = text(formData, "opportunityId");
  const key = text(formData, "key");
  if (!opportunityId || !key) return { ok: false, error: "Nothing to record" };

  const confirmed = formData.get("confirmed") !== "false";
  const prospectSourced = formData.get("prospectSourced") === "on";
  const confirmedByName = text(formData, "confirmedByName");
  const evidence = text(formData, "evidence");
  const documentUrl = text(formData, "documentUrl");

  if (confirmed && prospectSourced && !confirmedByName) {
    // "The prospect confirmed it" with nobody named is exactly the claim this screen exists to
    // refuse. A name is what makes it evidence rather than an assertion.
    return {
      ok: false,
      error: "Who confirmed it?",
      fieldErrors: { confirmedByName: "Name the person who told you." },
    };
  }

  try {
    await confirmOpportunityMilestone(
      user.tenantId,
      { opportunityId, key, confirmed, prospectSourced, confirmedByName, evidence, documentUrl },
      { userId: user.userId, name: user.name },
    );
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not record" };
  }
  revalidateAll(opportunityId);
  return { ok: true };
}

/** Move the close date, recording whether the prospect gave you this one. */
export async function moveCloseDateAction(
  _prev: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const opportunityId = text(formData, "opportunityId");
  const closeDate = text(formData, "closeDate");
  if (!opportunityId || !closeDate) {
    return { ok: false, error: "A date is required", fieldErrors: { closeDate: "Pick a date." } };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closeDate)) {
    return { ok: false, error: "Invalid date", fieldErrors: { closeDate: "Use a calendar date." } };
  }

  try {
    await moveCloseDate(
      user.tenantId,
      { opportunityId, closeDate, prospectSourced: formData.get("prospectSourced") === "on" },
      { userId: user.userId, name: user.name },
    );
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not move the date" };
  }
  revalidateAll(opportunityId);
  return { ok: true };
}

export async function changeAmountAction(
  _prev: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const opportunityId = text(formData, "opportunityId");
  const raw = text(formData, "amount");
  if (!opportunityId || raw === null) {
    return {
      ok: false,
      error: "An amount is required",
      fieldErrors: { amount: "Enter an amount." },
    };
  }
  const dollars = Number(raw.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(dollars) || dollars <= 0) {
    return { ok: false, error: "Invalid amount", fieldErrors: { amount: "Enter a whole amount." } };
  }

  try {
    await changeAmount(
      user.tenantId,
      {
        opportunityId,
        amountCents: Math.round(dollars * 100),
        amountNote: text(formData, "amountNote"),
      },
      { userId: user.userId, name: user.name },
    );
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not change it" };
  }
  revalidateAll(opportunityId);
  return { ok: true };
}

/** Log a contact. This is what resets the silence counter, so it is what the rule reads. */
export async function logContactAction(
  _prev: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const opportunityId = text(formData, "opportunityId");
  if (!opportunityId) return { ok: false, error: "Nothing to log" };

  try {
    await logWhatHappened(
      user.tenantId,
      { opportunityId, note: text(formData, "note") },
      { userId: user.userId, name: user.name },
    );
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not log it" };
  }
  revalidateAll(opportunityId);
  return { ok: true };
}

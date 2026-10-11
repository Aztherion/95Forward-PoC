"use server";

import { revalidatePath } from "next/cache";
import {
  DefinitionInvalidError,
  InUseError,
  LinkTargetNotVisibleError,
  type DefinitionInput,
} from "@95forward/db";
import { MEETING_SOURCE_TYPES, type MeetingSourceType } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import {
  createMeetingType,
  deleteMeetingType,
  deleteScorecardDefinition,
  overrideMeetingType,
  reportMeeting,
  rescoreScorecard,
  saveScorecardDefinition,
  setDefinitionActive,
  updateMeetingType,
  type AuthedUser,
} from "@/server/data/scorecards";

// 95 Forward — Scorecard server actions (Initiative 31). No UI yet; I32 binds to these.
//
// The one rule that runs through every action: the ACTING USER comes from getCurrentUser(), never
// from the form. A `reportedBy` field on a form would be a hole in the visibility model whether or
// not any screen ever rendered it.

export interface ScorecardFormState {
  ok?: boolean;
  error?: string;
  /** Per-field problems from a definition validation, keyed by the validator's path. */
  fieldErrors?: Record<string, string>;
  scorecardId?: string;
}

async function requireUser(): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return { id: user.id, tenantId: user.tenantId, name: user.name };
}

function revalidateScorecards(scorecardId?: string): void {
  revalidatePath("/95-forward/scorecards");
  if (scorecardId) revalidatePath(`/95-forward/scorecards/${scorecardId}`);
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function asSourceType(value: string): MeetingSourceType {
  return (MEETING_SOURCE_TYPES as readonly string[]).includes(value)
    ? (value as MeetingSourceType)
    : "notes";
}

/** Report a meeting. Returns the Scorecard id so the caller can start polling status. */
export async function reportMeetingAction(
  _prev: ScorecardFormState,
  formData: FormData,
): Promise<ScorecardFormState> {
  let user: AuthedUser;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const opportunityId = text(formData, "opportunityId");
  const prospectId = text(formData, "prospectId");
  const content = String(formData.get("content") ?? "");
  const occurredAtRaw = text(formData, "occurredAt");

  if (!opportunityId && !prospectId) {
    return { ok: false, error: "Link the meeting to an opportunity or a prospect." };
  }
  if (opportunityId && prospectId) {
    return { ok: false, error: "Link the meeting to one thing, not both." };
  }
  if (content.trim().length === 0) {
    return { ok: false, error: "Paste the notes or the transcript." };
  }
  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : null;
  if (occurredAt === null || Number.isNaN(occurredAt.getTime())) {
    return { ok: false, error: "When did the meeting happen?" };
  }

  try {
    const created = await reportMeeting(user, {
      opportunityId: opportunityId || null,
      prospectId: prospectId || null,
      occurredAt,
      sourceType: asSourceType(text(formData, "sourceType")),
      content,
    });
    revalidateScorecards(created.scorecardId);
    return { ok: true, scorecardId: created.scorecardId };
  } catch (error) {
    if (error instanceof LinkTargetNotVisibleError) return { ok: false, error: error.message };
    return { ok: false, error: messageOf(error, "Could not report the meeting") };
  }
}

export async function overrideMeetingTypeAction(
  _prev: ScorecardFormState,
  formData: FormData,
): Promise<ScorecardFormState> {
  let user: AuthedUser;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const scorecardId = text(formData, "scorecardId");
  const meetingTypeId = text(formData, "meetingTypeId");
  if (!scorecardId || !meetingTypeId) return { ok: false, error: "Nothing to change" };

  try {
    const ok = await overrideMeetingType(user, scorecardId, meetingTypeId);
    // Same answer for "no such scorecard" and "not yours" — see getScorecardForViewer.
    if (!ok) return { ok: false, error: "That scorecard could not be found." };
    revalidateScorecards(scorecardId);
    return { ok: true, scorecardId };
  } catch (error) {
    if (error instanceof InUseError) return { ok: false, error: error.message };
    return { ok: false, error: messageOf(error, "Could not change the meeting type") };
  }
}

export async function rescoreScorecardAction(
  _prev: ScorecardFormState,
  formData: FormData,
): Promise<ScorecardFormState> {
  let user: AuthedUser;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const scorecardId = text(formData, "scorecardId");
  if (!scorecardId) return { ok: false, error: "Nothing to re-score" };

  const ok = await rescoreScorecard(user, scorecardId);
  if (!ok) return { ok: false, error: "That scorecard could not be found." };
  revalidateScorecards(scorecardId);
  return { ok: true, scorecardId };
}

// ---- Meeting Type and Scorecard Definition CRUD -----------------------------------------------

export async function saveMeetingTypeAction(
  _prev: ScorecardFormState,
  formData: FormData,
): Promise<ScorecardFormState> {
  let user: AuthedUser;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const id = text(formData, "id");
  const input = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    isFallback: formData.get("isFallback") === "on" || formData.get("isFallback") === "true",
  };

  try {
    if (id) await updateMeetingType(user, id, input);
    else await createMeetingType(user, input);
    revalidateScorecards();
    return { ok: true };
  } catch (error) {
    return definitionError(error, "Could not save the meeting type");
  }
}

export async function deleteMeetingTypeAction(
  _prev: ScorecardFormState,
  formData: FormData,
): Promise<ScorecardFormState> {
  let user: AuthedUser;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }
  const id = text(formData, "id");
  if (!id) return { ok: false, error: "Nothing to delete" };
  try {
    await deleteMeetingType(user, id);
    revalidateScorecards();
    return { ok: true };
  } catch (error) {
    if (error instanceof InUseError) return { ok: false, error: error.message };
    return { ok: false, error: messageOf(error, "Could not delete the meeting type") };
  }
}

/**
 * Save a whole definition. Takes the tree as JSON rather than a flattened form, because the shape
 * is a tree and flattening it would mean re-deriving section/criterion/option ids from field names
 * — which is exactly how stable ids get lost.
 */
export async function saveDefinitionAction(
  _prev: ScorecardFormState,
  formData: FormData,
): Promise<ScorecardFormState> {
  let user: AuthedUser;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  let input: DefinitionInput;
  try {
    input = JSON.parse(String(formData.get("definition") ?? "")) as DefinitionInput;
  } catch {
    return { ok: false, error: "The definition could not be read." };
  }

  try {
    await saveScorecardDefinition(user, input);
    revalidateScorecards();
    return { ok: true };
  } catch (error) {
    return definitionError(error, "Could not save the definition");
  }
}

export async function setDefinitionActiveAction(
  _prev: ScorecardFormState,
  formData: FormData,
): Promise<ScorecardFormState> {
  let user: AuthedUser;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }
  const id = text(formData, "id");
  if (!id) return { ok: false, error: "Nothing to change" };
  try {
    await setDefinitionActive(user, id, text(formData, "isActive") === "true");
    revalidateScorecards();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Could not change the definition") };
  }
}

export async function deleteDefinitionAction(
  _prev: ScorecardFormState,
  formData: FormData,
): Promise<ScorecardFormState> {
  let user: AuthedUser;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }
  const id = text(formData, "id");
  if (!id) return { ok: false, error: "Nothing to delete" };
  try {
    await deleteScorecardDefinition(user, id);
    revalidateScorecards();
    return { ok: true };
  } catch (error) {
    if (error instanceof InUseError) return { ok: false, error: error.message };
    return { ok: false, error: messageOf(error, "Could not delete the definition") };
  }
}

function definitionError(error: unknown, fallback: string): ScorecardFormState {
  if (error instanceof DefinitionInvalidError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) fieldErrors[issue.path] = issue.message;
    return { ok: false, error: "That definition is not complete yet.", fieldErrors };
  }
  return { ok: false, error: messageOf(error, fallback) };
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

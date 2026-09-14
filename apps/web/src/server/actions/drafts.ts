"use server";

import { revalidatePath } from "next/cache";
import type { NextActionKind } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { generateAndSave, markDraftDone, saveEdit, type DraftView } from "@/server/data/drafts";

export interface DraftFormState {
  ok?: boolean;
  error?: string;
  draft?: DraftView;
  /** What marking it done did to the record, in the user's words. */
  effect?: string;
}

function revalidateAll(opportunityId: string): void {
  revalidatePath(`/95-forward/opportunities/${opportunityId}`);
  revalidatePath("/95-forward/board");
  revalidatePath("/95-forward/forecast");
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return { userId: user.id, name: user.name, tenantId: user.tenantId };
}

function readTarget(formData: FormData): { opportunityId: string; kind: NextActionKind } | null {
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  if (!opportunityId || !kind) return null;
  return { opportunityId, kind: kind as NextActionKind };
}

/**
 * Generate a draft, or regenerate one that exists.
 *
 * Failure keeps the panel open with the error and a retry. Closing the panel on failure would
 * leave a rep looking at the button they just pressed with no sign anything happened — which is
 * indistinguishable from the hang this codebase has already shipped once.
 */
export async function generateDraftAction(
  _prev: DraftFormState,
  formData: FormData,
): Promise<DraftFormState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }
  const target = readTarget(formData);
  if (!target) return { ok: false, error: "Nothing to draft" };

  try {
    const draft = await generateAndSave(
      user.tenantId,
      target.opportunityId,
      user.userId,
      target.kind,
      { userId: user.userId, name: user.name },
    );
    revalidateAll(target.opportunityId);
    return { ok: true, draft };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The draft could not be generated",
    };
  }
}

/** Persist the human's version. The generated text is never overwritten. */
export async function saveDraftEditAction(
  _prev: DraftFormState,
  formData: FormData,
): Promise<DraftFormState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }
  const target = readTarget(formData);
  const finalText = String(formData.get("finalText") ?? "");
  if (!target || finalText.trim() === "") return { ok: false, error: "Nothing to save" };

  try {
    const draft = await saveEdit(user.tenantId, target.opportunityId, target.kind, finalText, {
      userId: user.userId,
      name: user.name,
    });
    revalidateAll(target.opportunityId);
    return { ok: true, draft };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save" };
  }
}

/**
 * Mark the action done.
 *
 * There is no send path anywhere in this product — no integration, no button, nothing to disable.
 * "Never auto-send" is therefore structural rather than a policy someone could relax. Done means
 * the rep copied the artifact out and used it, and the record catches up.
 */
export async function markDraftDoneAction(
  _prev: DraftFormState,
  formData: FormData,
): Promise<DraftFormState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }
  const target = readTarget(formData);
  if (!target) return { ok: false, error: "Nothing to mark done" };

  try {
    const { view, effect } = await markDraftDone(user.tenantId, target.opportunityId, target.kind, {
      userId: user.userId,
      name: user.name,
    });
    revalidateAll(target.opportunityId);
    return { ok: true, draft: view, effect };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not complete" };
  }
}

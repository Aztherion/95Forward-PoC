"use server";

import { revalidatePath } from "next/cache";
import type { DecisionKind } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { decideBoardItem, undecideBoardItem } from "@/server/data/board";

export interface BoardFormState {
  ok?: boolean;
  error?: string;
}

const BOARD_PATH = "/95-forward/board";

function readDecision(formData: FormData): {
  opportunityId: string;
  ruleId: string | null;
  kind: DecisionKind;
} | null {
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!opportunityId) return null;
  const rawRule = formData.get("ruleId");
  // A Fix-first finding is dismissed by (opportunity, rule); a queue item by opportunity alone.
  // An empty string from an unfilled hidden input is the queue item, not a rule called "".
  const ruleId = rawRule === null || String(rawRule) === "" ? null : String(rawRule);
  const kind = String(formData.get("kind") ?? "");
  if (kind !== "pin" && kind !== "dismiss") return null;
  return { opportunityId, ruleId, kind };
}

/** Pin an item to the top of the queue, or dismiss it from the board. */
export async function decideBoardItemAction(
  _prev: BoardFormState,
  formData: FormData,
): Promise<BoardFormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const decision = readDecision(formData);
  if (!decision) return { ok: false, error: "Nothing to decide" };

  try {
    await decideBoardItem(user.tenantId, decision, { userId: user.id, name: user.name });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save" };
  }
  revalidatePath(BOARD_PATH);
  return { ok: true };
}

/**
 * Unpin, or restore a dismissed item.
 *
 * Restore is not a nicety. A dismissal the user cannot see or undo is a one-way trapdoor: a
 * mis-click silently hides coaching from the person it was written for, and they have no way of
 * knowing it happened.
 */
export async function undecideBoardItemAction(
  _prev: BoardFormState,
  formData: FormData,
): Promise<BoardFormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const decision = readDecision(formData);
  if (!decision) return { ok: false, error: "Nothing to restore" };

  try {
    await undecideBoardItem(user.tenantId, decision);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not restore" };
  }
  revalidatePath(BOARD_PATH);
  return { ok: true };
}

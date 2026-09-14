"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { fundingInitiatives, users, withTenant } from "@95forward/db";
import { getCurrentUser } from "@/lib/auth";
import { getAppDb } from "@/server/db";
import { commitGridEdit, isGridEditableField, parseGridEdit } from "@/server/data/grid-mutations";

export interface GridEditState {
  ok?: boolean;
  /** Shown on the cell. A rejected edit must say why, not just snap back. */
  error?: string;
  /** Echoed so the client can match a response to the cell it came from. */
  opportunityId?: string;
  field?: string;
}

/**
 * One cell, one transaction, one event.
 *
 * Every editable field is already in `TRACKED_OPPORTUNITY_FIELDS`, so `updateForwardOpportunity`
 * date-stamps the change into the event log without this action doing anything special — which is
 * the point: the grid is a second front end onto I18's capture path, not a second way to write.
 *
 * Everything downstream is revalidated, because the reason to edit here rather than on the detail
 * page is to "see the effect on the forecast immediately".
 */
export async function editGridCellAction(
  _prev: GridEditState,
  formData: FormData,
): Promise<GridEditState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const opportunityId = String(formData.get("opportunityId") ?? "");
  const field = String(formData.get("field") ?? "");
  if (!opportunityId || !isGridEditableField(field)) {
    return { ok: false, error: "Nothing to change" };
  }

  const raw = formData.get("value");
  const rawValue = raw === null ? null : String(raw);

  // The two FK fields are validated against this tenant's own sets — a well-formed uuid from
  // another tenant is exactly the input that must not work, and RLS on the read is what makes the
  // set trustworthy.
  const allowed = await withTenant(getAppDb(), user.tenantId, async (tx) => {
    const [initiativeRows, userRows] = await Promise.all([
      tx
        .select({ id: fundingInitiatives.id })
        .from(fundingInitiatives)
        .where(eq(fundingInitiatives.tenantId, user.tenantId)),
      tx.select({ id: users.id }).from(users).where(eq(users.tenantId, user.tenantId)),
    ]);
    return {
      initiatives: new Set(initiativeRows.map((r) => r.id)),
      owners: new Set(userRows.map((r) => r.id)),
    };
  });

  const parsed = parseGridEdit(field, rawValue, allowed);
  if (parsed.error) {
    return { ok: false, error: parsed.error, opportunityId, field };
  }

  // Only the close date asks. See commitGridEdit for why it is not a constant.
  const prospectSourced = field === "closeDate" && formData.get("prospectSourced") === "on";

  try {
    await commitGridEdit(
      user.tenantId,
      { opportunityId, patch: parsed.patch, prospectSourced },
      { userId: user.id, name: user.name },
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The change could not be saved",
      opportunityId,
      field,
    };
  }

  revalidatePath("/95-forward/opportunities");
  revalidatePath(`/95-forward/opportunities/${opportunityId}`);
  revalidatePath("/95-forward/board");
  revalidatePath("/95-forward/forecast");
  return { ok: true, opportunityId, field };
}

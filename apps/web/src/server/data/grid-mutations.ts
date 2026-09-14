import "server-only";
import { updateForwardOpportunity, withTenant } from "@95forward/db";
import {
  DATE_CONFIDENCES,
  FORWARD_STAGES,
  GRID_EDITABLE_FIELDS,
  PROBABILITY_BANDS,
  VISIT_RATINGS,
  type GridEditableField,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { demoClock } from "@/server/data/forward-context";

export function isGridEditableField(value: string): value is GridEditableField {
  return (GRID_EDITABLE_FIELDS as readonly string[]).includes(value);
}

export interface ParsedEdit {
  readonly patch: Record<string, unknown>;
  /** Prose the cell shows if the value is rejected. */
  readonly error?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate one cell against the typed model.
 *
 * This is the line between a data grid and a spreadsheet. A spreadsheet cell accepts anything and
 * discovers later that the column no longer means one thing; every value here is checked against
 * an enum, a type or a range BEFORE it reaches the database, and a rejection comes back with a
 * sentence rather than silently writing something the rest of the product will misread.
 *
 * `initiativeId` and `ownerUserId` are checked against the sets the caller loaded from this tenant
 * rather than against a shape, because a well-formed uuid belonging to another tenant is exactly
 * the input that must not work.
 */
export function parseGridEdit(
  field: GridEditableField,
  raw: string | null,
  allowed: { initiatives: ReadonlySet<string>; owners: ReadonlySet<string> },
): ParsedEdit {
  const value = raw?.trim() ?? "";

  switch (field) {
    case "amountCents": {
      // Accept what a human types into a money cell: "250000", "250,000", "$250,000", "250000.50".
      const cleaned = value.replace(/[$,\s]/g, "");
      if (cleaned === "") return { patch: {}, error: "An amount is required." };
      const asNumber = Number(cleaned);
      if (!Number.isFinite(asNumber)) return { patch: {}, error: "That is not a number." };
      if (asNumber <= 0) return { patch: {}, error: "An ask has to be more than zero." };
      const cents = Math.round(asNumber * 100);
      if (cents > 100_000_000_00) {
        return { patch: {}, error: "That is over $100M — check the figure." };
      }
      return { patch: { amountCents: cents } };
    }
    case "probability":
      return (PROBABILITY_BANDS as readonly string[]).includes(value)
        ? { patch: { probability: value } }
        : { patch: {}, error: "Not one of the probability bands." };
    case "dateConfidence":
      return (DATE_CONFIDENCES as readonly string[]).includes(value)
        ? { patch: { dateConfidence: value } }
        : { patch: {}, error: "Not one of the date confidences." };
    case "stage":
      return (FORWARD_STAGES as readonly string[]).includes(value)
        ? { patch: { stage: value } }
        : { patch: {}, error: "Not one of the six stages." };
    case "visitRating":
      // Nullable: clearing it is a legitimate edit, not a validation failure.
      if (value === "") return { patch: { visitRating: null } };
      return (VISIT_RATINGS as readonly string[]).includes(value)
        ? { patch: { visitRating: value } }
        : { patch: {}, error: "Not one of the visit ratings." };
    case "closeDate": {
      if (value === "") return { patch: { closeDate: null } };
      if (!ISO_DATE.test(value)) return { patch: {}, error: "Use a real date." };
      const parsed = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) return { patch: {}, error: "That date does not exist." };
      return { patch: { closeDate: value } };
    }
    case "initiativeId":
      return allowed.initiatives.has(value)
        ? { patch: { initiativeId: value } }
        : { patch: {}, error: "Not an initiative on this account." };
    case "ownerUserId":
      return allowed.owners.has(value)
        ? { patch: { ownerUserId: value } }
        : { patch: {}, error: "Not a user on this account." };
  }
}

/**
 * Commit one cell.
 *
 * `prospectSourced` is a parameter rather than a constant because of the close date. Every other
 * field a rep edits is ours by definition — we set the amount, we move the stage — but a close
 * date is either one the prospect gave us or one we invented, and that single boolean is what
 * "All three moves made by us" and the Forecast Room's slipping panel are reads over. A grid that
 * wrote `false` for it would be the easiest place in the product to do all your date editing, and
 * the slippage argument would quietly become unreproducible.
 */
export async function commitGridEdit(
  tenantId: string,
  input: {
    readonly opportunityId: string;
    readonly patch: Record<string, unknown>;
    readonly prospectSourced: boolean;
  },
  actor: { userId: string; name: string },
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) =>
    updateForwardOpportunity(tx, tenantId, {
      id: input.opportunityId,
      patch: input.patch,
      prospectSourced: input.prospectSourced,
      actor,
      occurredAt: demoClock().now(),
    }),
  );
}

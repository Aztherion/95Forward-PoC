import type {
  GridEditableField,
  GridRow,
  MetricsOverrides,
  SnapshotOpportunity,
} from "@95forward/shared";
import { formatCurrencyFromCents } from "@/lib/format";
import { shortDate } from "./grid-copy";

/**
 * The what-if sandbox's entire write path: pure functions over a plain object.
 *
 * THIS MODULE IS THE GUARANTEE. It imports no server action, no repository, no `fetch`, and
 * nothing from `@/server` at all — so there is no code here that could reach the database, and
 * `no-write-path.test.ts` asserts that by reading the source rather than by driving the UI. A
 * behavioural test can only sample the states it happens to drive; a source check cannot miss one.
 *
 * The alternative — a runtime `if (whatIf) return` inside a component that still imports
 * `editGridCellAction` — would make the guarantee procedural, and one refactor away from being
 * wrong. Same reasoning as I28's drafted actions, where "never auto-send" holds because no send
 * integration exists at all.
 */

type FieldPatch = Partial<Omit<SnapshotOpportunity, "id">>;

export interface PendingState {
  /** Hypothetical field values, by opportunity id. */
  readonly patches: Readonly<Record<string, FieldPatch>>;
  /** Hypothetical confirmed-milestone sets, by opportunity id. Replaces the real one. */
  readonly milestones: Readonly<Record<string, readonly string[]>>;
  /** `opportunityId:field` → what the record actually says, as the cell rendered it. */
  readonly baseline: Readonly<Record<string, string>>;
}

export const EMPTY_PENDING: PendingState = { patches: {}, milestones: {}, baseline: {} };

/** The grid speaks display strings; the snapshot speaks typed values. */
function toSnapshotValue(field: GridEditableField, value: string): unknown {
  switch (field) {
    case "amountCents":
      return Math.round(Number(value.replace(/[$,\s]/g, "")) * 100);
    case "closeDate":
      return value === "" ? null : value;
    case "visitRating":
      return value === "" ? null : value;
    default:
      return value;
  }
}

/** What the record says today, as the cell renders it — for the struck-through comparison. */
export function baselineDisplay(row: GridRow, field: GridEditableField, today: string): string {
  switch (field) {
    case "amountCents":
      return formatCurrencyFromCents(row.amountCents);
    case "closeDate":
      return shortDate(row.closeDate, today);
    case "visitRating":
      return row.visitRating ?? "—";
    case "initiativeId":
      return row.initiativeName;
    case "ownerUserId":
      return row.ownerName;
    case "stage":
      return row.stage;
    case "probability":
      return row.probability;
    case "dateConfidence":
      return row.dateConfidence;
  }
}

/** Record a hypothetical cell edit. Nothing leaves this function but a new object. */
export function applyCellEdit(
  pending: PendingState,
  row: GridRow,
  field: GridEditableField,
  value: string,
  today: string,
): PendingState {
  const key = `${row.opportunityId}:${field}`;
  return {
    ...pending,
    patches: {
      ...pending.patches,
      [row.opportunityId]: {
        ...(pending.patches[row.opportunityId] ?? {}),
        [field]: toSnapshotValue(field, value),
      } as FieldPatch,
    },
    baseline: {
      ...pending.baseline,
      // The FIRST baseline wins: edit a cell three times and the comparison is still against the
      // record, not against your own previous guess.
      [key]: pending.baseline[key] ?? baselineDisplay(row, field, today),
    },
  };
}

/**
 * Toggle one milestone, hypothetically.
 *
 * The highest-value what-if in the product: qualification IS the thesis, and "what if we
 * qualified these three" is the question the whole methodology asks. The patch replaces the
 * confirmed SET and lets `computeQualification` decide, which is the shape `coverageWith` already
 * uses on Opportunity Detail rather than a second definition of qualified.
 */
export function toggleMilestone(
  pending: PendingState,
  row: GridRow,
  milestoneKey: string,
): PendingState {
  const confirmedNow =
    pending.milestones[row.opportunityId] ??
    row.milestones.filter((m) => m.confirmed).map((m) => m.key);
  const next = confirmedNow.includes(milestoneKey)
    ? confirmedNow.filter((k) => k !== milestoneKey)
    : [...confirmedNow, milestoneKey];
  return {
    ...pending,
    milestones: { ...pending.milestones, [row.opportunityId]: next },
  };
}

export function pendingCount(pending: PendingState): number {
  return new Set([...Object.keys(pending.patches), ...Object.keys(pending.milestones)]).size;
}

export function toOverrides(pending: PendingState): MetricsOverrides {
  return {
    opportunityPatches: pending.patches as MetricsOverrides["opportunityPatches"],
    milestonePatches: pending.milestones,
  };
}

/** The cells the UI should mark as changed. */
export function changedCellKeys(pending: PendingState): Set<string> {
  return new Set(Object.keys(pending.baseline));
}

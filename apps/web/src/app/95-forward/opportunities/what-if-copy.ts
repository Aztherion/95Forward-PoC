import type { GridRow } from "@95forward/shared";
import { shortDate } from "./grid-copy";

export const PRESET_IDS = ["slip-a-quarter", "qualify-best-only", "lose-the-largest"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export function isPresetId(value: string): value is PresetId {
  return (PRESET_IDS as readonly string[]).includes(value);
}

export interface Preset {
  readonly id: PresetId;
  readonly label: string;
  readonly detail: string;
}

/**
 * The obvious explorations, one click each.
 *
 * Cheap to build and they are the demo moments — the questions somebody asks in the first minute
 * of seeing the sandbox, which is exactly when fumbling with individual cells loses the room.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: "slip-a-quarter",
    label: "Slip everything a quarter",
    detail: "Push every open close date out three months.",
  },
  {
    id: "qualify-best-only",
    label: "Qualify the best-only asks",
    detail: "Confirm every blocking milestone on the deals the simulation only sees in Best.",
  },
  {
    id: "lose-the-largest",
    label: "Lose the largest deal",
    detail: "Take the biggest open ask off the table entirely.",
  },
];

/** `2026-10-31` + 3 months, clamped to a valid day. */
export function slipQuarter(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const target = new Date(Date.UTC(y, m - 1 + 3, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The shape a preset transforms. Structurally the same as `PendingState`, declared here so the
 * preset logic stays pure and testable without importing the component's module.
 */
export interface PendingLike {
  readonly patches: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly milestones: Readonly<Record<string, readonly string[]>>;
  readonly baseline: Readonly<Record<string, string>>;
}

/**
 * Apply a preset on top of whatever is already pending.
 *
 * Additive rather than replacing: a user who has slipped a quarter and then wants to see what
 * qualifying the best-only asks does on top of that is asking a real question, and a preset that
 * silently cleared their work would be answering a different one.
 */
export function applyPreset<T extends PendingLike>(
  id: PresetId,
  rows: readonly GridRow[],
  current: T,
  /** Today, so a recorded baseline reads the way the cell rendered it rather than as raw ISO. */
  today: string,
): T {
  const open = rows.filter((r) => r.status === "open" && r.preClose);

  if (id === "slip-a-quarter") {
    const patches: Record<string, Record<string, unknown>> = { ...current.patches };
    const baseline: Record<string, string> = { ...current.baseline };
    for (const row of open) {
      if (!row.closeDate) continue;
      patches[row.opportunityId] = {
        ...(patches[row.opportunityId] ?? {}),
        closeDate: slipQuarter(row.closeDate),
      };
      const key = `${row.opportunityId}:closeDate`;
      baseline[key] = baseline[key] ?? shortDate(row.closeDate, today);
    }
    return { ...current, patches, baseline };
  }

  if (id === "qualify-best-only") {
    const milestones: Record<string, readonly string[]> = { ...current.milestones };
    const baseline: Record<string, string> = { ...current.baseline };
    for (const row of open) {
      if (row.membership !== "BEST_ONLY") continue;
      // Confirm every blocking key and let computeQualification decide — the same shape
      // `coverageWith` uses on Opportunity Detail, rather than a second definition of qualified.
      const blocking = row.milestones.filter((m) => m.blocking).map((m) => m.key);
      const already = row.milestones.filter((m) => m.confirmed).map((m) => m.key);
      milestones[row.opportunityId] = [...new Set([...already, ...blocking])];
      baseline[`${row.opportunityId}:milestones`] =
        `${row.qualification.blockingConfirmed}/${row.qualification.blockingTotal}`;
    }
    return { ...current, milestones, baseline };
  }

  // lose-the-largest
  const largest = [...open].sort((a, b) => b.amountCents - a.amountCents)[0];
  if (!largest) return current;
  return {
    ...current,
    patches: {
      ...current.patches,
      // Status rather than exclusion: "lost" is a real state the model has, and it keeps the row
      // on screen so you can see WHICH deal the curve just lost.
      [largest.opportunityId]: {
        ...(current.patches[largest.opportunityId] ?? {}),
        status: "lost",
      },
    },
    baseline: { ...current.baseline, [`${largest.opportunityId}:status`]: "open" },
  };
}

/**
 * `12 changes pending · 4 outside this view`.
 *
 * The second half is not decoration. Overrides are scope-independent — a change made under one
 * initiative keeps affecting the year when you widen the lens — and a change you cannot see but
 * which is moving the numbers you can is the worst state this feature could produce.
 */
export function pendingSummary(total: number, outOfView: number): string {
  if (total === 0) return "No changes yet — edit a cell or pick a preset";
  const head = `${total} ${total === 1 ? "change" : "changes"} pending`;
  return outOfView > 0 ? `${head} · ${outOfView} outside this view` : head;
}

/** `+$120,000` / `−$40,000` / `no change`. The sign is the whole message. */
export function deltaText(cents: number | null, format: (c: number) => string): string {
  if (cents === null) return "—";
  if (cents === 0) return "no change";
  return `${cents > 0 ? "+" : "−"}${format(Math.abs(cents))}`;
}

export function deltaTone(cents: number | null): "up" | "down" | "flat" {
  if (cents === null || cents === 0) return "flat";
  return cents > 0 ? "up" : "down";
}

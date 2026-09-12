// 95 Forward — the opportunity event log (Initiative 18).
//
// This looks like a display feature. It is not. Slippage flags, silence duration, the movement
// timeline and both Forecast Room movement panels are READS OVER THIS LOG. It is nearly free to add
// with the model and expensive to retrofit — without it those features cannot exist until months of
// real usage accumulate.
//
// Pure module: the shapes and the derivations live here so they are testable without a database.

import type { ForwardStage } from "./forward";

export const OPPORTUNITY_EVENT_TYPES = [
  "field_change",
  "contact_logged",
  "milestone_confirmed",
  "stage_change",
  "note",
] as const;

export type OpportunityEventType = (typeof OPPORTUNITY_EVENT_TYPES)[number];

/**
 * The fields whose changes are recorded. `stage` is tracked but emitted as `stage_change` rather
 * than `field_change` so the timeline can treat it distinctly.
 */
export const TRACKED_OPPORTUNITY_FIELDS = [
  "initiativeId",
  "amountCents",
  "amountNote",
  "closeDate",
  "dateConfidence",
  "stage",
  "probability",
  "visitRating",
  "ownerUserId",
  "status",
] as const;

export type TrackedOpportunityField = (typeof TRACKED_OPPORTUNITY_FIELDS)[number];

export interface OpportunityEventInput {
  readonly eventType: OpportunityEventType;
  readonly field: string | null;
  readonly oldValue: string | null;
  readonly newValue: string | null;
  /**
   * Was the prospect the source of this change?
   *
   * This single boolean is what makes "Dana Reese · no prospect input" and "All three moves made by
   * us" possible. It is the difference between a date the prospect gave you and a date you invented,
   * which is the entire slippage argument.
   */
  readonly prospectSourced: boolean;
  readonly note?: string | null;
}

/** Serialise a tracked value to the log's text representation. */
export function serialiseEventValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}

export type TrackedOpportunityValues = Partial<Record<TrackedOpportunityField, unknown>>;

/**
 * Diff a single write. This is write-path capture, not snapshot reconstruction: each call to the
 * repository produces its own events, so an opportunity updated twice between reads yields two sets
 * of events rather than one collapsed diff.
 */
export function diffOpportunityFields(
  before: TrackedOpportunityValues,
  after: TrackedOpportunityValues,
  prospectSourced: boolean,
): OpportunityEventInput[] {
  const events: OpportunityEventInput[] = [];
  for (const field of TRACKED_OPPORTUNITY_FIELDS) {
    if (!(field in after)) continue;
    const oldValue = serialiseEventValue(before[field]);
    const newValue = serialiseEventValue(after[field]);
    if (oldValue === newValue) continue;
    events.push({
      eventType: field === "stage" ? "stage_change" : "field_change",
      field,
      oldValue,
      newValue,
      prospectSourced,
    });
  }
  return events;
}

// ---------------------------------------------------------------------------------------------
// Derived reads (per-opportunity; portfolio aggregation is I19)
// ---------------------------------------------------------------------------------------------

/** The minimal event shape the derivations need — satisfied by a row from the event log table. */
export interface OpportunityEventLike {
  readonly eventType: OpportunityEventType;
  readonly field: string | null;
  readonly oldValue: string | null;
  readonly newValue: string | null;
  readonly prospectSourced: boolean;
  readonly occurredAt: Date;
  readonly actorUserId?: string | null;
  readonly actorName?: string | null;
  readonly note?: string | null;
}

export interface CloseDateChange {
  readonly from: string | null;
  readonly to: string | null;
  readonly occurredAt: Date;
  readonly prospectSourced: boolean;
  readonly actorName: string | null;
  readonly daysMoved: number;
}

export interface CloseDateChainResult {
  readonly changes: readonly CloseDateChange[];
  readonly count: number;
  /** Net days the close date has moved across the whole chain. Positive = pushed later. */
  readonly totalDaysMoved: number;
  /** False when every move was ours — the "a date we invent is not a date" case. */
  readonly anyProspectSourced: boolean;
  /** The ordered date chain for the monospace display, e.g. Jul 29 -> Aug 31 -> Sep 30 -> Oct 31. */
  readonly chain: readonly string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayDelta(from: string | null, to: string | null): number {
  if (!from || !to) return 0;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / DAY_MS);
}

export function closeDateChanges(events: readonly OpportunityEventLike[]): CloseDateChainResult {
  const changes = events
    .filter((e) => e.field === "closeDate")
    .slice()
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
    .map((e) => ({
      from: e.oldValue,
      to: e.newValue,
      occurredAt: e.occurredAt,
      prospectSourced: e.prospectSourced,
      actorName: e.actorName ?? null,
      daysMoved: dayDelta(e.oldValue, e.newValue),
    }));

  const chain: string[] = [];
  for (const [index, change] of changes.entries()) {
    if (index === 0 && change.from) chain.push(change.from);
    if (change.to) chain.push(change.to);
  }

  return {
    changes,
    count: changes.length,
    totalDaysMoved: changes.reduce((sum, c) => sum + c.daysMoved, 0),
    anyProspectSourced: changes.some((c) => c.prospectSourced),
    chain,
  };
}

/**
 * Days since the last logged contact.
 *
 * `now` is injected rather than read from the clock so the seed's fixed demo anchor and the app's
 * real clock can both drive it — see DEMO_TODAY in @95forward/db.
 */
export function silenceDays(lastContactAt: Date | null | undefined, now: Date): number | null {
  if (!lastContactAt) return null;
  return Math.max(0, Math.floor((now.getTime() - lastContactAt.getTime()) / DAY_MS));
}

/** The last contact_logged event, which is what silenceDays measures from. */
export function lastContactAt(events: readonly OpportunityEventLike[]): Date | null {
  const contacts = events
    .filter((e) => e.eventType === "contact_logged")
    .map((e) => e.occurredAt)
    .sort((a, b) => b.getTime() - a.getTime());
  return contacts[0] ?? null;
}

/** The ordered event list for the detail screen's Movement panel — newest first. */
export function movementTimeline(
  events: readonly OpportunityEventLike[],
): readonly OpportunityEventLike[] {
  return events.slice().sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

/** Convenience for the stage_change subset, used by the board's "not yet qualified" copy. */
export function stageChanges(
  events: readonly OpportunityEventLike[],
): readonly OpportunityEventLike[] {
  return events
    .filter((e) => e.eventType === "stage_change")
    .slice()
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

export function currentStageFromEvents(
  events: readonly OpportunityEventLike[],
): ForwardStage | null {
  const changes = stageChanges(events);
  const last = changes[changes.length - 1];
  return (last?.newValue as ForwardStage | undefined) ?? null;
}

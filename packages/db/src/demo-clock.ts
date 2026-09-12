/**
 * The demo's fixed "today".
 *
 * The war-room designs compute their headline figures against a specific date in mid-September:
 * "81 days idle", "week 38 of 52", and a set of absolute close dates. Seeding relative to
 * `new Date()` (as the pre-I18 seeds do) makes those figures drift every time the seed runs, so the
 * built screens stop being comparable to the screenshots.
 *
 * 2026-09-12 is not arbitrary — it is pinned by the design's own arithmetic: Hallworth's last
 * contact is 23 June and the board reads "no contact for 81 days". 23 June + 81 days = 12 September.
 *
 * Anchored at midday UTC for the same reason `marketing-format.ts` does: a calendar day rendered
 * with `timeZone: "UTC"` then displays as the same date regardless of where the server sits.
 *
 * CONTRACT: this constant drives the SEED. Derived reads (`silenceDays`, close-date chains) take
 * `now` as an injected parameter and default to the real clock, so a later initiative can decide
 * per-surface whether the demo should be frozen or should track real time. Pass DEMO_TODAY when you
 * want the screenshots to reproduce.
 */
export const DEMO_TODAY = new Date("2026-09-12T12:00:00.000Z");

const DAY_MS = 24 * 60 * 60 * 1000;

/** A timestamp `days` before the demo anchor. */
export function daysBeforeAnchor(days: number, anchor: Date = DEMO_TODAY): Date {
  return new Date(anchor.getTime() - days * DAY_MS);
}

/** A timestamp `days` after the demo anchor. */
export function daysAfterAnchor(days: number, anchor: Date = DEMO_TODAY): Date {
  return new Date(anchor.getTime() + days * DAY_MS);
}

/** A `YYYY-MM-DD` calendar day offset from the anchor, for `date` columns. */
export function anchorDateOffset(days: number, anchor: Date = DEMO_TODAY): string {
  return new Date(anchor.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

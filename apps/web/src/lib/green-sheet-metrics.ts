export type GreenSheetScope = "me" | "team";

export interface OutcomeSplit {
  commitment: number;
  roadmap: number;
  decline: number;
}

export interface HorizonPipeline {
  today: number;
  tomorrow: number;
  forever: number;
}

export function weekStart(reference: Date): Date {
  const d = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  // ISO week starts Monday; getUTCDay() is 0 (Sun)..6 (Sat).
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

export function monthStart(reference: Date): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
}

// The SLA we care about: of the follow-ups that have come due, how many were completed. 100% when
// none have come due yet (nothing to be late on), so the metric reads as a clean slate, not 0%.
export function compliancePct(dueCount: number, completedOnTime: number): number {
  if (dueCount === 0) return 100;
  return Math.round((completedOnTime / dueCount) * 100);
}

export function coveragePct(covered: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((covered / total) * 100);
}

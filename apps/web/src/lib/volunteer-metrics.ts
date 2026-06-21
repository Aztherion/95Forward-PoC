export interface VolunteerHoursEntry {
  constituentId: string;
  opportunityId: string;
  hours: number;
}

export interface VolunteerRollup {
  key: string;
  hours: number;
}

export function totalHours(entries: readonly { hours: number }[]): number {
  return entries.reduce((sum, entry) => sum + entry.hours, 0);
}

export function rollUpByVolunteer(entries: readonly VolunteerHoursEntry[]): VolunteerRollup[] {
  return rollUp(entries, (entry) => entry.constituentId);
}

export function rollUpByOpportunity(entries: readonly VolunteerHoursEntry[]): VolunteerRollup[] {
  return rollUp(entries, (entry) => entry.opportunityId);
}

function rollUp(
  entries: readonly VolunteerHoursEntry[],
  keyOf: (entry: VolunteerHoursEntry) => string,
): VolunteerRollup[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = keyOf(entry);
    totals.set(key, (totals.get(key) ?? 0) + entry.hours);
  }
  return Array.from(totals, ([key, hours]) => ({ key, hours }));
}

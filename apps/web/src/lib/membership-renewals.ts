export type RenewalClassification = "upcoming" | "lapsed" | "current" | "none";

const UPCOMING_WINDOW_DAYS = 60;

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function classifyRenewal(
  renewalDate: string | null | undefined,
  status: string | null | undefined,
  today: string,
): RenewalClassification {
  if (status === "lapsed") return "lapsed";
  if (status === "cancelled") return "none";
  if (!renewalDate) return "none";

  if (renewalDate < today) {
    return "lapsed";
  }

  const windowEnd = addDaysIso(today, UPCOMING_WINDOW_DAYS);
  if (status === "active" && renewalDate <= windowEnd) {
    return "upcoming";
  }

  return "current";
}

export function nextRenewalDate(renewalDate: string | null | undefined, today?: string): string {
  const base = renewalDate ?? today;
  if (!base) {
    throw new Error("nextRenewalDate requires a renewal date or today's date");
  }
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

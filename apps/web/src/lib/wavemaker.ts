export interface RecurringGiftLike {
  amountCents: number;
  giftDate: string;
}

export interface WavemakerTenure {
  monthlyAmountCents: number;
  tenureMonths: number;
  totalGivenCents: number;
  recurringGiftCount: number;
}

function monthsBetween(earliestIso: string, today: string): number {
  const earliest = new Date(`${earliestIso}T00:00:00Z`);
  const now = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(earliest.getTime()) || Number.isNaN(now.getTime())) return 0;
  const months =
    (now.getUTCFullYear() - earliest.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - earliest.getUTCMonth());
  return Math.max(0, months);
}

export function summarizeWavemaker(
  gifts: readonly RecurringGiftLike[],
  today: string,
): WavemakerTenure {
  if (gifts.length === 0) {
    return {
      monthlyAmountCents: 0,
      tenureMonths: 0,
      totalGivenCents: 0,
      recurringGiftCount: 0,
    };
  }

  let mostRecent = gifts[0]!;
  let earliest = gifts[0]!;
  let totalGivenCents = 0;

  for (const gift of gifts) {
    totalGivenCents += gift.amountCents;
    if (gift.giftDate > mostRecent.giftDate) mostRecent = gift;
    if (gift.giftDate < earliest.giftDate) earliest = gift;
  }

  return {
    monthlyAmountCents: mostRecent.amountCents,
    tenureMonths: monthsBetween(earliest.giftDate, today),
    totalGivenCents,
    recurringGiftCount: gifts.length,
  };
}

export function formatTenure(tenureMonths: number): string {
  if (tenureMonths <= 0) return "New this month";
  const years = Math.floor(tenureMonths / 12);
  const months = tenureMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(years === 1 ? "1 year" : `${years} years`);
  if (months > 0) parts.push(months === 1 ? "1 month" : `${months} months`);
  return parts.join(", ");
}

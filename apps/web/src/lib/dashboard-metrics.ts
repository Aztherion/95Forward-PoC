export const MAJOR_GIFT_LIKELIHOOD_THRESHOLD = 70;

export interface MonthBucket {
  key: string;
  label: string;
  year: number;
  month: number;
}

export interface MonthlyTotal extends MonthBucket {
  amountCents: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function recentMonthBuckets(reference: Date, count: number): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const baseYear = reference.getUTCFullYear();
  const baseMonth = reference.getUTCMonth();
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(baseYear, baseMonth - offset, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    buckets.push({
      key: `${year}-${pad2(month + 1)}`,
      label: MONTH_LABELS[month]!,
      year,
      month: month + 1,
    });
  }
  return buckets;
}

export function bucketGiftsByMonth(
  reference: Date,
  count: number,
  gifts: readonly { giftDate: string; amountCents: number }[],
): MonthlyTotal[] {
  const buckets = recentMonthBuckets(reference, count);
  const totals = new Map<string, number>();
  for (const bucket of buckets) totals.set(bucket.key, 0);
  for (const gift of gifts) {
    const key = gift.giftDate.slice(0, 7);
    if (totals.has(key)) {
      totals.set(key, totals.get(key)! + gift.amountCents);
    }
  }
  return buckets.map((bucket) => ({
    ...bucket,
    amountCents: totals.get(bucket.key) ?? 0,
  }));
}

export function maxMonthlyTotal(months: readonly MonthlyTotal[]): number {
  let max = 0;
  for (const month of months) {
    if (month.amountCents > max) max = month.amountCents;
  }
  return max;
}

export function barHeightPercent(amountCents: number, maxCents: number): number {
  if (maxCents <= 0) return 0;
  const ratio = amountCents / maxCents;
  const percent = Math.round(ratio * 100);
  if (percent < 0) return 0;
  if (percent > 100) return 100;
  return percent;
}

export function yearStartIso(reference: Date): string {
  return `${reference.getUTCFullYear()}-01-01`;
}

export function formatCurrencyFromCents(amountCents: number | null | undefined): string {
  if (amountCents === null || amountCents === undefined) return "—";
  const dollars = amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export interface GiftLike {
  amountCents: number;
  giftDate: string;
}

export function lifetimeGivingCents(gifts: readonly GiftLike[]): number {
  return gifts.reduce((sum, gift) => sum + gift.amountCents, 0);
}

export function lastGift(gifts: readonly GiftLike[]): GiftLike | null {
  let latest: GiftLike | null = null;
  for (const gift of gifts) {
    if (latest === null || gift.giftDate > latest.giftDate) {
      latest = gift;
    }
  }
  return latest;
}

export interface DatedLike {
  occurredAt: string | Date;
}

export function latestInteractionDate(interactions: readonly DatedLike[]): Date | null {
  let latest: Date | null = null;
  for (const interaction of interactions) {
    const date =
      interaction.occurredAt instanceof Date
        ? interaction.occurredAt
        : new Date(interaction.occurredAt);
    if (Number.isNaN(date.getTime())) continue;
    if (latest === null || date > latest) latest = date;
  }
  return latest;
}

export function titleCaseFromSnake(value: string): string {
  return value
    .split("_")
    .map((part) => (part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join(" ");
}

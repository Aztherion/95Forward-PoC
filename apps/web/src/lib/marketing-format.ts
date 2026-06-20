import { MARKETING_CHANNELS, MARKETING_STATUSES } from "@95forward/shared";

export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];
export type MarketingStatus = (typeof MARKETING_STATUSES)[number];

export function isMarketingChannel(value: string | null | undefined): value is MarketingChannel {
  return value != null && (MARKETING_CHANNELS as readonly string[]).includes(value);
}

export function isMarketingStatus(value: string | null | undefined): value is MarketingStatus {
  return value != null && (MARKETING_STATUSES as readonly string[]).includes(value);
}

export function normalizeStatus(value: string | null | undefined): MarketingStatus {
  return isMarketingStatus(value) ? value : "draft";
}

// Anchor the calendar day to midday UTC so it displays the same date regardless of server timezone.
export function scheduledDateToTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function timestampToScheduledDate(value: Date | null | undefined): string {
  if (!value) return "";
  const time = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(time.getTime())) return "";
  return time.toISOString().slice(0, 10);
}

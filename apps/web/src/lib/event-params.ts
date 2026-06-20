import { EVENT_TYPES } from "@95forward/shared";
import type { RawSearchParams } from "./list-params";

export const EVENTS_PAGE_SIZE = 25;

export interface EventListParams {
  search: string;
  eventType: (typeof EVENT_TYPES)[number] | null;
  page: number;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseEventListParams(raw: RawSearchParams): EventListParams {
  const search = (first(raw.search) ?? "").trim();

  const typeRaw = first(raw.event_type);
  const eventType =
    typeRaw && (EVENT_TYPES as readonly string[]).includes(typeRaw)
      ? (typeRaw as (typeof EVENT_TYPES)[number])
      : null;

  const pageRaw = Number.parseInt(first(raw.page) ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return { search, eventType, page };
}

export function eventParamsToSearch(params: Partial<EventListParams>): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.eventType) sp.set("event_type", params.eventType);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  return sp;
}

export function hasActiveEventFilters(params: EventListParams): boolean {
  return Boolean(params.search || params.eventType);
}

// Anchor date-only input at midday UTC so the timestamptz column never drifts a day.
export function dateInputToTimestamp(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

export function timestampToDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

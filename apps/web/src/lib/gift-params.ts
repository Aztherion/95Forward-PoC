import { GIFT_TYPES, RECEIPT_STATUSES, type SavedListDefinition } from "@95forward/shared";
import type { RawSearchParams } from "./list-params";

export const GIFT_SORT_FIELDS = [
  "giftDate",
  "amount",
  "donor",
  "fund",
  "campaign",
  "appeal",
  "giftType",
  "receiptStatus",
] as const;

export type GiftSortField = (typeof GIFT_SORT_FIELDS)[number];

export const GIFTS_PAGE_SIZE = 25;

export interface GiftListParams {
  search: string;
  giftType: (typeof GIFT_TYPES)[number] | null;
  fundId: string | null;
  campaignId: string | null;
  appealId: string | null;
  receiptStatus: (typeof RECEIPT_STATUSES)[number] | null;
  from: string | null;
  to: string | null;
  sort: GiftSortField;
  dir: "asc" | "desc";
  page: number;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseGiftListParams(raw: RawSearchParams): GiftListParams {
  const search = (first(raw.search) ?? "").trim();

  const giftTypeRaw = first(raw.gift_type);
  const giftType =
    giftTypeRaw && (GIFT_TYPES as readonly string[]).includes(giftTypeRaw)
      ? (giftTypeRaw as (typeof GIFT_TYPES)[number])
      : null;

  const fundRaw = first(raw.fund);
  const fundId = fundRaw && isUuid(fundRaw) ? fundRaw : null;

  const campaignRaw = first(raw.campaign);
  const campaignId = campaignRaw && isUuid(campaignRaw) ? campaignRaw : null;

  const appealRaw = first(raw.appeal);
  const appealId = appealRaw && isUuid(appealRaw) ? appealRaw : null;

  const receiptRaw = first(raw.receipt);
  const receiptStatus =
    receiptRaw && (RECEIPT_STATUSES as readonly string[]).includes(receiptRaw)
      ? (receiptRaw as (typeof RECEIPT_STATUSES)[number])
      : null;

  const fromRaw = first(raw.from);
  const from = fromRaw && isIsoDate(fromRaw) ? fromRaw : null;

  const toRaw = first(raw.to);
  const to = toRaw && isIsoDate(toRaw) ? toRaw : null;

  const sortRaw = first(raw.sort);
  const isExplicitSort = (GIFT_SORT_FIELDS as readonly string[]).includes(sortRaw ?? "");
  const sort = isExplicitSort ? (sortRaw as GiftSortField) : "giftDate";

  const dirRaw = first(raw.dir);
  const defaultDir: "asc" | "desc" = isExplicitSort && sort !== "giftDate" ? "asc" : "desc";
  const dir: "asc" | "desc" = dirRaw === "asc" ? "asc" : dirRaw === "desc" ? "desc" : defaultDir;

  const pageRaw = Number.parseInt(first(raw.page) ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return {
    search,
    giftType,
    fundId,
    campaignId,
    appealId,
    receiptStatus,
    from,
    to,
    sort,
    dir,
    page,
  };
}

export function giftParamsToSearch(params: Partial<GiftListParams>): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.giftType) sp.set("gift_type", params.giftType);
  if (params.fundId) sp.set("fund", params.fundId);
  if (params.campaignId) sp.set("campaign", params.campaignId);
  if (params.appealId) sp.set("appeal", params.appealId);
  if (params.receiptStatus) sp.set("receipt", params.receiptStatus);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.sort && params.sort !== "giftDate") sp.set("sort", params.sort);
  if (params.dir && params.dir !== "desc") sp.set("dir", params.dir);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  return sp;
}

export function giftParamsToDefinition(params: GiftListParams): SavedListDefinition {
  const filters: SavedListDefinition["filters"] = [];
  if (params.giftType) filters.push({ field: "giftType", operator: "eq", value: params.giftType });
  if (params.fundId) filters.push({ field: "fundId", operator: "eq", value: params.fundId });
  if (params.campaignId)
    filters.push({ field: "campaignId", operator: "eq", value: params.campaignId });
  if (params.appealId) filters.push({ field: "appealId", operator: "eq", value: params.appealId });
  if (params.receiptStatus)
    filters.push({ field: "receiptStatus", operator: "eq", value: params.receiptStatus });
  if (params.from) filters.push({ field: "giftDate", operator: "gte", value: params.from });
  if (params.to) filters.push({ field: "giftDate", operator: "lte", value: params.to });

  return {
    filters,
    search: params.search || undefined,
    sort: { field: params.sort, dir: params.dir },
  };
}

export function definitionToGiftParams(definition: SavedListDefinition): GiftListParams {
  const base: GiftListParams = {
    search: definition.search ?? "",
    giftType: null,
    fundId: null,
    campaignId: null,
    appealId: null,
    receiptStatus: null,
    from: null,
    to: null,
    sort: "giftDate",
    dir: "desc",
    page: 1,
  };

  for (const filter of definition.filters ?? []) {
    if (
      filter.field === "giftType" &&
      typeof filter.value === "string" &&
      (GIFT_TYPES as readonly string[]).includes(filter.value)
    ) {
      base.giftType = filter.value as (typeof GIFT_TYPES)[number];
    }
    if (filter.field === "fundId" && typeof filter.value === "string") base.fundId = filter.value;
    if (filter.field === "campaignId" && typeof filter.value === "string")
      base.campaignId = filter.value;
    if (filter.field === "appealId" && typeof filter.value === "string")
      base.appealId = filter.value;
    if (
      filter.field === "receiptStatus" &&
      typeof filter.value === "string" &&
      (RECEIPT_STATUSES as readonly string[]).includes(filter.value)
    ) {
      base.receiptStatus = filter.value as (typeof RECEIPT_STATUSES)[number];
    }
    if (
      filter.field === "giftDate" &&
      filter.operator === "gte" &&
      typeof filter.value === "string"
    ) {
      base.from = filter.value;
    }
    if (
      filter.field === "giftDate" &&
      filter.operator === "lte" &&
      typeof filter.value === "string"
    ) {
      base.to = filter.value;
    }
  }

  const sortField = definition.sort?.field;
  if (sortField && (GIFT_SORT_FIELDS as readonly string[]).includes(sortField)) {
    base.sort = sortField as GiftSortField;
  }
  if (definition.sort?.dir === "asc" || definition.sort?.dir === "desc") {
    base.dir = definition.sort.dir;
  }

  return base;
}

export function hasActiveGiftFilters(params: GiftListParams): boolean {
  return Boolean(
    params.search ||
    params.giftType ||
    params.fundId ||
    params.campaignId ||
    params.appealId ||
    params.receiptStatus ||
    params.from ||
    params.to,
  );
}

const CENTS_PER_DOLLAR = 100;

export function dollarsToCents(value: string): number | null {
  const trimmed = value.trim().replace(/[$,\s]/g, "");
  if (trimmed === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const dollars = Number.parseFloat(trimmed);
  if (!Number.isFinite(dollars)) return null;
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

export function centsToDollarsInput(amountCents: number): string {
  return (amountCents / CENTS_PER_DOLLAR).toFixed(2);
}

export interface GiftSummary {
  totalRaisedCents: number;
  giftCount: number;
  averageGiftCents: number;
}

export function computeGiftSummary(totalRaisedCents: number, giftCount: number): GiftSummary {
  const safeTotal = Number.isFinite(totalRaisedCents) ? totalRaisedCents : 0;
  const safeCount = Number.isFinite(giftCount) && giftCount > 0 ? giftCount : 0;
  const averageGiftCents = safeCount === 0 ? 0 : Math.round(safeTotal / safeCount);
  return {
    totalRaisedCents: safeTotal,
    giftCount: safeCount,
    averageGiftCents,
  };
}

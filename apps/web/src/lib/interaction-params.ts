import { INTERACTION_TYPES, type SavedListDefinition } from "@95forward/shared";
import type { RawSearchParams } from "./list-params";

export const INTERACTION_SORT_FIELDS = ["occurredAt", "type", "constituent", "owner"] as const;

export type InteractionSortField = (typeof INTERACTION_SORT_FIELDS)[number];

export const INTERACTIONS_PAGE_SIZE = 25;

export interface InteractionListParams {
  search: string;
  type: (typeof INTERACTION_TYPES)[number] | null;
  ownerUserId: string | null;
  constituentId: string | null;
  from: string | null;
  to: string | null;
  sort: InteractionSortField;
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

export function parseInteractionListParams(raw: RawSearchParams): InteractionListParams {
  const search = (first(raw.search) ?? "").trim();

  const typeRaw = first(raw.type);
  const type =
    typeRaw && (INTERACTION_TYPES as readonly string[]).includes(typeRaw)
      ? (typeRaw as (typeof INTERACTION_TYPES)[number])
      : null;

  const ownerRaw = first(raw.owner);
  const ownerUserId = ownerRaw && isUuid(ownerRaw) ? ownerRaw : null;

  const constituentRaw = first(raw.constituent);
  const constituentId = constituentRaw && isUuid(constituentRaw) ? constituentRaw : null;

  const fromRaw = first(raw.from);
  const from = fromRaw && isIsoDate(fromRaw) ? fromRaw : null;

  const toRaw = first(raw.to);
  const to = toRaw && isIsoDate(toRaw) ? toRaw : null;

  const sortRaw = first(raw.sort);
  const sort = (INTERACTION_SORT_FIELDS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as InteractionSortField)
    : "occurredAt";

  const dirRaw = first(raw.dir);
  const dir: "asc" | "desc" = dirRaw === "asc" ? "asc" : "desc";

  const pageRaw = Number.parseInt(first(raw.page) ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return { search, type, ownerUserId, constituentId, from, to, sort, dir, page };
}

export function interactionParamsToSearch(params: Partial<InteractionListParams>): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.type) sp.set("type", params.type);
  if (params.ownerUserId) sp.set("owner", params.ownerUserId);
  if (params.constituentId) sp.set("constituent", params.constituentId);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.sort && params.sort !== "occurredAt") sp.set("sort", params.sort);
  if (params.dir && params.dir !== "desc") sp.set("dir", params.dir);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  return sp;
}

export function hasActiveInteractionFilters(params: InteractionListParams): boolean {
  return Boolean(
    params.search ||
    params.type ||
    params.ownerUserId ||
    params.constituentId ||
    params.from ||
    params.to,
  );
}

export function interactionParamsToDefinition(params: InteractionListParams): SavedListDefinition {
  const filters: SavedListDefinition["filters"] = [];
  if (params.type) filters.push({ field: "type", operator: "eq", value: params.type });
  if (params.ownerUserId)
    filters.push({ field: "ownerUserId", operator: "eq", value: params.ownerUserId });
  if (params.constituentId)
    filters.push({ field: "constituentId", operator: "eq", value: params.constituentId });
  if (params.from) filters.push({ field: "occurredAt", operator: "gte", value: params.from });
  if (params.to) filters.push({ field: "occurredAt", operator: "lte", value: params.to });

  return {
    filters,
    search: params.search || undefined,
    sort: { field: params.sort, dir: params.dir },
  };
}

export function definitionToInteractionParams(
  definition: SavedListDefinition,
): InteractionListParams {
  const base: InteractionListParams = {
    search: definition.search ?? "",
    type: null,
    ownerUserId: null,
    constituentId: null,
    from: null,
    to: null,
    sort: "occurredAt",
    dir: "desc",
    page: 1,
  };

  for (const filter of definition.filters ?? []) {
    if (
      filter.field === "type" &&
      typeof filter.value === "string" &&
      (INTERACTION_TYPES as readonly string[]).includes(filter.value)
    ) {
      base.type = filter.value as (typeof INTERACTION_TYPES)[number];
    }
    if (filter.field === "ownerUserId" && typeof filter.value === "string") {
      base.ownerUserId = filter.value;
    }
    if (filter.field === "constituentId" && typeof filter.value === "string") {
      base.constituentId = filter.value;
    }
    if (
      filter.field === "occurredAt" &&
      filter.operator === "gte" &&
      typeof filter.value === "string"
    ) {
      base.from = filter.value;
    }
    if (
      filter.field === "occurredAt" &&
      filter.operator === "lte" &&
      typeof filter.value === "string"
    ) {
      base.to = filter.value;
    }
  }

  const sortField = definition.sort?.field;
  if (sortField && (INTERACTION_SORT_FIELDS as readonly string[]).includes(sortField)) {
    base.sort = sortField as InteractionSortField;
  }
  if (definition.sort?.dir === "asc" || definition.sort?.dir === "desc") {
    base.dir = definition.sort.dir;
  }

  return base;
}

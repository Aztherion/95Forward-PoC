import {
  CONSTITUENT_PROSPECT_STATUSES,
  CONSTITUENT_TYPES,
  type SavedListDefinition,
} from "@95forward/shared";

export const CONSTITUENT_SORT_FIELDS = [
  "displayName",
  "type",
  "lifetimeGiving",
  "lastGift",
  "lastContact",
  "prospectStatus",
  "city",
  "assignedTo",
] as const;

export type ConstituentSortField = (typeof CONSTITUENT_SORT_FIELDS)[number];

export const CONSTITUENTS_PAGE_SIZE = 25;

export interface ConstituentListParams {
  search: string;
  type: (typeof CONSTITUENT_TYPES)[number] | null;
  status: (typeof CONSTITUENT_PROSPECT_STATUSES)[number] | null;
  assignedUserId: string | null;
  tagId: string | null;
  sort: ConstituentSortField;
  dir: "asc" | "desc";
  page: number;
  showArchived: boolean;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function parseConstituentListParams(raw: RawSearchParams): ConstituentListParams {
  const search = (first(raw.search) ?? "").trim();

  const typeRaw = first(raw.type);
  const type =
    typeRaw && (CONSTITUENT_TYPES as readonly string[]).includes(typeRaw)
      ? (typeRaw as (typeof CONSTITUENT_TYPES)[number])
      : null;

  const statusRaw = first(raw.status);
  const status =
    statusRaw && (CONSTITUENT_PROSPECT_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as (typeof CONSTITUENT_PROSPECT_STATUSES)[number])
      : null;

  const assignedRaw = first(raw.assigned);
  const assignedUserId = assignedRaw && isUuid(assignedRaw) ? assignedRaw : null;

  const tagRaw = first(raw.tag);
  const tagId = tagRaw && isUuid(tagRaw) ? tagRaw : null;

  const sortRaw = first(raw.sort);
  const sort = (CONSTITUENT_SORT_FIELDS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as ConstituentSortField)
    : "displayName";

  const dirRaw = first(raw.dir);
  const dir: "asc" | "desc" = dirRaw === "desc" ? "desc" : "asc";

  const pageRaw = Number.parseInt(first(raw.page) ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const showArchived = first(raw.archived) === "1";

  return { search, type, status, assignedUserId, tagId, sort, dir, page, showArchived };
}

export function constituentParamsToSearch(params: Partial<ConstituentListParams>): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.type) sp.set("type", params.type);
  if (params.status) sp.set("status", params.status);
  if (params.assignedUserId) sp.set("assigned", params.assignedUserId);
  if (params.tagId) sp.set("tag", params.tagId);
  if (params.sort && params.sort !== "displayName") sp.set("sort", params.sort);
  if (params.dir && params.dir !== "asc") sp.set("dir", params.dir);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.showArchived) sp.set("archived", "1");
  return sp;
}

export function constituentParamsToDefinition(params: ConstituentListParams): SavedListDefinition {
  const filters: SavedListDefinition["filters"] = [];
  if (params.type) filters.push({ field: "type", operator: "eq", value: params.type });
  if (params.status)
    filters.push({ field: "prospectStatus", operator: "eq", value: params.status });
  if (params.assignedUserId)
    filters.push({ field: "assignedUserId", operator: "eq", value: params.assignedUserId });
  if (params.tagId) filters.push({ field: "tagId", operator: "eq", value: params.tagId });
  if (params.showArchived) filters.push({ field: "archived", operator: "is_true", value: true });

  return {
    filters,
    search: params.search || undefined,
    sort: { field: params.sort, dir: params.dir },
  };
}

export function definitionToConstituentParams(
  definition: SavedListDefinition,
): ConstituentListParams {
  return parseConstituentListParams(Object.fromEntries(definitionToConstituentSearch(definition)));
}

export function definitionToConstituentSearch(definition: SavedListDefinition): URLSearchParams {
  const sp = new URLSearchParams();
  if (definition.search) sp.set("search", definition.search);
  for (const filter of definition.filters ?? []) {
    if (filter.field === "type" && typeof filter.value === "string") sp.set("type", filter.value);
    if (filter.field === "prospectStatus" && typeof filter.value === "string")
      sp.set("status", filter.value);
    if (filter.field === "assignedUserId" && typeof filter.value === "string")
      sp.set("assigned", filter.value);
    if (filter.field === "tagId" && typeof filter.value === "string") sp.set("tag", filter.value);
    if (filter.field === "archived") sp.set("archived", "1");
  }
  const sortField = definition.sort?.field;
  if (sortField && (CONSTITUENT_SORT_FIELDS as readonly string[]).includes(sortField)) {
    if (sortField !== "displayName") sp.set("sort", sortField);
    if (definition.sort?.dir === "desc") sp.set("dir", "desc");
  }
  return sp;
}

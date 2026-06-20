import {
  CONSTITUENT_PROSPECT_STATUSES,
  CONSTITUENT_TYPES,
  GIFT_TYPES,
  INTERACTION_TYPES,
  RECEIPT_STATUSES,
  type ListFilter,
  type SavedListInput,
} from "@95forward/shared";

export type RecordType = SavedListInput["recordType"];

export type FieldKind = "enum" | "ref" | "date" | "text";

export type FilterOperator = ListFilter["operator"];

export interface StaticOption {
  value: string;
  label: string;
}

export interface FilterFieldDef {
  field: string;
  label: string;
  kind: FieldKind;
  operators: FilterOperator[];
  options?: StaticOption[];
  refSource?: "users" | "tags" | "funds" | "campaigns" | "appeals" | "constituents";
}

function enumOptions(values: readonly string[]): StaticOption[] {
  return values.map((value) => ({
    value,
    label: value
      .split("_")
      .map((part) => (part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
      .join(" "),
  }));
}

const CONSTITUENT_FIELDS: FilterFieldDef[] = [
  {
    field: "type",
    label: "Type",
    kind: "enum",
    operators: ["eq"],
    options: enumOptions(CONSTITUENT_TYPES),
  },
  {
    field: "prospectStatus",
    label: "Prospect status",
    kind: "enum",
    operators: ["eq"],
    options: enumOptions(CONSTITUENT_PROSPECT_STATUSES),
  },
  {
    field: "assignedUserId",
    label: "Assigned to",
    kind: "ref",
    operators: ["eq"],
    refSource: "users",
  },
  {
    field: "tagId",
    label: "Tag",
    kind: "ref",
    operators: ["eq"],
    refSource: "tags",
  },
];

const GIFT_FIELDS: FilterFieldDef[] = [
  {
    field: "giftType",
    label: "Gift type",
    kind: "enum",
    operators: ["eq"],
    options: enumOptions(GIFT_TYPES),
  },
  {
    field: "receiptStatus",
    label: "Receipt status",
    kind: "enum",
    operators: ["eq"],
    options: enumOptions(RECEIPT_STATUSES),
  },
  { field: "fundId", label: "Fund", kind: "ref", operators: ["eq"], refSource: "funds" },
  {
    field: "campaignId",
    label: "Campaign",
    kind: "ref",
    operators: ["eq"],
    refSource: "campaigns",
  },
  { field: "appealId", label: "Appeal", kind: "ref", operators: ["eq"], refSource: "appeals" },
  { field: "giftDate", label: "Gift date", kind: "date", operators: ["gte", "lte"] },
];

const INTERACTION_FIELDS: FilterFieldDef[] = [
  {
    field: "type",
    label: "Action type",
    kind: "enum",
    operators: ["eq"],
    options: enumOptions(INTERACTION_TYPES),
  },
  {
    field: "ownerUserId",
    label: "Owner",
    kind: "ref",
    operators: ["eq"],
    refSource: "users",
  },
  {
    field: "constituentId",
    label: "Constituent",
    kind: "ref",
    operators: ["eq"],
    refSource: "constituents",
  },
  { field: "occurredAt", label: "Date", kind: "date", operators: ["gte", "lte"] },
];

export function filterFieldsFor(recordType: RecordType): FilterFieldDef[] {
  switch (recordType) {
    case "gift":
      return GIFT_FIELDS;
    case "interaction":
      return INTERACTION_FIELDS;
    case "constituent":
    default:
      return CONSTITUENT_FIELDS;
  }
}

export function findFilterField(recordType: RecordType, field: string): FilterFieldDef | undefined {
  return filterFieldsFor(recordType).find((def) => def.field === field);
}

export interface SortOptionDef {
  value: string;
  label: string;
}

const CONSTITUENT_SORT_OPTIONS: SortOptionDef[] = [
  { value: "displayName", label: "Name" },
  { value: "lifetimeGiving", label: "Lifetime giving" },
  { value: "lastGift", label: "Last gift" },
  { value: "lastContact", label: "Last contact" },
  { value: "prospectStatus", label: "Prospect status" },
];

const GIFT_SORT_OPTIONS: SortOptionDef[] = [
  { value: "giftDate", label: "Gift date" },
  { value: "amount", label: "Amount" },
  { value: "donor", label: "Donor" },
  { value: "fund", label: "Fund" },
  { value: "campaign", label: "Campaign" },
];

const INTERACTION_SORT_OPTIONS: SortOptionDef[] = [
  { value: "occurredAt", label: "Date" },
  { value: "type", label: "Type" },
  { value: "constituent", label: "Constituent" },
  { value: "owner", label: "Owner" },
];

export function sortOptionsFor(recordType: RecordType): SortOptionDef[] {
  switch (recordType) {
    case "gift":
      return GIFT_SORT_OPTIONS;
    case "interaction":
      return INTERACTION_SORT_OPTIONS;
    case "constituent":
    default:
      return CONSTITUENT_SORT_OPTIONS;
  }
}

export function validateFilters(recordType: RecordType, filters: ListFilter[]): ListFilter[] {
  const valid: ListFilter[] = [];
  for (const filter of filters) {
    const def = findFilterField(recordType, filter.field);
    if (!def) continue;
    if (!def.operators.includes(filter.operator)) continue;
    if (filter.value === undefined || filter.value === "") continue;
    if (def.kind === "enum") {
      if (
        typeof filter.value !== "string" ||
        !(def.options ?? []).some((option) => option.value === filter.value)
      ) {
        continue;
      }
    }
    if ((def.kind === "ref" || def.kind === "date") && typeof filter.value !== "string") {
      continue;
    }
    valid.push(filter);
  }
  return valid;
}

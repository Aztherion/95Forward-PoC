import { z } from "zod";

// The whitelist of fields a natural-language prospect search may filter on — the single source of
// truth shared by (1) the LLM extraction tool's input_schema (the model can only emit these
// fields/operators/values, which bounds hallucination and injection), (2) the deterministic
// filter→predicate translation in the web data layer, and (3) the interpreted-query chips in the UI.
// A strict discriminated union on `field` means an off-whitelist field cannot parse at all.

export const PROSPECT_TYPES = ["individual", "organization", "foundation"] as const;
export const PROSPECT_STATUSES = [
  "research",
  "cultivation",
  "solicitation",
  "stewardship",
  "active",
] as const;
export const QPI_FILTER_DIMENSIONS = [
  "capacity",
  "relationship",
  "timing",
  "gift_history",
  "philanthropy",
] as const;
export const HORIZONS = ["today", "tomorrow", "forever"] as const;
export const QPI_BANDS = ["go", "strong", "build", "early"] as const;

const typeFilter = z.object({
  field: z.literal("type"),
  op: z.literal("eq"),
  value: z.enum(PROSPECT_TYPES),
});

const statusFilter = z.object({
  field: z.literal("status"),
  op: z.literal("eq"),
  value: z.enum(PROSPECT_STATUSES),
});

const qpiTotalFilter = z.object({
  field: z.literal("qpi_total"),
  op: z.enum(["gt", "gte", "lt", "lte"]),
  value: z.number().int().min(0).max(100),
});

// One variant covers all five QPI dimensions; ratings are 1–5. Fuzzy adjectives are mapped to
// thresholds by the extraction prompt (high/strong → >= 4; low/weak → <= 2), bounded here to 1–5.
const dimensionFilter = z.object({
  field: z.enum(QPI_FILTER_DIMENSIONS),
  op: z.enum(["gte", "lte", "eq"]),
  value: z.number().int().min(1).max(5),
});

// "not contacted in N days" → last_contact_days gt N (never-contacted counts as satisfying it).
const recencyFilter = z.object({
  field: z.literal("last_contact_days"),
  op: z.enum(["gt", "lt"]),
  value: z.number().int().min(1).max(3650),
});

// Horizon is resolved through the prospect↔initiative cultivation join, never a column on prospects.
const horizonFilter = z.object({
  field: z.literal("horizon"),
  op: z.literal("eq"),
  value: z.enum(HORIZONS),
});

const bandFilter = z.object({
  field: z.literal("band"),
  op: z.literal("eq"),
  value: z.enum(QPI_BANDS),
});

// Relationship manager. The literal "me"/"mine" resolves to the current user in the web layer.
const rmFilter = z.object({
  field: z.literal("rm"),
  op: z.literal("eq"),
  value: z.string().min(1),
});

export const SearchFilterSchema = z.discriminatedUnion("field", [
  typeFilter,
  statusFilter,
  qpiTotalFilter,
  dimensionFilter,
  recencyFilter,
  horizonFilter,
  bandFilter,
  rmFilter,
]);

export type SearchFilter = z.infer<typeof SearchFilterSchema>;

export const ExtractionToolInputSchema = z.object({
  filters: z.array(SearchFilterSchema),
  semanticTerms: z.string().nullable(),
});

export type ExtractionToolInput = z.infer<typeof ExtractionToolInputSchema>;

export type SearchMode = "structured" | "semantic" | "hybrid";

export interface QueryInterpretation {
  filters: SearchFilter[];
  semanticTerms: string | null;
  mode: SearchMode;
  fellBack: boolean;
}

const DIMENSION_LABELS: Record<(typeof QPI_FILTER_DIMENSIONS)[number], string> = {
  capacity: "Capacity",
  relationship: "Relationship",
  timing: "Timing",
  gift_history: "Gift history",
  philanthropy: "Philanthropy",
};

const OP_SYMBOLS: Record<string, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "is",
};

export function filterChipLabel(filter: SearchFilter): string {
  switch (filter.field) {
    case "type":
      return `Type is ${filter.value}`;
    case "status":
      return `Stage is ${filter.value}`;
    case "qpi_total":
      return `QPI ${OP_SYMBOLS[filter.op]} ${filter.value}`;
    case "capacity":
    case "relationship":
    case "timing":
    case "gift_history":
    case "philanthropy":
      return `${DIMENSION_LABELS[filter.field]} ${OP_SYMBOLS[filter.op]} ${filter.value}`;
    case "last_contact_days":
      return filter.op === "gt"
        ? `Not contacted in ${filter.value} days`
        : `Contacted within ${filter.value} days`;
    case "horizon":
      return `Horizon is ${filter.value}`;
    case "band":
      return `Band is ${filter.value}`;
    case "rm":
      return filter.value === "me" ? "My prospects" : "Relationship manager";
  }
}

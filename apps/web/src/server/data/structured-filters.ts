import type { QpiResult, SearchFilter } from "@95forward/shared";
import type { ProspectListRow } from "./prospect-types";
import type { FundingFrame } from "./prospect-types";

// The internal row carries the fields the structured-search filters need (rmUserId, lastContactAt,
// horizons) that getProspectsList strips before returning ProspectListRow to feature callers.
export interface EnrichedProspectListRow extends ProspectListRow {
  rmUserId: string | null;
  lastContactAt: Date | null;
  horizons: Set<FundingFrame>;
}

function compareNum(actual: number, op: string, value: number): boolean {
  switch (op) {
    case "gt":
      return actual > value;
    case "gte":
      return actual >= value;
    case "lt":
      return actual < value;
    case "lte":
      return actual <= value;
    case "eq":
      return actual === value;
    default:
      return false;
  }
}

// Deterministic predicate for one validated filter. The LLM never writes SQL; it emits a
// whitelist-bounded {field,op,value} and this code maps it to an in-memory check over the already
// computed prospect row. "me" resolves to the current user; never-contacted counts as not-contacted.
function matchFilter(
  row: EnrichedProspectListRow,
  filter: SearchFilter,
  callerId: string,
): boolean {
  switch (filter.field) {
    case "type":
      return row.type === filter.value;
    case "status":
      return row.status === filter.value;
    case "band":
      return row.qpi.band === filter.value;
    case "qpi_total":
      return compareNum(row.qpi.total, filter.op, filter.value);
    case "capacity":
    case "relationship":
    case "timing":
    case "gift_history":
    case "philanthropy": {
      const dim: QpiResult["dimensions"][number] | undefined = row.qpi.dimensions.find(
        (d) => d.dimension === filter.field,
      );
      if (dim === undefined || dim.isUnknown || dim.rating === null) return false;
      return compareNum(dim.rating, filter.op, filter.value);
    }
    case "last_contact_days": {
      const days =
        row.lastContactAt === null
          ? Number.POSITIVE_INFINITY
          : Math.floor((Date.now() - row.lastContactAt.getTime()) / 86_400_000);
      return compareNum(days, filter.op, filter.value);
    }
    case "horizon":
      return row.horizons.has(filter.value);
    case "rm": {
      const target = filter.value === "me" ? callerId : filter.value;
      return row.rmUserId === target;
    }
  }
}

// AND across all filters (the content spec's filter logic). Pure function over the enriched rows.
export function applyStructuredFilters(
  rows: EnrichedProspectListRow[],
  filters: SearchFilter[],
  callerId: string,
): EnrichedProspectListRow[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) => filters.every((filter) => matchFilter(row, filter, callerId)));
}

import { describe, expect, it } from "vitest";
import type { QpiResult } from "@95forward/shared";
import type { SearchFilter } from "@95forward/shared";
import { applyStructuredFilters, type EnrichedProspectListRow } from "./structured-filters";

function qpi(total: number, dims: Partial<Record<string, number | null>> = {}): QpiResult {
  const dimensions = (
    ["capacity", "relationship", "timing", "gift_history", "philanthropy"] as const
  ).map((dimension) => {
    const rating = dimension in dims ? (dims[dimension] ?? null) : null;
    return {
      dimension,
      weight: 1,
      maxPoints: 5,
      rating,
      isUnknown: rating === null,
      points: rating ?? 0,
      rationale: null,
      source: null,
    };
  });
  const band = total >= 90 ? "go" : total >= 70 ? "strong" : total >= 50 ? "build" : "early";
  return {
    total,
    maxTotal: 100,
    band,
    knownCount: dimensions.filter((d) => !d.isUnknown).length,
    unknownCount: dimensions.filter((d) => d.isUnknown).length,
    dimensions,
  } as QpiResult;
}

const CALLER = "user-dana";

function row(overrides: Partial<EnrichedProspectListRow>): EnrichedProspectListRow {
  return {
    id: "p1",
    rank: 1,
    name: "Test Prospect",
    type: "foundation",
    descriptor: "Foundation · Cultivating",
    qpi: qpi(50),
    rmName: null,
    partnerName: null,
    status: "cultivation",
    cadence: "",
    top33: false,
    openFollowUpDueAt: null,
    visited: false,
    hasAsk: false,
    rmUserId: null,
    lastContactAt: null,
    horizons: new Set(),
    ...overrides,
  };
}

function run(rows: EnrichedProspectListRow[], filters: SearchFilter[]): string[] {
  return applyStructuredFilters(rows, filters, CALLER).map((r) => r.id);
}

describe("applyStructuredFilters / matchFilter", () => {
  it("empty filters returns all rows (pure-semantic / no-op)", () => {
    const rows = [row({ id: "a" }), row({ id: "b" })];
    expect(run(rows, [])).toEqual(["a", "b"]);
  });

  it("qpi_total gt/gte/lt/lte", () => {
    const rows = [row({ id: "lo", qpi: qpi(40) }), row({ id: "hi", qpi: qpi(92) })];
    expect(run(rows, [{ field: "qpi_total", op: "gt", value: 80 }])).toEqual(["hi"]);
    expect(run(rows, [{ field: "qpi_total", op: "lt", value: 50 }])).toEqual(["lo"]);
    expect(run(rows, [{ field: "qpi_total", op: "gte", value: 92 }])).toEqual(["hi"]);
  });

  it("dimension threshold: unknown dimension never matches", () => {
    const rows = [
      row({ id: "cap5", qpi: qpi(80, { capacity: 5 }) }),
      row({ id: "cap3", qpi: qpi(60, { capacity: 3 }) }),
      row({ id: "capUnknown", qpi: qpi(40, {}) }),
    ];
    expect(run(rows, [{ field: "capacity", op: "gte", value: 4 }])).toEqual(["cap5"]);
  });

  it("type / status / band eq", () => {
    const rows = [
      row({ id: "f", type: "foundation" }),
      row({ id: "i", type: "individual" }),
      row({ id: "go", qpi: qpi(95) }),
    ];
    expect(run(rows, [{ field: "type", op: "eq", value: "foundation" }])).toEqual(["f", "go"]);
    expect(run(rows, [{ field: "band", op: "eq", value: "go" }])).toEqual(["go"]);
  });

  it("last_contact_days gt — never-contacted (null) counts as not contacted", () => {
    const recent = new Date(Date.now() - 10 * 86_400_000);
    const old = new Date(Date.now() - 200 * 86_400_000);
    const rows = [
      row({ id: "recent", lastContactAt: recent }),
      row({ id: "old", lastContactAt: old }),
      row({ id: "never", lastContactAt: null }),
    ];
    expect(run(rows, [{ field: "last_contact_days", op: "gt", value: 60 }]).sort()).toEqual([
      "never",
      "old",
    ]);
    expect(run(rows, [{ field: "last_contact_days", op: "lt", value: 60 }])).toEqual(["recent"]);
  });

  it("horizon — OR over multiple cultivation associations", () => {
    const rows = [
      row({ id: "today", horizons: new Set(["today"]) }),
      row({ id: "multi", horizons: new Set(["tomorrow", "today"]) }),
      row({ id: "forever", horizons: new Set(["forever"]) }),
      row({ id: "none", horizons: new Set() }),
    ];
    expect(run(rows, [{ field: "horizon", op: "eq", value: "today" }]).sort()).toEqual([
      "multi",
      "today",
    ]);
  });

  it("rm 'me' resolves to the caller id", () => {
    const rows = [
      row({ id: "mine", rmUserId: CALLER }),
      row({ id: "theirs", rmUserId: "user-priya" }),
    ];
    expect(run(rows, [{ field: "rm", op: "eq", value: "me" }])).toEqual(["mine"]);
    expect(run(rows, [{ field: "rm", op: "eq", value: "user-priya" }])).toEqual(["theirs"]);
  });

  it("multiple filters AND together (foundations with high capacity)", () => {
    const rows = [
      row({ id: "goodFoundation", type: "foundation", qpi: qpi(85, { capacity: 5 }) }),
      row({ id: "lowCapFoundation", type: "foundation", qpi: qpi(50, { capacity: 2 }) }),
      row({ id: "highCapIndividual", type: "individual", qpi: qpi(85, { capacity: 5 }) }),
    ];
    expect(
      run(rows, [
        { field: "type", op: "eq", value: "foundation" },
        { field: "capacity", op: "gte", value: 4 },
      ]),
    ).toEqual(["goodFoundation"]);
  });
});

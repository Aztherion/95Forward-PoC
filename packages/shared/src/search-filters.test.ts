import { describe, expect, it } from "vitest";
import { ExtractionToolInputSchema, SearchFilterSchema, filterChipLabel } from "./search-filters";

describe("SearchFilterSchema — the filterable-field whitelist", () => {
  it("accepts each whitelisted field with a valid operator and value", () => {
    const valid = [
      { field: "type", op: "eq", value: "foundation" },
      { field: "status", op: "eq", value: "cultivation" },
      { field: "qpi_total", op: "gt", value: 80 },
      { field: "capacity", op: "gte", value: 4 },
      { field: "relationship", op: "gte", value: 4 },
      { field: "last_contact_days", op: "gt", value: 60 },
      { field: "horizon", op: "eq", value: "today" },
      { field: "band", op: "eq", value: "go" },
      { field: "rm", op: "eq", value: "me" },
    ];
    for (const f of valid) {
      expect(SearchFilterSchema.safeParse(f).success).toBe(true);
    }
  });

  it("rejects an off-whitelist field", () => {
    expect(
      SearchFilterSchema.safeParse({ field: "annual_income", op: "gt", value: 100 }).success,
    ).toBe(false);
    expect(SearchFilterSchema.safeParse({ field: "ssn", op: "eq", value: "x" }).success).toBe(
      false,
    );
  });

  it("rejects an off-whitelist operator for a field", () => {
    expect(
      SearchFilterSchema.safeParse({ field: "type", op: "gt", value: "foundation" }).success,
    ).toBe(false);
    expect(
      SearchFilterSchema.safeParse({ field: "horizon", op: "lt", value: "today" }).success,
    ).toBe(false);
  });

  it("rejects out-of-range / wrong-type values", () => {
    expect(SearchFilterSchema.safeParse({ field: "capacity", op: "gte", value: 6 }).success).toBe(
      false,
    );
    expect(SearchFilterSchema.safeParse({ field: "capacity", op: "gte", value: 0 }).success).toBe(
      false,
    );
    expect(SearchFilterSchema.safeParse({ field: "qpi_total", op: "gt", value: 200 }).success).toBe(
      false,
    );
    expect(
      SearchFilterSchema.safeParse({ field: "qpi_total", op: "gt", value: 50.5 }).success,
    ).toBe(false);
    expect(SearchFilterSchema.safeParse({ field: "type", op: "eq", value: "robot" }).success).toBe(
      false,
    );
    expect(
      SearchFilterSchema.safeParse({ field: "horizon", op: "eq", value: "yesterday" }).success,
    ).toBe(false);
  });

  it("validates the extraction tool envelope and drops nothing valid", () => {
    const ok = ExtractionToolInputSchema.safeParse({
      filters: [
        { field: "type", op: "eq", value: "foundation" },
        { field: "capacity", op: "gte", value: 4 },
      ],
      semanticTerms: "clean water",
    });
    expect(ok.success).toBe(true);

    const empty = ExtractionToolInputSchema.safeParse({ filters: [], semanticTerms: null });
    expect(empty.success).toBe(true);

    const bad = ExtractionToolInputSchema.safeParse({
      filters: [{ field: "password", op: "eq", value: "x" }],
      semanticTerms: null,
    });
    expect(bad.success).toBe(false);
  });
});

describe("filterChipLabel", () => {
  it("renders human chips for the interpreted-query display", () => {
    expect(filterChipLabel({ field: "qpi_total", op: "gt", value: 80 })).toBe("QPI > 80");
    expect(filterChipLabel({ field: "type", op: "eq", value: "foundation" })).toBe(
      "Type is foundation",
    );
    expect(filterChipLabel({ field: "capacity", op: "gte", value: 4 })).toBe("Capacity ≥ 4");
    expect(filterChipLabel({ field: "last_contact_days", op: "gt", value: 60 })).toBe(
      "Not contacted in 60 days",
    );
    expect(filterChipLabel({ field: "horizon", op: "eq", value: "today" })).toBe(
      "Horizon is today",
    );
    expect(filterChipLabel({ field: "rm", op: "eq", value: "me" })).toBe("My prospects");
  });
});

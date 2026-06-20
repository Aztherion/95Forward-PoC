import { describe, expect, it } from "vitest";
import { filterFieldsFor, findFilterField, sortOptionsFor, validateFilters } from "./list-fields";

describe("filterFieldsFor", () => {
  it("returns distinct catalogs per record type", () => {
    expect(filterFieldsFor("constituent").map((f) => f.field)).toContain("prospectStatus");
    expect(filterFieldsFor("gift").map((f) => f.field)).toContain("giftType");
    expect(filterFieldsFor("interaction").map((f) => f.field)).toContain("ownerUserId");
  });

  it("date fields offer gte and lte operators", () => {
    const giftDate = findFilterField("gift", "giftDate");
    expect(giftDate?.operators).toEqual(["gte", "lte"]);
  });
});

describe("sortOptionsFor", () => {
  it("includes a default newest-first option per type", () => {
    expect(sortOptionsFor("gift")[0]?.value).toBe("giftDate");
    expect(sortOptionsFor("interaction")[0]?.value).toBe("occurredAt");
    expect(sortOptionsFor("constituent")[0]?.value).toBe("displayName");
  });
});

describe("validateFilters", () => {
  it("drops unknown fields", () => {
    const result = validateFilters("gift", [{ field: "ghost", operator: "eq", value: "x" }]);
    expect(result).toHaveLength(0);
  });

  it("drops operators not allowed for the field", () => {
    const result = validateFilters("gift", [
      { field: "giftType", operator: "gte", value: "one_time" },
    ]);
    expect(result).toHaveLength(0);
  });

  it("drops empty values", () => {
    const result = validateFilters("constituent", [
      { field: "type", operator: "eq", value: "" },
      { field: "type", operator: "eq" },
    ]);
    expect(result).toHaveLength(0);
  });

  it("drops enum values outside the option set", () => {
    const result = validateFilters("constituent", [
      { field: "type", operator: "eq", value: "alien" },
    ]);
    expect(result).toHaveLength(0);
  });

  it("keeps valid enum, ref, and date filters", () => {
    const result = validateFilters("gift", [
      { field: "giftType", operator: "eq", value: "recurring" },
      { field: "fundId", operator: "eq", value: "11111111-1111-4111-8111-111111111111" },
      { field: "giftDate", operator: "gte", value: "2025-01-01" },
    ]);
    expect(result).toHaveLength(3);
  });
});

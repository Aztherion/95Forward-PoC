import { describe, expect, it } from "vitest";
import {
  centsToDollarsInput,
  computeGiftSummary,
  definitionToGiftParams,
  dollarsToCents,
  giftParamsToDefinition,
  giftParamsToSearch,
  hasActiveGiftFilters,
  parseGiftListParams,
} from "./gift-params";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("parseGiftListParams", () => {
  it("returns newest-first defaults for empty input", () => {
    const params = parseGiftListParams({});
    expect(params).toEqual({
      search: "",
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
    });
  });

  it("parses and trims valid filters", () => {
    const params = parseGiftListParams({
      search: "  vega ",
      gift_type: "recurring",
      fund: UUID,
      campaign: UUID,
      appeal: UUID,
      receipt: "receipted",
      from: "2025-01-01",
      to: "2025-12-31",
      sort: "amount",
      dir: "asc",
      page: "4",
    });
    expect(params.search).toBe("vega");
    expect(params.giftType).toBe("recurring");
    expect(params.fundId).toBe(UUID);
    expect(params.campaignId).toBe(UUID);
    expect(params.appealId).toBe(UUID);
    expect(params.receiptStatus).toBe("receipted");
    expect(params.from).toBe("2025-01-01");
    expect(params.to).toBe("2025-12-31");
    expect(params.sort).toBe("amount");
    expect(params.dir).toBe("asc");
    expect(params.page).toBe(4);
  });

  it("rejects invalid enum, non-uuid, and malformed date values", () => {
    const params = parseGiftListParams({
      gift_type: "barter",
      fund: "not-a-uuid",
      campaign: "123",
      appeal: "x",
      receipt: "pending",
      from: "01-01-2025",
      to: "yesterday",
      sort: "salary",
      dir: "sideways",
      page: "-9",
    });
    expect(params.giftType).toBeNull();
    expect(params.fundId).toBeNull();
    expect(params.campaignId).toBeNull();
    expect(params.appealId).toBeNull();
    expect(params.receiptStatus).toBeNull();
    expect(params.from).toBeNull();
    expect(params.to).toBeNull();
    expect(params.sort).toBe("giftDate");
    expect(params.dir).toBe("desc");
    expect(params.page).toBe(1);
  });

  it("defaults a known sort to ascending unless dir says otherwise", () => {
    expect(parseGiftListParams({ sort: "donor" }).dir).toBe("asc");
    expect(parseGiftListParams({ sort: "donor", dir: "desc" }).dir).toBe("desc");
  });

  it("takes the first value when arrays are provided", () => {
    const params = parseGiftListParams({ search: ["first", "second"] });
    expect(params.search).toBe("first");
  });
});

describe("giftParamsToSearch", () => {
  it("omits defaults to keep URLs clean", () => {
    const sp = giftParamsToSearch({
      search: "",
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
    });
    expect(sp.toString()).toBe("");
  });

  it("serializes only non-default values", () => {
    const sp = giftParamsToSearch({
      search: "vega",
      giftType: "pledge",
      receiptStatus: "receipted",
      from: "2025-01-01",
      sort: "amount",
      dir: "asc",
      page: 3,
    });
    expect(sp.get("search")).toBe("vega");
    expect(sp.get("gift_type")).toBe("pledge");
    expect(sp.get("receipt")).toBe("receipted");
    expect(sp.get("from")).toBe("2025-01-01");
    expect(sp.get("sort")).toBe("amount");
    expect(sp.get("dir")).toBe("asc");
    expect(sp.get("page")).toBe("3");
  });
});

describe("hasActiveGiftFilters", () => {
  it("is false for bare defaults", () => {
    expect(hasActiveGiftFilters(parseGiftListParams({}))).toBe(false);
  });

  it("is true when any filter is set", () => {
    expect(hasActiveGiftFilters(parseGiftListParams({ receipt: "receipted" }))).toBe(true);
    expect(hasActiveGiftFilters(parseGiftListParams({ search: "vega" }))).toBe(true);
    expect(hasActiveGiftFilters(parseGiftListParams({ from: "2025-01-01" }))).toBe(true);
  });

  it("stays false when only sort and page change", () => {
    expect(hasActiveGiftFilters(parseGiftListParams({ sort: "amount", page: "2" }))).toBe(false);
  });
});

describe("gift definition round-trip", () => {
  it("maps params to a definition and back", () => {
    const params = parseGiftListParams({
      gift_type: "pledge",
      fund: UUID,
      receipt: "receipted",
      from: "2025-01-01",
      to: "2025-12-31",
      sort: "amount",
      dir: "asc",
    });
    const definition = giftParamsToDefinition(params);
    expect(definition.filters).toContainEqual({
      field: "giftType",
      operator: "eq",
      value: "pledge",
    });
    expect(definition.filters).toContainEqual({
      field: "giftDate",
      operator: "gte",
      value: "2025-01-01",
    });

    const restored = definitionToGiftParams(definition);
    expect(restored.giftType).toBe("pledge");
    expect(restored.fundId).toBe(UUID);
    expect(restored.receiptStatus).toBe("receipted");
    expect(restored.from).toBe("2025-01-01");
    expect(restored.to).toBe("2025-12-31");
    expect(restored.sort).toBe("amount");
    expect(restored.dir).toBe("asc");
  });

  it("ignores unknown fields and invalid enum values", () => {
    const restored = definitionToGiftParams({
      filters: [
        { field: "giftType", operator: "eq", value: "barter" },
        { field: "ghost", operator: "eq", value: "x" },
      ],
    });
    expect(restored.giftType).toBeNull();
    expect(restored.sort).toBe("giftDate");
    expect(restored.dir).toBe("desc");
  });
});

describe("dollarsToCents", () => {
  it("converts whole and fractional dollars", () => {
    expect(dollarsToCents("100")).toBe(10000);
    expect(dollarsToCents("100.5")).toBe(10050);
    expect(dollarsToCents("100.55")).toBe(10055);
    expect(dollarsToCents("0.01")).toBe(1);
  });

  it("strips currency formatting", () => {
    expect(dollarsToCents("$1,250.00")).toBe(125000);
    expect(dollarsToCents("  2,000 ")).toBe(200000);
  });

  it("returns null for empty or invalid input", () => {
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents("   ")).toBeNull();
    expect(dollarsToCents("abc")).toBeNull();
    expect(dollarsToCents("10.555")).toBeNull();
    expect(dollarsToCents("-5")).toBeNull();
  });
});

describe("centsToDollarsInput", () => {
  it("formats cents to a two-decimal dollar string", () => {
    expect(centsToDollarsInput(10000)).toBe("100.00");
    expect(centsToDollarsInput(10055)).toBe("100.55");
    expect(centsToDollarsInput(1)).toBe("0.01");
    expect(centsToDollarsInput(0)).toBe("0.00");
  });

  it("round-trips with dollarsToCents", () => {
    const cents = 123456;
    expect(dollarsToCents(centsToDollarsInput(cents))).toBe(cents);
  });
});

describe("computeGiftSummary", () => {
  it("computes the average from total and count", () => {
    const summary = computeGiftSummary(30000, 3);
    expect(summary.totalRaisedCents).toBe(30000);
    expect(summary.giftCount).toBe(3);
    expect(summary.averageGiftCents).toBe(10000);
  });

  it("rounds the average to the nearest cent", () => {
    const summary = computeGiftSummary(10000, 3);
    expect(summary.averageGiftCents).toBe(3333);
  });

  it("returns a zero average when there are no gifts", () => {
    const summary = computeGiftSummary(0, 0);
    expect(summary).toEqual({ totalRaisedCents: 0, giftCount: 0, averageGiftCents: 0 });
  });

  it("guards against non-finite inputs", () => {
    const summary = computeGiftSummary(Number.NaN, Number.NaN);
    expect(summary).toEqual({ totalRaisedCents: 0, giftCount: 0, averageGiftCents: 0 });
  });
});

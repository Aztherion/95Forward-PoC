import { describe, expect, it } from "vitest";
import {
  computePortfolioStats,
  computeStageSummaries,
  hasActiveOpportunityFilters,
  opportunityParamsToSearch,
  parseOpportunityListParams,
  type OpportunityCountable,
} from "./opportunity-params";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("parseOpportunityListParams", () => {
  it("returns null filters for empty input", () => {
    expect(parseOpportunityListParams({})).toEqual({ stage: null, ownerUserId: null });
  });

  it("parses a valid stage and owner uuid", () => {
    const params = parseOpportunityListParams({ stage: "solicitation", owner: UUID });
    expect(params.stage).toBe("solicitation");
    expect(params.ownerUserId).toBe(UUID);
  });

  it("rejects an unknown stage and a non-uuid owner", () => {
    const params = parseOpportunityListParams({ stage: "closed", owner: "not-a-uuid" });
    expect(params.stage).toBeNull();
    expect(params.ownerUserId).toBeNull();
  });

  it("takes the first value when arrays are provided", () => {
    const params = parseOpportunityListParams({ stage: ["cultivation", "stewardship"] });
    expect(params.stage).toBe("cultivation");
  });
});

describe("opportunityParamsToSearch", () => {
  it("omits null filters to keep URLs clean", () => {
    expect(opportunityParamsToSearch({ stage: null, ownerUserId: null }).toString()).toBe("");
  });

  it("serializes set filters", () => {
    const sp = opportunityParamsToSearch({ stage: "cultivation", ownerUserId: UUID });
    expect(sp.get("stage")).toBe("cultivation");
    expect(sp.get("owner")).toBe(UUID);
  });
});

describe("hasActiveOpportunityFilters", () => {
  it("is false for bare defaults", () => {
    expect(hasActiveOpportunityFilters(parseOpportunityListParams({}))).toBe(false);
  });

  it("is true when any filter is set", () => {
    expect(hasActiveOpportunityFilters({ stage: "solicitation", ownerUserId: null })).toBe(true);
    expect(hasActiveOpportunityFilters({ stage: null, ownerUserId: UUID })).toBe(true);
  });
});

describe("computeStageSummaries", () => {
  it("returns all four stages in order, even when empty", () => {
    const summaries = computeStageSummaries([]);
    expect(summaries.map((s) => s.stage)).toEqual([
      "identification",
      "cultivation",
      "solicitation",
      "stewardship",
    ]);
    expect(summaries.every((s) => s.count === 0 && s.totalAskCents === 0)).toBe(true);
  });

  it("counts opportunities and sums ask amounts per stage", () => {
    const rows: OpportunityCountable[] = [
      { stage: "solicitation", askAmountCents: 280_000_000 },
      { stage: "solicitation", askAmountCents: 120_000_000 },
      { stage: "cultivation", askAmountCents: 75_000_000 },
      { stage: "identification", askAmountCents: null },
    ];
    const byStage = new Map(computeStageSummaries(rows).map((s) => [s.stage, s]));
    expect(byStage.get("solicitation")).toEqual({
      stage: "solicitation",
      count: 2,
      totalAskCents: 400_000_000,
    });
    expect(byStage.get("cultivation")).toEqual({
      stage: "cultivation",
      count: 1,
      totalAskCents: 75_000_000,
    });
    expect(byStage.get("identification")).toEqual({
      stage: "identification",
      count: 1,
      totalAskCents: 0,
    });
    expect(byStage.get("stewardship")).toEqual({
      stage: "stewardship",
      count: 0,
      totalAskCents: 0,
    });
  });
});

describe("computePortfolioStats", () => {
  it("totals count and ask across stages", () => {
    const rows: OpportunityCountable[] = [
      { stage: "solicitation", askAmountCents: 280_000_000 },
      { stage: "cultivation", askAmountCents: 75_000_000 },
      { stage: "identification", askAmountCents: null },
    ];
    const stats = computePortfolioStats(rows);
    expect(stats.totalCount).toBe(3);
    expect(stats.totalAskCents).toBe(355_000_000);
    expect(stats.byStage).toHaveLength(4);
  });

  it("returns zeroes for an empty book", () => {
    const stats = computePortfolioStats([]);
    expect(stats.totalCount).toBe(0);
    expect(stats.totalAskCents).toBe(0);
  });
});

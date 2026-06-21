import { describe, expect, it } from "vitest";
import { formatTenure, summarizeWavemaker, type RecurringGiftLike } from "./wavemaker";

const TODAY = "2026-06-21";

const gifts: RecurringGiftLike[] = [
  { amountCents: 2_500, giftDate: "2025-01-15" },
  { amountCents: 2_500, giftDate: "2025-06-15" },
  { amountCents: 5_000, giftDate: "2026-06-15" },
  { amountCents: 5_000, giftDate: "2025-12-15" },
];

describe("summarizeWavemaker", () => {
  it("uses the most recent recurring gift for the monthly amount", () => {
    expect(summarizeWavemaker(gifts, TODAY).monthlyAmountCents).toBe(5_000);
  });

  it("computes tenure in months from the earliest recurring gift to today", () => {
    expect(summarizeWavemaker(gifts, TODAY).tenureMonths).toBe(17);
  });

  it("sums all recurring gift amounts as the total given", () => {
    expect(summarizeWavemaker(gifts, TODAY).totalGivenCents).toBe(15_000);
  });

  it("counts the recurring gifts", () => {
    expect(summarizeWavemaker(gifts, TODAY).recurringGiftCount).toBe(4);
  });

  it("returns zeroes for an empty list", () => {
    expect(summarizeWavemaker([], TODAY)).toEqual({
      monthlyAmountCents: 0,
      tenureMonths: 0,
      totalGivenCents: 0,
      recurringGiftCount: 0,
    });
  });

  it("clamps tenure to zero for a gift dated in the future", () => {
    expect(
      summarizeWavemaker([{ amountCents: 1_000, giftDate: "2026-12-01" }], TODAY).tenureMonths,
    ).toBe(0);
  });
});

describe("formatTenure", () => {
  it("formats years and months together", () => {
    expect(formatTenure(17)).toBe("1 year, 5 months");
  });

  it("formats whole years", () => {
    expect(formatTenure(24)).toBe("2 years");
  });

  it("formats sub-year tenures in months", () => {
    expect(formatTenure(5)).toBe("5 months");
    expect(formatTenure(1)).toBe("1 month");
  });

  it("describes a brand-new supporter", () => {
    expect(formatTenure(0)).toBe("New this month");
  });
});

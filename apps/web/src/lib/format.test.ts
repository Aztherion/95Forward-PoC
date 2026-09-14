import { describe, expect, it } from "vitest";
import {
  formatCurrencyAbbreviatedFromCents,
  formatCurrencyFromCents,
  formatCurrencySeriesAbbreviatedFromCents,
  formatDate,
  lastGift,
  latestInteractionDate,
  lifetimeGivingCents,
  titleCaseFromSnake,
} from "./format";

describe("formatCurrencyFromCents", () => {
  it("formats cents into whole-dollar currency", () => {
    expect(formatCurrencyFromCents(0)).toBe("$0");
    expect(formatCurrencyFromCents(12_345_67)).toBe("$12,346");
    expect(formatCurrencyFromCents(20_000_00)).toBe("$20,000");
  });

  it("returns a dash for missing amounts", () => {
    expect(formatCurrencyFromCents(null)).toBe("—");
    expect(formatCurrencyFromCents(undefined)).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats ISO date strings in UTC", () => {
    expect(formatDate("2025-09-11")).toBe("Sep 11, 2025");
  });

  it("returns a dash for empty or invalid values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("lifetimeGivingCents", () => {
  it("sums all gift amounts", () => {
    expect(
      lifetimeGivingCents([
        { amountCents: 5_000_00, giftDate: "2022-09-10" },
        { amountCents: 12_000_00, giftDate: "2024-09-11" },
        { amountCents: 20_000_00, giftDate: "2025-09-12" },
      ]),
    ).toBe(37_000_00);
  });

  it("returns zero for no gifts", () => {
    expect(lifetimeGivingCents([])).toBe(0);
  });
});

describe("lastGift", () => {
  it("returns the gift with the latest date", () => {
    const result = lastGift([
      { amountCents: 5_000_00, giftDate: "2022-09-10" },
      { amountCents: 20_000_00, giftDate: "2025-09-12" },
      { amountCents: 12_000_00, giftDate: "2024-09-11" },
    ]);
    expect(result).toEqual({ amountCents: 20_000_00, giftDate: "2025-09-12" });
  });

  it("returns null when there are no gifts", () => {
    expect(lastGift([])).toBeNull();
  });
});

describe("latestInteractionDate", () => {
  it("returns the most recent occurredAt", () => {
    const result = latestInteractionDate([
      { occurredAt: "2025-01-15T16:00:00Z" },
      { occurredAt: new Date("2025-06-01T16:00:00Z") },
      { occurredAt: "2025-03-20T16:00:00Z" },
    ]);
    expect(result?.toISOString()).toBe("2025-06-01T16:00:00.000Z");
  });

  it("ignores invalid dates and returns null when empty", () => {
    expect(latestInteractionDate([])).toBeNull();
    expect(latestInteractionDate([{ occurredAt: "nope" }])).toBeNull();
  });
});

describe("titleCaseFromSnake", () => {
  it("turns snake_case enums into sentence-friendly labels", () => {
    expect(titleCaseFromSnake("corporate_grant")).toBe("Corporate Grant");
    expect(titleCaseFromSnake("foundation")).toBe("Foundation");
    expect(titleCaseFromSnake("one_time")).toBe("One Time");
  });
});

describe("formatCurrencyAbbreviatedFromCents", () => {
  it("renders the strings SCREENS.md is written in", () => {
    expect(formatCurrencyAbbreviatedFromCents(1_860_000_00)).toBe("$1.86M");
    expect(formatCurrencyAbbreviatedFromCents(2_700_000_00)).toBe("$2.70M");
    expect(formatCurrencyAbbreviatedFromCents(2_080_000_00)).toBe("$2.08M");
    expect(formatCurrencyAbbreviatedFromCents(1_040_000_00)).toBe("$1.04M");
    expect(formatCurrencyAbbreviatedFromCents(845_000_00)).toBe("$845K");
    expect(formatCurrencyAbbreviatedFromCents(945_000_00)).toBe("$945K");
    expect(formatCurrencyAbbreviatedFromCents(225_000_00)).toBe("$225K");
  });

  it("keeps millions at two decimals and thousands at none", () => {
    // The trailing zero is the point: $2.70M must not collapse to $2.7M beside $1.86M.
    expect(formatCurrencyAbbreviatedFromCents(2_500_000_00)).toBe("$2.50M");
    expect(formatCurrencyAbbreviatedFromCents(2_000_000_00)).toBe("$2.00M");
    expect(formatCurrencyAbbreviatedFromCents(70_000_00)).toBe("$70K");
    expect(formatCurrencyAbbreviatedFromCents(17_500_00)).toBe("$18K");
  });

  it("handles the tier boundaries", () => {
    expect(formatCurrencyAbbreviatedFromCents(999_99)).toBe("$1,000");
    expect(formatCurrencyAbbreviatedFromCents(1_000_00)).toBe("$1K");
    expect(formatCurrencyAbbreviatedFromCents(999_400_00)).toBe("$999K");
    expect(formatCurrencyAbbreviatedFromCents(1_000_000_00)).toBe("$1.00M");
    expect(formatCurrencyAbbreviatedFromCents(999_000_000_00)).toBe("$999.00M");
    expect(formatCurrencyAbbreviatedFromCents(1_000_000_000_00)).toBe("$1.00B");
  });

  it("promotes a value that rounds up through its own ceiling", () => {
    // 999,500 at K/0dp is "$1,000K", which reads as a typo rather than a number.
    expect(formatCurrencyAbbreviatedFromCents(999_500_00)).toBe("$1.00M");
    expect(formatCurrencyAbbreviatedFromCents(999_999_500_00)).toBe("$1.00B");
    // …but not when the caller forced a unit for a shared axis.
    expect(formatCurrencyAbbreviatedFromCents(999_500_00, { unit: "K" })).toBe("$1,000K");
  });

  it("carries the sign and zero the way the full formatter does", () => {
    expect(formatCurrencyAbbreviatedFromCents(0)).toBe("$0");
    expect(formatCurrencyAbbreviatedFromCents(-5_249_400_00)).toBe("-$5.25M");
    expect(formatCurrencyAbbreviatedFromCents(-845_000_00)).toBe("-$845K");
    expect(formatCurrencyAbbreviatedFromCents(null)).toBe("—");
    expect(formatCurrencyAbbreviatedFromCents(undefined)).toBe("—");
    expect(formatCurrencyAbbreviatedFromCents(Number.NaN)).toBe("—");
  });

  it("rounds on the exact cents, not on a float", () => {
    // (2.025).toFixed(2) is "2.02" — 2.025 has no binary representation and lands just under the
    // half — so a float path renders "$2.02M" beside a table that says $2,025,000.
    expect(formatCurrencyAbbreviatedFromCents(2_025_000_00)).toBe("$2.03M");
    expect(formatCurrencyAbbreviatedFromCents(1_005_000_00)).toBe("$1.01M");
    expect(formatCurrencyAbbreviatedFromCents(8_150_00)).toBe("$8K");
  });

  it("honours a forced unit, so an axis can share one", () => {
    const ticks = [0, 675_000_00, 1_350_000_00, 2_025_000_00, 2_700_000_00];
    expect(ticks.map((c) => formatCurrencyAbbreviatedFromCents(c, { unit: "M" }))).toEqual([
      "$0.00M",
      "$0.68M",
      "$1.35M",
      "$2.03M",
      "$2.70M",
    ]);
    expect(formatCurrencyAbbreviatedFromCents(2_700_000_00, { unit: "exact" })).toBe("$2,700,000");
    expect(formatCurrencyAbbreviatedFromCents(2_700_000_00, { decimals: 1 })).toBe("$2.7M");
  });
});

describe("formatCurrencySeriesAbbreviatedFromCents", () => {
  it("leaves a well-separated set at the default precision", () => {
    expect(
      formatCurrencySeriesAbbreviatedFromCents([2_080_000_00, 1_860_000_00, 1_040_000_00]),
    ).toEqual(["$2.08M", "$1.86M", "$1.04M"]);
  });

  it("never lets two different amounts render as the same string", () => {
    // Best and Most likely $8,000 apart: at two decimals both are "$2.08M", which would assert a
    // band whose ends are equal. The set gains a digit instead.
    const rendered = formatCurrencySeriesAbbreviatedFromCents([2_084_000_00, 2_076_000_00]);
    expect(rendered[0]).not.toBe(rendered[1]);
    expect(rendered).toEqual(["$2.084M", "$2.076M"]);
  });

  it("preserves the real ordering once distinct", () => {
    const amounts = [1_040_000_00, 2_084_000_00, 2_076_000_00, 845_000_00];
    const rendered = formatCurrencySeriesAbbreviatedFromCents(amounts);
    const order = amounts
      .map((amount, i) => ({ amount, text: rendered[i]! }))
      .sort((a, b) => a.amount - b.amount)
      .map((entry) => entry.text);
    expect(new Set(order).size).toBe(order.length);
  });

  it("repeats one string for one repeated amount, and only then", () => {
    expect(formatCurrencySeriesAbbreviatedFromCents([1_000_000_00, 1_000_000_00])).toEqual([
      "$1.00M",
      "$1.00M",
    ]);
  });

  it("keeps nulls out of the decision", () => {
    expect(formatCurrencySeriesAbbreviatedFromCents([2_084_000_00, null, 2_076_000_00])).toEqual([
      "$2.084M",
      "—",
      "$2.076M",
    ]);
  });

  it("falls back to exact dollars when no abbreviation can separate the set", () => {
    // A dollar apart: five extra decimals at the M tier still collide.
    expect(formatCurrencySeriesAbbreviatedFromCents([2_000_000_00, 2_000_001_00])).toEqual([
      "$2,000,000",
      "$2,000,001",
    ]);
  });
});

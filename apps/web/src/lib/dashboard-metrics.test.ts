import { describe, expect, it } from "vitest";
import {
  barHeightPercent,
  bucketGiftsByMonth,
  maxMonthlyTotal,
  recentMonthBuckets,
  yearStartIso,
} from "./dashboard-metrics";

const REFERENCE = new Date(Date.UTC(2026, 5, 20));

describe("recentMonthBuckets", () => {
  it("returns the trailing months ending at the reference month", () => {
    const buckets = recentMonthBuckets(REFERENCE, 6);
    expect(buckets).toHaveLength(6);
    expect(buckets[0]?.key).toBe("2026-01");
    expect(buckets[5]?.key).toBe("2026-06");
    expect(buckets[5]?.label).toBe("Jun");
  });

  it("crosses the year boundary correctly", () => {
    const buckets = recentMonthBuckets(new Date(Date.UTC(2026, 1, 15)), 4);
    expect(buckets.map((b) => b.key)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("bucketGiftsByMonth", () => {
  it("sums gift amounts into the matching month and ignores out-of-range gifts", () => {
    const months = bucketGiftsByMonth(REFERENCE, 6, [
      { giftDate: "2026-06-01", amountCents: 1000 },
      { giftDate: "2026-06-28", amountCents: 500 },
      { giftDate: "2026-01-10", amountCents: 2000 },
      { giftDate: "2025-09-10", amountCents: 9999 },
    ]);
    const june = months.find((m) => m.key === "2026-06");
    const january = months.find((m) => m.key === "2026-01");
    expect(june?.amountCents).toBe(1500);
    expect(january?.amountCents).toBe(2000);
    expect(months.reduce((sum, m) => sum + m.amountCents, 0)).toBe(3500);
  });

  it("returns zeroed buckets when there are no gifts", () => {
    const months = bucketGiftsByMonth(REFERENCE, 3, []);
    expect(months).toHaveLength(3);
    expect(months.every((m) => m.amountCents === 0)).toBe(true);
  });
});

describe("maxMonthlyTotal", () => {
  it("returns the largest amount", () => {
    const months = bucketGiftsByMonth(REFERENCE, 2, [
      { giftDate: "2026-05-01", amountCents: 300 },
      { giftDate: "2026-06-01", amountCents: 800 },
    ]);
    expect(maxMonthlyTotal(months)).toBe(800);
  });

  it("is zero for an empty range", () => {
    expect(maxMonthlyTotal([])).toBe(0);
  });
});

describe("barHeightPercent", () => {
  it("scales relative to the max and clamps to 0-100", () => {
    expect(barHeightPercent(50, 100)).toBe(50);
    expect(barHeightPercent(100, 100)).toBe(100);
    expect(barHeightPercent(0, 100)).toBe(0);
    expect(barHeightPercent(150, 100)).toBe(100);
  });

  it("is zero when the max is zero", () => {
    expect(barHeightPercent(0, 0)).toBe(0);
    expect(barHeightPercent(10, 0)).toBe(0);
  });
});

describe("yearStartIso", () => {
  it("returns January 1 of the reference year in UTC", () => {
    expect(yearStartIso(REFERENCE)).toBe("2026-01-01");
  });
});

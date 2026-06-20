import { describe, expect, it } from "vitest";
import {
  classifyDonor,
  computeGoalProgress,
  maxAmount,
  progressBarWidthPercent,
  summarizeRetention,
  topByAmount,
} from "./analysis-metrics";

const CURRENT_YEAR = 2026;

describe("classifyDonor", () => {
  it("labels a first-gift-this-year donor as new", () => {
    expect(
      classifyDonor({ constituentId: "a", firstGiftYear: 2026, gaveThisYear: true }, CURRENT_YEAR),
    ).toBe("new");
  });

  it("labels a prior donor who gave this year as returning", () => {
    expect(
      classifyDonor({ constituentId: "b", firstGiftYear: 2022, gaveThisYear: true }, CURRENT_YEAR),
    ).toBe("returning");
  });

  it("labels a prior donor with no gift this year as lapsed", () => {
    expect(
      classifyDonor({ constituentId: "c", firstGiftYear: 2023, gaveThisYear: false }, CURRENT_YEAR),
    ).toBe("lapsed");
  });
});

describe("summarizeRetention", () => {
  it("counts new, returning, and lapsed donors", () => {
    const result = summarizeRetention(
      [
        { constituentId: "a", firstGiftYear: 2026, gaveThisYear: true },
        { constituentId: "b", firstGiftYear: 2022, gaveThisYear: true },
        { constituentId: "c", firstGiftYear: 2024, gaveThisYear: true },
        { constituentId: "d", firstGiftYear: 2023, gaveThisYear: false },
      ],
      CURRENT_YEAR,
    );
    expect(result.newCount).toBe(1);
    expect(result.returningCount).toBe(2);
    expect(result.lapsedCount).toBe(1);
    expect(result.totalDonors).toBe(4);
    expect(result.activeDonors).toBe(3);
  });

  it("computes retention rate as returning over prior-year donors", () => {
    const result = summarizeRetention(
      [
        { constituentId: "a", firstGiftYear: 2022, gaveThisYear: true },
        { constituentId: "b", firstGiftYear: 2023, gaveThisYear: true },
        { constituentId: "c", firstGiftYear: 2024, gaveThisYear: false },
        { constituentId: "d", firstGiftYear: 2026, gaveThisYear: true },
      ],
      CURRENT_YEAR,
    );
    expect(result.returningCount).toBe(2);
    expect(result.lapsedCount).toBe(1);
    expect(result.retentionRatePercent).toBe(67);
  });

  it("returns zeroed values for no donors", () => {
    const result = summarizeRetention([], CURRENT_YEAR);
    expect(result).toEqual({
      newCount: 0,
      returningCount: 0,
      lapsedCount: 0,
      totalDonors: 0,
      activeDonors: 0,
      retentionRatePercent: 0,
    });
  });

  it("avoids divide-by-zero when only new donors exist", () => {
    const result = summarizeRetention(
      [{ constituentId: "a", firstGiftYear: 2026, gaveThisYear: true }],
      CURRENT_YEAR,
    );
    expect(result.retentionRatePercent).toBe(0);
  });
});

describe("computeGoalProgress", () => {
  it("computes percent, remaining, and met flag below goal", () => {
    const result = computeGoalProgress(25_000_000, 100_000_000);
    expect(result.percentToGoal).toBe(25);
    expect(result.remainingCents).toBe(75_000_000);
    expect(result.metGoal).toBe(false);
  });

  it("clamps remaining to zero and flags met when over goal", () => {
    const result = computeGoalProgress(120_000_000, 100_000_000);
    expect(result.percentToGoal).toBe(120);
    expect(result.remainingCents).toBe(0);
    expect(result.metGoal).toBe(true);
  });

  it("handles a zero goal without dividing by zero", () => {
    const result = computeGoalProgress(50_000, 0);
    expect(result.percentToGoal).toBe(0);
    expect(result.remainingCents).toBe(0);
    expect(result.goalCents).toBe(0);
  });

  it("treats negative raised as zero", () => {
    const result = computeGoalProgress(-100, 1_000);
    expect(result.raisedCents).toBe(0);
    expect(result.percentToGoal).toBe(0);
  });
});

describe("progressBarWidthPercent", () => {
  it("passes through values within range", () => {
    expect(progressBarWidthPercent(42)).toBe(42);
  });

  it("clamps above 100 and below 0", () => {
    expect(progressBarWidthPercent(150)).toBe(100);
    expect(progressBarWidthPercent(-5)).toBe(0);
  });
});

describe("topByAmount", () => {
  const items = [
    { id: "a", name: "A", amountCents: 100 },
    { id: "b", name: "B", amountCents: 500 },
    { id: "c", name: "C", amountCents: 300 },
  ];

  it("returns the highest items in descending order", () => {
    const top = topByAmount(items, 2);
    expect(top.map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("does not mutate the input array", () => {
    topByAmount(items, 2);
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for a non-positive limit", () => {
    expect(topByAmount(items, 0)).toEqual([]);
  });
});

describe("maxAmount", () => {
  it("returns the largest amount", () => {
    expect(
      maxAmount([
        { id: "a", name: "A", amountCents: 100 },
        { id: "b", name: "B", amountCents: 800 },
      ]),
    ).toBe(800);
  });

  it("is zero for an empty list", () => {
    expect(maxAmount([])).toBe(0);
  });
});

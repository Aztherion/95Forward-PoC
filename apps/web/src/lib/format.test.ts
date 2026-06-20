import { describe, expect, it } from "vitest";
import {
  formatCurrencyFromCents,
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

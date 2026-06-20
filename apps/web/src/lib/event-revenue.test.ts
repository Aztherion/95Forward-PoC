import { describe, expect, it } from "vitest";
import {
  computeEventRevenue,
  sumGiftRevenue,
  sumRegistrationFees,
  type EventFeeLike,
  type EventGiftLike,
} from "./event-revenue";

const registrations: EventFeeLike[] = [
  { status: "registered", feeAmountCents: 25_000 },
  { status: "waitlisted", feeAmountCents: 10_000 },
  { status: "cancelled", feeAmountCents: 50_000 },
  { status: "registered", feeAmountCents: null },
];

const gifts: EventGiftLike[] = [{ amountCents: 100_000 }, { amountCents: 5_000 }];

describe("sumRegistrationFees", () => {
  it("sums non-cancelled fees and treats null as zero", () => {
    expect(sumRegistrationFees(registrations)).toBe(35_000);
  });

  it("returns zero for an empty list", () => {
    expect(sumRegistrationFees([])).toBe(0);
  });

  it("excludes cancelled registrations entirely", () => {
    expect(sumRegistrationFees([{ status: "cancelled", feeAmountCents: 99_999 }])).toBe(0);
  });
});

describe("sumGiftRevenue", () => {
  it("sums gift amounts", () => {
    expect(sumGiftRevenue(gifts)).toBe(105_000);
  });

  it("returns zero for an empty list", () => {
    expect(sumGiftRevenue([])).toBe(0);
  });
});

describe("computeEventRevenue", () => {
  it("combines fees and gift revenue with counts", () => {
    expect(computeEventRevenue(registrations, gifts)).toEqual({
      registrationFeesCents: 35_000,
      giftRevenueCents: 105_000,
      totalCents: 140_000,
      registrationCount: 3,
    });
  });

  it("counts only non-cancelled registrations", () => {
    const result = computeEventRevenue(
      [
        { status: "registered", feeAmountCents: 0 },
        { status: "cancelled", feeAmountCents: 0 },
      ],
      [],
    );
    expect(result.registrationCount).toBe(1);
    expect(result.totalCents).toBe(0);
  });

  it("handles empty inputs", () => {
    expect(computeEventRevenue([], [])).toEqual({
      registrationFeesCents: 0,
      giftRevenueCents: 0,
      totalCents: 0,
      registrationCount: 0,
    });
  });
});

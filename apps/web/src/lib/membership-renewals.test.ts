import { describe, expect, it } from "vitest";
import { classifyRenewal, nextRenewalDate } from "./membership-renewals";

const TODAY = "2026-06-21";

describe("classifyRenewal", () => {
  it("marks an active membership renewing within 60 days as upcoming", () => {
    expect(classifyRenewal("2026-06-25", "active", TODAY)).toBe("upcoming");
    expect(classifyRenewal("2026-08-15", "active", TODAY)).toBe("upcoming");
  });

  it("treats a renewal exactly today as upcoming for active members", () => {
    expect(classifyRenewal(TODAY, "active", TODAY)).toBe("upcoming");
  });

  it("marks an active membership renewing beyond 60 days as current", () => {
    expect(classifyRenewal("2026-12-01", "active", TODAY)).toBe("current");
  });

  it("marks a past renewal date as lapsed when not cancelled", () => {
    expect(classifyRenewal("2026-05-15", "active", TODAY)).toBe("lapsed");
    expect(classifyRenewal("2026-05-15", "pending", TODAY)).toBe("lapsed");
  });

  it("always treats an explicit lapsed status as lapsed", () => {
    expect(classifyRenewal("2027-01-01", "lapsed", TODAY)).toBe("lapsed");
    expect(classifyRenewal(null, "lapsed", TODAY)).toBe("lapsed");
  });

  it("treats cancelled memberships as none regardless of date", () => {
    expect(classifyRenewal("2026-05-15", "cancelled", TODAY)).toBe("none");
    expect(classifyRenewal("2026-06-25", "cancelled", TODAY)).toBe("none");
  });

  it("returns none when there is no renewal date and no lapsed status", () => {
    expect(classifyRenewal(null, "active", TODAY)).toBe("none");
    expect(classifyRenewal(undefined, "pending", TODAY)).toBe("none");
  });

  it("does not mark a future pending renewal as upcoming (only active)", () => {
    expect(classifyRenewal("2026-06-25", "pending", TODAY)).toBe("current");
  });
});

describe("nextRenewalDate", () => {
  it("advances an existing renewal date by exactly one year", () => {
    expect(nextRenewalDate("2026-06-25")).toBe("2027-06-25");
    expect(nextRenewalDate("2026-05-15")).toBe("2027-05-15");
  });

  it("handles a leap day by rolling to the next valid date", () => {
    expect(nextRenewalDate("2024-02-29")).toBe("2025-03-01");
  });

  it("falls back to today plus one year when no renewal date exists", () => {
    expect(nextRenewalDate(null, TODAY)).toBe("2027-06-21");
    expect(nextRenewalDate(undefined, TODAY)).toBe("2027-06-21");
  });
});

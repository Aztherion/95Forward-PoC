import { describe, expect, it } from "vitest";
import { compliancePct, coveragePct, monthStart, weekStart } from "./green-sheet-metrics";

describe("weekStart", () => {
  it("snaps to the preceding Monday (UTC)", () => {
    // 2026-06-25 is a Thursday.
    expect(weekStart(new Date("2026-06-25T18:00:00Z")).toISOString()).toBe(
      "2026-06-22T00:00:00.000Z",
    );
  });

  it("returns Monday itself unchanged", () => {
    expect(weekStart(new Date("2026-06-22T09:00:00Z")).toISOString()).toBe(
      "2026-06-22T00:00:00.000Z",
    );
  });
});

describe("monthStart", () => {
  it("snaps to the first of the month (UTC)", () => {
    expect(monthStart(new Date("2026-06-25T18:00:00Z")).toISOString()).toBe(
      "2026-06-01T00:00:00.000Z",
    );
  });
});

describe("compliancePct", () => {
  it("is 100% when nothing has come due", () => {
    expect(compliancePct(0, 0)).toBe(100);
  });

  it("computes the completed-on-time share", () => {
    expect(compliancePct(4, 3)).toBe(75);
    expect(compliancePct(2, 2)).toBe(100);
    expect(compliancePct(3, 0)).toBe(0);
  });
});

describe("coveragePct", () => {
  it("is 0% when there is nothing to cover", () => {
    expect(coveragePct(0, 0)).toBe(0);
  });

  it("computes the covered share", () => {
    expect(coveragePct(5, 10)).toBe(50);
    expect(coveragePct(33, 33)).toBe(100);
  });
});

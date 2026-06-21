import { describe, expect, it } from "vitest";
import {
  rollUpByOpportunity,
  rollUpByVolunteer,
  totalHours,
  type VolunteerHoursEntry,
} from "./volunteer-metrics";

const entries: VolunteerHoursEntry[] = [
  { constituentId: "lin", opportunityId: "wwd", hours: 6 },
  { constituentId: "lin", opportunityId: "gala", hours: 4 },
  { constituentId: "bradley", opportunityId: "gala", hours: 5 },
  { constituentId: "bradley", opportunityId: "office", hours: 8 },
  { constituentId: "webb", opportunityId: "wwd", hours: 5 },
];

describe("totalHours", () => {
  it("sums hours across entries", () => {
    expect(totalHours(entries)).toBe(28);
  });

  it("returns zero for an empty list", () => {
    expect(totalHours([])).toBe(0);
  });
});

describe("rollUpByVolunteer", () => {
  it("sums hours per volunteer", () => {
    const result = rollUpByVolunteer(entries);
    const byKey = new Map(result.map((row) => [row.key, row.hours]));
    expect(byKey.get("lin")).toBe(10);
    expect(byKey.get("bradley")).toBe(13);
    expect(byKey.get("webb")).toBe(5);
    expect(result).toHaveLength(3);
  });

  it("returns an empty array for empty input", () => {
    expect(rollUpByVolunteer([])).toEqual([]);
  });
});

describe("rollUpByOpportunity", () => {
  it("sums hours per opportunity", () => {
    const result = rollUpByOpportunity(entries);
    const byKey = new Map(result.map((row) => [row.key, row.hours]));
    expect(byKey.get("wwd")).toBe(11);
    expect(byKey.get("gala")).toBe(9);
    expect(byKey.get("office")).toBe(8);
    expect(result).toHaveLength(3);
  });

  it("returns an empty array for empty input", () => {
    expect(rollUpByOpportunity([])).toEqual([]);
  });
});

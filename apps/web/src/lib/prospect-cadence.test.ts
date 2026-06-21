import { describe, expect, it } from "vitest";
import { computeQpi, type QpiDimensionInput } from "@95forward/shared";
import { deriveCadence, deriveNextMove, prospectStatusLabel } from "./prospect-cadence";

const NOW = new Date("2026-06-21T12:00:00Z");

function qpiOf(inputs: QpiDimensionInput[]) {
  return computeQpi(inputs);
}

describe("deriveCadence", () => {
  it("reports recency in days when a contact is logged", () => {
    const tenDaysAgo = new Date("2026-06-11T12:00:00Z");
    expect(deriveCadence("cultivation", tenDaysAgo, NOW)).toBe("Last contact 10d ago");
  });

  it("uses 'today' and '1d' wording at the boundaries", () => {
    expect(deriveCadence("cultivation", NOW, NOW)).toBe("Last contact today");
    expect(deriveCadence("cultivation", new Date("2026-06-20T12:00:00Z"), NOW)).toBe(
      "Last contact 1d ago",
    );
  });

  it("falls back to the research stage with no contact", () => {
    expect(deriveCadence("research", null, NOW)).toBe("Research stage");
  });

  it("invites first contact for non-research stages with no contact", () => {
    expect(deriveCadence("cultivation", null, NOW)).toBe("No contact yet");
  });
});

describe("deriveNextMove", () => {
  it("urges a visit for a 90+ go prospect", () => {
    const qpi = qpiOf([
      { dimension: "capacity", rating: 5 },
      { dimension: "relationship", rating: 4 },
      { dimension: "timing", rating: 5 },
      { dimension: "gift_history", rating: 4 },
      { dimension: "philanthropy", rating: 5 },
    ]);
    expect(qpi.band).toBe("go");
    expect(deriveNextMove(qpi, "cultivation", NOW).headline).toBe("Plan the visit");
  });

  it("points to research gaps before nurturing when a dimension is unknown", () => {
    const qpi = qpiOf([
      { dimension: "capacity", rating: null, isUnknown: true },
      { dimension: "relationship", rating: 3 },
      { dimension: "timing", rating: 4 },
      { dimension: "gift_history", rating: 1 },
      { dimension: "philanthropy", rating: 4 },
    ]);
    expect(qpi.unknownCount).toBeGreaterThan(0);
    const move = deriveNextMove(qpi, "research", null);
    expect(move.headline).toBe("Fill the research gaps");
    expect(move.why).toContain("unknown");
  });

  it("opens the relationship for an early fully-known prospect with no contact", () => {
    const qpi = qpiOf([
      { dimension: "capacity", rating: 2 },
      { dimension: "relationship", rating: 2 },
      { dimension: "timing", rating: 2 },
      { dimension: "gift_history", rating: 1 },
      { dimension: "philanthropy", rating: 2 },
    ]);
    expect(qpi.band).toBe("early");
    expect(deriveNextMove(qpi, "research", null).headline).toBe("Open the relationship");
  });
});

describe("prospectStatusLabel", () => {
  it("maps statuses to sentence-case labels", () => {
    expect(prospectStatusLabel("research")).toBe("Research stage");
    expect(prospectStatusLabel("solicitation")).toBe("Solicitation");
  });
});

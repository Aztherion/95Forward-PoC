import { describe, expect, it } from "vitest";
import {
  computeQpi,
  qpiBand,
  QPI_DEFAULT_WEIGHTS,
  QPI_DIMENSIONS,
  QPI_MAX_RATING,
  qpiMaxPoints,
  type QpiDimensionInput,
  type QpiWeights,
  weightsPointsTotal,
  weightsSumTo100,
} from "./qpi";

// Build the five-dimension assessment set from a [capacity, relationship, timing, gift_history,
// philanthropy] tuple where `null` means an unknown gap.
function dims(ratings: (number | null)[]): QpiDimensionInput[] {
  return QPI_DIMENSIONS.map((dimension, i) => ({
    dimension,
    rating: ratings[i] ?? null,
    isUnknown: ratings[i] == null,
  }));
}

describe("qpi defaults", () => {
  it("weights times max rating sum to 100", () => {
    const total = QPI_DIMENSIONS.reduce(
      (sum, dimension) => sum + QPI_DEFAULT_WEIGHTS[dimension] * QPI_MAX_RATING,
      0,
    );
    expect(total).toBe(100);
  });

  it("matches the methodology maxes", () => {
    expect(qpiMaxPoints("capacity")).toBe(35);
    expect(qpiMaxPoints("relationship")).toBe(30);
    expect(qpiMaxPoints("timing")).toBe(15);
    expect(qpiMaxPoints("gift_history")).toBe(10);
    expect(qpiMaxPoints("philanthropy")).toBe(10);
  });
});

describe("computeQpi — the eight Water For People grounding totals", () => {
  const cases: [string, (number | null)[], number][] = [
    ["Hallworth", [5, 4, 5, 4, 5], 92],
    ["Cordova", [4, 4, 5, 5, 3], 83],
    ["Osgood", [4, 4, 3, 3, 5], 77],
    ["Vega", [4, 4, 2, 3, 3], 70],
    ["Cornerstone (gift-history gap)", [4, 4, 2, null, 3], 64],
    ["Whitfield (timing gap)", [4, 4, null, 1, 2], 58],
    ["Northwater (capacity gap)", [null, 4, 4, 4, 2], 48],
    ["Bello (capacity gap)", [null, 3, 4, 3, 2], 40],
  ];

  for (const [name, ratings, expected] of cases) {
    it(`${name} computes to ${expected}`, () => {
      expect(computeQpi(dims(ratings)).total).toBe(expected);
    });
  }
});

describe("computeQpi — unknown as a first-class gap", () => {
  it("an unknown dimension contributes 0 and is flagged, never guessed", () => {
    const result = computeQpi(dims([null, 4, 4, 4, 2]));
    const capacity = result.dimensions.find((d) => d.dimension === "capacity");
    expect(capacity?.isUnknown).toBe(true);
    expect(capacity?.rating).toBeNull();
    expect(capacity?.points).toBe(0);
    expect(result.unknownCount).toBe(1);
    expect(result.knownCount).toBe(4);
    expect(result.total).toBe(48);
  });

  it("a missing assessment is treated as a gap (0), not zero-rated", () => {
    const result = computeQpi([{ dimension: "capacity", rating: 5 }]);
    expect(result.total).toBe(35);
    expect(result.unknownCount).toBe(4);
    expect(result.dimensions.filter((d) => d.isUnknown)).toHaveLength(4);
  });

  it("all-unknown is 0, not fabricated", () => {
    expect(computeQpi(dims([null, null, null, null, null])).total).toBe(0);
  });

  it("a null rating is a gap even without isUnknown set", () => {
    const result = computeQpi([{ dimension: "timing", rating: null }]);
    expect(result.dimensions.find((d) => d.dimension === "timing")?.isUnknown).toBe(true);
  });
});

describe("computeQpi — weight tuning changes totals", () => {
  it("re-weighting the tenant's dimensions changes the same ratings' total", () => {
    const equalWeights: QpiWeights = {
      capacity: 4,
      relationship: 4,
      timing: 4,
      gift_history: 4,
      philanthropy: 4,
    };
    const ratings = dims([5, 3, 2, 1, 4]);
    const withDefaults = computeQpi(ratings, QPI_DEFAULT_WEIGHTS).total; // 5*7+3*6+2*3+1*2+4*2
    const withEqual = computeQpi(ratings, equalWeights).total; // (5+3+2+1+4)*4
    expect(withDefaults).toBe(69);
    expect(withEqual).toBe(60);
    expect(withDefaults).not.toBe(withEqual);
  });

  it("maxTotal follows the active weights", () => {
    expect(computeQpi(dims([5, 5, 5, 5, 5])).maxTotal).toBe(100);
    expect(computeQpi(dims([5, 5, 5, 5, 5])).total).toBe(100);
  });

  it("clamps out-of-range ratings to [1,5] so the total never exceeds maxTotal", () => {
    const high = computeQpi(dims([6, 5, 5, 5, 5]));
    expect(high.total).toBe(100);
    expect(high.dimensions[0]?.rating).toBe(5);

    const low = computeQpi(dims([0, 1, 1, 1, 1]));
    expect(low.dimensions[0]?.rating).toBe(1);
  });
});

describe("qpiBand", () => {
  it("bands by total", () => {
    expect(qpiBand(92)).toBe("go");
    expect(qpiBand(90)).toBe("go");
    expect(qpiBand(83)).toBe("strong");
    expect(qpiBand(70)).toBe("strong");
    expect(qpiBand(64)).toBe("build");
    expect(qpiBand(50)).toBe("build");
    expect(qpiBand(48)).toBe("early");
    expect(qpiBand(0)).toBe("early");
  });
});

describe("weights validation (Settings)", () => {
  it("default weights sum to 100 points", () => {
    expect(weightsPointsTotal(QPI_DEFAULT_WEIGHTS)).toBe(100);
    expect(weightsSumTo100(QPI_DEFAULT_WEIGHTS)).toBe(true);
  });

  it("rejects weights that do not sum to 100", () => {
    expect(
      weightsSumTo100({
        capacity: 8,
        relationship: 6,
        timing: 3,
        gift_history: 2,
        philanthropy: 2,
      }),
    ).toBe(false);
  });
});

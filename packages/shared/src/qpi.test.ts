import { describe, expect, it } from "vitest";
import { QPI_DEFAULT_WEIGHTS, QPI_DIMENSIONS, QPI_MAX_RATING, qpiMaxPoints } from "./qpi";

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

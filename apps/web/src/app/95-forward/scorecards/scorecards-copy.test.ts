import { describe, expect, it } from "vitest";
import { SCORE_BANDS, scoreBand } from "@95forward/shared";
import {
  BAND_HEALTH,
  BAND_TEXT,
  detailTitle,
  isProcessing,
  linkTargetLabel,
  processingSteps,
  STATUS_TEXT,
  toDateInputValue,
} from "./scorecards-copy";

describe("band colour routing", () => {
  it("routes every band onto a health alias, and only onto a colour", () => {
    for (const band of SCORE_BANDS) {
      expect(["moving", "slowing", "stuck"]).toContain(BAND_HEALTH[band]);
      expect(BAND_TEXT[band]).toBeTruthy();
    }
  });

  it("keeps the score vocabulary out of the deal-health vocabulary", () => {
    // Borrowing the palette is the point; borrowing the words would assert something about the
    // deal that nobody measured.
    expect(Object.values(BAND_TEXT)).toEqual(["Strong", "Mixed", "Weak"]);
    expect(Object.values(BAND_TEXT)).not.toContain("Stuck");
    expect(Object.values(BAND_TEXT)).not.toContain("Moving");
  });

  it("maps the documented thresholds through to colours", () => {
    expect(BAND_HEALTH[scoreBand(0.97)!]).toBe("moving");
    expect(BAND_HEALTH[scoreBand(0.44)!]).toBe("slowing");
    expect(BAND_HEALTH[scoreBand(0.25)!]).toBe("stuck");
    expect(scoreBand(null)).toBeNull();
  });
});

describe("processing", () => {
  it("treats everything before ready as in flight", () => {
    expect(isProcessing("queued")).toBe(true);
    expect(isProcessing("classifying")).toBe(true);
    expect(isProcessing("scoring")).toBe(true);
    expect(isProcessing("ready")).toBe(false);
    expect(isProcessing("failed")).toBe(false);
  });

  it("ticks the first step only once classification is done", () => {
    const early = processingSteps("classifying", null);
    expect(early[0]?.done).toBe(false);
    expect(early[0]?.active).toBe(true);
    expect(early[1]?.active).toBe(false);

    const scoring = processingSteps("scoring", "Discovery Visit Scorecard");
    expect(scoring[0]?.done).toBe(true);
    expect(scoring[1]?.active).toBe(true);
    expect(scoring[1]?.label).toBe("Scoring against Discovery Visit Scorecard");
  });

  it("names the second step generically before a definition is known", () => {
    expect(processingSteps("queued", null)[1]?.label).toBe("Scoring");
  });

  it("gives ready no status word — the score is the status", () => {
    expect(STATUS_TEXT.ready).toBeUndefined();
    expect(STATUS_TEXT.scoring).toBe("Scoring…");
  });
});

describe("detailTitle", () => {
  it("says 'your meeting' only to the rep who reported it", () => {
    expect(detailTitle("Marisol Vega", "Dana Reese", true)).toBe(
      "Scorecard for your meeting with Marisol Vega",
    );
    expect(detailTitle("Marisol Vega", "Dana Reese", false)).toBe(
      "Scorecard for Dana Reese's meeting with Marisol Vega",
    );
  });
});

describe("linkTargetLabel", () => {
  it("separates two opportunities against the same prospect", () => {
    const a = linkTargetLabel("Cordova Beverage Company", "Everyone in Kamuli", "$425,000");
    const b = linkTargetLabel("Cordova Beverage Company", "Bolivia Scale-Up", "$50,000");
    expect(a).not.toBe(b);
    expect(a).toContain("Kamuli");
  });

  it("leaves a prospect as its bare name", () => {
    expect(linkTargetLabel("Dr. Aisha Bello", null, null)).toBe("Dr. Aisha Bello");
  });
});

describe("toDateInputValue", () => {
  it("renders the UTC calendar day the demo clock means", () => {
    expect(toDateInputValue(new Date("2026-09-12T12:00:00.000Z"))).toBe("2026-09-12");
  });
});

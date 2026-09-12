import { describe, expect, it } from "vitest";
import {
  computeQualification,
  DEFAULT_MILESTONE_DEFINITIONS,
  FORWARD_STAGES,
  isPreCloseStage,
  PRE_CLOSE_STAGES,
  CLOSED_WORK_STAGES,
  probabilityBandRank,
  suggestProbabilityBand,
  type MilestoneDefinition,
} from "./forward";

const DEFS = DEFAULT_MILESTONE_DEFINITIONS;
const ALL_BLOCKING = DEFS.filter((d) => d.blocking).map((d) => d.key);

describe("stage", () => {
  it("orders the six stages and splits pre-close from closed work", () => {
    expect(FORWARD_STAGES).toHaveLength(6);
    expect(PRE_CLOSE_STAGES).toEqual([
      "get_the_visit",
      "prep_the_visit",
      "visit_and_ask",
      "follow_up_and_close",
    ]);
    expect(CLOSED_WORK_STAGES).toEqual(["celebrate_steward", "repeat"]);
  });

  it("treats celebrate/steward and repeat as outside the headline number", () => {
    expect(isPreCloseStage("follow_up_and_close")).toBe(true);
    expect(isPreCloseStage("celebrate_steward")).toBe(false);
    expect(isPreCloseStage("repeat")).toBe(false);
  });
});

describe("computeQualification", () => {
  it("qualifies when every blocking milestone is confirmed", () => {
    const result = computeQualification(DEFS, ALL_BLOCKING);
    expect(result.qualified).toBe(true);
    expect(result.missingBlocking).toEqual([]);
    expect(result.blockingConfirmed).toBe(result.blockingTotal);
  });

  it("does not qualify when one blocking milestone is missing, and names it", () => {
    const confirmed = ALL_BLOCKING.filter((key) => key !== "confirmed_in_writing");
    const result = computeQualification(DEFS, confirmed);

    expect(result.qualified).toBe(false);
    expect(result.missingBlocking.map((d) => d.key)).toEqual(["confirmed_in_writing"]);
    expect(result.blockingConfirmed).toBe(result.blockingTotal - 1);
  });

  it("is unaffected by a non-blocking they-said milestone, which still moves the they-said counter", () => {
    // permission_to_share is they_said but NOT blocking. Conflating source with blocking would
    // break both the qualification verdict and the "1/4 they said" counter.
    const withoutPermission = computeQualification(DEFS, ["amount_agreed"]);
    const withPermission = computeQualification(DEFS, ["amount_agreed", "permission_to_share"]);

    expect(withoutPermission.qualified).toBe(false);
    expect(withPermission.qualified).toBe(false);
    expect(withPermission.blockingConfirmed).toBe(withoutPermission.blockingConfirmed);

    expect(withoutPermission.theySaidConfirmed).toBe(1);
    expect(withPermission.theySaidConfirmed).toBe(2);
    expect(withPermission.theySaidTotal).toBe(4);
  });

  it("reproduces the design's Hallworth counter: 1/4 they said, 2/2 we said, not qualified", () => {
    const result = computeQualification(DEFS, [
      "amount_agreed",
      "ask_approved_by_leader",
      "specific_ask_made",
    ]);

    expect(result.theySaidConfirmed).toBe(1);
    expect(result.theySaidTotal).toBe(4);
    expect(result.weSaidConfirmed).toBe(2);
    expect(result.weSaidTotal).toBe(2);
    expect(result.qualified).toBe(false);
    expect(result.missingBlocking.map((d) => d.key)).toEqual([
      "close_date_confirmed",
      "confirmed_in_writing",
    ]);
  });

  it("refuses to qualify by vacuous truth when no blocking milestones are defined", () => {
    const noneBlocking: MilestoneDefinition[] = DEFS.map((d) => ({ ...d, blocking: false }));
    expect(computeQualification(noneBlocking, []).qualified).toBe(false);
  });

  it("ignores confirmed keys that are not in the definition set", () => {
    const result = computeQualification(DEFS, [...ALL_BLOCKING, "a_key_robb_deleted"]);
    expect(result.qualified).toBe(true);
    expect(result.blockingTotal).toBe(ALL_BLOCKING.length);
  });
});

describe("suggestProbabilityBand", () => {
  it("climbs the ladder as the prospect confirms more", () => {
    expect(suggestProbabilityBand(DEFS, [])).toBe("longshot");
    expect(suggestProbabilityBand(DEFS, ["specific_ask_made"])).toBe("medium");
    expect(suggestProbabilityBand(DEFS, ["specific_ask_made", "amount_agreed"])).toBe("high");
    expect(suggestProbabilityBand(DEFS, ["amount_agreed", "close_date_confirmed"])).toBe("bookable");
    expect(suggestProbabilityBand(DEFS, ALL_BLOCKING)).toBe("lock");
  });

  it("stays independent of the stored band so I20 has a gap to detect", () => {
    // The Rules of Robb case: amount agreed AND confirmed in writing, but the rep still reads
    // "medium". The suggestion must disagree with the stored value rather than overwrite it.
    const suggested = suggestProbabilityBand(DEFS, [
      "amount_agreed",
      "confirmed_in_writing",
      "close_date_confirmed",
    ]);
    const stored = "medium" as const;
    expect(suggested).toBe("lock");
    expect(probabilityBandRank(suggested)).toBeGreaterThan(probabilityBandRank(stored));
  });
});

describe("milestone definitions", () => {
  it("keeps source and blocking independent", () => {
    const permission = DEFS.find((d) => d.key === "permission_to_share");
    expect(permission?.source).toBe("they_said");
    expect(permission?.blocking).toBe(false);

    // Every blocking milestone is they-said, but not every they-said milestone is blocking.
    expect(DEFS.filter((d) => d.blocking).every((d) => d.source === "they_said")).toBe(true);
    expect(DEFS.filter((d) => d.source === "they_said").every((d) => d.blocking)).toBe(false);
  });
});

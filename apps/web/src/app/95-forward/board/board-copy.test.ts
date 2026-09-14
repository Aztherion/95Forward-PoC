import { describe, expect, it } from "vitest";
import type { BelowCut, DayWorkSummary, TopItemFact } from "@95forward/shared";
import {
  belowCutSentence,
  boardSubtitle,
  closeDateLine,
  effortPhrase,
  fixFirstSummary,
  prospectTypeLabel,
  stageLabel,
  topItemSentence,
} from "./board-copy";

const summary = (over: Partial<DayWorkSummary> = {}): DayWorkSummary => ({
  findingCount: 3,
  totalEffortSeconds: 150,
  queueCount: 6,
  topItemFact: { opportunityId: "o1", kind: "idle-days", value: 81 },
  ...over,
});

describe("boardSubtitle", () => {
  it("composes the designed sentence from the engine's facts", () => {
    expect(boardSubtitle(summary())).toBe(
      "3 broken forecasts, then 6 moves that change the number today. Item #1 is 81 days idle.",
    );
  });

  it("drops the findings clause when the forecast is clean", () => {
    expect(boardSubtitle(summary({ findingCount: 0 }))).toBe(
      "6 moves that change the number today. Item #1 is 81 days idle.",
    );
  });

  it("says so plainly when there is nothing to do, without congratulating anyone", () => {
    expect(boardSubtitle(summary({ findingCount: 0, queueCount: 0, topItemFact: null }))).toBe(
      "Nothing needs you right now. Every forecast agrees with itself and no move changes the number today.",
    );
  });

  it("handles findings with an empty queue", () => {
    expect(boardSubtitle(summary({ queueCount: 0, topItemFact: null }))).toBe(
      "3 broken forecasts to clear, and no moves that change the number today.",
    );
  });

  it("gets the singulars right", () => {
    expect(
      boardSubtitle(
        summary({
          findingCount: 1,
          queueCount: 1,
          topItemFact: { opportunityId: "o1", kind: "idle-days", value: 1 },
        }),
      ),
    ).toBe("1 broken forecast, then 1 move that change the number today. Item #1 is 1 day idle.");
  });
});

describe("topItemSentence", () => {
  const fact = (kind: TopItemFact["kind"], value: number | null): TopItemFact => ({
    opportunityId: "o1",
    kind,
    value,
  });

  it("phrases every kind the engine can return", () => {
    expect(topItemSentence(fact("idle-days", 81))).toBe("Item #1 is 81 days idle.");
    expect(topItemSentence(fact("past-close", 42))).toBe("Item #1 is 42 days past its close date.");
    expect(topItemSentence(fact("closes-in", 28))).toBe("Item #1 closes in 28 days.");
    expect(topItemSentence(fact("closes-in", 0))).toBe("Item #1 closes today.");
    expect(topItemSentence(fact("unasked-visits", 3))).toBe(
      "Item #1 has had 3 visits and no specific ask.",
    );
  });

  it("says nothing when there is nothing worth quoting", () => {
    expect(topItemSentence(null)).toBeNull();
    expect(topItemSentence(fact("none", null))).toBeNull();
    expect(topItemSentence(fact("idle-days", null))).toBeNull();
  });
});

describe("fixFirstSummary and effortPhrase", () => {
  it("computes the time claim rather than promising three minutes", () => {
    // A hardcoded "under three minutes" becomes a lie the moment a fourth finding appears.
    expect(fixFirstSummary(3, 150)).toBe(
      "3 forecasts contradict themselves · clear them in under three minutes",
    );
    expect(fixFirstSummary(1, 30)).toBe(
      "1 forecast contradicts itself · clear it in about 30 seconds",
    );
  });

  it("rounds effort up, so the claim is never optimistic", () => {
    expect(effortPhrase(30)).toBe("about 30 seconds");
    expect(effortPhrase(31)).toBe("about 45 seconds");
    expect(effortPhrase(61)).toBe("about 75 seconds");
    expect(effortPhrase(90)).toBe("under two minutes");
    expect(effortPhrase(121)).toBe("under three minutes");
    expect(effortPhrase(660)).toBe("under 11 minutes");
    expect(effortPhrase(0)).toBe("no time at all");
  });
});

describe("belowCutSentence", () => {
  const cut = (over: Partial<BelowCut> = {}): BelowCut => ({
    count: 9,
    cents: 540_000_00,
    changesTheNumber: true,
    ...over,
  });

  it("renders what the engine computed, not what the design assumed", () => {
    expect(belowCutSentence(cut({ changesTheNumber: false }))).toBe(
      "9 more opportunities are ranked below the cut — none of them change this week's number.",
    );
    expect(belowCutSentence(cut())).toBe(
      "9 more opportunities are ranked below the cut — together they hold $540,000.",
    );
  });

  it("withholds the verdict when there is no goal to measure against", () => {
    // Null is not "no". With no goal the claim has not been earned either way, so the amount is
    // stated and nothing is asserted about it.
    const sentence = belowCutSentence(cut({ changesTheNumber: null }));
    expect(sentence).toContain("$540,000");
    expect(sentence).not.toContain("none of them");
  });

  it("gets the singular right", () => {
    expect(belowCutSentence(cut({ count: 1, changesTheNumber: false }))).toBe(
      "1 more opportunity is ranked below the cut — none of them change this week's number.",
    );
  });
});

describe("closeDateLine", () => {
  const fmt = (value: string) => `Oct ${value.slice(8, 10)}, ${value.slice(0, 4)}`;

  it("states the absence of a date in full", () => {
    // A date nobody outside the building agreed to is what this screen exists to expose, so the
    // absence of one is not abbreviated to a dash.
    expect(
      closeDateLine(
        { closeDate: null, closeDateMoves: 0, closeDateMovesProspectSourced: false },
        fmt,
      ),
    ).toBe("NO CLOSE DATE SET WITH THEM");
  });

  it("does not say the same thing twice", () => {
    const line = closeDateLine(
      { closeDate: null, closeDateMoves: 2, closeDateMovesProspectSourced: false },
      fmt,
    );
    expect(line.match(/NO CLOSE DATE/g)).toHaveLength(1);
  });

  it("names who moved the date, which is the whole point", () => {
    expect(
      closeDateLine(
        { closeDate: "2026-10-31", closeDateMoves: 3, closeDateMovesProspectSourced: false },
        fmt,
      ),
    ).toBe("CLOSES Oct 31, 2026 · PUSHED 3×, NEVER BY THEM");
    expect(
      closeDateLine(
        { closeDate: "2026-10-31", closeDateMoves: 1, closeDateMovesProspectSourced: true },
        fmt,
      ),
    ).toBe("CLOSES Oct 31, 2026 · PUSHED 1×");
    expect(
      closeDateLine(
        { closeDate: "2026-10-31", closeDateMoves: 0, closeDateMovesProspectSourced: false },
        fmt,
      ),
    ).toBe("CLOSES Oct 31, 2026 · ON TIME");
  });
});

describe("vocabulary", () => {
  it("renders the six stages in the specified words", () => {
    expect(stageLabel("get_the_visit")).toBe("Get the visit");
    expect(stageLabel("prep_the_visit")).toBe("Prep the visit");
    expect(stageLabel("visit_and_ask")).toBe("Visit & ask");
    expect(stageLabel("follow_up_and_close")).toBe("Follow up & close");
    expect(stageLabel("celebrate_steward")).toBe("Celebrate / steward");
    expect(stageLabel("repeat")).toBe("Repeat");
  });

  it("labels the three constituent types", () => {
    expect(prospectTypeLabel("individual")).toBe("Individual");
    expect(prospectTypeLabel("organization")).toBe("Organization");
    expect(prospectTypeLabel("foundation")).toBe("Foundation");
    expect(prospectTypeLabel("some_new_kind")).toBe("Some new kind");
  });
});

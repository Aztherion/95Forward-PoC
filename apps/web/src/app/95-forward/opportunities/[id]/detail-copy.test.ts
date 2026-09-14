import { describe, expect, it } from "vitest";
import type {
  CoverageWith,
  CoverageWithout,
  InitiativeShare,
  MilestoneDefinition,
  QualificationResult,
  ScenarioBadge,
} from "@95forward/shared";
import {
  actorLine,
  counterLine,
  countsAsClosing,
  countsAsRows,
  coverageSentence,
  milestoneFooter,
  missingLine,
  shareSentence,
  slippageChain,
  slippageHeadline,
  slippageVerdict,
  timelineHealth,
  timelineSentence,
  unconfirmedNotes,
  verdictHeadline,
} from "./detail-copy";

const def = (key: string, label: string): MilestoneDefinition => ({
  key,
  label,
  source: "they_said",
  blocking: true,
  sortOrder: 0,
});

const HALLWORTH: QualificationResult = {
  qualified: false,
  missingBlocking: [
    def("close_date_confirmed", "Close date confirmed by the prospect"),
    def("confirmed_in_writing", "Confirmed in writing"),
  ],
  blockingConfirmed: 1,
  blockingTotal: 3,
  theySaidConfirmed: 1,
  theySaidTotal: 4,
  weSaidConfirmed: 2,
  weSaidTotal: 2,
};

const QUALIFIED: QualificationResult = {
  ...HALLWORTH,
  qualified: true,
  missingBlocking: [],
  blockingConfirmed: 3,
  theySaidConfirmed: 4,
};

describe("the verdict", () => {
  it("opens with a judgement, in the words a colleague would use", () => {
    expect(verdictHeadline(HALLWORTH)).toBe("Not a real ask yet");
    expect(verdictHeadline(QUALIFIED)).toBe("This is a real ask");
  });

  it("counts they-said and we-said separately from qualification", () => {
    // The two denominators differ on purpose: the counter counts they-said milestones, and
    // qualification counts BLOCKING ones. `permission_to_share` is they-said and non-blocking, so
    // a record can be 1/4 they-said and one milestone from qualified at the same time.
    expect(counterLine(HALLWORTH)).toBe("1/4 they said · 2/2 we said");
    expect(HALLWORTH.theySaidTotal).not.toBe(HALLWORTH.blockingTotal);
  });

  it("names what is missing, and only claims the rest is ours while something is", () => {
    expect(missingLine(HALLWORTH)).toBe(
      "Missing: close date confirmed by the prospect and confirmed in writing. Everything else is us talking to ourselves.",
    );
    expect(missingLine(QUALIFIED)).not.toContain("Missing");
  });

  it("computes the footer, and says nothing when nothing is missing", () => {
    expect(milestoneFooter(HALLWORTH, 250_000_00)).toBe(
      "2 unconfirmed milestones hold $250,000 out of the numbers your leader reads on Monday.",
    );
    expect(milestoneFooter(QUALIFIED, 250_000_00)).toBeNull();
  });
});

describe("what this ask counts as", () => {
  const rows = (qualified: boolean, badge: ScenarioBadge | null) =>
    countsAsRows(250_000_00, qualified, badge).map((r) => r.value);

  it("maps every membership state the simulation can return", () => {
    expect(rows(true, "IN_ALL_THREE")).toEqual(["$250,000", "$250,000", "$250,000"]);
    expect(rows(true, "MOST_LIKELY_PLUS")).toEqual(["$250,000", "$250,000", "$0"]);
    expect(rows(false, "BEST_ONLY")).toEqual(["not counted", "not counted", "$0"]);
    expect(rows(false, "OUTSIDE_BEST")).toEqual(["not counted", "not counted", "$0"]);
    expect(rows(false, null)).toEqual(["not counted", "not counted", "$0"]);
  });

  it("separates qualification from membership — they are different questions", () => {
    // An unqualified ask can still close in the majority of P50 trials. "Not a qualified ask" and
    // "not in Most likely" are different claims, and the three rows exist to show that.
    expect(rows(false, "MOST_LIKELY_PLUS")).toEqual(["not counted", "$250,000", "$0"]);
  });

  it("says zero where zero is the answer, and absent where it is an absence", () => {
    const parsed = countsAsRows(250_000_00, false, null);
    expect(parsed[2]!.value).toBe("$0");
    expect(parsed[2]!.counted).toBe(false);
    expect(countsAsClosing(false)).toBe(
      "Until the prospect confirms a date, this amount is a claim, not an ask.",
    );
  });
});

describe("the initiative panels invert on qualification", () => {
  const ifLost: CoverageWithout = {
    opportunityId: "o",
    initiativeId: "i",
    coverageRatio: 1.4,
    coverageRatioWithout: 0.9,
    delta: -0.5,
  };
  const ifQualified: CoverageWith = {
    opportunityId: "o",
    initiativeId: "i",
    coverageRatio: 1.11,
    coverageRatioWith: 1.36,
    delta: 0.25,
    wouldChange: true,
  };

  it("asks the forward-looking question of an ask that is not real yet", () => {
    // coverageWithout returns a delta of exactly zero for an unqualified ask, so "lose this one and
    // coverage drops" is arithmetically false about this record — which is the whole argument of
    // the screen above it.
    expect(coverageSentence("Kamuli", false, ifLost, ifQualified)).toBe(
      "Qualify this and Kamuli goes from 1.11× to 1.36× coverage.",
    );
  });

  it("asks what you would lose only of something you have", () => {
    expect(coverageSentence("Kamuli", true, ifLost, ifQualified)).toBe(
      "Lose this one and Kamuli drops from 1.40× to 0.90× coverage.",
    );
  });

  it("says nothing rather than something false when there is no goal", () => {
    const noGoal: CoverageWith = { ...ifQualified, coverageRatio: null, coverageRatioWith: null };
    expect(coverageSentence("Kamuli", false, ifLost, noGoal)).toBeNull();
  });

  it("inverts the share line too — a share you would have is not a share you have", () => {
    const counted: InitiativeShare = {
      opportunityId: "o",
      initiativeId: "i",
      share: 0.58,
      initiativeQualifiedCents: 430_000_00,
      opportunityCents: 250_000_00,
      isLargest: true,
      largestOtherCents: 180_000_00,
      counted: true,
    };
    expect(shareSentence(counted)).toBe(
      "58% of the initiative's qualified asks — the largest single ask in it.",
    );
    expect(shareSentence({ ...counted, counted: false, share: 0 })).toBe(
      "Would be the largest single qualified ask in it.",
    );
    expect(
      shareSentence({
        ...counted,
        counted: false,
        share: 0,
        opportunityCents: 10_000_00,
      }),
    ).toBe("Would count towards the initiative's qualified asks once it is real.");
  });
});

describe("slippage", () => {
  const fmt = (v: string) => `${v.slice(5, 7)}/${v.slice(8, 10)}`;

  it("renders the chain and names who moved it", () => {
    expect(
      slippageChain(["2026-07-29", "2026-08-31", "2026-09-30", "2026-10-31"], 3, false, fmt),
    ).toBe("07/29 → 08/31 → 09/30 → 10/31 · ALL THREE MOVES WERE MADE BY US");
    expect(slippageChain(["2026-07-29", "2026-08-31"], 1, true, fmt)).toBe(
      "07/29 → 08/31 · ONE MOVE ON THE RECORD",
    );
  });

  it("states the total movement", () => {
    expect(slippageHeadline(3, 94)).toBe("Close date moved 3 times · +94 days");
    expect(slippageHeadline(1, -7)).toBe("Close date moved once · −7 days");
  });

  it("delivers the verdict only when every move was ours", () => {
    expect(slippageVerdict("Hallworth", false)).toBe(
      "Hallworth has never given a date. A date we invent is not a date.",
    );
    expect(slippageVerdict("Hallworth", true)).not.toContain("never given");
  });
});

describe("the timeline is composed from the log, not stored as prose", () => {
  const fmt = (v: string) => v;
  const labels = { amount_agreed: "Amount agreed" };

  it("renders a close-date move with its delta", () => {
    expect(
      timelineSentence(
        {
          eventType: "field_change",
          field: "closeDate",
          oldValue: "2026-09-30",
          newValue: "2026-10-31",
        },
        fmt,
        labels,
      ),
    ).toBe("Close date moved 2026-09-30 → 2026-10-31 (+31 days).");
  });

  it("names the milestone from the definitions, not from the event", () => {
    expect(
      timelineSentence(
        {
          eventType: "milestone_confirmed",
          field: "amount_agreed",
          oldValue: null,
          newValue: "true",
        },
        fmt,
        labels,
      ),
    ).toBe("Amount agreed confirmed.");
  });

  it("carries the attribution that makes slippage undeniable rather than accusatory", () => {
    expect(actorLine("Dana Reese", false)).toBe("Dana Reese · no prospect input");
    expect(actorLine("Ellen Hallworth, on a call with Priya Nair", true)).toBe(
      "Ellen Hallworth, on a call with Priya Nair · from the prospect",
    );
    expect(timelineHealth(true)).toBe("moving");
    expect(timelineHealth(false)).toBe("slowing");
  });
});

describe("unconfirmed milestones say something specific", () => {
  it("computes the close-date note from the slippage chain", () => {
    const notes = unconfirmedNotes({
      closeDateMoves: 3,
      anyProspectSourced: false,
      silenceDays: 81,
      amountAgreed: true,
    });
    expect(notes["close_date_confirmed"]).toBe("Never given. All 3 close dates were set by us.");
    expect(notes["confirmed_in_writing"]).toBe(
      "81 days since the verbal yes. No letter, no email, no signature.",
    );
  });

  it("does not claim a verbal yes that never happened", () => {
    const notes = unconfirmedNotes({
      closeDateMoves: 0,
      anyProspectSourced: false,
      silenceDays: null,
      amountAgreed: false,
    });
    expect(notes["confirmed_in_writing"]).toBe(
      "Nothing in writing, and no verbal agreement either.",
    );
    expect(notes["close_date_confirmed"]).toBe("Never given. No date has come from them.");
  });

  it("keeps the non-blocking one honest about not blocking", () => {
    const notes = unconfirmedNotes({
      closeDateMoves: 1,
      anyProspectSourced: true,
      silenceDays: 5,
      amountAgreed: true,
    });
    expect(notes["permission_to_share"]).toBe("Not asked. Not blocking the gift.");
  });
});

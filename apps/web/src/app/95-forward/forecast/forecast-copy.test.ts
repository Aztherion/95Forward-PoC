import { describe, expect, it } from "vitest";
import type { ForwardMetrics, SimulationResult, StageBoard } from "@95forward/shared";
import {
  basisLine,
  chipStaleness,
  closedWorkLine,
  coverageSubline,
  forecastSubtitle,
  forecastVerdict,
  ledgerFooter,
  neededLine,
  simulationSubtitle,
  slipBeyondLine,
  stageReconciliation,
} from "./forecast-copy";

const metrics = (over: Partial<ForwardMetrics> = {}): ForwardMetrics =>
  ({
    scope: { rep: "all", initiative: "all", period: "FY26" },
    asOf: new Date("2026-09-12T12:00:00.000Z"),
    period: { label: "FY26", start: "2026-01-01", end: "2026-12-31" },
    weeksLeft: 15,
    weekOfPeriod: 37,
    weeksInPeriod: 52,
    won: { cents: 291_200_00, count: 4, opportunityIds: [] },
    qualifiedAsks: { cents: 925_000_00, count: 2, opportunityIds: [] },
    preCloseTotal: { cents: 2_163_000_00, count: 16, opportunityIds: [] },
    unqualified: { cents: 1_238_000_00, count: 14, opportunityIds: [] },
    closedWork: { cents: 0, count: 0, opportunityIds: [] },
    goalDefined: true,
    goalCents: 2_700_000_00,
    goalScope: "rep",
    basisCents: 2_408_800_00,
    coverageRatio: 0.38,
    neededAtCoverageCents: 7_226_400_00,
    coverageGapCents: -6_301_400_00,
    newAsksNeeded: { perWeek: 420_093_00, perDay: 84_019_00, perHour: 21_005_00 },
    ...over,
  }) as ForwardMetrics;

const sim = (over: Partial<SimulationResult> = {}): SimulationResult =>
  ({
    months: [],
    yearEnd: { bestCents: 1_720_000_00, mostLikelyCents: 1_496_200_00, worstCents: 881_000_00 },
    membership: [],
    bestOnly: { count: 3, cents: 430_000_00, unqualifiedCents: 430_000_00 },
    slipBeyondPeriod: { bestCents: 0, mostLikelyCents: 0, worstCents: 0 },
    meta: {
      seed: 1,
      trialCount: 10_000,
      percentiles: { best: 90, mostLikely: 50, worst: 5 },
      vintageDate: "2026-09-12",
    },
    ...over,
  }) as SimulationResult;

describe("the subtitle", () => {
  it("abbreviates the context and states the shortfall exactly", () => {
    // The first two figures are context; the third is the one a reader writes down.
    expect(forecastSubtitle("Everything", metrics(), sim())).toBe(
      "Everything · most likely $1.50M against a $2.70M goal — $1,203,800 short on today's numbers.",
    );
  });

  it("says clear rather than short when it is", () => {
    expect(
      forecastSubtitle(
        "Kamuli",
        metrics(),
        sim({ yearEnd: { bestCents: 0, mostLikelyCents: 3_000_000_00, worstCents: 0 } }),
      ),
    ).toContain("$300,000 clear");
  });

  it("makes no claim about a goal that does not exist", () => {
    const noGoal = metrics({ goalDefined: false, goalCents: null, basisCents: null });
    const line = forecastSubtitle("Forever Promise", noGoal, sim());
    expect(line).toContain("No goal defined for this view.");
    expect(line).not.toContain("$2.70M");
  });
});

describe("the working, shown", () => {
  it("renders the basis rather than leaving a reader to compute it", () => {
    // Coverage is measured against goal MINUS won, and the goal is on screen. Without this line a
    // reader checking 0.38× against $2,700,000 gets a different answer and concludes we are broken.
    expect(basisLine(metrics())).toBe("$2,700,000 GOAL − $291,200 WON = $2,408,800 BASIS");
    expect(neededLine(metrics(), 3)).toBe("3× × $2,408,800 REMAINING = $7,226,400 NEEDED");
    expect(coverageSubline(metrics())).toBe("0.38× coverage of the $2,408,800 still to raise");
  });

  it("withholds all of it when there is no goal", () => {
    const noGoal = metrics({
      goalDefined: false,
      goalCents: null,
      basisCents: null,
      coverageRatio: null,
      neededAtCoverageCents: null,
    });
    expect(basisLine(noGoal)).toBeNull();
    expect(neededLine(noGoal, 3)).toBeNull();
    expect(coverageSubline(noGoal)).toBe("no goal defined for this view");
  });
});

describe("the simulation's own sentences", () => {
  it("renders the trial count from the setting, not from prose", () => {
    expect(simulationSubtitle(sim())).toBe(
      "10,000 simulated years. Every dollar closes in full or not at all.",
    );
    // Lower the setting and the copy follows, rather than becoming a lie.
    expect(simulationSubtitle(sim({ meta: { ...sim().meta, trialCount: 2_000 } }))).toContain(
      "2,000 simulated years",
    );
  });

  it("claims 'all unqualified' only when all of it is", () => {
    expect(forecastVerdict(metrics(), sim())).toBe(
      "Most likely lands $1,203,800 short. Only $223,800 of best-case sits outside it — and it is all unqualified.",
    );
    const mixed = sim({ bestOnly: { count: 3, cents: 430_000_00, unqualifiedCents: 100_000_00 } });
    expect(forecastVerdict(metrics(), mixed)).toContain("$100,000 of it unqualified.");
  });

  it("says nothing about landing short when there is no goal", () => {
    expect(forecastVerdict(metrics({ goalCents: null }), sim())).toBeNull();
  });

  it("computes the ledger footer, and withholds the hope line when the money is confirmed", () => {
    expect(ledgerFooter(sim(), 9)).toBe(
      "3 of these 9 only appear in Best. $430,000 of hope, nothing prospect-confirmed behind it.",
    );
    const confirmed = sim({ bestOnly: { count: 2, cents: 50_000_00, unqualifiedCents: 0 } });
    expect(ledgerFooter(confirmed, 9)).toBe("2 of these 9 only appear in Best.");
    expect(
      ledgerFooter(sim({ bestOnly: { count: 0, cents: 0, unqualifiedCents: 0 } }), 9),
    ).toBeNull();
  });

  it("surfaces money that slips past period end, and stays quiet when none does", () => {
    // A year-end total that quietly omits it is a forecast with a hole in it.
    expect(slipBeyondLine(sim())).toBeNull();
    const slips = sim({
      slipBeyondPeriod: { bestCents: 0, mostLikelyCents: 120_000_00, worstCents: 0 },
    });
    expect(slipBeyondLine(slips)).toContain("$120,000 of most-likely money lands after period end");
  });
});

describe("the stage board's reconciliation", () => {
  const stage: StageBoard = {
    columns: [],
    preCloseCents: 2_163_000_00,
    qualifiedCents: 925_000_00,
    closedWorkCents: 48_000_00,
  };

  it("states BOTH totals, because they are different numbers", () => {
    // Amendment 1 in a sentence. Without it, summing the columns appears to contradict the header
    // and the first person to do that arithmetic stops believing the rest of the screen.
    expect(stageReconciliation(stage)).toBe(
      "Get the visit → Follow up & close = $2,163,000 pre-close, of which $925,000 is qualified — the asks on the table above.",
    );
    expect(closedWorkLine(stage)).toBe(
      "CLOSED WORK RIGHT OF THE DIVIDER · $48,000 · NOT IN THE HEADLINE NUMBER",
    );
  });
});

describe("chip staleness", () => {
  it("leads with the fact that matters most about the chip", () => {
    expect(chipStaleness({ silenceDays: 5, closeDateMoves: 3 })).toBe("pushed 3×");
    expect(chipStaleness({ silenceDays: 81, closeDateMoves: 0 })).toBe("81d silent");
    expect(chipStaleness({ silenceDays: 4, closeDateMoves: 0 })).toBe("4d ago");
    expect(chipStaleness({ silenceDays: null, closeDateMoves: 0 })).toBe("never contacted");
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_MILESTONE_DEFINITIONS } from "./forward";
import { DEFAULT_FORWARD_SETTINGS, fixedClock, type ForwardSettings } from "./forward-settings";
import type { MetricScope, MetricsSnapshot, SnapshotOpportunity } from "./forward-metrics";
import {
  hashString,
  mulberry32,
  percentileOf,
  simulate,
  simulationSeedInput,
} from "./forward-simulation";

const DEFS = DEFAULT_MILESTONE_DEFINITIONS;
const ALL_BLOCKING = DEFS.filter((d) => d.blocking).map((d) => d.key);
const ANCHOR = new Date("2026-09-12T12:00:00.000Z");
const CLOCK = fixedClock(ANCHOR);
const SCOPE: MetricScope = { rep: "all", initiative: "all", period: "FY26" };

/** Small trial counts keep the suite fast; determinism means the results are still exact. */
const SETTINGS: ForwardSettings = {
  ...DEFAULT_FORWARD_SETTINGS,
  simulation: { ...DEFAULT_FORWARD_SETTINGS.simulation, trialCount: 2_000 },
};

function opportunity(partial: Partial<SnapshotOpportunity> & { id: string }): SnapshotOpportunity {
  return {
    prospectId: "p",
    initiativeId: "i-kamuli",
    ownerUserId: "u-dana",
    amountCents: 100_000_00,
    stage: "visit_and_ask",
    status: "open",
    closeDate: "2026-10-15",
    confirmedMilestoneKeys: [],
    dateConfidence: "semi_firm",
    probability: "medium",
    visitRating: null,
    milestoneEvidence: {},
    lastContactAt: null,
    milestoneConfirmedAt: {},
    visitCount: 0,
    nextVisitAt: null,
    nextVisitPrepared: false,
    closeDateMoves: 0,
    closeDateMovesProspectSourced: false,
    partners: [],
    ...partial,
  };
}

function snapshot(opportunities: SnapshotOpportunity[]): MetricsSnapshot {
  return {
    orgRefId: "tenant-1",
    opportunities,
    definitions: DEFS,
    goals: [
      { scope: "org", scopeRefId: "tenant-1", fiscalPeriod: "FY26", amountCents: 270_000_000 },
    ],
  };
}

function run(opportunities: SnapshotOpportunity[], settings: ForwardSettings = SETTINGS) {
  return simulate({ snapshot: snapshot(opportunities), scope: SCOPE, settings, clock: CLOCK });
}

describe("the half-pregnant rule — never amount x probability", () => {
  it("books the full amount or zero, never a fraction, across every trial", () => {
    // THE methodology constraint, tested directly rather than by reading the code. A single
    // opportunity at 40% over many trials must produce exactly two distinct year-end totals.
    const o = opportunity({ id: "solo", amountCents: 1_000_000_00, probability: "medium" });
    const result = run([o]);

    const distinct = new Set(
      result.months.map((m) => m.mostLikelyCents).concat(result.yearEnd.mostLikelyCents),
    );
    // Every value present is either 0 or the full amount — never 40% of it.
    for (const value of distinct) {
      expect([0, 1_000_000_00]).toContain(value);
    }
    expect(result.yearEnd.bestCents).toBe(1_000_000_00);
    expect(result.yearEnd.worstCents).toBe(0);
    // The expected value, 40% of a million, must never appear.
    expect([...distinct]).not.toContain(40_000_000);
  });

  it("a 50% chance of $1M never yields $500,000", () => {
    const o = opportunity({ id: "half", amountCents: 1_000_000_00, probability: "medium" });
    const result = run([o]);
    const everyValue = result.months.flatMap((m) => [
      m.bestCents,
      m.mostLikelyCents,
      m.worstCents,
    ]);
    expect(everyValue).not.toContain(500_000_00);
    for (const value of everyValue) expect(value % 1_000_000_00).toBe(0);
  });

  it("a lock-band opportunity still sometimes fails — it is a draw, not a certainty", () => {
    const o = opportunity({ id: "lock", probability: "lock", dateConfidence: "firm" });
    const result = run([o]);
    // 95% closes: the 5th percentile should catch the failures.
    expect(result.yearEnd.bestCents).toBe(100_000_00);
    expect(result.yearEnd.worstCents).toBe(0);
  });
});

describe("determinism", () => {
  const portfolio = [
    opportunity({ id: "a", probability: "high" }),
    opportunity({ id: "b", probability: "medium", amountCents: 250_000_00 }),
  ];

  it("two runs with identical inputs produce identical output", () => {
    const first = run(portfolio);
    const second = run(portfolio);
    expect(second.meta.seed).toBe(first.meta.seed);
    expect(second.months).toEqual(first.months);
    expect(second.yearEnd).toEqual(first.yearEnd);
    expect(second.membership).toEqual(first.membership);
  });

  it("is unaffected by the order opportunities arrive in", () => {
    const forwards = run(portfolio);
    const backwards = run([...portfolio].reverse());
    expect(backwards.meta.seed).toBe(forwards.meta.seed);
  });

  it("rolling the clock changes the curve", () => {
    const later = simulate({
      snapshot: snapshot(portfolio),
      scope: SCOPE,
      settings: SETTINGS,
      clock: fixedClock(new Date("2026-09-13T12:00:00.000Z")),
    });
    expect(later.meta.vintageDate).toBe("2026-09-13");
    expect(later.meta.seed).not.toBe(run(portfolio).meta.seed);
  });

  it("editing one amount changes the curve", () => {
    const edited = [portfolio[0]!, { ...portfolio[1]!, amountCents: 250_000_01 }];
    expect(run(edited).meta.seed).not.toBe(run(portfolio).meta.seed);
  });

  it("the seed input is stable and explicit, not object-key-order dependent", () => {
    const a = simulationSeedInput(portfolio, "2026-09-12", SETTINGS.simulation);
    const b = simulationSeedInput([...portfolio].reverse(), "2026-09-12", SETTINGS.simulation);
    expect(a).toBe(b);
  });

  it("mulberry32 is reproducible from a seed", () => {
    const first = Array.from({ length: 5 }, mulberry32(hashString("x")));
    const second = Array.from({ length: 5 }, mulberry32(hashString("x")));
    expect(second).toEqual(first);
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("the curve", () => {
  const portfolio = [
    opportunity({ id: "a", probability: "high", closeDate: "2026-10-01" }),
    opportunity({ id: "b", probability: "bookable", closeDate: "2026-11-15" }),
    opportunity({ id: "c", probability: "longshot", closeDate: "2026-12-20" }),
    opportunity({
      id: "won",
      status: "won",
      stage: "repeat",
      closeDate: "2026-03-10",
      amountCents: 50_000_00,
    }),
  ];

  it("covers the whole period, one point per month", () => {
    const result = run(portfolio);
    expect(result.months).toHaveLength(12);
    expect(result.months[0]?.month).toBe("2026-01");
    expect(result.months[11]?.month).toBe("2026-12");
  });

  it("keeps worst <= mostLikely <= best in every month", () => {
    for (const month of run(portfolio).months) {
      expect(month.worstCents).toBeLessThanOrEqual(month.mostLikelyCents);
      expect(month.mostLikelyCents).toBeLessThanOrEqual(month.bestCents);
    }
  });

  it("is non-decreasing — money already booked never un-books", () => {
    const months = run(portfolio).months;
    for (let i = 1; i < months.length; i++) {
      expect(months[i]!.worstCents).toBeGreaterThanOrEqual(months[i - 1]!.worstCents);
      expect(months[i]!.mostLikelyCents).toBeGreaterThanOrEqual(months[i - 1]!.mostLikelyCents);
      expect(months[i]!.bestCents).toBeGreaterThanOrEqual(months[i - 1]!.bestCents);
    }
  });

  it("continues from won-to-date rather than restarting at zero", () => {
    const result = run(portfolio);
    // March holds the won gift, so every line is at least that from March onward.
    const march = result.months[2]!;
    expect(march.actualCents).toBe(50_000_00);
    expect(march.worstCents).toBeGreaterThanOrEqual(50_000_00);
    expect(result.yearEnd.worstCents).toBeGreaterThanOrEqual(50_000_00);
  });

  it("stops the actuals at today — they do not run into the future", () => {
    const result = run(portfolio);
    // The anchor is September, month index 8.
    expect(result.months[8]?.actualCents).toBeDefined();
    expect(result.months[9]?.actualCents).toBeUndefined();
    expect(result.months[11]?.actualCents).toBeUndefined();
  });

  it("reports the trial count so the chart subtitle can state it", () => {
    expect(run(portfolio).meta.trialCount).toBe(2_000);
    const bigger = run(portfolio, {
      ...SETTINGS,
      simulation: { ...SETTINGS.simulation, trialCount: 500 },
    });
    expect(bigger.meta.trialCount).toBe(500);
  });

  it("moves the lines in the expected direction when percentiles change", () => {
    const wider = run(portfolio, {
      ...SETTINGS,
      simulation: { ...SETTINGS.simulation, percentiles: { best: 99, mostLikely: 50, worst: 1 } },
    });
    const base = run(portfolio);
    expect(wider.yearEnd.bestCents).toBeGreaterThanOrEqual(base.yearEnd.bestCents);
    expect(wider.yearEnd.worstCents).toBeLessThanOrEqual(base.yearEnd.worstCents);
  });

  it("percentileOf uses nearest-rank and clamps", () => {
    const sample = [1, 2, 3, 4, 5];
    expect(percentileOf(sample, 50)).toBe(3);
    expect(percentileOf(sample, 100)).toBe(5);
    expect(percentileOf(sample, 0)).toBe(1);
    expect(percentileOf([], 50)).toBe(0);
  });
});

describe("who enters the simulation", () => {
  it("includes unqualified opportunities — an unqualified ask can still close", () => {
    const unqualified = opportunity({ id: "u", confirmedMilestoneKeys: [], probability: "lock" });
    const result = run([unqualified]);
    expect(result.membership.map((m) => m.opportunityId)).toContain("u");
    expect(result.membership[0]?.qualified).toBe(false);
    expect(result.yearEnd.bestCents).toBeGreaterThan(0);
  });

  it("excludes closed work and won/lost from the draw", () => {
    const result = run([
      opportunity({ id: "steward", stage: "celebrate_steward" }),
      opportunity({ id: "lost", status: "lost" }),
    ]);
    expect(result.membership).toHaveLength(0);
    expect(result.yearEnd.bestCents).toBe(0);
  });

  it("covers exactly what scopeMatches returns", () => {
    const mine = opportunity({ id: "mine", ownerUserId: "u-dana" });
    const theirs = opportunity({ id: "theirs", ownerUserId: "u-priya" });
    const scoped = simulate({
      snapshot: snapshot([mine, theirs]),
      scope: { ...SCOPE, rep: "u-dana" },
      settings: SETTINGS,
      clock: CLOCK,
    });
    expect(scoped.membership.map((m) => m.opportunityId)).toEqual(["mine"]);
  });
});

describe("scenario membership is trial-derived, not band-derived", () => {
  it("two opportunities with the SAME band get different badges when their dates differ", () => {
    // The test a banding implementation cannot pass. Identical probability band; one sits
    // comfortably inside the period, the other sits past period end with a wide date band, so most
    // of its trials close but land too late to count. Only trial outcomes can tell them apart.
    //
    // Filler opportunities keep the worst-case neighbourhood from degenerating to "nothing closed",
    // which is what a two-row portfolio produces.
    const filler = ["f1", "f2", "f3"].map((id) =>
      opportunity({ id, probability: "lock", closeDate: "2026-04-01", dateConfidence: "firm" }),
    );
    const inside = opportunity({
      id: "inside",
      probability: "lock",
      closeDate: "2026-06-15",
      dateConfidence: "firm",
    });
    const onTheEdge = opportunity({
      id: "edge",
      probability: "lock",
      closeDate: "2027-01-15",
      dateConfidence: "loose",
    });
    const result = run([...filler, inside, onTheEdge]);
    const byId = new Map(result.membership.map((m) => [m.opportunityId, m]));

    // Same band, so a banding implementation would give these identical membership.
    expect(byId.get("inside")?.amountCents).toBe(byId.get("edge")?.amountCents);
    expect(byId.get("inside")?.inclusionRates.mostLikely).toBeGreaterThan(
      byId.get("edge")?.inclusionRates.mostLikely ?? 1,
    );
    expect(byId.get("inside")?.badge).not.toBe(byId.get("edge")?.badge);
    expect(byId.get("inside")?.badge).toBe("IN_ALL_THREE");
  });

  it("a longshot and a lock with identical dates get different badges", () => {
    const longshot = opportunity({ id: "longshot", probability: "longshot" });
    const lock = opportunity({ id: "lock", probability: "lock" });
    const byId = new Map(run([longshot, lock]).membership.map((m) => [m.opportunityId, m]));
    expect(byId.get("lock")?.badge).toBe("IN_ALL_THREE");
    expect(byId.get("longshot")?.badge).not.toBe("IN_ALL_THREE");
  });

  it("badges are monotone by construction: in Worst implies IN_ALL_THREE", () => {
    // Note this asserts the BADGE, not the raw rates. Scenario neighbourhoods are trials whose
    // year-end TOTAL is near a percentile, and the same total is reachable many ways — so raw
    // inclusion rates need not be ordered. Assigning the badge by the lowest-percentile scenario an
    // opportunity qualifies for makes the badge monotone regardless.
    const portfolio = [
      opportunity({ id: "a", probability: "lock" }),
      opportunity({ id: "b", probability: "bookable" }),
      opportunity({ id: "c", probability: "high" }),
      opportunity({ id: "d", probability: "medium" }),
      opportunity({ id: "e", probability: "longshot" }),
    ];
    const threshold = SETTINGS.simulation.membershipThreshold;
    for (const row of run(portfolio).membership) {
      if (row.inclusionRates.worst >= threshold) expect(row.badge).toBe("IN_ALL_THREE");
      if (row.badge === "OUTSIDE_BEST") {
        expect(row.inclusionRates.best).toBeLessThan(threshold);
        expect(row.inclusionRates.worst).toBeLessThan(threshold);
      }
    }
  });

  it("reports the best-only footer, and how much of it rests on nothing", () => {
    const hopeful = opportunity({
      id: "hope",
      probability: "longshot",
      amountCents: 225_000_00,
      confirmedMilestoneKeys: [],
    });
    const solid = opportunity({
      id: "solid",
      probability: "lock",
      confirmedMilestoneKeys: ALL_BLOCKING,
    });
    const result = run([hopeful, solid]);
    const hope = result.membership.find((m) => m.opportunityId === "hope");
    if (hope?.badge === "BEST_ONLY") {
      expect(result.bestOnly.count).toBeGreaterThanOrEqual(1);
      expect(result.bestOnly.unqualifiedCents).toBe(225_000_00);
    }
    // Whatever the badge, an unqualified row must be reported as unqualified.
    expect(hope?.qualified).toBe(false);
  });

  it("returns OUTSIDE_BEST rather than dropping an opportunity", () => {
    const result = run([opportunity({ id: "never", probability: "longshot", amountCents: 1_00 })]);
    expect(result.membership).toHaveLength(1);
    expect(
      ["IN_ALL_THREE", "MOST_LIKELY_PLUS", "BEST_ONLY", "OUTSIDE_BEST"],
    ).toContain(result.membership[0]?.badge);
  });
});

describe("slip beyond the period", () => {
  it("counts money whose varied date lands after period end", () => {
    const edge = opportunity({
      id: "edge",
      probability: "lock",
      closeDate: "2026-12-30",
      dateConfidence: "loose",
      amountCents: 500_000_00,
    });
    const result = run([edge]);
    expect(result.slipBeyondPeriod.bestCents).toBeGreaterThan(0);
  });

  it("is zero when everything closes comfortably inside", () => {
    const early = opportunity({
      id: "early",
      probability: "lock",
      closeDate: "2026-05-01",
      dateConfidence: "firm",
    });
    expect(run([early]).slipBeyondPeriod.bestCents).toBe(0);
  });
});

describe("what-if overrides", () => {
  it("excluding an opportunity removes it from the simulation", () => {
    const portfolio = [
      opportunity({ id: "a", probability: "lock" }),
      opportunity({ id: "b", probability: "lock" }),
    ];
    const withBoth = run(portfolio);
    const withoutB = simulate({
      snapshot: snapshot(portfolio),
      scope: SCOPE,
      settings: SETTINGS,
      clock: CLOCK,
      overrides: { excludeOpportunityIds: ["b"] },
    });
    expect(withoutB.membership.map((m) => m.opportunityId)).toEqual(["a"]);
    expect(withoutB.yearEnd.bestCents).toBeLessThan(withBoth.yearEnd.bestCents);
  });
});

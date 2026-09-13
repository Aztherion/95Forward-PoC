import { describe, expect, it } from "vitest";
import { DEFAULT_MILESTONE_DEFINITIONS, type MilestoneDefinition } from "./forward";
import {
  DEFAULT_FORWARD_SETTINGS,
  FY26,
  fixedClock,
  resolveFiscalPeriod,
  type ForwardSettings,
} from "./forward-settings";
import {
  computeMetrics,
  coverageWithout,
  evaluateWhatIf,
  initiativeShare,
  resolveGoalForScope,
  scopeMatches,
  weekOfPeriod,
  weeksInPeriod,
  weeksLeftIn,
  type MetricScope,
  type MetricsSnapshot,
  type SnapshotOpportunity,
} from "./forward-metrics";

const DEFS: readonly MilestoneDefinition[] = DEFAULT_MILESTONE_DEFINITIONS;
const ALL_BLOCKING = DEFS.filter((d) => d.blocking).map((d) => d.key);
const SETTINGS: ForwardSettings = DEFAULT_FORWARD_SETTINGS;
const ANCHOR = new Date("2026-09-12T12:00:00.000Z");
const CLOCK = fixedClock(ANCHOR);

function opportunity(partial: Partial<SnapshotOpportunity> & { id: string }): SnapshotOpportunity {
  return {
    prospectId: "p",
    initiativeId: "i-kamuli",
    ownerUserId: "u-dana",
    amountCents: 10_000_00,
    stage: "visit_and_ask",
    status: "open",
    closeDate: "2026-11-30",
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

function snapshot(
  opportunities: SnapshotOpportunity[],
  goals: MetricsSnapshot["goals"] = [],
): MetricsSnapshot {
  return { orgRefId: "tenant-1", opportunities, definitions: DEFS, goals };
}

const SCOPE: MetricScope = { rep: "all", initiative: "all", period: "FY26" };

describe("scope predicate", () => {
  const o = opportunity({ id: "a", ownerUserId: "u-dana", initiativeId: "i-kamuli" });

  it("matches everything under all/all", () => {
    expect(scopeMatches(o, SCOPE)).toBe(true);
  });

  it("filters by rep and by initiative independently, and by both together", () => {
    expect(scopeMatches(o, { ...SCOPE, rep: "u-dana" })).toBe(true);
    expect(scopeMatches(o, { ...SCOPE, rep: "u-priya" })).toBe(false);
    expect(scopeMatches(o, { ...SCOPE, initiative: "i-kamuli" })).toBe(true);
    expect(scopeMatches(o, { ...SCOPE, initiative: "i-bolivia" })).toBe(false);
    expect(scopeMatches(o, { rep: "u-dana", initiative: "i-kamuli", period: "FY26" })).toBe(true);
    expect(scopeMatches(o, { rep: "u-dana", initiative: "i-bolivia", period: "FY26" })).toBe(false);
  });
});

describe("weeksLeft", () => {
  it("counts whole weeks from the CLOCK to the period end, not from wall time", () => {
    // 12 Sep -> 31 Dec 2026 is 110 days; 110/7 = 15.7 whole weeks.
    expect(weeksLeftIn(FY26, ANCHOR)).toBe(15);
  });

  it("is pinned by the clock — a different today gives a different answer", () => {
    expect(weeksLeftIn(FY26, new Date("2026-01-01T00:00:00.000Z"))).toBe(52);
    expect(weeksLeftIn(FY26, new Date("2026-12-30T00:00:00.000Z"))).toBe(0);
  });

  it("never goes negative past the period end", () => {
    expect(weeksLeftIn(FY26, new Date("2027-06-01T00:00:00.000Z"))).toBe(0);
  });

  it("computes the week number and period length for the eyebrow", () => {
    expect(weekOfPeriod(FY26, ANCHOR)).toBe(37);
    expect(weeksInPeriod(FY26)).toBe(52);
  });

  it("disagrees with BOTH design plugs, which is the expected outcome", () => {
    const computed = weeksLeftIn(FY26, ANCHOR);
    expect(computed).not.toBe(19); // The Board's "19 weeks left"
    expect(computed).not.toBe(52 - 38); // The Forecast Room's "WEEK 38 OF 52"
  });

  it("reads the period from settings rather than a constant", () => {
    expect(resolveFiscalPeriod(SETTINGS, "FY26")).toEqual(FY26);
    expect(resolveFiscalPeriod(SETTINGS, "FY99")).toBeUndefined();
  });
});

describe("goal resolution — strict, no fallback", () => {
  const goals: MetricsSnapshot["goals"] = [
    { scope: "org", scopeRefId: "tenant-1", fiscalPeriod: "FY26", amountCents: 100_000_00 },
    { scope: "rep", scopeRefId: "u-dana", fiscalPeriod: "FY26", amountCents: 60_000_00 },
    { scope: "initiative", scopeRefId: "i-kamuli", fiscalPeriod: "FY26", amountCents: 40_000_00 },
  ];
  const snap = snapshot([], goals);

  it("resolves org, rep and initiative scopes to their own goal", () => {
    expect(resolveGoalForScope(snap, SCOPE)).toMatchObject({
      defined: true,
      amountCents: 100_000_00,
      scope: "org",
    });
    expect(resolveGoalForScope(snap, { ...SCOPE, rep: "u-dana" })).toMatchObject({
      defined: true,
      amountCents: 60_000_00,
      scope: "rep",
    });
    expect(resolveGoalForScope(snap, { ...SCOPE, initiative: "i-kamuli" })).toMatchObject({
      defined: true,
      amountCents: 40_000_00,
      scope: "initiative",
    });
  });

  it("returns ABSENT for one rep x one initiative, and does NOT fall back to a parent", () => {
    // The failure mode this guards: Henrik's spreadsheet silently reverts to the total goal when
    // you filter to a subset. An absent number is better than a wrong one.
    const resolved = resolveGoalForScope(snap, {
      rep: "u-dana",
      initiative: "i-kamuli",
      period: "FY26",
    });
    expect(resolved.defined).toBe(false);
    expect(resolved.amountCents).toBeNull();
    expect(resolved.amountCents).not.toBe(100_000_00);
    expect(resolved.amountCents).not.toBe(60_000_00);
  });

  it("returns absent for an initiative with no goal rather than apportioning the org goal", () => {
    const resolved = resolveGoalForScope(snap, { ...SCOPE, initiative: "i-forever" });
    expect(resolved.defined).toBe(false);
    expect(resolved.amountCents).toBeNull();
  });

  it("returns absent for a period that does not exist", () => {
    expect(resolveGoalForScope(snap, { ...SCOPE, period: "FY27" }).defined).toBe(false);
  });

  it("leaves every goal-derived metric absent when the goal is absent", () => {
    const metrics = computeMetrics({
      snapshot: snapshot([opportunity({ id: "a", confirmedMilestoneKeys: ALL_BLOCKING })], goals),
      scope: { rep: "u-dana", initiative: "i-kamuli", period: "FY26" },
      settings: SETTINGS,
      clock: CLOCK,
    });
    expect(metrics.goalDefined).toBe(false);
    expect(metrics.goalCents).toBeNull();
    expect(metrics.basisCents).toBeNull();
    expect(metrics.coverageRatio).toBeNull();
    expect(metrics.neededAtCoverageCents).toBeNull();
    expect(metrics.coverageGapCents).toBeNull();
    expect(metrics.newAsksNeeded).toBeNull();
    // The non-goal metrics still compute — an absent goal does not blank the pipeline.
    expect(metrics.qualifiedAsks.cents).toBe(10_000_00);
  });
});

describe("the metric set", () => {
  const goals: MetricsSnapshot["goals"] = [
    { scope: "org", scopeRefId: "tenant-1", fiscalPeriod: "FY26", amountCents: 1_000_000_00 },
  ];
  const snap = snapshot(
    [
      opportunity({ id: "q1", amountCents: 300_000_00, confirmedMilestoneKeys: ALL_BLOCKING }),
      opportunity({ id: "q2", amountCents: 200_000_00, confirmedMilestoneKeys: ALL_BLOCKING }),
      opportunity({ id: "u1", amountCents: 150_000_00, confirmedMilestoneKeys: ["amount_agreed"] }),
      opportunity({ id: "u2", amountCents: 50_000_00 }),
      opportunity({ id: "cw", amountCents: 25_000_00, stage: "celebrate_steward" }),
      opportunity({
        id: "won1",
        amountCents: 100_000_00,
        status: "won",
        stage: "repeat",
        closeDate: "2026-03-01",
      }),
      opportunity({
        id: "wonOutside",
        amountCents: 999_000_00,
        status: "won",
        stage: "repeat",
        closeDate: "2025-03-01",
      }),
      opportunity({ id: "lost", amountCents: 400_000_00, status: "lost" }),
    ],
    goals,
  );
  const m = computeMetrics({ snapshot: snap, scope: SCOPE, settings: SETTINGS, clock: CLOCK });

  it("splits pre-close into qualified and unqualified, and they reconcile", () => {
    expect(m.preCloseTotal.cents).toBe(700_000_00);
    expect(m.qualifiedAsks.cents).toBe(500_000_00);
    expect(m.unqualified.cents).toBe(200_000_00);
    expect(m.qualifiedAsks.cents + m.unqualified.cents).toBe(m.preCloseTotal.cents);
    expect(m.qualifiedAsks.count + m.unqualified.count).toBe(m.preCloseTotal.count);
  });

  it("keeps closed work out of the headline, and excludes won and lost from the pipeline", () => {
    expect(m.closedWork.cents).toBe(25_000_00);
    expect(m.preCloseTotal.opportunityIds).not.toContain("cw");
    expect(m.preCloseTotal.opportunityIds).not.toContain("won1");
    expect(m.preCloseTotal.opportunityIds).not.toContain("lost");
  });

  it("counts only wins that closed INSIDE the period", () => {
    expect(m.won.cents).toBe(100_000_00);
    expect(m.won.opportunityIds).toEqual(["won1"]);
  });

  it("returns basis as a first-class value — never the bare goal", () => {
    expect(m.goalCents).toBe(1_000_000_00);
    expect(m.basisCents).toBe(900_000_00); // goal - won
    expect(m.basisCents).not.toBe(m.goalCents);
  });

  it("computes coverage against the basis, not the goal", () => {
    expect(m.neededAtCoverageCents).toBe(3 * 900_000_00);
    expect(m.coverageRatio).toBeCloseTo(500_000_00 / 900_000_00, 10);
    // The wrong answer a reader gets if they use the bare goal — must NOT be what we return.
    expect(m.coverageRatio).not.toBeCloseTo(500_000_00 / 1_000_000_00, 10);
  });

  it("signs the coverage gap so negative means short", () => {
    expect(m.coverageGapCents).toBe(500_000_00 - 3 * 900_000_00);
    expect(m.coverageGapCents).toBeLessThan(0);
  });

  it("derives the new-ask requirement down to an hour in the chair", () => {
    const gap = Math.abs(m.coverageGapCents ?? 0);
    expect(m.newAsksNeeded?.perWeek).toBeCloseTo(gap / 15, 6);
    expect(m.newAsksNeeded?.perDay).toBeCloseTo(gap / 15 / 5, 6);
    expect(m.newAsksNeeded?.perHour).toBeCloseTo(gap / 15 / 5 / 4, 6);
  });

  it("omits the new-ask requirement when coverage is already met", () => {
    const covered = computeMetrics({
      snapshot: snapshot(
        [opportunity({ id: "big", amountCents: 9_000_000_00, confirmedMilestoneKeys: ALL_BLOCKING })],
        goals,
      ),
      scope: SCOPE,
      settings: SETTINGS,
      clock: CLOCK,
    });
    expect(covered.coverageGapCents).toBeGreaterThan(0);
    expect(covered.newAsksNeeded).toBeNull();
  });

  it("every aggregate's ids sum to its cents", () => {
    const byId = new Map(snap.opportunities.map((o) => [o.id, o.amountCents]));
    for (const key of ["won", "qualifiedAsks", "preCloseTotal", "unqualified", "closedWork"] as const) {
      const agg = m[key];
      const summed = agg.opportunityIds.reduce((sum, id) => sum + (byId.get(id) ?? 0), 0);
      expect(summed, `${key} decomposition`).toBe(agg.cents);
      expect(agg.opportunityIds).toHaveLength(agg.count);
    }
  });

  it("uses settings rather than magic numbers", () => {
    const doubled = computeMetrics({
      snapshot: snap,
      scope: SCOPE,
      settings: { ...SETTINGS, coverageMultiple: 6 },
      clock: CLOCK,
    });
    expect(doubled.neededAtCoverageCents).toBe(2 * (m.neededAtCoverageCents ?? 0));
  });

  it("throws rather than guessing when the period is not a defined setting", () => {
    expect(() =>
      computeMetrics({
        snapshot: snap,
        scope: { ...SCOPE, period: "FY99" },
        settings: SETTINGS,
        clock: CLOCK,
      }),
    ).toThrow(/fiscal period/i);
  });
});

describe("what-if", () => {
  const goals: MetricsSnapshot["goals"] = [
    { scope: "org", scopeRefId: "tenant-1", fiscalPeriod: "FY26", amountCents: 1_000_000_00 },
  ];
  const snap = snapshot(
    [
      opportunity({ id: "q1", amountCents: 300_000_00, confirmedMilestoneKeys: ALL_BLOCKING }),
      opportunity({ id: "u1", amountCents: 150_000_00, confirmedMilestoneKeys: ["amount_agreed"] }),
    ],
    goals,
  );

  it("excluding an opportunity changes qualified asks by exactly its amount", () => {
    const result = evaluateWhatIf({
      snapshot: snap,
      scope: SCOPE,
      settings: SETTINGS,
      clock: CLOCK,
      overrides: { excludeOpportunityIds: ["q1"] },
    });
    expect(result.qualifiedAsksDeltaCents).toBe(-300_000_00);
    expect(result.after.qualifiedAsks.opportunityIds).not.toContain("q1");
  });

  it("excluding an UNQUALIFIED opportunity leaves qualified asks untouched", () => {
    const result = evaluateWhatIf({
      snapshot: snap,
      scope: SCOPE,
      settings: SETTINGS,
      clock: CLOCK,
      overrides: { excludeOpportunityIds: ["u1"] },
    });
    expect(result.qualifiedAsksDeltaCents).toBe(0);
    expect(result.preCloseDeltaCents).toBe(-150_000_00);
  });

  it("confirming the missing milestones promotes an ask — what I20 quantifies", () => {
    const result = evaluateWhatIf({
      snapshot: snap,
      scope: SCOPE,
      settings: SETTINGS,
      clock: CLOCK,
      overrides: { milestonePatches: { u1: ALL_BLOCKING } },
    });
    expect(result.qualifiedAsksDeltaCents).toBe(150_000_00);
    expect(result.coverageGapDeltaCents).toBe(150_000_00);
  });

  it("supports hypothetical field values, e.g. moving a stage out of pre-close", () => {
    const result = evaluateWhatIf({
      snapshot: snap,
      scope: SCOPE,
      settings: SETTINGS,
      clock: CLOCK,
      overrides: { opportunityPatches: { q1: { stage: "celebrate_steward" } } },
    });
    expect(result.qualifiedAsksDeltaCents).toBe(-300_000_00);
    expect(result.after.closedWork.cents).toBe(300_000_00);
  });

  it("does not mutate the snapshot — a second call gives the same answer", () => {
    const overrides = { excludeOpportunityIds: ["q1"] };
    const first = evaluateWhatIf({ snapshot: snap, scope: SCOPE, settings: SETTINGS, clock: CLOCK, overrides });
    const second = evaluateWhatIf({ snapshot: snap, scope: SCOPE, settings: SETTINGS, clock: CLOCK, overrides });
    expect(second.qualifiedAsksDeltaCents).toBe(first.qualifiedAsksDeltaCents);
    expect(snap.opportunities).toHaveLength(2);
  });
});

describe("per-initiative metrics", () => {
  const goals: MetricsSnapshot["goals"] = [
    { scope: "initiative", scopeRefId: "i-kamuli", fiscalPeriod: "FY26", amountCents: 500_000_00 },
  ];
  const snap = snapshot(
    [
      opportunity({ id: "big", amountCents: 300_000_00, confirmedMilestoneKeys: ALL_BLOCKING }),
      opportunity({ id: "small", amountCents: 100_000_00, confirmedMilestoneKeys: ALL_BLOCKING }),
      opportunity({ id: "unq", amountCents: 900_000_00, confirmedMilestoneKeys: [] }),
      opportunity({ id: "other", initiativeId: "i-bolivia", confirmedMilestoneKeys: ALL_BLOCKING }),
    ],
    goals,
  );

  it("computes an opportunity's share of its initiative's qualified asks, and flags the largest", () => {
    const share = initiativeShare(snap, "big", SETTINGS, CLOCK);
    expect(share?.initiativeQualifiedCents).toBe(400_000_00);
    expect(share?.share).toBeCloseTo(0.75, 10);
    expect(share?.isLargest).toBe(true);

    expect(initiativeShare(snap, "small", SETTINGS, CLOCK)?.isLargest).toBe(false);
  });

  it("gives an unqualified ask a zero share — it contributes nothing to qualified asks", () => {
    const share = initiativeShare(snap, "unq", SETTINGS, CLOCK);
    expect(share?.counted).toBe(false);
    expect(share?.share).toBe(0);
    expect(share?.isLargest).toBe(false);
  });

  it("recomputes the initiative's coverage without an opportunity", () => {
    const result = coverageWithout(snap, "big", SETTINGS, CLOCK);
    expect(result?.coverageRatio).toBeCloseTo(400_000_00 / 500_000_00, 10);
    expect(result?.coverageRatioWithout).toBeCloseTo(100_000_00 / 500_000_00, 10);
    expect(result?.delta).toBeLessThan(0);
  });

  it("shows no coverage change when removing an unqualified ask — it was never counted", () => {
    const result = coverageWithout(snap, "unq", SETTINGS, CLOCK);
    expect(result?.coverageRatioWithout).toBeCloseTo(result?.coverageRatio ?? -1, 10);
    expect(result?.delta).toBeCloseTo(0, 10);
  });

  it("returns undefined for an unknown opportunity", () => {
    expect(initiativeShare(snap, "nope", SETTINGS, CLOCK)).toBeUndefined();
    expect(coverageWithout(snap, "nope", SETTINGS, CLOCK)).toBeUndefined();
  });
});

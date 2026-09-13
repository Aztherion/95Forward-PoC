import { describe, expect, it } from "vitest";
import { DEFAULT_MILESTONE_DEFINITIONS } from "./forward";
import { DEFAULT_FORWARD_SETTINGS, fixedClock, type ForwardSettings } from "./forward-settings";
import { evaluateWhatIf, type MetricScope, type MetricsSnapshot, type SnapshotOpportunity } from "./forward-metrics";
import {
  CHECK_DEFINITIONS,
  checkScope,
  type ConsequenceEvaluator,
} from "./forward-checks";

const DEFS = DEFAULT_MILESTONE_DEFINITIONS;
const ALL_BLOCKING = DEFS.filter((d) => d.blocking).map((d) => d.key);
const SETTINGS: ForwardSettings = DEFAULT_FORWARD_SETTINGS;
const ANCHOR = new Date("2026-09-12T12:00:00.000Z");
const CLOCK = fixedClock(ANCHOR);
const SCOPE: MetricScope = { rep: "all", initiative: "all", period: "FY26" };

function opportunity(partial: Partial<SnapshotOpportunity> & { id: string }): SnapshotOpportunity {
  return {
    prospectId: "prospect-1",
    initiativeId: "i-kamuli",
    ownerUserId: "u-dana",
    amountCents: 100_000_00,
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

function snapshot(opportunities: SnapshotOpportunity[]): MetricsSnapshot {
  return {
    orgRefId: "tenant-1",
    opportunities,
    definitions: DEFS,
    goals: [
      { scope: "org", scopeRefId: "tenant-1", fiscalPeriod: "FY26", amountCents: 10_000_000_00 },
    ],
  };
}

function run(opportunities: SnapshotOpportunity[], evaluators?: readonly ConsequenceEvaluator[]) {
  return checkScope({
    snapshot: snapshot(opportunities),
    scope: SCOPE,
    settings: SETTINGS,
    clock: CLOCK,
    evaluators,
  });
}

/** A record with nothing wrong with it: qualified, documented, dated, confidently rated. */
function healthyQualified(id = "healthy"): SnapshotOpportunity {
  return opportunity({
    id,
    confirmedMilestoneKeys: [...ALL_BLOCKING, "specific_ask_made", "ask_approved_by_leader"],
    milestoneEvidence: {
      confirmed_in_writing: { evidence: "Countersigned LOI", documentUrl: "https://x.invalid/loi" },
    },
    probability: "bookable",
    visitRating: "strong",
    closeDate: "2026-12-01",
  });
}

/** A record that is simply early: nothing asked, nothing dated. Normal, not a finding. */
function healthyEarly(id = "early"): SnapshotOpportunity {
  return opportunity({
    id,
    stage: "prep_the_visit",
    closeDate: null,
    confirmedMilestoneKeys: [],
    probability: "longshot",
  });
}

describe("the boundary — no false positives", () => {
  it("finds nothing wrong with a healthy qualified opportunity", () => {
    expect(run([healthyQualified()]).findings).toEqual([]);
  });

  it("finds nothing wrong with a normal early-stage opportunity", () => {
    // The most dangerous false positive: "no close date" on a prospect nobody has asked yet.
    expect(run([healthyEarly()]).findings).toEqual([]);
  });

  it("does not flag a missing close date before the ask has been made", () => {
    const early = opportunity({ id: "e", stage: "get_the_visit", closeDate: null });
    expect(run([early]).count).toBe(0);
  });

  it("does not flag an open opportunity sitting in a closed-work stage", () => {
    // I19 counts exactly this as "closed work right of the divider". Flagging it would contradict
    // the model the stage board is built on.
    const stewarding = opportunity({ id: "s", stage: "celebrate_steward", status: "open" });
    expect(run([stewarding]).count).toBe(0);
  });

  it("does not flag a qualified ask held at 'high' rather than 'lock'", () => {
    // Holding short of "lock" is a defensible judgement, not a contradiction.
    const held = { ...healthyQualified("held"), probability: "high" as const };
    expect(run([held]).count).toBe(0);
  });

  it("produces no findings for won or lost records — history is not a contradiction", () => {
    const won = { ...healthyQualified("won"), status: "won" as const, stage: "repeat" as const };
    const lost = { ...healthyEarly("lost"), status: "lost" as const, stage: "repeat" as const };
    expect(run([won, lost]).count).toBe(0);
  });

  it("does not flag a low likelihood on an unqualified ask", () => {
    const unq = opportunity({ id: "u", probability: "longshot", confirmedMilestoneKeys: [] });
    expect(run([unq]).findings.map((f) => f.ruleId)).not.toContain("probability-below-evidence");
  });
});

describe("the eight checks", () => {
  it("1 — amount agreed with no prospect-confirmed close date", () => {
    const o = opportunity({
      id: "o",
      confirmedMilestoneKeys: ["amount_agreed", "specific_ask_made"],
    });
    const result = run([o]);
    expect(result.findings.map((f) => f.ruleId)).toContain("amount-agreed-no-confirmed-date");
    const finding = result.findings.find((f) => f.ruleId === "amount-agreed-no-confirmed-date");
    expect(finding?.statement).toBe("Amount agreed, but no close date confirmed by the prospect.");
    expect(finding?.consequence.kind).toBe("excluded-from-forecast");
    expect(finding?.resolution).toMatchObject({
      kind: "confirm-milestone",
      label: "Confirm close date",
      targetMilestone: "close_date_confirmed",
    });
  });

  it("2 — close date in the past while the stage is still open", () => {
    const o = opportunity({ id: "o", closeDate: "2026-08-15" });
    const finding = run([o]).findings.find((f) => f.ruleId === "close-date-past-stage-open");
    expect(finding?.statement).toBe(
      "Close date 2026-08-15 is in the past while the stage still reads visit and ask.",
    );
    expect(finding?.consequence.kind).toBe("distorts-simulation");
    expect(finding?.resolution.kind).toBe("re-date-or-close");
  });

  it("3 — confirmed in writing with no document attached", () => {
    const o = opportunity({
      id: "o",
      confirmedMilestoneKeys: [...ALL_BLOCKING, "specific_ask_made"],
      milestoneEvidence: {
        confirmed_in_writing: { evidence: "Cited on a call", documentUrl: null },
      },
      probability: "bookable",
    });
    const finding = run([o]).findings.find((f) => f.ruleId === "written-confirmation-no-evidence");
    expect(finding?.consequence.kind).toBe("inflates-asks");
    expect(finding?.consequence.cents).toBe(100_000_00);
    expect(finding?.resolution.kind).toBe("attach-or-uncheck");
  });

  it("3b — a documented written confirmation does not fire", () => {
    expect(
      run([healthyQualified()]).findings.map((f) => f.ruleId),
    ).not.toContain("written-confirmation-no-evidence");
  });

  it("4 — likelihood below the evidence on a qualified ask", () => {
    const o = {
      ...healthyQualified("o"),
      probability: "medium" as const,
    };
    const finding = run([o]).findings.find((f) => f.ruleId === "probability-below-evidence");
    expect(finding?.statement).toBe(
      "Every blocking milestone is confirmed, but the likelihood still reads medium.",
    );
    expect(finding?.resolution.targetField).toBe("probability");
  });

  it("5 — confident likelihood against a poor visit rating", () => {
    const o = opportunity({ id: "o", probability: "bookable", visitRating: "poor" });
    const finding = run([o]).findings.find((f) => f.ruleId === "probability-above-visit-rating");
    expect(finding?.statement).toBe(
      "Likelihood reads bookable, but the visit rating was poor.",
    );
  });

  it("5b — a poor visit with a modest likelihood is consistent, not a finding", () => {
    const o = opportunity({ id: "o", probability: "longshot", visitRating: "poor" });
    expect(run([o]).findings.map((f) => f.ruleId)).not.toContain("probability-above-visit-rating");
  });

  it("6 — an agreed amount we have no record of asking for", () => {
    const o = opportunity({ id: "o", confirmedMilestoneKeys: ["amount_agreed"] });
    const finding = run([o]).findings.find((f) => f.ruleId === "amount-agreed-no-ask-made");
    expect(finding?.statement).toBe(
      "The prospect agreed an amount we have no record of asking for.",
    );
    expect(finding?.resolution.targetMilestone).toBe("specific_ask_made");
  });

  it("7 — missing forecast inputs once the ask stage is reached", () => {
    const o = opportunity({ id: "o", stage: "follow_up_and_close", closeDate: null });
    const finding = run([o]).findings.find((f) => f.ruleId === "missing-forecast-inputs");
    expect(finding?.statement).toBe("Close date is blank — this opportunity cannot be forecast.");
    expect(finding?.resolution).toMatchObject({ kind: "set-field", targetField: "closeDate" });
  });

  it("7b — names every blank field it found", () => {
    const o = opportunity({ id: "o", stage: "visit_and_ask", closeDate: null, amountCents: 0 });
    const finding = run([o]).findings.find((f) => f.ruleId === "missing-forecast-inputs");
    expect(finding?.statement).toBe(
      "Amount and Close date are blank — this opportunity cannot be forecast.",
    );
  });

  it("8 — a won record still sitting in a pre-close stage", () => {
    const o = { ...healthyQualified("o"), status: "won" as const, stage: "visit_and_ask" as const };
    const finding = run([o]).findings.find((f) => f.ruleId === "status-stage-disagreement");
    expect(finding?.statement).toBe("Status reads won while the stage reads visit and ask.");
    expect(finding?.resolution.kind).toBe("reconcile-status");
  });

  it("every check has a stable id, an effort and a resolution", () => {
    expect(CHECK_DEFINITIONS).toHaveLength(8);
    const ids = CHECK_DEFINITIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(8);
    for (const id of ids) {
      expect(SETTINGS.checks.effortSeconds[id], `${id} needs an effort estimate`).toBeGreaterThan(0);
    }
  });
});

describe("consequences are computed, never hardcoded", () => {
  it("an excluded record reports what it would contribute once corrected", () => {
    const o = opportunity({
      id: "o",
      amountCents: 250_000_00,
      confirmedMilestoneKeys: ["amount_agreed", "specific_ask_made"],
    });
    const finding = run([o]).findings.find((f) => f.ruleId === "amount-agreed-no-confirmed-date");

    const expected = evaluateWhatIf({
      snapshot: snapshot([o]),
      scope: SCOPE,
      settings: SETTINGS,
      clock: CLOCK,
      overrides: { milestonePatches: { o: ALL_BLOCKING } },
    }).qualifiedAsksDeltaCents;

    expect(finding?.consequence.cents).toBe(expected);
    expect(finding?.consequence.cents).toBe(250_000_00);
  });

  it("an inflating record reports the drop when the unsupported claim is removed", () => {
    const o = opportunity({
      id: "o",
      amountCents: 300_000_00,
      confirmedMilestoneKeys: [...ALL_BLOCKING, "specific_ask_made"],
      milestoneEvidence: { confirmed_in_writing: { evidence: null, documentUrl: null } },
      probability: "bookable",
    });
    const finding = run([o]).findings.find((f) => f.ruleId === "written-confirmation-no-evidence");

    const delta = evaluateWhatIf({
      snapshot: snapshot([o]),
      scope: SCOPE,
      settings: SETTINGS,
      clock: CLOCK,
      overrides: {
        milestonePatches: {
          o: [...ALL_BLOCKING, "specific_ask_made"].filter((k) => k !== "confirmed_in_writing"),
        },
      },
    }).qualifiedAsksDeltaCents;

    expect(finding?.consequence.cents).toBe(Math.abs(delta));
    expect(finding?.consequence.cents).toBe(300_000_00);
  });

  it("scales with the portfolio rather than reporting a fixed figure", () => {
    const small = opportunity({
      id: "o",
      amountCents: 10_000_00,
      confirmedMilestoneKeys: ["amount_agreed", "specific_ask_made"],
    });
    const large = { ...small, amountCents: 900_000_00 };
    const smallCents = run([small]).findings[0]?.consequence.cents;
    const largeCents = run([large]).findings[0]?.consequence.cents;
    expect(smallCents).toBe(10_000_00);
    expect(largeCents).toBe(900_000_00);
  });
});

describe("the I21 dependency degrades honestly", () => {
  const pastDated = opportunity({ id: "o", amountCents: 60_000_00, closeDate: "2026-08-01" });

  it("states what it can actually know, and marks itself provisional", () => {
    const finding = run([pastDated]).findings.find(
      (f) => f.ruleId === "close-date-past-stage-open",
    );
    expect(finding?.consequence.provisional).toBe(true);
    expect(finding?.consequence.text).toBe(
      "$60,000 is forecast on a close date we know is wrong.",
    );
    // Crucially it does NOT invent a best/worst spread.
    expect(finding?.consequence.text).not.toMatch(/best|worst/i);
  });

  it("a registered simulation-backed evaluator overrides the fallback in place", () => {
    // Proves I21's integration before I21 exists: same check definition, upgraded wording.
    const simulationEvaluator: ConsequenceEvaluator = {
      kind: "distorts-simulation",
      evaluate: ({ ctx }) => ({
        kind: "distorts-simulation",
        cents: ctx.opportunity.amountCents,
        text: `Distorts best/worst by $${ctx.opportunity.amountCents / 100}.`,
        provisional: false,
      }),
    };
    const finding = run([pastDated], [simulationEvaluator]).findings.find(
      (f) => f.ruleId === "close-date-past-stage-open",
    );
    expect(finding?.consequence.provisional).toBe(false);
    expect(finding?.consequence.text).toBe("Distorts best/worst by $60000.");
  });
});

describe("ordering, effort and scope", () => {
  const big = opportunity({
    id: "big",
    amountCents: 300_000_00,
    confirmedMilestoneKeys: [...ALL_BLOCKING, "specific_ask_made"],
    milestoneEvidence: { confirmed_in_writing: { evidence: null, documentUrl: null } },
    probability: "bookable",
  });
  const mid = opportunity({
    id: "mid",
    amountCents: 250_000_00,
    confirmedMilestoneKeys: ["amount_agreed", "specific_ask_made"],
  });
  const small = opportunity({ id: "small", amountCents: 180_000_00, closeDate: "2026-08-15" });

  it("orders by consequence magnitude descending", () => {
    const result = run([small, mid, big]);
    expect(result.findings.map((f) => f.opportunityId)).toEqual(["big", "mid", "small"]);
  });

  it("breaks ties on effort, quick wins first", () => {
    const a = opportunity({
      id: "a",
      amountCents: 100_000_00,
      closeDate: "2026-08-15", // distorts, 60s
    });
    const b = opportunity({
      id: "b",
      amountCents: 100_000_00,
      confirmedMilestoneKeys: ["amount_agreed", "specific_ask_made"], // excluded, 30s
    });
    const result = run([a, b]);
    expect(result.findings[0]?.opportunityId).toBe("b");
    expect(result.findings[0]?.effortSeconds).toBe(30);
  });

  it("sums effort so the UI can make the three-minute claim", () => {
    const result = run([small, mid, big]);
    expect(result.totalEffortSeconds).toBe(60 + 30 + 60);
    expect(result.totalEffortSeconds).toBeLessThan(180);
    expect(result.count).toBe(result.findings.length);
  });

  it("respects rep scope", () => {
    const mine = { ...mid, id: "mine", ownerUserId: "u-dana" };
    const theirs = { ...mid, id: "theirs", ownerUserId: "u-priya" };
    const result = checkScope({
      snapshot: snapshot([mine, theirs]),
      scope: { ...SCOPE, rep: "u-dana" },
      settings: SETTINGS,
      clock: CLOCK,
    });
    expect(result.findings.map((f) => f.opportunityId)).toEqual(["mine"]);
  });

  it("respects initiative scope", () => {
    const kamuli = { ...mid, id: "k", initiativeId: "i-kamuli" };
    const bolivia = { ...mid, id: "b", initiativeId: "i-bolivia" };
    const result = checkScope({
      snapshot: snapshot([kamuli, bolivia]),
      scope: { ...SCOPE, initiative: "i-bolivia" },
      settings: SETTINGS,
      clock: CLOCK,
    });
    expect(result.findings.map((f) => f.opportunityId)).toEqual(["b"]);
  });

  it("reads efforts from settings rather than inlining them", () => {
    const result = checkScope({
      snapshot: snapshot([mid]),
      scope: SCOPE,
      settings: {
        ...SETTINGS,
        checks: {
          ...SETTINGS.checks,
          effortSeconds: { ...SETTINGS.checks.effortSeconds, "amount-agreed-no-confirmed-date": 999 },
        },
      },
      clock: CLOCK,
    });
    expect(result.findings[0]?.effortSeconds).toBe(999);
  });

  it("is driven by the clock, so 'in the past' moves with today", () => {
    const dated = opportunity({ id: "d", closeDate: "2026-08-15" });
    const before = checkScope({
      snapshot: snapshot([dated]),
      scope: SCOPE,
      settings: SETTINGS,
      clock: fixedClock(new Date("2026-07-01T00:00:00.000Z")),
    });
    expect(before.findings.map((f) => f.ruleId)).not.toContain("close-date-past-stage-open");
    expect(run([dated]).findings.map((f) => f.ruleId)).toContain("close-date-past-stage-open");
  });
});

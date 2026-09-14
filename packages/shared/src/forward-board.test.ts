import { describe, expect, it } from "vitest";
import { movementPanels, stageBoard } from "./forward-board";
import { DEFAULT_MILESTONE_DEFINITIONS } from "./forward";
import { fixedClock } from "./forward-settings";
import type { MetricScope, MetricsSnapshot, SnapshotOpportunity } from "./forward-metrics";

const ANCHOR = new Date("2026-09-12T12:00:00.000Z");
const CLOCK = fixedClock(ANCHOR);
const ALL: MetricScope = { rep: "all", initiative: "all", period: "FY26" };
const BLOCKING = DEFAULT_MILESTONE_DEFINITIONS.filter((d) => d.blocking).map((d) => d.key);

function daysAgo(n: number): string {
  return new Date(ANCHOR.getTime() - n * 86_400_000).toISOString();
}

function opp(partial: Partial<SnapshotOpportunity> & { id: string }): SnapshotOpportunity {
  return {
    prospectId: `p-${partial.id}`,
    initiativeId: "i-kamuli",
    ownerUserId: "u-dana",
    amountCents: 100_000_00,
    stage: "visit_and_ask",
    status: "open",
    closeDate: null,
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

function snap(opportunities: readonly SnapshotOpportunity[]): MetricsSnapshot {
  return {
    orgRefId: "org",
    opportunities,
    definitions: DEFAULT_MILESTONE_DEFINITIONS,
    goals: [{ scope: "org", scopeRefId: "org", fiscalPeriod: "FY26", amountCents: 1_000_000_00 }],
  };
}

describe("stageBoard", () => {
  const rows = [
    opp({ id: "a", stage: "get_the_visit", amountCents: 50_000_00 }),
    opp({
      id: "b",
      stage: "visit_and_ask",
      amountCents: 300_000_00,
      confirmedMilestoneKeys: BLOCKING,
    }),
    opp({ id: "c", stage: "visit_and_ask", amountCents: 100_000_00 }),
    opp({
      id: "d",
      stage: "follow_up_and_close",
      amountCents: 200_000_00,
      confirmedMilestoneKeys: BLOCKING,
    }),
    opp({ id: "steward", stage: "celebrate_steward", amountCents: 48_000_00 }),
    opp({ id: "lost", stage: "visit_and_ask", amountCents: 999_000_00, status: "lost" }),
  ];

  it("puts every open opportunity in its stage column, and nothing closed", () => {
    const board = stageBoard(snap(rows), ALL, CLOCK);
    expect(board.columns).toHaveLength(6);
    const ids = board.columns.flatMap((c) => c.chips.map((chip) => chip.opportunityId));
    expect(ids).toEqual(expect.arrayContaining(["a", "b", "c", "d", "steward"]));
    // A lost opportunity is not work on a board.
    expect(ids).not.toContain("lost");
  });

  it("splits each pre-close column into qualified and not — amendment 1's whole point", () => {
    // Qualified asks is the qualified SUBSET of the four pre-close columns, not their sum. A column
    // total that silently contradicted the headline would be the most damaging thing this screen
    // could do in a room where someone is checking the arithmetic.
    const board = stageBoard(snap(rows), ALL, CLOCK);
    const visitAndAsk = board.columns.find((c) => c.stage === "visit_and_ask")!;
    expect(visitAndAsk.totalCents).toBe(400_000_00);
    expect(visitAndAsk.qualifiedCents).toBe(300_000_00);
    expect(visitAndAsk.qualifiedCount).toBe(1);
    expect(visitAndAsk.count).toBe(2);
  });

  it("totals the two halves separately, and keeps closed work out of both", () => {
    const board = stageBoard(snap(rows), ALL, CLOCK);
    expect(board.preCloseCents).toBe(650_000_00);
    expect(board.qualifiedCents).toBe(500_000_00);
    expect(board.closedWorkCents).toBe(48_000_00);
    // The reconciliation the footer states: the pre-close columns sum to preCloseCents, and the
    // qualified subset of them is the headline. Closed work is in neither.
    const preClose = board.columns.filter((c) => c.preClose);
    expect(preClose.reduce((s, c) => s + c.totalCents, 0)).toBe(board.preCloseCents);
    expect(preClose.reduce((s, c) => s + c.qualifiedCents, 0)).toBe(board.qualifiedCents);
  });

  it("never counts closed work as qualified, whatever its milestones say", () => {
    const board = stageBoard(
      snap([opp({ id: "s", stage: "repeat", confirmedMilestoneKeys: BLOCKING })]),
      ALL,
      CLOCK,
    );
    const repeat = board.columns.find((c) => c.stage === "repeat")!;
    expect(repeat.totalCents).toBe(100_000_00);
    expect(repeat.qualifiedCents).toBe(0);
    expect(board.qualifiedCents).toBe(0);
  });

  it("orders chips biggest first, because a wall is scanned", () => {
    const board = stageBoard(snap(rows), ALL, CLOCK);
    const amounts = board.columns
      .find((c) => c.stage === "visit_and_ask")!
      .chips.map((c) => c.amountCents);
    expect(amounts).toEqual([300_000_00, 100_000_00]);
  });

  it("scopes to one initiative", () => {
    const board = stageBoard(
      snap([...rows, opp({ id: "other", initiativeId: "i-bolivia", amountCents: 777_000_00 })]),
      { ...ALL, initiative: "i-bolivia" },
      CLOCK,
    );
    expect(board.preCloseCents).toBe(777_000_00);
  });
});

describe("movementPanels", () => {
  const rows = [
    opp({ id: "silent", amountCents: 250_000_00, lastContactAt: daysAgo(81) }),
    opp({ id: "quiet", amountCents: 90_000_00, lastContactAt: daysAgo(95) }),
    opp({ id: "recent", amountCents: 400_000_00, lastContactAt: daysAgo(3) }),
    opp({ id: "never", amountCents: 60_000_00, lastContactAt: null }),
    opp({ id: "slipped", amountCents: 180_000_00, lastContactAt: daysAgo(2), closeDateMoves: 3 }),
    opp({ id: "moved-once", amountCents: 70_000_00, lastContactAt: daysAgo(2), closeDateMoves: 1 }),
    opp({
      id: "stewarded",
      stage: "repeat",
      amountCents: 500_000_00,
      lastContactAt: daysAgo(200),
      closeDateMoves: 9,
    }),
  ];
  const thresholds = { untouchedDays: 30, pushes: 2 };

  it("flags by name, and totals what is frozen", () => {
    const { untouched } = movementPanels(snap(rows), ALL, CLOCK, thresholds);
    expect(untouched.rows.map((r) => r.opportunityId)).toEqual(["never", "quiet", "silent"]);
    expect(untouched.count).toBe(3);
    expect(untouched.cents).toBe(400_000_00);
  });

  it("counts never-contacted as untouched — its strongest case", () => {
    const { untouched } = movementPanels(snap(rows), ALL, CLOCK, thresholds);
    expect(untouched.rows.some((r) => r.opportunityId === "never")).toBe(true);
    expect(untouched.rows[0]!.opportunityId).toBe("never");
  });

  it("flags the slipping ones at the doctrine's threshold, not a literal", () => {
    const { slipping } = movementPanels(snap(rows), ALL, CLOCK, thresholds);
    expect(slipping.rows.map((r) => r.opportunityId)).toEqual(["slipped"]);
    expect(slipping.cents).toBe(180_000_00);

    // Lower the threshold and the one-move record joins it. The panel is doctrine, not a constant.
    const looser = movementPanels(snap(rows), ALL, CLOCK, { untouchedDays: 30, pushes: 1 });
    expect(looser.slipping.rows.map((r) => r.opportunityId)).toEqual(["slipped", "moved-once"]);
  });

  it("leaves stewardship out of both — quiet stewardship is not a forecast risk", () => {
    const { untouched, slipping } = movementPanels(snap(rows), ALL, CLOCK, thresholds);
    expect(untouched.rows.some((r) => r.opportunityId === "stewarded")).toBe(false);
    expect(slipping.rows.some((r) => r.opportunityId === "stewarded")).toBe(false);
  });
});

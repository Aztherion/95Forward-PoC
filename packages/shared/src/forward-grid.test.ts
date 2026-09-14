import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_MILESTONE_DEFINITIONS, type MilestoneDefinition } from "./forward";
import { DEFAULT_FORWARD_SETTINGS, fixedClock } from "./forward-settings";
import {
  computeMetrics,
  subtotals,
  type MetricScope,
  type MetricsSnapshot,
  type SnapshotOpportunity,
} from "./forward-metrics";
import { checkScope } from "./forward-checks";
import { dayWork } from "./forward-ranking";
import { enabledCheckDefinitions, registerBuiltInRules } from "./rules-registrations";
import { registerRankingRules } from "./rules-registrations-ranking";
import { resetCatalogue, resolveCatalogue } from "./rules-catalogue";
import { resetFiringSources } from "./rules-firing";
import {
  buildGridRows,
  filterGridRows,
  GRID_EDITABLE_FIELDS,
  gridTotals,
  groupGridRows,
  sortGridRows,
  type GridLabel,
} from "./forward-grid";
import { TRACKED_OPPORTUNITY_FIELDS } from "./forward-events";

const DEFS: readonly MilestoneDefinition[] = DEFAULT_MILESTONE_DEFINITIONS;
const ALL_BLOCKING = DEFS.filter((d) => d.blocking).map((d) => d.key);
const SETTINGS = DEFAULT_FORWARD_SETTINGS;
const ANCHOR = new Date("2026-09-12T12:00:00.000Z");
const CLOCK = fixedClock(ANCHOR);
const SCOPE: MetricScope = { rep: "all", initiative: "all", period: "FY26" };

// The catalogue and the firing registry are MODULE-GLOBAL and shared by every test file in a
// vitest worker, so another file's afterEach can empty them underneath this one. Register per
// test, the way forward-ranking.test.ts does. Without it every ranking rule is simply absent and
// the rank column silently reads null everywhere — which looks like a passing test.
beforeEach(() => {
  resetCatalogue();
  resetFiringSources();
  registerBuiltInRules();
  registerRankingRules();
});
afterEach(() => {
  resetCatalogue();
  resetFiringSources();
});

function opportunity(partial: Partial<SnapshotOpportunity> & { id: string }): SnapshotOpportunity {
  return {
    prospectId: `p-${partial.id}`,
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

function snap(opportunities: SnapshotOpportunity[]): MetricsSnapshot {
  return { orgRefId: "tenant-1", opportunities, definitions: DEFS, goals: [] };
}

function labelsFor(snapshot: MetricsSnapshot): ReadonlyMap<string, GridLabel> {
  return new Map(
    snapshot.opportunities.map((o) => [
      o.id,
      {
        prospectName: `Prospect ${o.id}`,
        initiativeName: o.initiativeId === "i-kamuli" ? "Kamuli 2026" : "Bolivia Scale-Up",
        initiativeColourKey: null,
      },
    ]),
  );
}

function build(snapshot: MetricsSnapshot, scope: MetricScope = SCOPE) {
  const resolved = resolveCatalogue([]);
  const checks = enabledCheckDefinitions(resolved);
  const work = dayWork({
    snapshot,
    scope,
    settings: SETTINGS,
    clock: CLOCK,
    resolved,
    checks,
  });
  const findings = checkScope({
    snapshot,
    scope,
    settings: SETTINGS,
    clock: CLOCK,
    checks,
  }).findings;
  return {
    work,
    findings,
    rows: buildGridRows({
      snapshot,
      scope,
      ranked: work.ranked,
      findings,
      membership: [],
      labels: labelsFor(snapshot),
      ownerNames: new Map([
        ["u-dana", "Dana Reese"],
        ["u-priya", "Priya Nair"],
      ]),
      now: ANCHOR,
    }),
  };
}

describe("the line: a data grid, not a spreadsheet", () => {
  it("edits exactly eight fields, and every one is already tracked in the event log", () => {
    // The grid is a second front end onto I18's capture path, not a second way to write. A field
    // editable here but absent from TRACKED_OPPORTUNITY_FIELDS would change the record with no
    // event behind it — invisible on the timeline and invisible to a leader.
    expect(GRID_EDITABLE_FIELDS).toHaveLength(8);
    for (const field of GRID_EDITABLE_FIELDS) {
      expect(TRACKED_OPPORTUNITY_FIELDS as readonly string[]).toContain(field);
    }
  });

  it("does not make status editable — winning and losing are not cell edits", () => {
    expect(GRID_EDITABLE_FIELDS as readonly string[]).not.toContain("status");
  });
});

describe("derived columns are LOOKED UP, never recomputed", () => {
  const snapshot = snap([
    opportunity({ id: "a", amountCents: 500_000_00, confirmedMilestoneKeys: ALL_BLOCKING }),
    opportunity({ id: "b", amountCents: 250_000_00 }),
    opportunity({ id: "c", amountCents: 75_000_00, stage: "celebrate_steward" }),
  ]);

  it("takes the rank from the ranking engine's own ordering", () => {
    const { work, rows } = build(snapshot);
    for (const item of work.ranked) {
      const row = rows.find((r) => r.opportunityId === item.opportunityId)!;
      expect(row.rank).toBe(item.rank);
      expect(row.statusLabel).toBe(item.statusLabel);
      expect(row.health).toBe(item.health);
      expect(row.impactCents).toBe(item.impactCents);
      expect(row.nextAction?.kind).toBe(item.nextAction.kind);
    }
  });

  it("leaves an unranked record blank rather than inventing a position", () => {
    // `celebrate_steward` is closed work: no ranking rule fires on it, and rank 0 or last would
    // both be claims the engine never made.
    const { rows } = build(snapshot);
    const closed = rows.find((r) => r.opportunityId === "c")!;
    expect(closed.rank).toBeNull();
    expect(closed.statusLabel).toBeNull();
    expect(closed.impactCents).toBeNull();
  });

  it("attaches each finding to the row it is about, and only that row", () => {
    const { findings, rows } = build(snapshot);
    for (const row of rows) {
      expect(row.findings.map((f) => f.ruleId).sort()).toEqual(
        findings
          .filter((f) => f.opportunityId === row.opportunityId)
          .map((f) => f.ruleId)
          .sort(),
      );
    }
  });

  it("agrees with computeQualification about what is a real ask", () => {
    const { rows } = build(snapshot);
    expect(rows.find((r) => r.opportunityId === "a")!.qualification.qualified).toBe(true);
    expect(rows.find((r) => r.opportunityId === "b")!.qualification.qualified).toBe(false);
  });

  it("respects the scope — a rep's grid does not contain another rep's deals", () => {
    const mixed = snap([
      opportunity({ id: "mine", ownerUserId: "u-dana" }),
      opportunity({ id: "theirs", ownerUserId: "u-priya" }),
    ]);
    const { rows } = build(mixed, { ...SCOPE, rep: "u-dana" });
    expect(rows.map((r) => r.opportunityId)).toEqual(["mine"]);
  });
});

describe("the grid's rank column cannot disagree with The Board", () => {
  it("The Board's queue is literally the first slice of the grid's ranking", () => {
    // Not "matches" — IS. Two sorts of the same scores is exactly how two surfaces come to
    // disagree about which deal is #1 while both look right.
    // `visits-without-specific-ask` fires on two visits with no ask recorded — twelve firing
    // records, enough to overflow the seven-item queue, which is the condition under test.
    const snapshot = snap(
      Array.from({ length: 12 }, (_, i) =>
        opportunity({
          id: `o${i}`,
          amountCents: (i + 1) * 10_000_00,
          visitCount: 2,
          lastContactAt: "2026-05-01T00:00:00.000Z",
        }),
      ),
    );
    const { work } = build(snapshot);
    expect(work.queue.length).toBeLessThan(work.ranked.length);
    expect(work.queue).toEqual(work.ranked.slice(0, work.queue.length));
    expect(work.ranked.map((r) => r.rank)).toEqual(work.ranked.map((_, i) => i + 1));
  });
});

describe("group subtotals avoid the naive sum", () => {
  const snapshot = snap([
    opportunity({ id: "q1", amountCents: 100_000_00, confirmedMilestoneKeys: ALL_BLOCKING }),
    opportunity({
      id: "q2",
      amountCents: 50_000_00,
      confirmedMilestoneKeys: ALL_BLOCKING,
      stage: "get_the_visit",
    }),
    opportunity({ id: "u1", amountCents: 400_000_00 }),
    opportunity({ id: "u2", amountCents: 25_000_00, stage: "get_the_visit" }),
    opportunity({ id: "closed", amountCents: 999_000_00, stage: "repeat" }),
  ]);

  it("reports pre-close and qualified separately, never one merged number", () => {
    const { rows } = build(snapshot);
    const groups = groupGridRows(rows, "stage", snapshot);
    const byStage = new Map(groups.map((g) => [g.key, g]));

    const visit = byStage.get("visit_and_ask")!;
    expect(visit.subtotal.preClose.cents).toBe(500_000_00);
    expect(visit.subtotal.qualified.cents).toBe(100_000_00);
    expect(visit.subtotal.unqualified.cents).toBe(400_000_00);
  });

  it("the qualified halves sum to the headline metric, exactly", () => {
    // The whole claim. If a leader adds up the group footers in a Monday meeting they must get the
    // number at the top of the screen; the stage board hit precisely this and I27 answered it with
    // a two-part reconciliation.
    const { rows } = build(snapshot);
    const metrics = computeMetrics({ snapshot, scope: SCOPE, settings: SETTINGS, clock: CLOCK });
    for (const groupBy of ["stage", "owner", "initiative", "none"] as const) {
      const groups = groupGridRows(rows, groupBy, snapshot);
      const summed = groups.reduce((n, g) => n + g.subtotal.qualified.cents, 0);
      expect(summed, `grouped by ${groupBy}`).toBe(metrics.qualifiedAsks.cents);
    }
  });

  it("a naive sum of the pre-close halves would NOT equal the headline — which is the point", () => {
    const { rows } = build(snapshot);
    const metrics = computeMetrics({ snapshot, scope: SCOPE, settings: SETTINGS, clock: CLOCK });
    const groups = groupGridRows(rows, "stage", snapshot);
    const naive = groups.reduce((n, g) => n + g.subtotal.preClose.cents, 0);
    expect(naive).toBeGreaterThan(metrics.qualifiedAsks.cents);
    expect(naive).toBe(metrics.preCloseTotal.cents);
  });

  it("keeps closed work out of both halves", () => {
    const { rows } = build(snapshot);
    const groups = groupGridRows(rows, "stage", snapshot);
    const repeat = groups.find((g) => g.key === "repeat")!;
    expect(repeat.subtotal.preClose.cents).toBe(0);
    expect(repeat.subtotal.qualified.cents).toBe(0);
    expect(repeat.subtotal.closedWork.cents).toBe(999_000_00);
  });

  it("uses the metrics module's own predicates, not a reimplementation", () => {
    const { rows } = build(snapshot);
    const all = gridTotals(rows, snapshot);
    expect(all).toEqual(subtotals(snapshot.opportunities, snapshot.definitions));
  });

  it("orders stage groups by the pipeline, not alphabetically", () => {
    const { rows } = build(snapshot);
    const groups = groupGridRows(rows, "stage", snapshot);
    expect(groups.map((g) => g.key)).toEqual(["get_the_visit", "visit_and_ask", "repeat"]);
  });
});

describe("sorting", () => {
  const snapshot = snap([
    opportunity({
      id: "big",
      amountCents: 900_000_00,
      stage: "follow_up_and_close",
      closeDate: "2026-10-01",
    }),
    opportunity({ id: "mid", amountCents: 500_000_00, stage: "get_the_visit", closeDate: null }),
    opportunity({
      id: "small",
      amountCents: 10_000_00,
      stage: "visit_and_ask",
      closeDate: "2026-09-20",
    }),
  ]);

  it("sorts by amount in both directions", () => {
    const { rows } = build(snapshot);
    expect(sortGridRows(rows, "amount", "desc").map((r) => r.opportunityId)).toEqual([
      "big",
      "mid",
      "small",
    ]);
    expect(sortGridRows(rows, "amount", "asc").map((r) => r.opportunityId)).toEqual([
      "small",
      "mid",
      "big",
    ]);
  });

  it("sorts stage by pipeline order rather than by label", () => {
    const { rows } = build(snapshot);
    expect(sortGridRows(rows, "stage", "asc").map((r) => r.stage)).toEqual([
      "get_the_visit",
      "visit_and_ask",
      "follow_up_and_close",
    ]);
  });

  it("puts a missing value last in BOTH directions — an absent date is not an early one", () => {
    const { rows } = build(snapshot);
    expect(
      sortGridRows(rows, "closeDate", "asc")
        .map((r) => r.opportunityId)
        .at(-1),
    ).toBe("mid");
    expect(
      sortGridRows(rows, "closeDate", "desc")
        .map((r) => r.opportunityId)
        .at(-1),
    ).toBe("mid");
  });

  it("is stable on ties, so the grid does not reshuffle under a cursor mid-edit", () => {
    const tied = snap([
      opportunity({ id: "zzz", amountCents: 100_00 }),
      opportunity({ id: "aaa", amountCents: 100_00 }),
      opportunity({ id: "mmm", amountCents: 100_00 }),
    ]);
    const { rows } = build(tied);
    const once = sortGridRows(rows, "amount", "desc").map((r) => r.opportunityId);
    const twice = sortGridRows([...rows].reverse(), "amount", "desc").map((r) => r.opportunityId);
    expect(once).toEqual(twice);
    expect(once).toEqual(["aaa", "mmm", "zzz"]);
  });
});

describe("filtering", () => {
  const snapshot = snap([
    opportunity({ id: "a", stage: "get_the_visit", confirmedMilestoneKeys: ALL_BLOCKING }),
    opportunity({ id: "b", stage: "visit_and_ask", probability: "lock" }),
    opportunity({ id: "c", stage: "visit_and_ask", ownerUserId: "u-priya" }),
  ]);

  it("filters by stage, probability, owner and qualification", () => {
    const { rows } = build(snapshot);
    expect(filterGridRows(rows, { stage: ["visit_and_ask"] }).map((r) => r.opportunityId)).toEqual([
      "b",
      "c",
    ]);
    expect(filterGridRows(rows, { probability: ["lock"] }).map((r) => r.opportunityId)).toEqual([
      "b",
    ]);
    expect(filterGridRows(rows, { owner: ["u-priya"] }).map((r) => r.opportunityId)).toEqual(["c"]);
    expect(
      filterGridRows(rows, { qualification: "qualified" }).map((r) => r.opportunityId),
    ).toEqual(["a"]);
    expect(
      filterGridRows(rows, { qualification: "unqualified" }).map((r) => r.opportunityId),
    ).toEqual(["b", "c"]);
  });

  it("an empty filter is not a filter", () => {
    const { rows } = build(snapshot);
    expect(filterGridRows(rows, {})).toHaveLength(rows.length);
    expect(filterGridRows(rows, { stage: [] })).toHaveLength(rows.length);
  });

  it("combines filters as AND", () => {
    const { rows } = build(snapshot);
    expect(
      filterGridRows(rows, { stage: ["visit_and_ask"], owner: ["u-priya"] }).map(
        (r) => r.opportunityId,
      ),
    ).toEqual(["c"]);
  });
});

describe("milestones travel with their source", () => {
  it("carries they-said / we-said so the dot cannot be misread", () => {
    // Filled-versus-empty already means they-said-versus-we-said everywhere else in this product.
    // A dot that used fill for "confirmed" alone would render a we-said milestone as though the
    // prospect had said it, in the densest place on the screen.
    const snapshot = snap([opportunity({ id: "a", confirmedMilestoneKeys: ALL_BLOCKING })]);
    const { rows } = build(snapshot);
    const milestones = rows[0]!.milestones;
    expect(milestones).toHaveLength(DEFS.length);
    for (const m of milestones) {
      const def = DEFS.find((d) => d.key === m.key)!;
      expect(m.source).toBe(def.source);
      expect(m.blocking).toBe(def.blocking);
      expect(m.confirmed).toBe(ALL_BLOCKING.includes(m.key));
    }
  });
});

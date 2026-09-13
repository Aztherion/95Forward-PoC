import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkScope,
  DEFAULT_FORWARD_SETTINGS,
  evaluateWhatIf,
  fixedClock,
  type ConsequenceEvaluator,
  type MetricScope,
  type MetricsSnapshot,
} from "@95forward/shared";
import { eq } from "drizzle-orm";
import { seed } from "./seed";
import { stableId } from "./seed-records-core";
import { DEMO_TODAY } from "./demo-clock";
import { connectTestDb, type TestDb } from "./test-support";
import type { Database } from "./client";
import { users } from "./schema/users";
import { loadMetricsSnapshot } from "./forward-metrics-repo";

let handle: TestDb | null = null;
let db: Database;
let tenantId: string;
let snapshot: MetricsSnapshot;
let danaId: string;

const CLOCK = fixedClock(DEMO_TODAY);
const ALL: MetricScope = { rep: "all", initiative: "all", period: "FY26" };
const BOLIVIA = stableId("initiative:bolivia");

const HALLWORTH = stableId("forward-opportunity:hallworth-kamuli");
const OSGOOD = stableId("forward-opportunity:osgood-bolivia");
const CORNERSTONE = stableId("forward-opportunity:cornerstone-bolivia");

beforeAll(async () => {
  handle = await connectTestDb();
  if (!handle) return;
  db = handle.db;
  ({ tenantId } = await seed(db));
  snapshot = await loadMetricsSnapshot(db, tenantId);
  const userRows = await db.select().from(users).where(eq(users.tenantId, tenantId));
  danaId = userRows.find((u) => u.email === "dana.reese@waterforpeople.org")?.id ?? "";
}, 120_000);

afterAll(async () => {
  if (handle) await handle.pool.end();
});

const maybe = (name: string, fn: () => void) =>
  it(name, () => {
    if (!handle) return;
    fn();
  });

function run(scope: MetricScope = ALL, evaluators?: readonly ConsequenceEvaluator[]) {
  return checkScope({
    snapshot,
    scope,
    settings: DEFAULT_FORWARD_SETTINGS,
    clock: CLOCK,
    evaluators,
  });
}

// =================================================================================================
// GOLDEN — the three designed pathologies, in the designed order.
// =================================================================================================

describe("golden: the seeded Fix-first block", () => {
  maybe("detects exactly the three designed contradictions, and nothing else", () => {
    const result = run();
    // The total matters as much as the contents: a new check that over-fires breaks this.
    expect(result.count).toBe(3);
    expect(result.findings.map((f) => f.ruleId)).toEqual([
      "written-confirmation-no-evidence",
      "amount-agreed-no-confirmed-date",
      "close-date-past-stage-open",
    ]);
  });

  maybe("orders by consequence magnitude descending", () => {
    const cents = run().findings.map((f) => f.consequence.cents ?? 0);
    expect(cents).toEqual([30_000_000, 25_000_000, 18_000_000]); // $300k, $250k, $180k
    expect([...cents].sort((a, b) => b - a)).toEqual(cents);
  });

  maybe("attaches each finding to the right opportunity", () => {
    const byRule = new Map(run().findings.map((f) => [f.ruleId, f]));
    expect(byRule.get("written-confirmation-no-evidence")?.opportunityId).toBe(CORNERSTONE);
    expect(byRule.get("amount-agreed-no-confirmed-date")?.opportunityId).toBe(HALLWORTH);
    expect(byRule.get("close-date-past-stage-open")?.opportunityId).toBe(OSGOOD);
  });

  maybe("states Hallworth's contradiction and what it costs", () => {
    const finding = run().findings.find((f) => f.opportunityId === HALLWORTH);
    expect(finding?.statement).toBe("Amount agreed, but no close date confirmed by the prospect.");
    expect(finding?.consequence.kind).toBe("excluded-from-forecast");
    expect(finding?.consequence.cents).toBe(25_000_000);
    expect(finding?.consequence.text).toBe(
      "Excluded from the forecast — worth $250,000 once corrected.",
    );
    expect(finding?.effortSeconds).toBe(30);
    expect(finding?.resolution).toMatchObject({
      kind: "confirm-milestone",
      label: "Confirm close date",
      targetMilestone: "close_date_confirmed",
    });
  });

  maybe("states Cornerstone's contradiction and what it inflates", () => {
    const finding = run().findings.find((f) => f.opportunityId === CORNERSTONE);
    expect(finding?.consequence.kind).toBe("inflates-asks");
    expect(finding?.consequence.text).toBe("Inflates asks on the table by $300,000.");
    expect(finding?.resolution.label).toBe("Attach or uncheck");
  });

  maybe("states Osgood's contradiction honestly while I21 does not exist", () => {
    const finding = run().findings.find((f) => f.opportunityId === OSGOOD);
    expect(finding?.statement).toBe(
      "Close date 2026-08-15 is in the past while the stage still reads visit and ask.",
    );
    expect(finding?.consequence.provisional).toBe(true);
    expect(finding?.consequence.text).toBe(
      "$180,000 is forecast on a close date we know is wrong.",
    );
    expect(finding?.resolution.label).toBe("Re-date or close out");
  });

  maybe("clears in under three minutes", () => {
    const result = run();
    expect(result.totalEffortSeconds).toBe(150);
    expect(result.totalEffortSeconds).toBeLessThan(180);
  });
});

describe("consequence integrity — computed, not asserted against a literal", () => {
  maybe("every finding's cents equals the whatIf delta it claims", () => {
    for (const finding of run().findings) {
      if (finding.consequence.kind === "distorts-simulation") continue; // sized by I21 later
      const opportunity = snapshot.opportunities.find((o) => o.id === finding.opportunityId);
      expect(opportunity).toBeDefined();
      if (!opportunity) continue;

      const blocking = snapshot.definitions.filter((d) => d.blocking).map((d) => d.key);
      const overrides =
        finding.consequence.kind === "excluded-from-forecast"
          ? { milestonePatches: { [opportunity.id]: blocking } }
          : {
              milestonePatches: {
                [opportunity.id]: opportunity.confirmedMilestoneKeys.filter(
                  (k) => k !== "confirmed_in_writing",
                ),
              },
            };

      const delta = evaluateWhatIf({
        snapshot,
        scope: ALL,
        settings: DEFAULT_FORWARD_SETTINGS,
        clock: CLOCK,
        overrides,
      }).qualifiedAsksDeltaCents;

      expect(Math.abs(delta), `${finding.ruleId} consequence`).toBe(finding.consequence.cents);
    }
  });

  maybe("no finding carries a null consequence", () => {
    for (const finding of run().findings) {
      expect(finding.consequence.cents, finding.ruleId).not.toBeNull();
      expect(finding.consequence.cents).toBeGreaterThan(0);
    }
  });
});

describe("no false positives against the seed", () => {
  maybe("the rest of the portfolio produces nothing", () => {
    const flagged = new Set(run().findings.map((f) => f.opportunityId));
    const open = snapshot.opportunities.filter((o) => o.status === "open");
    // I18b took the portfolio from 10 open records to 28, and the finding count did NOT move.
    // That is the discipline the Fix-first block depends on: three contradictions a rep can clear
    // in under three minutes, not a backlog that grows with the pipeline.
    expect(open.length).toBe(28);
    expect(flagged.size).toBe(3);

    // Specifically: the qualified ones and the genuinely early ones are silent.
    expect(flagged.has(stableId("forward-opportunity:cordova-kamuli"))).toBe(false);
    expect(flagged.has(stableId("forward-opportunity:northwater-kamuli"))).toBe(false);
    expect(flagged.has(stableId("forward-opportunity:vega-forever-promise"))).toBe(false);
    expect(flagged.has(stableId("forward-opportunity:bello-forever-promise"))).toBe(false);
    expect(flagged.has(stableId("forward-opportunity:cordova-bolivia"))).toBe(false);
  });

  maybe("the stewarding opportunity is not flagged — open in a closed-work stage is legitimate", () => {
    const steward = stableId("forward-opportunity:osgood-kamuli-steward");
    expect(run().findings.map((f) => f.opportunityId)).not.toContain(steward);
  });

  maybe("won records produce nothing", () => {
    const wonIds = snapshot.opportunities.filter((o) => o.status === "won").map((o) => o.id);
    expect(wonIds).toHaveLength(6);
    const flagged = run().findings.map((f) => f.opportunityId);
    for (const id of wonIds) expect(flagged).not.toContain(id);
  });
});

describe("scope", () => {
  maybe("filters findings to one initiative", () => {
    const bolivia = run({ ...ALL, initiative: BOLIVIA });
    expect(bolivia.findings.map((f) => f.opportunityId).sort()).toEqual(
      [CORNERSTONE, OSGOOD].sort(),
    );
  });

  maybe("filters findings to one rep", () => {
    const dana = run({ ...ALL, rep: danaId });
    // Hallworth is Dana's; Osgood and Cornerstone are Priya's.
    expect(dana.findings.map((f) => f.opportunityId)).toEqual([HALLWORTH]);
    expect(dana.totalEffortSeconds).toBe(30);
  });

  maybe("scoped findings are a subset of the unscoped set", () => {
    const all = new Set(run().findings.map((f) => `${f.ruleId}:${f.opportunityId}`));
    const scoped = run({ ...ALL, initiative: BOLIVIA }).findings.map(
      (f) => `${f.ruleId}:${f.opportunityId}`,
    );
    for (const key of scoped) expect(all.has(key)).toBe(true);
  });
});

describe("I21 integration, proven before I21 exists", () => {
  maybe("a registered simulation evaluator upgrades the wording in place", () => {
    const simulation: ConsequenceEvaluator = {
      kind: "distorts-simulation",
      evaluate: ({ ctx }) => ({
        kind: "distorts-simulation",
        cents: 6_000_000,
        text: "Distorts best/worst by $60,000.",
        provisional: false,
      }),
    };
    const finding = run(ALL, [simulation]).findings.find((f) => f.opportunityId === OSGOOD);
    expect(finding?.consequence.text).toBe("Distorts best/worst by $60,000.");
    expect(finding?.consequence.provisional).toBe(false);
    // The check definition, statement and resolution are untouched by the upgrade.
    expect(finding?.ruleId).toBe("close-date-past-stage-open");
    expect(finding?.resolution.label).toBe("Re-date or close out");
  });

  maybe("re-ordering follows the upgraded consequence", () => {
    const shrink: ConsequenceEvaluator = {
      kind: "distorts-simulation",
      evaluate: () => ({
        kind: "distorts-simulation",
        cents: 100,
        text: "Barely distorts anything.",
        provisional: false,
      }),
    };
    const ids = run(ALL, [shrink]).findings.map((f) => f.opportunityId);
    expect(ids[ids.length - 1]).toBe(OSGOOD);
  });
});

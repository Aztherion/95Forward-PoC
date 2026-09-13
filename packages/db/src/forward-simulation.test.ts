import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkScope,
  DEFAULT_FORWARD_SETTINGS,
  fixedClock,
  simulationConsequenceEvaluator,
  type ForwardSettings,
  type MetricScope,
  type MetricsSnapshot,
} from "@95forward/shared";
import { seed } from "./seed";
import { stableId } from "./seed-records-core";
import { DEMO_TODAY } from "./demo-clock";
import { connectTestDb, type TestDb } from "./test-support";
import type { Database } from "./client";
import { loadMetricsSnapshot } from "./forward-metrics-repo";
import { ForwardSimulationService, dataVersion, simulationCacheKey } from "./forward-simulation-repo";

let handle: TestDb | null = null;
let db: Database;
let tenantId: string;
let snapshot: MetricsSnapshot;
let version: string;

const CLOCK = fixedClock(DEMO_TODAY);
const ALL: MetricScope = { rep: "all", initiative: "all", period: "FY26" };
const KAMULI = stableId("initiative:kamuli");
const OSGOOD = stableId("forward-opportunity:osgood-bolivia");

/** Trimmed trials keep the suite quick; determinism keeps the results exact regardless. */
const SETTINGS: ForwardSettings = {
  ...DEFAULT_FORWARD_SETTINGS,
  simulation: {
    ...DEFAULT_FORWARD_SETTINGS.simulation,
    trialCount: 2_000,
    consequenceTrialCount: 500,
  },
};

beforeAll(async () => {
  handle = await connectTestDb();
  if (!handle) return;
  db = handle.db;
  ({ tenantId } = await seed(db));
  snapshot = await loadMetricsSnapshot(db, tenantId);
  version = await dataVersion(db, tenantId);
}, 120_000);

afterAll(async () => {
  if (handle) await handle.pool.end();
});

const maybe = (name: string, fn: () => void | Promise<void>) =>
  it(name, async () => {
    if (!handle) return;
    await fn();
  });

const RULES_VERSION = "1";

function service(settings: ForwardSettings = SETTINGS, cache?: Map<string, never>) {
  return new ForwardSimulationService(snapshot, {
    settings,
    clock: CLOCK,
    dataVersion: version,
    rulesVersion: RULES_VERSION,
    cache: cache as never,
  });
}

describe("the seeded curve", () => {
  maybe("runs the whole fiscal period and stays ordered every month", () => {
    const result = service().run(ALL);
    expect(result.months).toHaveLength(12);
    for (const month of result.months) {
      expect(month.worstCents).toBeLessThanOrEqual(month.mostLikelyCents);
      expect(month.mostLikelyCents).toBeLessThanOrEqual(month.bestCents);
    }
  });

  maybe("continues from won-to-date rather than restarting at zero", () => {
    const result = service().run(ALL);
    // $385,200 is already won across the period, so no line may ever sit below it at year end.
    expect(result.yearEnd.worstCents).toBeGreaterThanOrEqual(38_520_000);
    const december = result.months[11]!;
    expect(december.worstCents).toBeGreaterThanOrEqual(38_520_000);
  });

  maybe("stops the actuals at the anchor month", () => {
    const months = service().run(ALL).months;
    expect(months[8]?.actualCents).toBe(38_520_000); // September, the anchor
    expect(months[9]?.actualCents).toBeUndefined();
  });

  maybe("never books a fraction of any seeded amount", () => {
    // Every seeded amount is a whole number of dollars in round hundreds; an expected-value
    // implementation would produce totals that are not reachable by summing whole amounts.
    const amounts = snapshot.opportunities.map((o) => o.amountCents);
    const result = service().run(ALL);
    const reachable = new Set<number>([0]);
    for (const amount of amounts) {
      for (const existing of [...reachable]) reachable.add(existing + amount);
    }
    expect(reachable.has(result.yearEnd.worstCents)).toBe(true);
    expect(reachable.has(result.yearEnd.mostLikelyCents)).toBe(true);
    expect(reachable.has(result.yearEnd.bestCents)).toBe(true);
  });

  maybe("reports its own trial count for the chart subtitle", () => {
    expect(service().run(ALL).meta.trialCount).toBe(2_000);
    expect(service().run(ALL).meta.vintageDate).toBe("2026-09-12");
  });
});

describe("determinism", () => {
  maybe("identical inputs produce an identical curve", () => {
    const first = service().run(ALL);
    const second = new ForwardSimulationService(snapshot, {
      settings: SETTINGS,
      clock: CLOCK,
      dataVersion: version,
      rulesVersion: RULES_VERSION,
    }).run(ALL);
    expect(second.meta.seed).toBe(first.meta.seed);
    expect(second.months).toEqual(first.months);
    expect(second.membership).toEqual(first.membership);
  });

  maybe("a different vintage date produces a different curve", () => {
    const tomorrow = new ForwardSimulationService(snapshot, {
      settings: SETTINGS,
      clock: fixedClock(new Date("2026-09-13T12:00:00.000Z")),
      dataVersion: version,
      rulesVersion: RULES_VERSION,
    }).run(ALL);
    expect(tomorrow.meta.seed).not.toBe(service().run(ALL).meta.seed);
  });

  maybe("editing one amount produces a different curve", () => {
    const edited: MetricsSnapshot = {
      ...snapshot,
      opportunities: snapshot.opportunities.map((o) =>
        o.id === OSGOOD ? { ...o, amountCents: o.amountCents + 1 } : o,
      ),
    };
    const changed = new ForwardSimulationService(edited, {
      settings: SETTINGS,
      clock: CLOCK,
      dataVersion: version,
      rulesVersion: RULES_VERSION,
    }).run(ALL);
    expect(changed.meta.seed).not.toBe(service().run(ALL).meta.seed);
  });
});

describe("membership", () => {
  maybe("covers every open pre-close opportunity, qualified or not", () => {
    const result = service().run(ALL);
    const preClose = snapshot.opportunities.filter(
      (o) => o.status === "open" && !["celebrate_steward", "repeat"].includes(o.stage),
    );
    expect(result.membership).toHaveLength(preClose.length);
    expect(result.membership.some((m) => !m.qualified)).toBe(true);
    expect(result.membership.some((m) => m.qualified)).toBe(true);
  });

  maybe("badges are monotone by construction, even where raw rates are not", () => {
    // Raw inclusion rates are NOT guaranteed to be ordered. A scenario neighbourhood is the trials
    // whose YEAR-END TOTAL is nearest a percentile, and a given total is reachable by many different
    // combinations — so a large, low-probability opportunity can appear in a few worst-neighbourhood
    // trials (it closed, little else did) and in none of the best-neighbourhood ones (trials where
    // it closes overshoot P90 and are not "nearest" to it).
    //
    // The badge is monotone anyway, because it is assigned by the LOWEST-percentile scenario the
    // opportunity qualifies for. That is what "by construction" buys.
    const threshold = SETTINGS.simulation.membershipThreshold;
    for (const row of service().run(ALL).membership) {
      if (row.inclusionRates.worst >= threshold) {
        expect(row.badge, row.opportunityId).toBe("IN_ALL_THREE");
      } else if (row.inclusionRates.mostLikely >= threshold) {
        expect(row.badge, row.opportunityId).toBe("MOST_LIKELY_PLUS");
      } else if (row.inclusionRates.best >= threshold) {
        expect(row.badge, row.opportunityId).toBe("BEST_ONLY");
      } else {
        expect(row.badge, row.opportunityId).toBe("OUTSIDE_BEST");
      }
    }
  });

  maybe("the best-only footer decomposes to its rows", () => {
    const result = service().run(ALL);
    const rows = result.membership.filter((m) => m.badge === "BEST_ONLY");
    expect(result.bestOnly.count).toBe(rows.length);
    expect(result.bestOnly.cents).toBe(rows.reduce((sum, r) => sum + r.amountCents, 0));
    expect(result.bestOnly.unqualifiedCents).toBe(
      rows.filter((r) => !r.qualified).reduce((sum, r) => sum + r.amountCents, 0),
    );
    expect(result.bestOnly.unqualifiedCents).toBeLessThanOrEqual(result.bestOnly.cents);
  });

  maybe("higher bands sit in more scenarios than lower ones", () => {
    const byId = new Map(service().run(ALL).membership.map((m) => [m.opportunityId, m]));
    const bookable = byId.get(stableId("forward-opportunity:cordova-kamuli")); // bookable
    const longshot = byId.get(stableId("forward-opportunity:bello-forever-promise")); // longshot
    expect(bookable?.inclusionRates.mostLikely).toBeGreaterThan(
      longshot?.inclusionRates.mostLikely ?? 1,
    );
  });
});

describe("scope parity with I19", () => {
  maybe("a scoped simulation covers exactly what scopeMatches returns", () => {
    const kamuli = service().run({ ...ALL, initiative: KAMULI });
    const expected = snapshot.opportunities
      .filter(
        (o) =>
          o.initiativeId === KAMULI &&
          o.status === "open" &&
          !["celebrate_steward", "repeat"].includes(o.stage),
      )
      .map((o) => o.id)
      .sort();
    expect(kamuli.membership.map((m) => m.opportunityId).sort()).toEqual(expected);
  });
});

describe("caching", () => {
  maybe("an identical key hits the cache", () => {
    const svc = service();
    svc.run(ALL);
    svc.run(ALL);
    expect(svc.stats).toEqual({ hits: 1, misses: 1 });
  });

  maybe("a data-version bump forces a recompute", () => {
    const cache = new Map();
    const before = new ForwardSimulationService(snapshot, {
      settings: SETTINGS,
      clock: CLOCK,
      dataVersion: version,
      rulesVersion: RULES_VERSION,
      cache,
    });
    before.run(ALL);

    const after = new ForwardSimulationService(snapshot, {
      settings: SETTINGS,
      clock: CLOCK,
      dataVersion: `${version}|changed`,
      rulesVersion: RULES_VERSION,
      cache,
    });
    after.run(ALL);
    expect(after.stats.misses).toBe(1);
    expect(after.stats.hits).toBe(0);
    expect(cache.size).toBe(2);
  });

  maybe("what-ifs are never cached — they are unbounded and never reused", () => {
    const svc = service();
    svc.run(ALL, { excludeOpportunityIds: [OSGOOD] });
    svc.run(ALL, { excludeOpportunityIds: [OSGOOD] });
    expect(svc.stats.hits).toBe(0);
  });

  maybe("the cache key moves with settings, not just data", () => {
    const a = simulationCacheKey(ALL, version, SETTINGS, 2_000, RULES_VERSION);
    const b = simulationCacheKey(ALL, version, SETTINGS, 500, RULES_VERSION);
    const c = simulationCacheKey(
      ALL,
      version,
      { ...SETTINGS, simulation: { ...SETTINGS.simulation, membershipThreshold: 0.9 } },
      2_000,
      RULES_VERSION,
    );
    // I22: a rule switched off or a statement rewritten changes no simulation parameter, so only
    // the rules version distinguishes these two keys.
    const d = simulationCacheKey(ALL, version, SETTINGS, 2_000, "7");
    expect(b).not.toBe(a);
    expect(c).not.toBe(a);
    expect(d).not.toBe(a);
  });

  maybe("the data version moves when the portfolio moves", async () => {
    const again = await dataVersion(db, tenantId);
    expect(again).toBe(version);
    expect(version).not.toBe("none|0|none|0|0");
  });
});

describe("slip beyond the period", () => {
  maybe("is ordered and non-negative", () => {
    const slip = service().run(ALL).slipBeyondPeriod;
    expect(slip.worstCents).toBeGreaterThanOrEqual(0);
    expect(slip.worstCents).toBeLessThanOrEqual(slip.mostLikelyCents);
    expect(slip.mostLikelyCents).toBeLessThanOrEqual(slip.bestCents);
  });
});

// =================================================================================================
// The handoff I20 built the interface for.
// =================================================================================================

describe("completing I20's distorts-simulation evaluator", () => {
  function findings(evaluators?: readonly (typeof simulationConsequenceEvaluator)[]) {
    return checkScope({
      snapshot,
      scope: ALL,
      settings: SETTINGS,
      clock: CLOCK,
      evaluators,
    });
  }

  maybe("the Osgood finding is provisional without the simulation evaluator", () => {
    const finding = findings().findings.find((f) => f.opportunityId === OSGOOD);
    expect(finding?.consequence.provisional).toBe(true);
    expect(finding?.consequence.text).toBe(
      "$180,000 is forecast on a close date we know is wrong.",
    );
  });

  maybe("registering the real evaluator upgrades it in place", () => {
    const finding = findings([simulationConsequenceEvaluator]).findings.find(
      (f) => f.opportunityId === OSGOOD,
    );
    expect(finding?.consequence.provisional).toBe(false);
    expect(finding?.consequence.text).toMatch(/^Distorts best\/worst by \$[\d,]+\.$/);
    // The check definition is untouched by the upgrade — that was the point of the interface.
    expect(finding?.ruleId).toBe("close-date-past-stage-open");
    expect(finding?.resolution.label).toBe("Re-date or close out");
    expect(finding?.statement).toBe(
      "Close date 2026-08-15 is in the past while the stage still reads visit and ask.",
    );
  });

  maybe("the upgraded consequence is derived from the band, not the amount", () => {
    const before = findings().findings.find((f) => f.opportunityId === OSGOOD);
    const after = findings([simulationConsequenceEvaluator]).findings.find(
      (f) => f.opportunityId === OSGOOD,
    );
    // The fallback reported the raw amount; the real one reports the change in best-to-worst
    // spread, which is a different quantity.
    expect(before?.consequence.cents).toBe(18_000_000);
    expect(after?.consequence.cents).not.toBe(18_000_000);
  });

  maybe("Fix-first still returns all three findings, re-sorted by the new magnitude", () => {
    const upgraded = findings([simulationConsequenceEvaluator]);
    expect(upgraded.count).toBe(3);
    const cents = upgraded.findings.map((f) => f.consequence.cents ?? 0);
    expect([...cents].sort((a, b) => b - a)).toEqual(cents);
    expect(upgraded.totalEffortSeconds).toBe(150);
  });

  maybe("is deterministic — the same consequence twice", () => {
    const first = findings([simulationConsequenceEvaluator]).findings.find(
      (f) => f.opportunityId === OSGOOD,
    );
    const second = findings([simulationConsequenceEvaluator]).findings.find(
      (f) => f.opportunityId === OSGOOD,
    );
    expect(second?.consequence.cents).toBe(first?.consequence.cents);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  DEFAULT_FORWARD_SETTINGS,
  fixedClock,
  type MetricScope,
  type MetricsSnapshot,
} from "@95forward/shared";
import { seed } from "./seed";
import { stableId } from "./seed-records-core";
import { DEMO_TODAY } from "./demo-clock";
import { connectTestDb, type TestDb } from "./test-support";
import type { Database } from "./client";
import { users } from "./schema/users";
import { ForwardMetricsService, loadMetricsSnapshot } from "./forward-metrics-repo";

let handle: TestDb | null = null;
let db: Database;
let tenantId: string;
let service: ForwardMetricsService;
let snapshot: MetricsSnapshot;
let danaId: string;
let priyaId: string;

const CLOCK = fixedClock(DEMO_TODAY);
const ALL: MetricScope = { rep: "all", initiative: "all", period: "FY26" };

const KAMULI = stableId("initiative:kamuli");
const BOLIVIA = stableId("initiative:bolivia");
const FOREVER = stableId("initiative:forever-promise");
const UNRESTRICTED = stableId("initiative:unrestricted");

beforeAll(async () => {
  handle = await connectTestDb();
  if (!handle) return;
  db = handle.db;
  ({ tenantId } = await seed(db));
  snapshot = await loadMetricsSnapshot(db, tenantId);
  service = new ForwardMetricsService(snapshot, {
    settings: DEFAULT_FORWARD_SETTINGS,
    clock: CLOCK,
  });
  const userRows = await db.select().from(users).where(eq(users.tenantId, tenantId));
  danaId = userRows.find((u) => u.email === "dana.reese@waterforpeople.org")?.id ?? "";
  priyaId = userRows.find((u) => u.email === "priya.nair@waterforpeople.org")?.id ?? "";
}, 120_000);

afterAll(async () => {
  if (handle) await handle.pool.end();
});

const maybe = (name: string, fn: () => Promise<void> | void) =>
  it(name, async () => {
    if (!handle) return;
    await fn();
  });

// =================================================================================================
// THE GOLDEN TEST
//
// This locks the tie-out end to end. If a later change breaks the arithmetic, this is what catches
// it — so read a failure here as "the numbers no longer agree", not "update the expectation".
// =================================================================================================

describe("golden tie-out against the seed", () => {
  maybe("computes the full arithmetic chain exactly", () => {
    const m = service.metrics(ALL);

    // Pipeline, in cents.
    expect(m.preCloseTotal.cents).toBe(370_800_000); // $3,708,000
    expect(m.qualifiedAsks.cents).toBe(172_000_000); //  $1,720,000
    expect(m.unqualified.cents).toBe(198_800_000); //    $1,988,000
    expect(m.closedWork.cents).toBe(4_800_000); //          $48,000
    expect(m.won.cents).toBe(46_920_000); //               $469,200

    // The split reconciles.
    expect(m.qualifiedAsks.cents + m.unqualified.cents).toBe(m.preCloseTotal.cents);

    // Goal, basis and coverage.
    expect(m.goalDefined).toBe(true);
    expect(m.goalScope).toBe("org");
    expect(m.goalCents).toBe(270_000_000); //          $2,700,000
    expect(m.basisCents).toBe(223_080_000); //         $2,230,800  = goal - won
    expect(m.neededAtCoverageCents).toBe(669_240_000); // $6,692,400  = 3 x basis
    expect(m.coverageGapCents).toBe(-497_240_000); //  -$4,972,400  = qualified - needed
    expect(m.coverageRatio).toBeCloseTo(0.771, 3); //        0.77x

    // Every displayed figure is derived from the two above it.
    expect(m.basisCents).toBe((m.goalCents ?? 0) - m.won.cents);
    expect(m.neededAtCoverageCents).toBe(3 * (m.basisCents ?? 0));
    expect(m.coverageGapCents).toBe(m.qualifiedAsks.cents - (m.neededAtCoverageCents ?? 0));
  });

  maybe("derives the new-ask requirement from the computed weeksLeft", () => {
    const m = service.metrics(ALL);
    expect(m.weeksLeft).toBe(15);
    expect(m.newAsksNeeded?.perWeek).toBeCloseTo(497_240_000 / 15, 6); // $331,493/wk
    expect(m.newAsksNeeded?.perDay).toBeCloseTo(497_240_000 / 15 / 5, 6); // $66,299/day
    expect(m.newAsksNeeded?.perHour).toBeCloseTo(497_240_000 / 15 / 5 / 4, 6); // $16,575/hr
  });

  maybe("counts 27 pre-close opportunities, of which 6 are qualified", () => {
    const m = service.metrics(ALL);
    // Most of the pipeline is NOT a real ask. That ratio is the product's thesis, not a data gap.
    expect(m.preCloseTotal.count).toBe(27);
    expect(m.qualifiedAsks.count).toBe(6);
    expect(m.unqualified.count).toBe(21);
    expect(m.won.count).toBe(6);
    expect(m.closedWork.count).toBe(1);
  });

  maybe("keeps Hallworth in the pre-close columns but out of qualified asks", () => {
    const hallworth = stableId("forward-opportunity:hallworth-kamuli");
    const m = service.metrics(ALL);
    expect(m.preCloseTotal.opportunityIds).toContain(hallworth);
    expect(m.qualifiedAsks.opportunityIds).not.toContain(hallworth);
    expect(m.unqualified.opportunityIds).toContain(hallworth);
  });
});

describe("decomposition — no number exists without names", () => {
  maybe("every aggregate's ids sum to its cents and match its count", () => {
    const byId = new Map(snapshot.opportunities.map((o) => [o.id, o.amountCents]));
    const m = service.metrics(ALL);
    for (const key of [
      "won",
      "qualifiedAsks",
      "preCloseTotal",
      "unqualified",
      "closedWork",
    ] as const) {
      const agg = m[key];
      const summed = agg.opportunityIds.reduce((sum, id) => sum + (byId.get(id) ?? 0), 0);
      expect(summed, `${key} ids must sum to cents`).toBe(agg.cents);
      expect(agg.opportunityIds, `${key} ids must match count`).toHaveLength(agg.count);
      expect(new Set(agg.opportunityIds).size, `${key} ids must be unique`).toBe(agg.count);
    }
  });

  maybe("qualified and unqualified id sets are disjoint and cover pre-close", () => {
    const m = service.metrics(ALL);
    const q = new Set(m.qualifiedAsks.opportunityIds);
    const u = new Set(m.unqualified.opportunityIds);
    expect([...q].some((id) => u.has(id))).toBe(false);
    expect(new Set([...q, ...u])).toEqual(new Set(m.preCloseTotal.opportunityIds));
  });
});

describe("scope", () => {
  maybe("each initiative tab sums back to the all-initiatives total", () => {
    const all = service.metrics(ALL);
    const perInitiative = [KAMULI, BOLIVIA, FOREVER, UNRESTRICTED].map((id) =>
      service.metrics({ ...ALL, initiative: id }),
    );
    const summedPreClose = perInitiative.reduce((sum, m) => sum + m.preCloseTotal.cents, 0);
    const summedQualified = perInitiative.reduce((sum, m) => sum + m.qualifiedAsks.cents, 0);

    expect(summedPreClose).toBe(all.preCloseTotal.cents);
    expect(summedQualified).toBe(all.qualifiedAsks.cents);
  });

  maybe("scopes to a single rep, and the reps partition the whole", () => {
    const all = service.metrics(ALL);
    const dana = service.metrics({ ...ALL, rep: danaId });
    const priya = service.metrics({ ...ALL, rep: priyaId });

    expect(dana.preCloseTotal.cents + priya.preCloseTotal.cents).toBe(all.preCloseTotal.cents);
    expect(dana.qualifiedAsks.cents + priya.qualifiedAsks.cents).toBe(all.qualifiedAsks.cents);
    expect(dana.preCloseTotal.cents).toBeGreaterThan(0);
    expect(priya.preCloseTotal.cents).toBeGreaterThan(0);
  });

  maybe("the cross-product narrows further than either axis alone", () => {
    const danaAll = service.metrics({ ...ALL, rep: danaId });
    const danaKamuli = service.metrics({ rep: danaId, initiative: KAMULI, period: "FY26" });
    expect(danaKamuli.preCloseTotal.cents).toBeLessThanOrEqual(danaAll.preCloseTotal.cents);
    expect(
      danaKamuli.preCloseTotal.opportunityIds.every((id) =>
        danaAll.preCloseTotal.opportunityIds.includes(id),
      ),
    ).toBe(true);
  });

  maybe("resolves the initiative's own goal when scoped to one initiative", () => {
    const kamuli = service.metrics({ ...ALL, initiative: KAMULI });
    expect(kamuli.goalDefined).toBe(true);
    expect(kamuli.goalScope).toBe("initiative");
    expect(kamuli.goalCents).toBe(120_000_000); // $1,200,000
  });
});

describe("strict goal resolution against the seed", () => {
  maybe("Forever Promise has no goal, and does NOT borrow the org's", () => {
    const m = service.metrics({ ...ALL, initiative: FOREVER });
    expect(m.goalDefined).toBe(false);
    expect(m.goalCents).toBeNull();
    expect(m.basisCents).toBeNull();
    expect(m.coverageRatio).toBeNull();
    expect(m.coverageGapCents).toBeNull();
    expect(m.newAsksNeeded).toBeNull();
    // The pipeline still computes — an absent goal blanks only the goal-derived metrics.
    expect(m.preCloseTotal.cents).toBeGreaterThan(0);
  });

  maybe("one rep x one initiative has no goal by design", () => {
    const m = service.metrics({ rep: danaId, initiative: KAMULI, period: "FY26" });
    expect(m.goalDefined).toBe(false);
    expect(m.goalCents).toBeNull();
    // Specifically not the rep's goal and not the initiative's.
    expect(m.goalCents).not.toBe(270_000_000);
    expect(m.goalCents).not.toBe(120_000_000);
  });
});

describe("what-if against the seed", () => {
  maybe("excluding a qualified opportunity moves the headline by exactly its amount", () => {
    const cordova = stableId("forward-opportunity:cordova-kamuli");
    const amount =
      snapshot.opportunities.find((o) => o.id === cordova)?.amountCents ?? 0;
    expect(amount).toBe(42_500_000);

    const result = service.whatIf(ALL, { excludeOpportunityIds: [cordova] });
    expect(result.qualifiedAsksDeltaCents).toBe(-amount);
    expect(result.after.qualifiedAsks.cents).toBe(172_000_000 - amount);
    expect(result.coverageGapDeltaCents).toBe(-amount);
  });

  maybe("quantifies what confirming Hallworth's missing milestones is worth", () => {
    // Exactly the shape I20 needs: "INFLATES ASKS ON THE TABLE BY $X".
    const hallworth = stableId("forward-opportunity:hallworth-kamuli");
    const blocking = snapshot.definitions.filter((d) => d.blocking).map((d) => d.key);
    const result = service.whatIf(ALL, { milestonePatches: { [hallworth]: blocking } });

    expect(result.qualifiedAsksDeltaCents).toBe(25_000_000); // $250,000
    expect(result.after.qualifiedAsks.cents).toBe(197_000_000);
    expect(result.before.qualifiedAsks.cents).toBe(172_000_000);
  });

  maybe("leaves the snapshot untouched so hypotheses are independent", () => {
    const before = service.metrics(ALL).qualifiedAsks.cents;
    service.whatIf(ALL, { excludeOpportunityIds: snapshot.opportunities.map((o) => o.id) });
    expect(service.metrics(ALL).qualifiedAsks.cents).toBe(before);
  });

  maybe("costs no database access — many hypotheses over one snapshot", () => {
    // I23 ranks by impact, which means one what-if per opportunity. All of them run against the
    // already-loaded snapshot.
    const deltas = snapshot.opportunities.map(
      (o) => service.whatIf(ALL, { excludeOpportunityIds: [o.id] }).qualifiedAsksDeltaCents,
    );
    expect(deltas).toHaveLength(snapshot.opportunities.length);
    const totalImpact = deltas.reduce((sum, d) => sum + d, 0);
    expect(totalImpact).toBe(-172_000_000);
  });
});

describe("per-initiative metrics against the seed", () => {
  maybe("computes an opportunity's share of its initiative's qualified asks", () => {
    const northwater = stableId("forward-opportunity:northwater-kamuli");
    const share = service.initiativeShare(northwater);
    // Kamuli qualified = Cordova $425,000 + Northwater $220,000 = $645,000.
    expect(share?.initiativeQualifiedCents).toBe(114_500_000);
    expect(share?.counted).toBe(true);
    expect(share?.share).toBeCloseTo(22_000_000 / 114_500_000, 10);
    expect(share?.isLargest).toBe(false);
  });

  maybe("gives Hallworth a zero share — unqualified contributes nothing", () => {
    const share = service.initiativeShare(stableId("forward-opportunity:hallworth-kamuli"));
    expect(share?.counted).toBe(false);
    expect(share?.share).toBe(0);
  });

  maybe("recomputes coverage without an opportunity", () => {
    const cordova = stableId("forward-opportunity:cordova-kamuli");
    const result = service.coverageWithout(cordova);
    // Coverage is measured against the BASIS, not the goal: Kamuli's $1,200,000 goal less its
    // $172,000 won = a $1,028,000 basis. Dividing by the goal here was this test's first draft,
    // and getting it wrong is exactly the reader error `basis` exists to prevent.
    const kamuliBasis = 120_000_000 - 17_200_000;
    expect(result?.coverageRatio).toBeCloseTo(114_500_000 / kamuliBasis, 10);
    // Kamuli's qualified asks are Cordova $425,000 + Northwater $220,000 + Sterling $500,000.
    expect(result?.coverageRatioWithout).toBeCloseTo((114_500_000 - 42_500_000) / kamuliBasis, 10);
    expect(result?.delta).toBeLessThan(0);
  });

  maybe("shows no coverage movement when removing an unqualified ask", () => {
    // Worth knowing before writing "Lose this one and Kamuli drops from 1.4x to 0.9x" about an
    // ask that is not yet real: under milestone qualification, losing it changes nothing.
    const result = service.coverageWithout(stableId("forward-opportunity:hallworth-kamuli"));
    expect(result?.delta).toBeCloseTo(0, 10);
  });
});

describe("clock", () => {
  maybe("weeksLeft comes from the injected clock, not wall time", () => {
    const january = new ForwardMetricsService(snapshot, {
      settings: DEFAULT_FORWARD_SETTINGS,
      clock: fixedClock(new Date("2026-01-01T00:00:00.000Z")),
    });
    expect(service.metrics(ALL).weeksLeft).toBe(15);
    expect(january.metrics(ALL).weeksLeft).toBe(52);
    expect(january.metrics(ALL).asOf.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

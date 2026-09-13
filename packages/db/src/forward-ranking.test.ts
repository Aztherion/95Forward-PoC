// 95 Forward — the action queue against the real seed (Initiative 23).
//
// The golden queue below is asserted EXACTLY: rank, label, rule, rationale, impact. That is the
// point of it. A ranking engine whose output is only spot-checked will drift a place at a time
// until the demo no longer opens on the record the whole story is about, and nobody will notice
// until they are in the room.

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  assertStatusLabel,
  catalogue,
  dayWork,
  firingFor,
  fixedClock,
  QUEUE_STATUS_LABELS,
  RANKING_RULE_IDS,
  registerBuiltInRules,
  registerRankingRules,
  STATUS_HEALTH,
  type MetricScope,
  type MetricsSnapshot,
} from "@95forward/shared";
import type { Database } from "./client";
import { DEMO_TODAY } from "./demo-clock";
import { loadMetricsSnapshot } from "./forward-metrics-repo";
import {
  decideQueueItem,
  liveDecisions,
  loadDayWork,
  opportunityDataVersions,
  pruneExpiredDismissals,
  undecideQueueItem,
} from "./forward-ranking-repo";
import { resolveTenantCatalogue, resolveTenantSettings, updateRule } from "./rules-repo";
import { seed } from "./seed";
import { stableId } from "./seed-records-core";
import { forwardOpportunities, opportunityEvents } from "./schema/forward";
import { queueDecisions } from "./schema/queue";
import { ruleOverrides } from "./schema/rules";
import { tenants } from "./schema/tenants";
import { withTenant } from "./tenancy";
import { connectAppTestDb, connectTestDb, uniqueSuffix, type TestDb } from "./test-support";

let handle: TestDb | null = null;
let app: TestDb | null = null;
let db: Database;
let tenantId: string;
let snapshot: MetricsSnapshot;

const CLOCK = fixedClock(DEMO_TODAY);
const ALL: MetricScope = { rep: "all", initiative: "all", period: "FY26" };

const HALLWORTH = stableId("forward-opportunity:hallworth-kamuli");
const OSGOOD_BOLIVIA = stableId("forward-opportunity:osgood-bolivia");
const VEGA = stableId("forward-opportunity:vega-forever-promise");
const BELLO = stableId("forward-opportunity:bello-forever-promise");
const CORDOVA_BOLIVIA = stableId("forward-opportunity:cordova-bolivia");

registerBuiltInRules();
registerRankingRules();

beforeAll(async () => {
  handle = await connectTestDb();
  app = await connectAppTestDb();
  if (!handle) return;
  db = handle.db;
  ({ tenantId } = await seed(db));
  snapshot = await loadMetricsSnapshot(db, tenantId, { now: DEMO_TODAY });
}, 120_000);

afterAll(async () => {
  if (handle) await handle.pool.end();
  if (app) await app.pool.end();
});

// Decisions and rule overrides are tenant-wide and every later assertion reads through them.
afterEach(async () => {
  if (!handle) return;
  await db.delete(queueDecisions).where(eq(queueDecisions.tenantId, tenantId));
  await db.delete(ruleOverrides).where(eq(ruleOverrides.tenantId, tenantId));
  await db
    .delete(opportunityEvents)
    .where(
      sql`${opportunityEvents.tenantId} = ${tenantId} and ${opportunityEvents.eventType} in ('guidance_pinned','guidance_dismissed')`,
    );
});

const maybe = (name: string, fn: () => void | Promise<void>, timeout?: number) =>
  it(
    name,
    async () => {
      if (!handle) return;
      await fn();
    },
    timeout,
  );

async function work() {
  return loadDayWork(db, tenantId, {
    snapshot,
    scope: ALL,
    settings: await resolveTenantSettings(db, tenantId),
    clock: CLOCK,
    resolved: await resolveTenantCatalogue(db, tenantId),
  });
}

// -------------------------------------------------------------------------------------------

describe("the seeded queue", () => {
  maybe("is exactly this, in exactly this order", async () => {
    const result = await work();

    expect(
      result.queue.map((item) => ({
        rank: item.rank,
        status: item.statusText,
        health: item.health,
        opportunityId: item.opportunityId,
        amountCents: item.amountCents,
        primary: item.primaryRuleId,
        rules: [...item.firingRuleIds],
        action: item.nextAction.label,
        rationale: item.rationale,
        impactCents: item.impactCents,
      })),
    ).toEqual([
      {
        rank: 1,
        status: "AT RISK",
        health: "stuck",
        opportunityId: HALLWORTH,
        amountCents: 25_000_000,
        primary: "live-ask-silence",
        rules: ["live-ask-silence", "verbal-agreement-unwritten"],
        action: "Follow up to close",
        rationale:
          "The largest live ask in your portfolio has gone silent longest — and it closes in 49 days.",
        impactCents: 25_000_000,
      },
      {
        rank: 2,
        status: "AT RISK",
        health: "stuck",
        opportunityId: OSGOOD_BOLIVIA,
        amountCents: 18_000_000,
        primary: "live-ask-silence",
        rules: ["live-ask-silence"],
        action: "Follow up to close",
        rationale: "This live ask has gone silent for 20 days — and it is 28 days past its close date.",
        impactCents: 18_000_000,
      },
      {
        rank: 3,
        status: "BLOCKED",
        health: "slowing",
        opportunityId: VEGA,
        amountCents: 9_000_000,
        primary: "prospect-ahead-of-us",
        rules: [
          "prospect-ahead-of-us",
          "visits-without-specific-ask",
          "visit-within-7d-unprepped",
        ],
        action: "Get the ask approved",
        rationale:
          "They have put a meeting in the diary that we are not yet internally cleared to walk into.",
        impactCents: 9_000_000,
      },
      {
        rank: 4,
        status: "COLD",
        health: "slowing",
        opportunityId: BELLO,
        amountCents: 12_000_000,
        primary: "partner-path-unused",
        rules: ["partner-path-unused"],
        action: "Ask Tom Bradley to open the door",
        rationale: "Tom Bradley (Colleague introduction) can open this door and has never been asked.",
        impactCents: 12_000_000,
      },
      {
        rank: 5,
        status: "DECAYING",
        health: "slowing",
        opportunityId: CORDOVA_BOLIVIA,
        amountCents: 5_000_000,
        primary: "intro-offered-unused",
        rules: ["intro-offered-unused"],
        action: "Get the visit through Sofia Lin",
        rationale: "Sofia Lin offered an introduction 35 days ago and it has not been used.",
        impactCents: 5_000_000,
      },
    ]);
  });

  maybe("delegates Fix first to I20 rather than re-deriving it", async () => {
    const result = await work();
    expect(result.fixFirst.length).toBe(3);
    expect(result.summary.findingCount).toBe(result.fixFirst.length);
    expect(result.summary.queueCount).toBe(result.queue.length);
  });

  maybe("hands The Board the one fact about item #1", async () => {
    const result = await work();
    // "Item #1 is 81 days idle." The engine returns the number; the screen writes the sentence.
    expect(result.summary.topItemFact).toEqual({
      opportunityId: HALLWORTH,
      kind: "idle-days",
      value: 81,
    });
  });

  maybe("emits only labels from the closed seven", async () => {
    const result = await work();
    for (const item of result.queue) {
      expect(QUEUE_STATUS_LABELS).toContain(item.statusLabel);
      expect(() => assertStatusLabel(item.statusLabel)).not.toThrow();
      expect(item.health).toBe(STATUS_HEALTH[item.statusLabel]);
      expect(item.firingRuleIds).toContain(item.primaryRuleId);
    }
  });

  maybe("never coaches a stewarding record", async () => {
    const result = await work();
    const stewarding = stableId("forward-opportunity:osgood-kamuli-steward");
    expect(result.queue.some((i) => i.opportunityId === stewarding)).toBe(false);
  });

  maybe("produces an identical queue on a second run", async () => {
    const first = await work();
    const second = await work();
    expect(second.queue.map((i) => [i.rank, i.opportunityId, i.score])).toEqual(
      first.queue.map((i) => [i.rank, i.opportunityId, i.score]),
    );
  });
});

describe("below the cut", () => {
  maybe("ties to the full portfolio: ranked plus remainder is everything that fires", async () => {
    const result = await work();
    const settings = await resolveTenantSettings(db, tenantId);
    const resolved = await resolveTenantCatalogue(db, tenantId);

    // The same run with a queue of one: everything that fell out is the remainder.
    const narrowed = dayWork({
      snapshot,
      scope: ALL,
      settings,
      clock: CLOCK,
      resolved: resolved.map((entry) =>
        entry.id === "queue-size" ? { ...entry, values: { items: 1 } } : entry,
      ),
    });

    expect(narrowed.queue).toHaveLength(1);
    expect(narrowed.belowCut.count).toBe(result.queue.length - 1);
    const remainderCents = result.queue.slice(1).reduce((sum, i) => sum + i.impactCents, 0);
    expect(narrowed.belowCut.cents).toBe(remainderCents);
  });

  maybe("answers whether the remainder changes this week's number", async () => {
    const result = await work();
    // Everything fits above the cut on this seed, so the remainder is empty and cannot move it.
    expect(result.belowCut.count).toBe(0);
    expect(result.belowCut.cents).toBe(0);
    expect(result.belowCut.changesTheNumber).toBe(false);
  });
});

describe("catalogue integration", () => {
  maybe("all seven rules are registered and addressable", async () => {
    const ids = new Set(catalogue().map((e) => e.id));
    for (const id of RANKING_RULE_IDS) {
      expect(ids.has(id), `missing catalogue entry ${id}`).toBe(true);
    }
    for (const id of ["queue-size", "queue-urgency"]) {
      expect(ids.has(id), `missing catalogue entry ${id}`).toBe(true);
    }
  });

  maybe("firingFor returns the same opportunities the queue attributes to each rule", async () => {
    const settings = await resolveTenantSettings(db, tenantId);
    const resolved = await resolveTenantCatalogue(db, tenantId);
    const result = await work();

    for (const ruleId of RANKING_RULE_IDS) {
      const firing = firingFor(ruleId, { snapshot, scope: ALL, settings, clock: CLOCK, resolved });
      const fromQueue = result.queue
        .filter((item) => item.firingRuleIds.includes(ruleId))
        .map((item) => item.opportunityId)
        .sort();
      // firingFor scans everything, including records the queue drops as closed work — so the
      // queue's attribution must be a SUBSET, and every rule the queue claims must be claimed back.
      const fromFiring = new Set(firing.findings.map((f) => f.opportunityId));
      for (const id of fromQueue) {
        expect(fromFiring.has(id), `${ruleId} on ${id}`).toBe(true);
      }
    }
  });

  maybe("changing a multiplier reorders the queue", async () => {
    const before = await work();
    const beforeRank = (id: string) => before.queue.find((i) => i.opportunityId === id)!.rank;
    expect(beforeRank(BELLO)).toBe(4);
    expect(beforeRank(VEGA)).toBe(3);

    // The spread is deliberately narrow so IMPACT DOMINATES: even at the catalogue's maximum of 5,
    // Bello's $120,000 does not overtake Hallworth's $250,000 at 2.0 with urgency behind it. What it
    // does do is move Bello past Vega, which is the honest thing a weight change should be able to do.
    await updateRule(db, tenantId, "partner-path-unused", { parameterValues: { multiplier: 5 } });
    const after = await work();
    const afterRank = (id: string) => after.queue.find((i) => i.opportunityId === id)!.rank;

    expect(afterRank(BELLO)).toBe(3);
    expect(afterRank(VEGA)).toBe(4);
    expect(after.queue.find((i) => i.opportunityId === BELLO)!.multiplier).toBe(5);
    expect(after.queue[0]!.opportunityId).toBe(HALLWORTH);
  });

  maybe("disabling a rule removes its items and its rationale", async () => {
    const before = await work();
    expect(before.queue.some((i) => i.primaryRuleId === "intro-offered-unused")).toBe(true);

    await updateRule(db, tenantId, "intro-offered-unused", { enabled: false });
    const after = await work();
    expect(after.queue.some((i) => i.opportunityId === CORDOVA_BOLIVIA)).toBe(false);
    expect(after.queue.some((i) => i.firingRuleIds.includes("intro-offered-unused"))).toBe(false);
  });

  maybe("disabling an I20 check removes it from Fix first too", async () => {
    const before = await work();
    const ruleId = before.fixFirst[0]!.ruleId;
    await updateRule(db, tenantId, ruleId, { enabled: false });
    const after = await work();
    expect(after.fixFirst.some((f) => f.ruleId === ruleId)).toBe(false);
    expect(after.summary.findingCount).toBeLessThan(before.summary.findingCount);
  });

  maybe("an edited cadence changes who is silent", async () => {
    const before = await work();
    expect(before.queue.some((i) => i.opportunityId === OSGOOD_BOLIVIA)).toBe(true);

    // Osgood-Bolivia is 20 days quiet at visit_and_ask. Relax that stage past 20 and it stops
    // being a silence problem — but ONLY that stage: Hallworth is follow_up_and_close.
    await updateRule(db, tenantId, "live-ask-silence", {
      parameterValues: { "cadence.visit_and_ask": 45 },
    });
    const after = await work();
    expect(after.queue.some((i) => i.opportunityId === OSGOOD_BOLIVIA)).toBe(false);
    expect(after.queue[0]!.opportunityId).toBe(HALLWORTH);
  });
});

describe("pin and dismiss", () => {
  maybe("a pin forces the item to the top and is logged with an actor", async () => {
    await decideQueueItem(db, tenantId, {
      opportunityId: CORDOVA_BOLIVIA,
      kind: "pin",
      actor: { name: "Dana Reese" },
      clock: CLOCK,
    });

    const result = await work();
    expect(result.queue[0]!.opportunityId).toBe(CORDOVA_BOLIVIA);
    expect(result.queue[0]!.pinned).toBe(true);

    const events = await db
      .select()
      .from(opportunityEvents)
      .where(eq(opportunityEvents.opportunityId, CORDOVA_BOLIVIA));
    const logged = events.find((e) => e.eventType === "guidance_pinned");
    expect(logged).toBeDefined();
    expect(logged!.actorName).toBe("Dana Reese");
    expect(logged!.prospectSourced).toBe(false);
  });

  maybe("a dismissal removes the item and is logged", async () => {
    await decideQueueItem(db, tenantId, {
      opportunityId: HALLWORTH,
      kind: "dismiss",
      actor: { name: "Dana Reese" },
      clock: CLOCK,
    });

    const result = await work();
    expect(result.queue.some((i) => i.opportunityId === HALLWORTH)).toBe(false);
    expect(result.queue[0]!.opportunityId).toBe(OSGOOD_BOLIVIA);

    const events = await db
      .select()
      .from(opportunityEvents)
      .where(eq(opportunityEvents.opportunityId, HALLWORTH));
    expect(events.some((e) => e.eventType === "guidance_dismissed")).toBe(true);
  });

  maybe("a data change on a dismissed item re-arms the rule", async () => {
    await decideQueueItem(db, tenantId, {
      opportunityId: HALLWORTH,
      kind: "dismiss",
      clock: CLOCK,
    });
    expect((await work()).queue.some((i) => i.opportunityId === HALLWORTH)).toBe(false);

    // Anything that moves the opportunity counts. Bumping `updated_at` is the cheapest honest
    // version of that, and — unlike writing an event — it leaves the seeded event log untouched, so
    // the silence and history assertions in forward-repo.test.ts still see the seed they describe.
    await db
      .update(forwardOpportunities)
      .set({ updatedAt: new Date() })
      .where(eq(forwardOpportunities.id, HALLWORTH));

    const after = await work();
    expect(after.queue.some((i) => i.opportunityId === HALLWORTH)).toBe(true);

    const live = await liveDecisions(db, tenantId);
    expect(live.some((d) => d.opportunityId === HALLWORTH && d.kind === "dismiss")).toBe(false);
    expect(await pruneExpiredDismissals(db, tenantId)).toBe(1);
  });

  maybe("a pin survives the data moving — only dismissals expire", async () => {
    await decideQueueItem(db, tenantId, {
      opportunityId: CORDOVA_BOLIVIA,
      kind: "pin",
      clock: CLOCK,
    });
    await db
      .update(forwardOpportunities)
      .set({ updatedAt: new Date() })
      .where(eq(forwardOpportunities.id, CORDOVA_BOLIVIA));

    const live = await liveDecisions(db, tenantId);
    expect(live.some((d) => d.opportunityId === CORDOVA_BOLIVIA && d.kind === "pin")).toBe(true);
  });

  maybe("re-deciding updates the row rather than adding a second", async () => {
    await decideQueueItem(db, tenantId, { opportunityId: HALLWORTH, kind: "dismiss", clock: CLOCK });
    await decideQueueItem(db, tenantId, { opportunityId: HALLWORTH, kind: "dismiss", clock: CLOCK });
    const rows = await db
      .select()
      .from(queueDecisions)
      .where(eq(queueDecisions.opportunityId, HALLWORTH));
    expect(rows).toHaveLength(1);
  });

  maybe("covers I20's findings with the same mechanism", async () => {
    const before = await work();
    const finding = before.fixFirst[0]!;
    await decideQueueItem(db, tenantId, {
      opportunityId: finding.opportunityId,
      ruleId: finding.ruleId,
      kind: "dismiss",
      clock: CLOCK,
    });

    const rows = await db
      .select()
      .from(queueDecisions)
      .where(eq(queueDecisions.tenantId, tenantId));
    expect(rows).toHaveLength(1);
    // rule_id set means "this one finding", null means "the whole queue item" — one table, both.
    expect(rows[0]!.ruleId).toBe(finding.ruleId);
  });

  maybe("can be undone outright", async () => {
    await decideQueueItem(db, tenantId, { opportunityId: HALLWORTH, kind: "dismiss", clock: CLOCK });
    expect((await work()).queue.some((i) => i.opportunityId === HALLWORTH)).toBe(false);
    await undecideQueueItem(db, tenantId, { opportunityId: HALLWORTH, kind: "dismiss" });
    expect((await work()).queue.some((i) => i.opportunityId === HALLWORTH)).toBe(true);
  });

  maybe("refuses a decision about an opportunity that is not this tenant's", async () => {
    await expect(
      decideQueueItem(db, tenantId, {
        opportunityId: "00000000-0000-0000-0000-000000000000",
        kind: "pin",
        clock: CLOCK,
      }),
    ).rejects.toThrow(/no opportunity/);
  });

  maybe("keys the data version per opportunity, not tenant-wide", async () => {
    // A dismissal must survive somebody else's Tuesday. If the version were the tenant-wide marker
    // I21 uses for its simulation cache, touching any record would expire every dismissal at once.
    const before = await opportunityDataVersions(db, tenantId);
    await db
      .update(forwardOpportunities)
      .set({ updatedAt: new Date() })
      .where(eq(forwardOpportunities.id, VEGA));
    const after = await opportunityDataVersions(db, tenantId);
    expect(after[VEGA]).not.toBe(before[VEGA]);
    expect(after[HALLWORTH]).toBe(before[HALLWORTH]);

  });
});

describe("RLS on queue_decisions", () => {
  it("keeps one tenant's decisions invisible to another", async () => {
    if (!handle || !app) return;
    const suffix = uniqueSuffix();
    const [other] = await db
      .insert(tenants)
      .values({ name: `Queue RLS ${suffix}`, slug: `queue-rls-${suffix}` })
      .returning();

    try {
      await decideQueueItem(db, tenantId, {
        opportunityId: HALLWORTH,
        kind: "pin",
        clock: CLOCK,
      });

      const seen = await withTenant(app!.db, other!.id, (tx) => tx.select().from(queueDecisions));
      expect(seen).toHaveLength(0);

      // No tenant context at all: nothing.
      expect(await app!.db.select().from(queueDecisions)).toHaveLength(0);

      // And this tenant sees exactly its own.
      const mine = await withTenant(app!.db, tenantId, (tx) => tx.select().from(queueDecisions));
      expect(mine).toHaveLength(1);
      expect(mine[0]!.opportunityId).toBe(HALLWORTH);

      // A write aimed at our row from the other tenant's context affects nothing.
      const affected = await withTenant(app!.db, other!.id, (tx) =>
        tx
          .update(queueDecisions)
          .set({ kind: "dismiss" })
          .where(eq(queueDecisions.id, mine[0]!.id))
          .returning(),
      );
      expect(affected).toHaveLength(0);
    } finally {
      await db.delete(tenants).where(eq(tenants.id, other!.id));
      await db.delete(queueDecisions).where(eq(queueDecisions.tenantId, tenantId));
    }
  }, 60_000);
});

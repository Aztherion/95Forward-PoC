// 95 Forward — the Rules of Robb layer (Initiative 22).
//
// What these tests are actually for: an editable rules layer is only trustworthy if editing a rule
// changes the numbers, removing the edit puts them back, and an illegal value never lands at all.
// Each of those is asserted against the real database and the real engines, not against a mock of
// them — a rules layer that only proves it can write rows proves nothing.

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  catalogue,
  catalogueEntry,
  checkScope,
  firingFor,
  fixedClock,
  registerBuiltInRules,
  resolveCatalogue,
  settingsFromCatalogue,
  enabledCheckDefinitions,
  simulate,
  validateParameterValue,
  type MetricScope,
  type MetricsSnapshot,
} from "@95forward/shared";
import type { Database } from "./client";
import { DEMO_TODAY } from "./demo-clock";
import { loadMetricsSnapshot } from "./forward-metrics-repo";
import { computeMetrics } from "@95forward/shared";
import {
  createRuleGoal,
  deleteRuleGoal,
  listProposedRules,
  listRuleChanges,
  listRuleGoals,
  proposeRule,
  reorderRuleGoals,
  resetRule,
  resolveTenantCatalogue,
  resolveTenantSettings,
  rulesVersion,
  RuleValidationError,
  updateRule,
} from "./rules-repo";
import { RULE_SEED_FACTS } from "./seed-rules";
import { seed } from "./seed";
import { proposedRules, ruleChanges, ruleGoals, ruleOverrides, ruleVersions } from "./schema/rules";
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

registerBuiltInRules();

beforeAll(async () => {
  handle = await connectTestDb();
  app = await connectAppTestDb();
  if (!handle) return;
  db = handle.db;
  ({ tenantId } = await seed(db));
  snapshot = await loadMetricsSnapshot(db, tenantId);
}, 120_000);

afterAll(async () => {
  if (handle) await handle.pool.end();
  if (app) await app.pool.end();
});

// Overrides are tenant-wide and every later assertion reads through them, so a test that leaves one
// behind silently changes the ones that follow. (I18 lost an afternoon to exactly this.)
afterEach(async () => {
  if (!handle) return;
  await db.delete(ruleOverrides).where(eq(ruleOverrides.tenantId, tenantId));
  await db.delete(ruleChanges).where(eq(ruleChanges.tenantId, tenantId));
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

// -------------------------------------------------------------------------------------------

describe("the catalogue", () => {
  it("is populated by registration, and registering twice is harmless", () => {
    const first = catalogue().length;
    registerBuiltInRules();
    expect(catalogue().length).toBe(first);
    expect(first).toBeGreaterThan(0);
  });

  it("absorbs every I20 check as a rule entry, with no duplicates of the two doctrine lines", () => {
    const evidence = catalogueEntry("probability-below-evidence");
    const visit = catalogueEntry("probability-above-visit-rating");
    expect(evidence?.kind).toBe("rule");
    expect(visit?.kind).toBe("rule");
    // The Rules of Robb sentences bind to I20's existing predicates rather than to new rules.
    expect(evidence?.statement).toContain("likelihood of booking should be High");
    expect(visit?.statement).toContain("Visit rating is poor");
    const sameStatement = catalogue().filter((e) => e.statement === visit?.statement);
    expect(sameStatement).toHaveLength(1);
  });

  it("carries every constant I19/I20/I21 read, so nothing is left hardcoded at a call site", () => {
    const ids = new Set(catalogue().map((e) => e.id));
    for (const id of [
      "coverage-multiple",
      "selling-days-per-week",
      "selling-hours-per-day",
      "simulation-trials",
      "percentile-best",
      "percentile-most-likely",
      "percentile-worst",
      "membership-threshold",
      "consequence-trials",
      "date-confidence-days",
      "ask-maturation-weeks",
    ]) {
      expect(ids.has(id), `missing catalogue entry ${id}`).toBe(true);
    }
  });

  it("round-trips to the settings object the engines consume", () => {
    const settings = settingsFromCatalogue(resolveCatalogue([]));
    expect(settings.coverageMultiple).toBe(3);
    expect(settings.simulation.percentiles).toEqual({ best: 90, mostLikely: 50, worst: 5 });
    expect(settings.simulation.dateConfidenceDays).toEqual({ firm: 7, semi_firm: 21, loose: 60 });
    expect(settings.checks.probabilityEvidenceFloor).toBe("high");
  });
});

describe("validation rejects rather than clamps", () => {
  it("refuses a coverage multiple of 0 and of -1", () => {
    const spec = catalogueEntry("coverage-multiple")!.parameters[0]!;
    expect(validateParameterValue(spec, 0)).not.toBeNull();
    expect(validateParameterValue(spec, -1)).not.toBeNull();
    // Not clamped to the minimum — the caller is told the value is impossible.
    expect(validateParameterValue(spec, 0)?.message).toContain("at least 1");
    expect(validateParameterValue(spec, 3)).toBeNull();
  });

  maybe("the write path refuses it too, and leaves nothing behind", async () => {
    const before = await rulesVersion(db, tenantId);
    await expect(
      updateRule(db, tenantId, "coverage-multiple", { parameterValues: { multiple: 0 } }),
    ).rejects.toBeInstanceOf(RuleValidationError);
    const rows = await db.select().from(ruleOverrides).where(eq(ruleOverrides.tenantId, tenantId));
    expect(rows).toHaveLength(0);
    // A rejected edit must not consume a version either, or every failed save invalidates caches.
    expect(await rulesVersion(db, tenantId)).toBe(before);
  });

  maybe("an unknown parameter key is rejected, not silently dropped", async () => {
    await expect(
      updateRule(db, tenantId, "coverage-multiple", { parameterValues: { multiplier: 4 } }),
    ).rejects.toBeInstanceOf(RuleValidationError);
  });

  maybe("an unknown rule id is rejected", async () => {
    await expect(updateRule(db, tenantId, "not-a-rule", { enabled: false })).rejects.toBeInstanceOf(
      RuleValidationError,
    );
  });

  maybe("an empty statement is rejected — reset is the way back to the default", async () => {
    await expect(
      updateRule(db, tenantId, "coverage-multiple", { statement: "   " }),
    ).rejects.toBeInstanceOf(RuleValidationError);
  });
});

describe("defaults, overrides and removal", () => {
  maybe("a tenant with zero rows gets the shipped defaults", async () => {
    const rows = await db.select().from(ruleOverrides).where(eq(ruleOverrides.tenantId, tenantId));
    expect(rows).toHaveLength(0);
    const settings = await resolveTenantSettings(db, tenantId);
    expect(settings.coverageMultiple).toBe(3);
  });

  maybe("an override changes the number the metrics service computes", async () => {
    const before = computeMetrics({
      snapshot,
      scope: ALL,
      settings: await resolveTenantSettings(db, tenantId),
      clock: CLOCK,
    });

    await updateRule(db, tenantId, "coverage-multiple", { parameterValues: { multiple: 4 } });

    const after = computeMetrics({
      snapshot,
      scope: ALL,
      settings: await resolveTenantSettings(db, tenantId),
      clock: CLOCK,
    });

    expect(before.neededAtCoverageCents).not.toBeNull();
    // 4x rather than 3x: the same basis, a third more coverage demanded.
    expect(after.neededAtCoverageCents!).toBeCloseTo((before.neededAtCoverageCents! / 3) * 4, 0);
  });

  maybe("removing the override puts the number back", async () => {
    const base = await resolveTenantSettings(db, tenantId);
    await updateRule(db, tenantId, "coverage-multiple", { parameterValues: { multiple: 4 } });
    expect((await resolveTenantSettings(db, tenantId)).coverageMultiple).toBe(4);
    await resetRule(db, tenantId, "coverage-multiple");
    expect((await resolveTenantSettings(db, tenantId)).coverageMultiple).toBe(base.coverageMultiple);
    const rows = await db.select().from(ruleOverrides).where(eq(ruleOverrides.tenantId, tenantId));
    expect(rows).toHaveLength(0);
  });

  maybe("a rewritten statement is what the resolved entry reads", async () => {
    await updateRule(db, tenantId, "coverage-multiple", {
      statement: "We want four dollars asked for every dollar we still need.",
    });
    const resolved = await resolveTenantCatalogue(db, tenantId);
    const entry = resolved.find((e) => e.id === "coverage-multiple")!;
    expect(entry.statement).toContain("four dollars");
    expect(entry.statementOverridden).toBe(true);
    // The predicate is untouched — only the sentence changed.
    expect(entry.values["multiple"]).toBe(3);
  });

  maybe("editing one field does not clear another", async () => {
    await updateRule(db, tenantId, "coverage-multiple", { statement: "Ours." });
    await updateRule(db, tenantId, "coverage-multiple", { parameterValues: { multiple: 5 } });
    const entry = (await resolveTenantCatalogue(db, tenantId)).find(
      (e) => e.id === "coverage-multiple",
    )!;
    expect(entry.statement).toBe("Ours.");
    expect(entry.values["multiple"]).toBe(5);
    expect(entry.changedParameterKeys).toEqual(["multiple"]);
  });
});

describe("disabling a rule", () => {
  maybe("removes its findings and shrinks the effort total", async () => {
    const baseSettings = await resolveTenantSettings(db, tenantId);
    const baseResolved = await resolveTenantCatalogue(db, tenantId);
    const before = checkScope({
      snapshot,
      scope: ALL,
      settings: baseSettings,
      clock: CLOCK,
      checks: enabledCheckDefinitions(baseResolved),
    });

    // Pick a rule that is actually firing, so the assertion cannot pass vacuously.
    const firing = before.findings[0];
    expect(firing).toBeDefined();
    const ruleId = firing!.ruleId;
    const firedCount = before.findings.filter((f) => f.ruleId === ruleId).length;
    const firedEffort = before.findings
      .filter((f) => f.ruleId === ruleId)
      .reduce((sum, f) => sum + f.effortSeconds, 0);

    await updateRule(db, tenantId, ruleId, { enabled: false });

    const resolved = await resolveTenantCatalogue(db, tenantId);
    const after = checkScope({
      snapshot,
      scope: ALL,
      settings: await resolveTenantSettings(db, tenantId),
      clock: CLOCK,
      checks: enabledCheckDefinitions(resolved),
    });

    expect(after.findings.some((f) => f.ruleId === ruleId)).toBe(false);
    expect(after.count).toBe(before.count - firedCount);
    expect(after.totalEffortSeconds).toBe(before.totalEffortSeconds - firedEffort);
  });

  maybe("changes the effort total when only the effort estimate is edited", async () => {
    const resolvedBefore = await resolveTenantCatalogue(db, tenantId);
    const before = checkScope({
      snapshot,
      scope: ALL,
      settings: await resolveTenantSettings(db, tenantId),
      clock: CLOCK,
      checks: enabledCheckDefinitions(resolvedBefore),
    });
    const ruleId = before.findings[0]!.ruleId;
    const firedCount = before.findings.filter((f) => f.ruleId === ruleId).length;
    const oldEffort = before.findings.find((f) => f.ruleId === ruleId)!.effortSeconds;

    await updateRule(db, tenantId, ruleId, { parameterValues: { effortSeconds: 300 } });

    const after = checkScope({
      snapshot,
      scope: ALL,
      settings: await resolveTenantSettings(db, tenantId),
      clock: CLOCK,
      checks: enabledCheckDefinitions(await resolveTenantCatalogue(db, tenantId)),
    });
    expect(after.totalEffortSeconds).toBe(
      before.totalEffortSeconds - firedCount * oldEffort + firedCount * 300,
    );
  });

  maybe("a threshold edit changes which records are contradictions", async () => {
    const baseline = checkScope({
      snapshot,
      scope: ALL,
      settings: await resolveTenantSettings(db, tenantId),
      clock: CLOCK,
    }).findings.filter((f) => f.ruleId === "probability-below-evidence").length;

    // "lock" demands certainty from every qualified ask — strictly more records contradict it.
    await updateRule(db, tenantId, "probability-below-evidence", {
      parameterValues: { floorBand: "lock" },
    });
    const stricter = checkScope({
      snapshot,
      scope: ALL,
      settings: await resolveTenantSettings(db, tenantId),
      clock: CLOCK,
    }).findings.filter((f) => f.ruleId === "probability-below-evidence").length;

    expect(stricter).toBeGreaterThan(baseline);
  });
});

describe("invalidation", () => {
  maybe("a tenant that has never edited anything reports 0, stably", async () => {
    const [fresh] = await db
      .insert(tenants)
      .values({ name: `Rules fresh ${uniqueSuffix()}`, slug: `rules-fresh-${uniqueSuffix()}` })
      .returning();
    try {
      expect(await rulesVersion(db, fresh!.id)).toBe("0");
      // Twice: a missing row must not be treated as a change, or every read invalidates the cache.
      expect(await rulesVersion(db, fresh!.id)).toBe("0");
    } finally {
      await db.delete(tenants).where(eq(tenants.id, fresh!.id));
    }
  });

  maybe("the version moves on every doctrine write, and never goes backwards", async () => {
    const start = Number(await rulesVersion(db, tenantId));
    await updateRule(db, tenantId, "coverage-multiple", { parameterValues: { multiple: 4 } });
    const afterParameter = Number(await rulesVersion(db, tenantId));
    expect(afterParameter).toBeGreaterThan(start);

    await updateRule(db, tenantId, "coverage-multiple", { statement: "Different words." });
    const afterStatement = Number(await rulesVersion(db, tenantId));
    expect(afterStatement).toBeGreaterThan(afterParameter);

    // A reset is a change too. The counter deliberately does NOT return to its earlier value:
    // reusing the cache entries from before the edit would serve numbers computed under doctrine
    // the org has since revised and revised back, which is only accidentally the same thing.
    await resetRule(db, tenantId, "coverage-multiple");
    expect(Number(await rulesVersion(db, tenantId))).toBeGreaterThan(afterStatement);
  });

  maybe(
    "editing percentile-best bumps the version AND changes the simulation seed",
    async () => {
      const before = await rulesVersion(db, tenantId);
      const baseSettings = await resolveTenantSettings(db, tenantId);
      const baseRun = simulate({ snapshot, scope: ALL, settings: baseSettings, clock: CLOCK });

      await updateRule(db, tenantId, "percentile-best", { parameterValues: { percentile: 85 } });

      const nextSettings = await resolveTenantSettings(db, tenantId);
      expect(nextSettings.simulation.percentiles.best).toBe(85);
      expect(await rulesVersion(db, tenantId)).not.toBe(before);

      const nextRun = simulate({ snapshot, scope: ALL, settings: nextSettings, clock: CLOCK });
      // I21 folds the percentiles into the seed input, so a percentile edit is not merely a
      // different read of the same trials — it is a different set of trials.
      expect(nextRun.meta.seed).not.toBe(baseRun.meta.seed);
    },
    60_000,
  );
});

describe("firingFor", () => {
  maybe("agrees exactly with I20's own findings for the same rule", async () => {
    const resolved = await resolveTenantCatalogue(db, tenantId);
    const settings = await resolveTenantSettings(db, tenantId);
    const all = checkScope({ snapshot, scope: ALL, settings, clock: CLOCK });

    for (const entry of resolved.filter((e) => e.kind === "rule")) {
      const result = firingFor(entry.id, { snapshot, scope: ALL, settings, clock: CLOCK, resolved });
      const fromEngine = all.findings.filter((f) => f.ruleId === entry.id);
      expect(result.count, entry.id).toBe(fromEngine.length);
      expect(result.findings.map((f) => f.opportunityId).sort(), entry.id).toEqual(
        fromEngine.map((f) => f.opportunityId).sort(),
      );
    }
  });

  maybe("says 'switched off', not 'nothing found', for a disabled rule", async () => {
    await updateRule(db, tenantId, "probability-below-evidence", { enabled: false });
    const resolved = await resolveTenantCatalogue(db, tenantId);
    const result = firingFor("probability-below-evidence", {
      snapshot,
      scope: ALL,
      settings: await resolveTenantSettings(db, tenantId),
      clock: CLOCK,
      resolved,
    });
    expect(result.count).toBe(0);
    expect(result.note).toContain("Switched off");
  });

  maybe("describes what reads a parameter instead of pretending it fires", async () => {
    const resolved = await resolveTenantCatalogue(db, tenantId);
    const result = firingFor("coverage-multiple", {
      snapshot,
      scope: ALL,
      settings: await resolveTenantSettings(db, tenantId),
      clock: CLOCK,
      resolved,
    });
    expect(result.kind).toBe("is-read");
    expect(result.readBy.length).toBeGreaterThan(0);
    expect(result.findings).toHaveLength(0);
  });
});

describe("the audit trail", () => {
  maybe("records actor, field, before and after for every kind of edit", async () => {
    const actor = { userId: null, name: "Dana Reese" };
    await updateRule(db, tenantId, "coverage-multiple", { parameterValues: { multiple: 4 } }, actor);
    await updateRule(db, tenantId, "coverage-multiple", { statement: "Four." }, actor);
    await updateRule(db, tenantId, "coverage-multiple", { enabled: false }, actor);
    await resetRule(db, tenantId, "coverage-multiple", actor);

    const rows = await listRuleChanges(db, tenantId, { ruleId: "coverage-multiple" });
    const fields = rows.map((r) => r.field);
    expect(fields).toContain("parameters");
    expect(fields).toContain("statement");
    expect(fields).toContain("enabled");
    expect(fields).toContain("reset");
    expect(rows.every((r) => r.actorName === "Dana Reese")).toBe(true);

    const parameterChange = rows.find((r) => r.field === "parameters")!;
    expect(parameterChange.before).toBeNull();
    expect(parameterChange.after).toEqual({ multiple: 4 });

    const statementChange = rows.find((r) => r.field === "statement")!;
    expect(statementChange.before).toBeNull();
    expect(statementChange.after).toBe("Four.");

    const resetChange = rows.find((r) => r.field === "reset")!;
    expect(resetChange.after).toBeNull();
    expect(resetChange.before).toMatchObject({ statement: "Four.", enabled: false });
  });
});

describe("goals", () => {
  maybe("are seeded in priority order", async () => {
    const goals = await listRuleGoals(db, tenantId);
    expect(goals.map((g) => g.statement)).toEqual([...RULE_SEED_FACTS.goalStatementsInPriorityOrder]);
    expect(goals[0]!.statement).toBe("Total Most Likely bookings by end of year");
  });

  maybe("reorder, and the reorder is audited and versioned", async () => {
    const before = await listRuleGoals(db, tenantId);
    const version = await rulesVersion(db, tenantId);
    const reversed = [...before].reverse().map((g) => g.id);

    const after = await reorderRuleGoals(db, tenantId, reversed, { name: "Dana Reese" });
    expect(after.map((g) => g.id)).toEqual(reversed);
    expect(after.map((g) => g.priority)).toEqual([1, 2]);
    expect(await rulesVersion(db, tenantId)).not.toBe(version);
    const trail = await listRuleChanges(db, tenantId, { ruleId: "rule-goals" });
    expect(trail.length).toBeGreaterThan(0);

    // Put it back so the seeded order is what the next test sees.
    await reorderRuleGoals(db, tenantId, before.map((g) => g.id));
  });

  maybe("a goal id that does not exist is rejected, and nothing is reordered", async () => {
    const before = await listRuleGoals(db, tenantId);
    await expect(
      reorderRuleGoals(db, tenantId, ["00000000-0000-0000-0000-000000000000"]),
    ).rejects.toBeInstanceOf(RuleValidationError);
    expect((await listRuleGoals(db, tenantId)).map((g) => g.id)).toEqual(before.map((g) => g.id));
  });

  maybe("a new goal lands last, and can be removed again", async () => {
    const created = await createRuleGoal(db, tenantId, "Retain every donor who gave last year");
    const withNew = await listRuleGoals(db, tenantId);
    expect(withNew.at(-1)!.id).toBe(created.id);
    await deleteRuleGoal(db, tenantId, created.id);
    expect((await listRuleGoals(db, tenantId)).some((g) => g.id === created.id)).toBe(false);
  });
});

describe("proposed rules", () => {
  maybe("are captured verbatim, listed, and never active", async () => {
    const version = await rulesVersion(db, tenantId);
    const statement = "Never let a lapsed major donor go two years without a visit.";
    const row = await proposeRule(db, tenantId, statement, { actor: { name: "Dana Reese" } });

    expect(row.statement).toBe(statement);
    expect(row.status).toBe("captured");

    const listed = await listProposedRules(db, tenantId);
    expect(listed.some((p) => p.id === row.id)).toBe(true);

    // It is inert: it is not in the catalogue, so nothing resolves it and nothing can fire it.
    expect(catalogueEntry(row.id)).toBeUndefined();
    expect((await resolveTenantCatalogue(db, tenantId)).some((e) => e.id === row.id)).toBe(false);

    // And it invalidates nothing, because it changed no computation.
    expect(await rulesVersion(db, tenantId)).toBe(version);

    await db.delete(proposedRules).where(eq(proposedRules.id, row.id));
  });

  maybe("an empty proposal is refused", async () => {
    await expect(proposeRule(db, tenantId, "  ")).rejects.toBeInstanceOf(RuleValidationError);
  });
});

// -------------------------------------------------------------------------------------------
// Tenant isolation — asserted through app_user, not eyeballed in the migration.
// -------------------------------------------------------------------------------------------

describe("RLS on the rules tables", () => {
  const suffix = uniqueSuffix();
  let otherTenantId = "";

  it("keeps one tenant's doctrine invisible to another", async () => {
    if (!handle || !app) return;

    const [other] = await db
      .insert(tenants)
      .values({ name: `Rules RLS ${suffix}`, slug: `rules-rls-${suffix}` })
      .returning();
    otherTenantId = other!.id;

    try {
      await updateRule(db, tenantId, "coverage-multiple", { parameterValues: { multiple: 4 } });
      await proposeRule(db, tenantId, `Proposal ${suffix}`);
      await db.insert(ruleGoals).values({
        tenantId: otherTenantId,
        statement: `Other tenant goal ${suffix}`,
        priority: 1,
      });

      // The other tenant's context sees ONLY its own rows, on every one of the five tables.
      const seen = await withTenant(app!.db, otherTenantId, async (tx) => ({
        overrides: await tx.select().from(ruleOverrides),
        changes: await tx.select().from(ruleChanges),
        proposals: await tx.select().from(proposedRules),
        goals: await tx.select().from(ruleGoals),
        versions: await tx.select().from(ruleVersions),
      }));

      expect(seen.overrides).toHaveLength(0);
      expect(seen.changes).toHaveLength(0);
      expect(seen.proposals).toHaveLength(0);
      expect(seen.versions).toHaveLength(0);
      expect(seen.goals).toHaveLength(1);
      expect(seen.goals[0]!.statement).toBe(`Other tenant goal ${suffix}`);

      // With no tenant context at all, app_user sees nothing.
      const unscoped = await app!.db.select().from(ruleOverrides);
      expect(unscoped).toHaveLength(0);

      // And a write aimed at another tenant's row from this context affects zero rows.
      const [mine] = await db
        .select()
        .from(ruleOverrides)
        .where(eq(ruleOverrides.tenantId, tenantId));
      const affected = await withTenant(app!.db, otherTenantId, (tx) =>
        tx
          .update(ruleOverrides)
          .set({ statement: "HACKED" })
          .where(eq(ruleOverrides.id, mine!.id))
          .returning(),
      );
      expect(affected).toHaveLength(0);
      const [check] = await db
        .select()
        .from(ruleOverrides)
        .where(eq(ruleOverrides.id, mine!.id));
      expect(check!.statement).toBeNull();
    } finally {
      await db.delete(tenants).where(eq(tenants.id, otherTenantId));
      await db.delete(proposedRules).where(eq(proposedRules.tenantId, tenantId));
      await db.execute(sql`select 1`);
    }
  }, 60_000);
});

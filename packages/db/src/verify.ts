/**
 * Verify a demo database — the tie-out and I30's six invariants, against any `DATABASE_URL`.
 *
 * READ ONLY. It opens no write transaction and calls nothing that mutates, so it is safe to point
 * at the deployed database from a laptop:
 *
 *     DATABASE_URL=<deployed> pnpm --filter @95forward/db verify
 *
 * Why it exists: the invariants were expressed only as Playwright assertions against rendered
 * output, which cannot be run against a deployed database. The arithmetic now lives once in
 * `@95forward/shared` (`forward-invariants.ts`) and both callers use it — this, and the e2e spec
 * that checks what is on screen. A second definition of "the numbers tie" is exactly the drift
 * this codebase has spent its life avoiding.
 *
 * Exit code 1 on any failed invariant, so it can gate a runbook step.
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import {
  checkInvariants,
  computeMetrics,
  dayWork,
  enabledCheckDefinitions,
  fixedClock,
  goalFor,
  registerBuiltInRules,
  registerRankingRules,
  settingsFromCatalogue,
  stageBoard,
  type MetricScope,
} from "@95forward/shared";
import * as schema from "./schema";
import { DEMO_TODAY } from "./demo-clock";
import { loadMetricsSnapshot } from "./forward-metrics-repo";
import { resolveTenantCatalogue } from "./rules-repo";
import { simulate } from "@95forward/shared";
import { users } from "./schema/users";
import { tenants } from "./schema/tenants";

const money = (cents: number | null): string =>
  cents === null ? "—" : `$${(cents / 100).toLocaleString("en-US")}`;
const ratio = (value: number | null): string => (value === null ? "—" : `${value.toFixed(2)}×`);

function row(label: string, a: string, b: string): string {
  return `  ${label.padEnd(30)} ${a.padStart(16)}   ${b.padStart(16)}`;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("verify: DATABASE_URL is required.");
    process.exit(2);
  }

  registerBuiltInRules();
  registerRankingRules();

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema, casing: "snake_case" });

  // The anchor the app computes against. Printed, because a verify that silently used a different
  // "today" from the app would tie out against nothing.
  const now = DEMO_TODAY;
  const clock = fixedClock(now);

  const [tenant] = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).limit(1);
  if (!tenant) {
    console.error("verify: no tenant — is this database seeded?");
    process.exit(1);
  }

  const resolved = await resolveTenantCatalogue(db, tenant.id);
  const snapshot = await loadMetricsSnapshot(db, tenant.id, { now });
  const settings = settingsFromCatalogue(resolved);
  const period = settings.fiscalPeriods[0]?.label ?? "FY26";
  const checks = enabledCheckDefinitions(resolved);

  const [dana] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.tenantId, tenant.id))
    .orderBy(users.name)
    .limit(1);

  const demoRep = dana?.id ?? "all";
  const scopes: { label: string; scope: MetricScope }[] = [
    { label: "ALL", scope: { rep: "all", initiative: "all", period } },
    {
      label: `${dana?.name ?? "demo rep"}`,
      scope: { rep: demoRep, initiative: "all", period },
    },
  ];

  console.log(`\n95 Forward — demo verification`);
  console.log(`  tenant        ${tenant.name}`);
  console.log(
    `  today         ${now.toISOString().slice(0, 10)}  (the anchor the app computes against)`,
  );
  console.log(`  opportunities ${snapshot.opportunities.length}`);
  console.log(`  rules         ${resolved.length} catalogue entries\n`);

  console.log(
    `  ${"".padEnd(30)} ${scopes[0]!.label.padStart(16)}   ${scopes[1]!.label.padStart(16)}`,
  );
  console.log(`  ${"-".repeat(66)}`);

  const reports = scopes.map(({ scope }) => {
    const metrics = computeMetrics({ snapshot, scope, settings, clock });
    const simulation = simulate({ snapshot, scope, settings, clock });
    const work = dayWork({ snapshot, scope, settings, clock, resolved, checks });
    const stage = stageBoard(snapshot, scope, clock);
    const goal = goalFor(snapshot, scope);
    return {
      scope,
      metrics,
      simulation,
      work,
      stage,
      goal,
      invariants: checkInvariants(
        { snapshot, scope, settings, clock, simulation, metrics },
        resolved.length,
      ),
    };
  });

  const [a, b] = reports as [(typeof reports)[0], (typeof reports)[0]];
  const lines: [string, (r: (typeof reports)[0]) => string][] = [
    ["goal", (r) => `${money(r.goal.amountCents)}${r.goal.defined ? "" : " (none)"}`],
    ["goal scope", (r) => r.goal.scope ?? "—"],
    ["won", (r) => money(r.metrics.won.cents)],
    ["qualified asks", (r) => money(r.metrics.qualifiedAsks.cents)],
    ["pre-close total", (r) => money(r.metrics.preCloseTotal.cents)],
    ["unqualified", (r) => money(r.metrics.unqualified.cents)],
    ["closed work", (r) => money(r.metrics.closedWork.cents)],
    ["basis (goal − won)", (r) => money(r.metrics.basisCents)],
    ["coverage", (r) => ratio(r.metrics.coverageRatio)],
    ["needed at coverage", (r) => money(r.metrics.neededAtCoverageCents)],
    ["coverage gap", (r) => money(r.metrics.coverageGapCents)],
    ["BMW best", (r) => money(r.simulation.yearEnd.bestCents)],
    ["BMW most likely", (r) => money(r.simulation.yearEnd.mostLikelyCents)],
    ["BMW worst", (r) => money(r.simulation.yearEnd.worstCents)],
    ["queue items", (r) => String(r.work.queue.length)],
    ["ranked (whole portfolio)", (r) => String(r.work.ranked.length)],
    ["below cut", (r) => `${r.work.belowCut.count} · ${money(r.work.belowCut.cents)}`],
    ["fix-first findings", (r) => String(r.work.fixFirst.length)],
    ["stage pre-close", (r) => money(r.stage.preCloseCents)],
    ["stage qualified", (r) => money(r.stage.qualifiedCents)],
    ["scenario badges", (r) => String(new Set(r.simulation.membership.map((m) => m.badge)).size)],
  ];
  for (const [label, get] of lines) console.log(row(label, get(a), get(b)));

  // The straddle, which is the thing a demo lives or dies on at the rep's scope.
  console.log(`\n  Straddle (does the band bracket the goal?)`);
  for (const r of reports) {
    if (!r.goal.defined || r.goal.amountCents === null) {
      console.log(`    ${String(r.scope.rep).slice(0, 8).padEnd(10)} no goal at this scope`);
      continue;
    }
    const g = r.goal.amountCents;
    const verdict =
      r.simulation.yearEnd.bestCents >= g && r.simulation.yearEnd.mostLikelyCents < g
        ? "STRADDLES — best reaches it, most likely falls short"
        : r.simulation.yearEnd.worstCents >= g
          ? "goal is below even the worst case"
          : "MISSES — even the best case falls short";
    console.log(
      `    ${(r.scope.rep === "all" ? "ALL" : (dana?.name ?? "rep")).padEnd(12)} ` +
        `best ${money(r.simulation.yearEnd.bestCents)} vs goal ${money(g)} → ${verdict}`,
    );
  }

  console.log(`\n  The six invariants (I30)`);
  let failed = 0;
  for (const r of reports) {
    const label = r.scope.rep === "all" ? "ALL" : (dana?.name ?? "rep");
    console.log(`\n    — at ${label} scope`);
    for (const check of r.invariants.checks) {
      const mark = check.notApplicable ? "n/a " : check.ok ? "PASS" : "FAIL";
      if (!check.ok) failed += 1;
      console.log(`    [${mark}] ${check.id}. ${check.title}`);
      console.log(`           ${check.detail}`);
    }
  }

  console.log(
    `\n  ${failed === 0 ? "All invariants hold." : `${failed} INVARIANT${failed === 1 ? "" : "S"} FAILED.`}\n`,
  );

  await pool.end();
  process.exit(failed === 0 ? 0 : 1);
}

void main().catch((error: unknown) => {
  console.error("verify failed:", error instanceof Error ? error.message : error);
  process.exit(2);
});

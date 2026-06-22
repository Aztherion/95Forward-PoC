import type { Pool } from "pg";
import { createDb, type Database } from "./client";
import { seed } from "./seed";

// The guarded, destructive demo reset (Initiative 13): TRUNCATE every tenant-scoped table + clear the
// Graphile job queue, then re-run the idempotent seed to restore the pristine Water For People demo
// state. A managed DB can't be `docker compose down -v`'d, so this is the truncate-and-reseed path.
//
// GUARD — this is the single most dangerous operation in the codebase. It must be IMPOSSIBLE to wipe
// a real database by accident. The marker is an explicit opt-in env var, NOT NODE_ENV/APP_ENV: the
// deployed demo runs with NODE_ENV=production + APP_ENV=production, so keying the refusal on those
// would block the exact database we need to reset. The three layers below must ALL hold:
//   1. ALLOW_DESTRUCTIVE_RESET === "true"  — set only on the demo app + local dev, never on real data
//   2. RESEARCH_MODE !== "live"            — live mode implies real OSINT on real people; refuse
//   3. process.argv includes "--confirm"   — blocks a fat-finger from a script/cron/console
export class ResetNotAllowedError extends Error {}

export function assertResetAllowed(
  env: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv,
): void {
  if (env.ALLOW_DESTRUCTIVE_RESET !== "true") {
    throw new ResetNotAllowedError(
      "Refusing to reset: ALLOW_DESTRUCTIVE_RESET is not 'true'. This guard makes it impossible to truncate a database that is not explicitly marked as a disposable demo.",
    );
  }
  if (env.RESEARCH_MODE === "live") {
    throw new ResetNotAllowedError(
      "Refusing to reset: RESEARCH_MODE=live means this database may hold live research data. Reset is for demo databases only.",
    );
  }
  if (!argv.includes("--confirm")) {
    throw new ResetNotAllowedError(
      "Refusing to reset: pass --confirm to proceed with the destructive truncate-and-reseed.",
    );
  }
}

// Authoritative truncate set, derived from the live DB rather than a hand-typed list so a future
// table can never be silently missed: every public table carrying a tenant_id (the same predicate
// the RLS DO-loop uses), plus `tenants` itself. The Graphile schema is deliberately excluded — its
// job rows are cleared separately and its internal migration state is left intact.
async function tenantTableNames(pool: Pool): Promise<string[]> {
  const result = await pool.query<{ relname: string }>(
    `SELECT c.relname
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND a.attname = 'tenant_id'
        AND NOT a.attisdropped`,
  );
  const names = result.rows.map((row) => row.relname);
  if (!names.includes("tenants")) names.push("tenants");
  return names;
}

export async function truncateAllTenantData(pool: Pool): Promise<void> {
  const names = await tenantTableNames(pool);
  const quoted = names.map((n) => `public."${n}"`).join(", ");
  await pool.query(`TRUNCATE ${quoted} RESTART IDENTITY CASCADE`);
  // Clear queued job payloads (not the queue's own migration/schema state).
  await pool.query("DELETE FROM graphile_worker._private_jobs");
  await pool.query("DELETE FROM graphile_worker._private_known_crontabs");
}

export async function reset(db: Database, pool: Pool): Promise<{ tenantId: string }> {
  assertResetAllowed();
  await truncateAllTenantData(pool);
  return seed(db);
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to run the reset");
  }
  const { db, pool } = createDb(url);
  try {
    const { tenantId } = await reset(db, pool);
    console.log(
      `[db] reset complete — pristine Water For People demo restored (tenant ${tenantId})`,
    );
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error("[db] reset failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

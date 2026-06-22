import { NextResponse } from "next/server";
import { runOnce } from "graphile-worker";
import { buildTaskList, createProviders, type JobHandler } from "@95forward/ai";
import { tenants } from "@95forward/db";
import { getEnv } from "@95forward/shared";
import { getAppDb, getDb } from "@/server/db";

export const dynamic = "force-dynamic";

function isEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "true";
}

// Test-only synchronous queue drain (Initiative 11). Gated exactly like the dev-login seam. runOnce
// processes all available jobs then resolves — and crucially ignores cron — so the e2e spec can
// enqueue a job, drain deterministically, and assert without timing flake or a second process. The
// handlers run with the web app's pools but still self-scope via withTenant, so RLS holds.
export async function POST(): Promise<NextResponse> {
  if (!isEnabled()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const env = getEnv();
  const handlers = buildTaskList({
    db: getAppDb(),
    providers: createProviders(env),
    listTenantIds: async () => {
      const rows = await getDb().select({ id: tenants.id }).from(tenants);
      return rows.map((row) => row.id);
    },
  });

  const taskList: Record<string, (payload: unknown) => Promise<void>> = {};
  for (const [name, handler] of Object.entries(handlers) as [string, JobHandler][]) {
    taskList[name] = async (payload: unknown) => {
      await handler(payload);
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ ok: false, error: "DATABASE_URL missing" }, { status: 500 });

  await runOnce({
    connectionString: url,
    schema: process.env.JOBS_SCHEMA ?? "graphile_worker",
    taskList,
  });
  return NextResponse.json({ ok: true });
}

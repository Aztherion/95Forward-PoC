import { run, makeWorkerUtils, parseCrontab, type Runner, type Task } from "graphile-worker";
import { createProviders, buildTaskList, type JobHandler } from "@95forward/ai";
import { createDb, tenants, type DbHandle } from "@95forward/db";
import { getWorkerEnv, type WorkerEnv } from "@95forward/shared";

// Daily re-embed sweep at 03:00 — proves Graphile's scheduled (cron) leg. Cron only fires from the
// long-running run(); runOnce (the e2e drain) ignores it, so it never triggers in tests/CI.
const CRONTAB = "0 3 * * * embed-sweep";

function adaptTaskList(handlers: Record<string, JobHandler>): Record<string, Task> {
  const tasks: Record<string, Task> = {};
  for (const [name, handler] of Object.entries(handlers)) {
    tasks[name] = async (payload) => {
      await handler(payload);
    };
  }
  return tasks;
}

export interface StartedWorker {
  runner: Runner;
  stop: () => Promise<void>;
}

// Starts Graphile Worker in the worker process. Two pools, by design (see the I11 architecture):
//   - the OWNER connectionString drives Graphile's own graphile_worker schema (no tenant_id, no RLS)
//   - an app_user Database (appHandle) is handed to the job handlers, which wrap every domain query
//     in withTenant(payload.tenantId) so RLS is enforced inside the worker.
// makeWorkerUtils().migrate() installs the graphile_worker schema before run(), so an enqueue from
// the web app can never hit a missing-relation error if the worker booted first.
export async function startWorker(env: WorkerEnv): Promise<StartedWorker> {
  const appHandle: DbHandle = createDb(env.APP_DATABASE_URL, { max: env.JOBS_CONCURRENCY + 1 });
  const ownerHandle: DbHandle = createDb(env.DATABASE_URL, { max: 2 });

  const utils = await makeWorkerUtils({
    connectionString: env.DATABASE_URL,
    schema: env.JOBS_SCHEMA,
  });
  await utils.migrate();
  await utils.release();

  const handlers = buildTaskList({
    db: appHandle.db,
    providers: createProviders(env),
    listTenantIds: async () => {
      const rows = await ownerHandle.db.select({ id: tenants.id }).from(tenants);
      return rows.map((row) => row.id);
    },
    ...(env.AI_MODE === "live" ? { liveFollowUpProviders: createProviders(env) } : {}),
  });

  const runner = await run({
    connectionString: env.DATABASE_URL,
    schema: env.JOBS_SCHEMA,
    concurrency: env.JOBS_CONCURRENCY,
    noHandleSignals: true,
    taskList: adaptTaskList(handlers),
    parsedCronItems: parseCrontab(CRONTAB),
  });

  return {
    runner,
    stop: async () => {
      await runner.stop();
      await appHandle.pool.end();
      await ownerHandle.pool.end();
    },
  };
}

export function workerEnv(): WorkerEnv {
  return getWorkerEnv();
}

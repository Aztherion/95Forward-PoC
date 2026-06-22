import "server-only";
import { makeWorkerUtils, type WorkerUtils } from "graphile-worker";
import { JOB_NAMES } from "@95forward/ai";

const SCHEMA = process.env.JOBS_SCHEMA ?? "graphile_worker";

// Cache the WorkerUtils promise on globalThis so Next.js dev HMR re-evaluation reuses one pool
// instead of leaking a new one each reload. migrate() installs the graphile_worker schema and is
// idempotent, so calling it here makes the very first enqueue safe even if the worker hasn't booted.
const globalForJobs = globalThis as typeof globalThis & {
  _f95WorkerUtils?: Promise<WorkerUtils>;
};

function getWorkerUtils(): Promise<WorkerUtils> {
  if (!globalForJobs._f95WorkerUtils) {
    globalForJobs._f95WorkerUtils = (async () => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is required to enqueue background jobs");
      const utils = await makeWorkerUtils({ connectionString: url, schema: SCHEMA });
      await utils.migrate();
      return utils;
    })();
  }
  return globalForJobs._f95WorkerUtils;
}

// tenantId/userId are always passed by the caller from getCurrentUser() (server-side) — never read
// from client input — and the handler trusts only the payload. jobKey makes a re-enqueue idempotent.
export async function enqueueResearch(
  tenantId: string,
  userId: string,
  researchJobId: string,
): Promise<void> {
  const utils = await getWorkerUtils();
  await utils.addJob(
    JOB_NAMES.research,
    { tenantId, userId, researchJobId },
    { jobKey: `research-${researchJobId}`, maxAttempts: 3 },
  );
}

export async function enqueueEmbed(tenantId: string): Promise<void> {
  const utils = await getWorkerUtils();
  await utils.addJob(
    JOB_NAMES.embed,
    { tenantId },
    { jobKey: `embed-${tenantId}`, jobKeyMode: "preserve_run_at", maxAttempts: 3 },
  );
}

export async function enqueueFollowUpDraft(
  tenantId: string,
  userId: string,
  prospectId: string,
): Promise<void> {
  const utils = await getWorkerUtils();
  await utils.addJob(
    JOB_NAMES.followUpDraft,
    { tenantId, userId, prospectId },
    { jobKey: `follow-up-draft-${prospectId}`, maxAttempts: 3 },
  );
}

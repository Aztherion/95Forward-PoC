import { and, eq, isNotNull, sql } from "drizzle-orm";
import {
  constituents,
  copilotProposals,
  prospects,
  researchJobs,
  withTenant,
  type Database,
} from "@95forward/db";
import type { CallerContext, Providers, ResearchFinding } from "../types";

export interface ResearchJobPayload {
  tenantId: string;
  userId: string;
  researchJobId: string;
}

export interface JobHandlerContext {
  db: Database;
  providers: Providers;
}

interface Checkpoint {
  findings: ResearchFinding[];
}

function callerFrom(payload: ResearchJobPayload): CallerContext {
  return { id: payload.userId, tenantId: payload.tenantId, role: "gift_officer" };
}

// Headline durable job (Initiative 11): research a known prospect and emit proposed knowledge-base
// updates via the I6 proposal mechanism. Idempotent + checkpointed so Graphile retries never
// duplicate proposals and resume without re-calling the ResearchProvider:
//   - early-exit once the job is ready/reviewed
//   - findings are persisted to research_jobs.checkpoint before any proposal is written
//   - proposals carry a stable origin_key and are inserted ON CONFLICT DO NOTHING
//   - the ready transition shares one transaction with the proposal inserts
// All DB work runs under withTenant(payload.tenantId), so RLS applies inside the worker. The
// research findings are untrusted external data: they only ever land in proposal payloads for a
// human to review — they never alter control flow here.
export async function runResearchProspectJob(
  payload: ResearchJobPayload,
  ctx: JobHandlerContext,
): Promise<void> {
  const { db, providers } = ctx;
  const { tenantId, researchJobId } = payload;

  const subjectName = await withTenant(db, tenantId, async (tx) => {
    const jobRows = await tx
      .select({ status: researchJobs.status, prospectId: researchJobs.prospectId })
      .from(researchJobs)
      .where(eq(researchJobs.id, researchJobId))
      .limit(1);
    const job = jobRows[0];
    if (!job) return null;
    if (job.status === "ready" || job.status === "reviewed") return null;

    const claimed = await tx
      .update(researchJobs)
      .set({ status: "researching" })
      .where(
        and(
          eq(researchJobs.id, researchJobId),
          eq(researchJobs.tenantId, tenantId),
          sql`${researchJobs.status} in ('queued', 'researching')`,
        ),
      )
      .returning({ id: researchJobs.id });
    if (claimed.length === 0) return null;

    const nameRows = await tx
      .select({ name: constituents.displayName })
      .from(prospects)
      .innerJoin(constituents, eq(constituents.id, prospects.constituentId))
      .where(eq(prospects.id, job.prospectId))
      .limit(1);
    return nameRows[0]?.name ?? null;
  });

  if (subjectName === null) return;

  const existing = await withTenant(db, tenantId, async (tx) => {
    const rows = await tx
      .select({ checkpoint: researchJobs.checkpoint })
      .from(researchJobs)
      .where(eq(researchJobs.id, researchJobId))
      .limit(1);
    return (rows[0]?.checkpoint as Checkpoint | null) ?? null;
  });

  let findings: ResearchFinding[];
  if (existing?.findings !== undefined) {
    findings = existing.findings;
  } else {
    const result = await providers.research.research({ subjectName });
    findings = result.findings;
    const checkpoint: Checkpoint = { findings };
    await withTenant(db, tenantId, async (tx) => {
      await tx.update(researchJobs).set({ checkpoint }).where(eq(researchJobs.id, researchJobId));
    });
  }

  const caller = callerFrom(payload);
  await withTenant(db, tenantId, async (tx) => {
    const jobRows = await tx
      .select({ prospectId: researchJobs.prospectId })
      .from(researchJobs)
      .where(eq(researchJobs.id, researchJobId))
      .limit(1);
    const prospectId = jobRows[0]?.prospectId;
    if (!prospectId) return;

    for (let i = 0; i < findings.length; i += 1) {
      const finding = findings[i];
      if (finding === undefined) continue;
      await tx
        .insert(copilotProposals)
        .values({
          tenantId,
          subjectType: "knowledge_base",
          subjectId: prospectId,
          proposalType: "knowledge_base_update",
          status: "pending",
          title: finding.title,
          summary: `Researched: ${finding.title}`,
          payload: { field: "capacitySource", value: finding.snippet },
          provenance: [{ sourceType: "research", source: finding.source, detail: finding.title }],
          confidence: Math.round(finding.confidence * 100),
          taskType: "research_prospect",
          origin: "copilot",
          createdByUserId: caller.id,
          originKey: `research:${researchJobId}:${String(i)}`,
        })
        .onConflictDoNothing({
          target: copilotProposals.originKey,
          where: isNotNull(copilotProposals.originKey),
        });
    }

    await tx
      .update(researchJobs)
      .set({ status: "ready", completedAt: new Date() })
      .where(
        and(
          eq(researchJobs.id, researchJobId),
          eq(researchJobs.tenantId, tenantId),
          eq(researchJobs.status, "researching"),
        ),
      );
  });
}

// Convenience for the approve/dismiss action: given a just-decided proposal id, derive its research
// job from the proposal's origin_key (research:{jobId}:{i}) and advance that job if complete. Lets
// the UI flip ready -> reviewed without threading the job id through every proposal form.
export async function reviewResearchJobForProposal(
  db: Database,
  caller: CallerContext,
  proposalId: string,
): Promise<void> {
  const researchJobId = await withTenant(db, caller.tenantId, async (tx) => {
    const rows = await tx
      .select({ originKey: copilotProposals.originKey })
      .from(copilotProposals)
      .where(eq(copilotProposals.id, proposalId))
      .limit(1);
    const originKey = rows[0]?.originKey;
    if (!originKey) return null;
    const match = /^research:([^:]+):/.exec(originKey);
    return match?.[1] ?? null;
  });
  if (researchJobId === null) return;
  await markResearchJobReviewedIfComplete(db, caller, researchJobId);
}

// Drives the final ready -> reviewed leg from the proposal approve/dismiss flow (called by the web
// action after a research-originated proposal is decided). The job is reviewed once none of its
// emitted proposals remain pending. Kept out of the shared approveProposal/dismissProposal path so
// the I6 mechanism is unchanged for non-research proposals.
export async function markResearchJobReviewedIfComplete(
  db: Database,
  caller: CallerContext,
  researchJobId: string,
): Promise<void> {
  await withTenant(db, caller.tenantId, async (tx) => {
    const pending = await tx
      .select({ id: copilotProposals.id })
      .from(copilotProposals)
      .where(
        and(
          eq(copilotProposals.tenantId, caller.tenantId),
          eq(copilotProposals.status, "pending"),
          sql`${copilotProposals.originKey} like ${`research:${researchJobId}:%`}`,
        ),
      )
      .limit(1);
    if (pending.length > 0) return;

    await tx
      .update(researchJobs)
      .set({ status: "reviewed" })
      .where(
        and(
          eq(researchJobs.id, researchJobId),
          eq(researchJobs.tenantId, caller.tenantId),
          eq(researchJobs.status, "ready"),
        ),
      );
  });
}

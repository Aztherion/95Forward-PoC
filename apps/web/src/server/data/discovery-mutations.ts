import "server-only";
import { and, eq, sql } from "drizzle-orm";
import {
  candidates,
  constituents,
  discoveryTasks,
  naturalPartners,
  prospects,
  withTenant,
} from "@95forward/db";
import type { CandidateDecisionInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";

// A candidate decision is a forward-only CAS: it only fires from a valid prior status, so a
// double-submit or an out-of-order click is a no-op. endorse: suggested→endorsed; request intro:
// endorsed→intro_requested; dismiss: suggested|endorsed|intro_requested→dismissed.
const ALLOWED_FROM: Record<CandidateDecisionInput["decision"], readonly string[]> = {
  endorsed: ["suggested"],
  intro_requested: ["endorsed"],
  dismissed: ["suggested", "endorsed", "intro_requested"],
};

export async function decideCandidate(
  tenantId: string,
  input: CandidateDecisionInput,
): Promise<void> {
  const allowed = ALLOWED_FROM[input.decision];
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(candidates)
      .set({ status: input.decision })
      .where(
        and(
          eq(candidates.id, input.candidateId),
          eq(candidates.tenantId, tenantId),
          sql`${candidates.status} in (${sql.join(
            allowed.map((s) => sql`${s}`),
            sql`, `,
          )})`,
        ),
      );
  });
}

// Promote an endorsed/intro-requested candidate into the pipeline — the methodology payoff. In ONE
// tenant-scoped transaction: create a constituent + a research-stage prospect from the candidate,
// auto-set the discovery task's connector as that prospect's Natural Partner (the warm path is
// already known), then mark the candidate promoted and link it to the new prospect. The promoted
// prospect now enters the MPL; the candidate is the only gateway onto the list. Returns the new
// prospect id (or null if the candidate was already promoted / not in a promotable state).
export async function promoteCandidate(
  tenantId: string,
  candidateId: string,
): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const candidateRows = await tx
      .select({
        name: candidates.name,
        status: candidates.status,
        discoveryTaskId: candidates.discoveryTaskId,
        evidenceConnection: candidates.evidenceConnection,
      })
      .from(candidates)
      .where(and(eq(candidates.id, candidateId), eq(candidates.tenantId, tenantId)))
      .limit(1);
    const candidate = candidateRows[0];
    if (!candidate) return null;
    if (candidate.status === "promoted" || candidate.status === "dismissed") return null;

    const taskRows = await tx
      .select({
        connectorConstituentId: discoveryTasks.connectorConstituentId,
        connectorExternalName: discoveryTasks.connectorExternalName,
      })
      .from(discoveryTasks)
      .where(eq(discoveryTasks.id, candidate.discoveryTaskId))
      .limit(1);
    const task = taskRows[0];
    if (!task) return null;

    const constituentRows = await tx
      .insert(constituents)
      .values({ tenantId, type: "individual", displayName: candidate.name })
      .returning({ id: constituents.id });
    const constituentId = constituentRows[0]!.id;

    const prospectRows = await tx
      .insert(prospects)
      .values({ tenantId, constituentId, status: "research" })
      .returning({ id: prospects.id });
    const prospectId = prospectRows[0]!.id;

    await tx.insert(naturalPartners).values({
      tenantId,
      prospectId,
      constituentId: task.connectorConstituentId ?? null,
      externalName: task.connectorConstituentId ? null : (task.connectorExternalName ?? null),
      role: "Connector",
      warmPathNote: candidate.evidenceConnection,
    });

    const promoted = await tx
      .update(candidates)
      .set({ status: "promoted", promotedProspectId: prospectId })
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.tenantId, tenantId),
          sql`${candidates.status} not in ('promoted', 'dismissed')`,
        ),
      )
      .returning({ id: candidates.id });
    if (promoted.length === 0) return null;

    return prospectId;
  });
}

// "Keep researching" re-runs discovery for the candidate's whole batch. NOTE (deviation from the
// literal prompt): this is a re-discovery pass, NOT an I11 research job — research_jobs.prospectId
// is NOT NULL, so a research job would require a prospect, and creating one would put the candidate
// on the MPL, breaking the off-MPL invariant. To actually re-run, we must reset the task to
// "queued", clear its checkpoint (so the provider is called again, not short-circuited), and delete
// the batch's existing candidates (so their origin_key slots are free for the fresh insert — the
// handler inserts ON CONFLICT DO NOTHING). Returns the task id for the action to re-enqueue.
export async function resetCandidateForResearch(
  tenantId: string,
  candidateId: string,
): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({ discoveryTaskId: candidates.discoveryTaskId })
      .from(candidates)
      .where(and(eq(candidates.id, candidateId), eq(candidates.tenantId, tenantId)))
      .limit(1);
    const candidate = rows[0];
    if (!candidate) return null;
    const taskId = candidate.discoveryTaskId;

    await tx
      .delete(candidates)
      .where(and(eq(candidates.tenantId, tenantId), eq(candidates.discoveryTaskId, taskId)));
    await tx
      .update(discoveryTasks)
      .set({ status: "queued", checkpoint: null, completedAt: null })
      .where(and(eq(discoveryTasks.id, taskId), eq(discoveryTasks.tenantId, tenantId)));
    return taskId;
  });
}

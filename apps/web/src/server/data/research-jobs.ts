import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { researchJobs, withTenant } from "@95forward/db";
import { getAppDb } from "@/server/db";

export interface CreateResearchJobInput {
  prospectId: string;
  researchGapId?: string | null;
  requestedByUserId: string;
}

export async function createResearchJob(
  tenantId: string,
  input: CreateResearchJobInput,
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(researchJobs)
      .values({
        tenantId,
        prospectId: input.prospectId,
        researchGapId: input.researchGapId ?? null,
        requestedByUserId: input.requestedByUserId,
        status: "queued",
      })
      .returning({ id: researchJobs.id });
    const inserted = rows[0];
    if (inserted === undefined) throw new Error("createResearchJob: insert returned no row");
    return inserted.id;
  });
}

export interface ResearchJobSummary {
  id: string;
  prospectId: string;
  prospectName: string;
  status: "queued" | "researching" | "ready" | "reviewed";
}

export interface JobTrayState {
  researching: ResearchJobSummary[];
  ready: ResearchJobSummary[];
  readyCount: number;
}

// Powers the polling job tray + the Today touch: the active ("researching"/"queued") jobs and the
// jobs whose results are ready to review. Scoped via withTenant, so a caller only ever sees their
// own tenant's jobs.
export async function getJobTrayState(tenantId: string): Promise<JobTrayState> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx.query.researchJobs.findMany({
      where: and(
        eq(researchJobs.tenantId, tenantId),
        inArray(researchJobs.status, ["queued", "researching", "ready"]),
      ),
      orderBy: [desc(researchJobs.requestedAt)],
      with: { prospect: { with: { constituent: { columns: { displayName: true } } } } },
    });
    const summaries: ResearchJobSummary[] = rows.map((row) => ({
      id: row.id,
      prospectId: row.prospectId,
      prospectName: row.prospect.constituent.displayName,
      status: row.status,
    }));
    const researching = summaries.filter(
      (s) => s.status === "queued" || s.status === "researching",
    );
    const ready = summaries.filter((s) => s.status === "ready");
    return { researching, ready, readyCount: ready.length };
  });
}

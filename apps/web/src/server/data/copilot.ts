import "server-only";
import { asc, eq } from "drizzle-orm";
import { constituents, prospects, withTenant } from "@95forward/db";
import { listProposals, type ProposalRow } from "@95forward/ai";
import { getAppDb } from "@/server/db";

export interface DemoSubject {
  prospectId: string;
  constituentId: string;
  constituentName: string;
}

export async function getDemoSubject(tenantId: string): Promise<DemoSubject | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        prospectId: prospects.id,
        constituentId: prospects.constituentId,
        constituentName: constituents.displayName,
      })
      .from(prospects)
      .innerJoin(constituents, eq(constituents.id, prospects.constituentId))
      .orderBy(asc(prospects.rank))
      .limit(1);
    const first = rows[0];
    if (first === undefined) return null;
    return {
      prospectId: first.prospectId,
      constituentId: first.constituentId,
      constituentName: first.constituentName,
    };
  });
}

export async function listSubjectProposals(
  tenantId: string,
  subjectIds: string[],
): Promise<ProposalRow[]> {
  const caller = {
    id: "00000000-0000-0000-0000-000000000000",
    tenantId,
    role: "gift_officer" as const,
  };
  const all = await listProposals(getAppDb(), caller);
  const ids = new Set(subjectIds);
  return all.filter((proposal) => ids.has(proposal.subjectId));
}

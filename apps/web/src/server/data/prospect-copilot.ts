import "server-only";
import { listProposals, type ProposalRow } from "@95forward/ai";
import type { CurrentUser } from "@95forward/shared";
import { getAppDb } from "@/server/db";

type Caller = Pick<CurrentUser, "id" | "tenantId" | "role">;

// Pending QPI suggestions for one prospect, read through the tenant-scoped proposal store so a
// suggestion can never leak across tenants or prospects.
export async function listProspectProposals(
  tenantId: string,
  caller: Caller,
  prospectId: string,
): Promise<ProposalRow[]> {
  return listProposals(
    getAppDb(),
    { id: caller.id, tenantId, role: caller.role },
    {
      subjectId: prospectId,
      proposalType: "qpi_assessment",
      status: "pending",
    },
  );
}

import "server-only";
import { listProposals, type ProposalRow, type ProposalType } from "@95forward/ai";
import type { CurrentUser } from "@95forward/shared";
import { getAppDb } from "@/server/db";

type Caller = Pick<CurrentUser, "id" | "tenantId" | "role">;

// Pending suggestions of one type for one prospect, read through the tenant-scoped proposal store
// so a suggestion can never leak across tenants or prospects. Defaults to QPI for the Overview tab.
export async function listProspectProposals(
  tenantId: string,
  caller: Caller,
  prospectId: string,
  proposalType: ProposalType = "qpi_assessment",
): Promise<ProposalRow[]> {
  return listProposals(
    getAppDb(),
    { id: caller.id, tenantId, role: caller.role },
    {
      subjectId: prospectId,
      proposalType,
      status: "pending",
    },
  );
}

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

// Call-memo / follow-up drafts are generic `draft` proposals scoped to the prospect's constituent
// (the I6 draft mechanism). They are surfaced for the user to edit and save/send, not auto-applied.
export async function listConstituentDrafts(
  tenantId: string,
  caller: Caller,
  constituentId: string,
): Promise<ProposalRow[]> {
  return listProposals(
    getAppDb(),
    { id: caller.id, tenantId, role: caller.role },
    {
      subjectId: constituentId,
      proposalType: "draft",
      status: "pending",
    },
  );
}

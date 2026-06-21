import "server-only";
import { listProposals, type ProposalRow } from "@95forward/ai";
import type { CurrentUser } from "@95forward/shared";
import { getAppDb } from "@/server/db";

type Caller = Pick<CurrentUser, "id" | "tenantId" | "role">;

export async function listInitiativeProposals(
  tenantId: string,
  caller: Caller,
  fundingInitiativeId: string,
): Promise<ProposalRow[]> {
  return listProposals(
    getAppDb(),
    { id: caller.id, tenantId, role: caller.role },
    {
      subjectId: fundingInitiativeId,
      proposalType: "funding_initiative_rationale",
      status: "pending",
    },
  );
}

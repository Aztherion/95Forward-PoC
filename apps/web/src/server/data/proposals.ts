import "server-only";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { constituents, proposals, withTenant } from "@95forward/db";
import type { ProposalInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import type { ProposalListParams } from "@/lib/proposal-params";

export interface ProposalListRow {
  id: string;
  constituentId: string;
  constituentName: string;
  purpose: string | null;
  amountCents: number | null;
  status: string | null;
  deadline: string | null;
}

function buildProposalConditions(params: ProposalListParams): SQL[] {
  const conditions: SQL[] = [];
  if (params.status) conditions.push(eq(proposals.status, params.status));
  return conditions;
}

export async function getProposalsList(
  tenantId: string,
  params: ProposalListParams,
): Promise<ProposalListRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const conditions = buildProposalConditions(params);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return tx
      .select({
        id: proposals.id,
        constituentId: proposals.constituentId,
        constituentName: constituents.displayName,
        purpose: proposals.purpose,
        amountCents: proposals.amountCents,
        status: proposals.status,
        deadline: proposals.deadline,
      })
      .from(proposals)
      .innerJoin(constituents, eq(constituents.id, proposals.constituentId))
      .where(whereClause)
      .orderBy(desc(proposals.deadline), asc(constituents.displayName));
  });
}

export interface ProposalDetail {
  id: string;
  constituentId: string;
  constituentName: string;
  purpose: string | null;
  amountCents: number | null;
  status: string | null;
  deadline: string | null;
}

export async function getProposalDetail(
  tenantId: string,
  id: string,
): Promise<ProposalDetail | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: proposals.id,
        constituentId: proposals.constituentId,
        constituentName: constituents.displayName,
        purpose: proposals.purpose,
        amountCents: proposals.amountCents,
        status: proposals.status,
        deadline: proposals.deadline,
      })
      .from(proposals)
      .innerJoin(constituents, eq(constituents.id, proposals.constituentId))
      .where(eq(proposals.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

function proposalValues(input: ProposalInput) {
  return {
    constituentId: input.constituentId,
    purpose: input.purpose ?? null,
    amountCents: input.amountCents ?? null,
    status: input.status,
    deadline: input.deadline ?? null,
  };
}

export async function createProposal(tenantId: string, input: ProposalInput): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(proposals)
      .values({ tenantId, ...proposalValues(input) })
      .returning({ id: proposals.id });
    const row = rows[0];
    if (!row) throw new Error("createProposal: insert returned no rows");
    return row.id;
  });
}

export async function updateProposal(
  tenantId: string,
  id: string,
  input: ProposalInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.update(proposals).set(proposalValues(input)).where(eq(proposals.id, id));
  });
}

export async function deleteProposal(tenantId: string, id: string): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .delete(proposals)
      .where(eq(proposals.id, id))
      .returning({ constituentId: proposals.constituentId });
    return rows[0]?.constituentId ?? null;
  });
}

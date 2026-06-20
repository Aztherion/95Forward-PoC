import "server-only";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { constituents, opportunities, users, withTenant } from "@95forward/db";
import type { OpportunityInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import type { OpportunityListParams } from "@/lib/opportunity-params";

export interface OpportunityListRow {
  id: string;
  constituentId: string;
  constituentName: string;
  stage: string;
  askAmountCents: number | null;
  expectedAmountCents: number | null;
  expectedCloseDate: string | null;
  likelihoodPct: number | null;
  ownerUserId: string | null;
  ownerName: string | null;
}

function buildOpportunityConditions(params: OpportunityListParams): SQL[] {
  const conditions: SQL[] = [];
  if (params.stage) conditions.push(eq(opportunities.stage, params.stage));
  if (params.ownerUserId) conditions.push(eq(opportunities.ownerUserId, params.ownerUserId));
  return conditions;
}

export async function getOpportunitiesList(
  tenantId: string,
  params: OpportunityListParams,
): Promise<OpportunityListRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const conditions = buildOpportunityConditions(params);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return tx
      .select({
        id: opportunities.id,
        constituentId: opportunities.constituentId,
        constituentName: constituents.displayName,
        stage: opportunities.stage,
        askAmountCents: opportunities.askAmountCents,
        expectedAmountCents: opportunities.expectedAmountCents,
        expectedCloseDate: opportunities.expectedCloseDate,
        likelihoodPct: opportunities.likelihoodPct,
        ownerUserId: opportunities.ownerUserId,
        ownerName: users.name,
      })
      .from(opportunities)
      .innerJoin(constituents, eq(constituents.id, opportunities.constituentId))
      .leftJoin(users, eq(users.id, opportunities.ownerUserId))
      .where(whereClause)
      .orderBy(desc(opportunities.askAmountCents), asc(constituents.displayName));
  });
}

export interface OpportunityDetail {
  id: string;
  constituentId: string;
  constituentName: string;
  stage: string;
  askAmountCents: number | null;
  expectedAmountCents: number | null;
  expectedCloseDate: string | null;
  likelihoodPct: number | null;
  ownerUserId: string | null;
  ownerName: string | null;
}

export async function getOpportunityDetail(
  tenantId: string,
  id: string,
): Promise<OpportunityDetail | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: opportunities.id,
        constituentId: opportunities.constituentId,
        constituentName: constituents.displayName,
        stage: opportunities.stage,
        askAmountCents: opportunities.askAmountCents,
        expectedAmountCents: opportunities.expectedAmountCents,
        expectedCloseDate: opportunities.expectedCloseDate,
        likelihoodPct: opportunities.likelihoodPct,
        ownerUserId: opportunities.ownerUserId,
        ownerName: users.name,
      })
      .from(opportunities)
      .innerJoin(constituents, eq(constituents.id, opportunities.constituentId))
      .leftJoin(users, eq(users.id, opportunities.ownerUserId))
      .where(eq(opportunities.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

function opportunityValues(input: OpportunityInput) {
  return {
    constituentId: input.constituentId,
    stage: input.stage,
    askAmountCents: input.askAmountCents ?? null,
    expectedAmountCents: input.expectedAmountCents ?? null,
    expectedCloseDate: input.expectedCloseDate ?? null,
    likelihoodPct: input.likelihoodPct ?? null,
    ownerUserId: input.ownerUserId ?? null,
  };
}

export async function createOpportunity(
  tenantId: string,
  input: OpportunityInput,
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(opportunities)
      .values({ tenantId, ...opportunityValues(input) })
      .returning({ id: opportunities.id });
    const row = rows[0];
    if (!row) throw new Error("createOpportunity: insert returned no rows");
    return row.id;
  });
}

export async function updateOpportunity(
  tenantId: string,
  id: string,
  input: OpportunityInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.update(opportunities).set(opportunityValues(input)).where(eq(opportunities.id, id));
  });
}

export async function deleteOpportunity(tenantId: string, id: string): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .delete(opportunities)
      .where(eq(opportunities.id, id))
      .returning({ constituentId: opportunities.constituentId });
    return rows[0]?.constituentId ?? null;
  });
}

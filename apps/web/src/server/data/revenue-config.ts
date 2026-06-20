import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { appeals, campaigns, funds, gifts, withTenant } from "@95forward/db";
import type { NamedRefInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";

export type RevenueEntity = "fund" | "campaign" | "appeal";

const TABLES = {
  fund: funds,
  campaign: campaigns,
  appeal: appeals,
} as const;

const GIFT_FK = {
  fund: gifts.fundId,
  campaign: gifts.campaignId,
  appeal: gifts.appealId,
} as const;

export interface NamedRef {
  id: string;
  name: string;
}

export interface NamedRefRow {
  id: string;
  name: string;
  code: string | null;
  startDate: string | null;
  endDate: string | null;
  giftCount: number;
}

export interface NamedRefDetail {
  id: string;
  name: string;
  code: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface RevenueRefs {
  funds: NamedRef[];
  campaigns: NamedRef[];
  appeals: NamedRef[];
}

export async function listRevenueRefs(tenantId: string): Promise<RevenueRefs> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    // Sequential, not Promise.all: a Drizzle transaction pins a single pg client,
    // which can only run one query at a time.
    const fundRows = await tx
      .select({ id: funds.id, name: funds.name })
      .from(funds)
      .orderBy(asc(funds.name));
    const campaignRows = await tx
      .select({ id: campaigns.id, name: campaigns.name })
      .from(campaigns)
      .orderBy(asc(campaigns.name));
    const appealRows = await tx
      .select({ id: appeals.id, name: appeals.name })
      .from(appeals)
      .orderBy(asc(appeals.name));
    return { funds: fundRows, campaigns: campaignRows, appeals: appealRows };
  });
}

export async function listNamedRefs(
  tenantId: string,
  entity: RevenueEntity,
): Promise<NamedRefRow[]> {
  const table = TABLES[entity];
  const fk = GIFT_FK[entity];
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: table.id,
        name: table.name,
        code: table.code,
        startDate: table.startDate,
        endDate: table.endDate,
        giftCount: sql<number>`count(${gifts.id})::int`,
      })
      .from(table)
      .leftJoin(gifts, eq(fk, table.id))
      .groupBy(table.id)
      .orderBy(asc(table.name));
    return rows.map((row) => ({ ...row, giftCount: Number(row.giftCount ?? 0) }));
  });
}

export async function getNamedRef(
  tenantId: string,
  entity: RevenueEntity,
  id: string,
): Promise<NamedRefDetail | null> {
  const table = TABLES[entity];
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: table.id,
        name: table.name,
        code: table.code,
        startDate: table.startDate,
        endDate: table.endDate,
      })
      .from(table)
      .where(eq(table.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

function namedRefValues(input: NamedRefInput) {
  return {
    name: input.name,
    code: input.code ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
  };
}

export async function createNamedRef(
  tenantId: string,
  entity: RevenueEntity,
  input: NamedRefInput,
): Promise<string> {
  const table = TABLES[entity];
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(table)
      .values({ tenantId, ...namedRefValues(input) })
      .returning({ id: table.id });
    const row = rows[0];
    if (!row) throw new Error("createNamedRef: insert returned no rows");
    return row.id;
  });
}

export async function updateNamedRef(
  tenantId: string,
  entity: RevenueEntity,
  id: string,
  input: NamedRefInput,
): Promise<void> {
  const table = TABLES[entity];
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.update(table).set(namedRefValues(input)).where(eq(table.id, id));
  });
}

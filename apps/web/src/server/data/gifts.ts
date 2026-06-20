import "server-only";
import { escapeLike } from "@/lib/sql";
import { and, asc, desc, eq, gte, ilike, lte, sql, type SQL } from "drizzle-orm";
import { appeals, campaigns, constituents, funds, gifts, withTenant } from "@95forward/db";
import type { GiftInput } from "@95forward/shared";
import { RECEIPT_STATUSES } from "@95forward/shared";

type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];
import { getAppDb } from "@/server/db";
import {
  GIFTS_PAGE_SIZE,
  computeGiftSummary,
  type GiftListParams,
  type GiftSummary,
} from "@/lib/gift-params";

export interface GiftListRow {
  id: string;
  constituentId: string;
  donorName: string;
  amountCents: number;
  giftDate: string;
  fundName: string | null;
  campaignName: string | null;
  appealName: string | null;
  giftType: string;
  receiptStatus: string | null;
}

export interface GiftListResult {
  rows: GiftListRow[];
  total: number;
  summary: GiftSummary;
}

function buildGiftConditions(params: GiftListParams): SQL[] {
  const conditions: SQL[] = [];

  if (params.search) {
    const term = `%${escapeLike(params.search)}%`;
    const like = ilike(constituents.displayName, term);
    if (like) conditions.push(like);
  }
  if (params.giftType) conditions.push(eq(gifts.giftType, params.giftType));
  if (params.fundId) conditions.push(eq(gifts.fundId, params.fundId));
  if (params.campaignId) conditions.push(eq(gifts.campaignId, params.campaignId));
  if (params.appealId) conditions.push(eq(gifts.appealId, params.appealId));
  if (params.receiptStatus) conditions.push(eq(gifts.receiptStatus, params.receiptStatus));
  if (params.from) conditions.push(gte(gifts.giftDate, params.from));
  if (params.to) conditions.push(lte(gifts.giftDate, params.to));

  return conditions;
}

function buildGiftOrderBy(params: GiftListParams): SQL[] {
  const direction = params.dir === "asc" ? asc : desc;
  switch (params.sort) {
    case "amount":
      return [direction(gifts.amountCents), desc(gifts.giftDate)];
    case "donor":
      return [direction(constituents.displayName), desc(gifts.giftDate)];
    case "fund":
      return [direction(funds.name), desc(gifts.giftDate)];
    case "campaign":
      return [direction(campaigns.name), desc(gifts.giftDate)];
    case "appeal":
      return [direction(appeals.name), desc(gifts.giftDate)];
    case "giftType":
      return [direction(gifts.giftType), desc(gifts.giftDate)];
    case "receiptStatus":
      return [direction(gifts.receiptStatus), desc(gifts.giftDate)];
    case "giftDate":
    default:
      return [direction(gifts.giftDate), desc(gifts.createdAt)];
  }
}

export async function getGiftsList(
  tenantId: string,
  params: GiftListParams,
): Promise<GiftListResult> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const conditions = buildGiftConditions(params);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const summaryRows = await tx
      .select({
        total: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`,
        count: sql<number>`count(*)::int`,
      })
      .from(gifts)
      .innerJoin(constituents, eq(constituents.id, gifts.constituentId))
      .leftJoin(funds, eq(funds.id, gifts.fundId))
      .leftJoin(campaigns, eq(campaigns.id, gifts.campaignId))
      .leftJoin(appeals, eq(appeals.id, gifts.appealId))
      .where(whereClause);

    const total = Number(summaryRows[0]?.count ?? 0);
    const totalRaisedCents = Number(summaryRows[0]?.total ?? 0);
    const summary = computeGiftSummary(totalRaisedCents, total);

    const orderBy = buildGiftOrderBy(params);

    const rows = await tx
      .select({
        id: gifts.id,
        constituentId: gifts.constituentId,
        donorName: constituents.displayName,
        amountCents: gifts.amountCents,
        giftDate: gifts.giftDate,
        fundName: funds.name,
        campaignName: campaigns.name,
        appealName: appeals.name,
        giftType: gifts.giftType,
        receiptStatus: gifts.receiptStatus,
      })
      .from(gifts)
      .innerJoin(constituents, eq(constituents.id, gifts.constituentId))
      .leftJoin(funds, eq(funds.id, gifts.fundId))
      .leftJoin(campaigns, eq(campaigns.id, gifts.campaignId))
      .leftJoin(appeals, eq(appeals.id, gifts.appealId))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(GIFTS_PAGE_SIZE)
      .offset((params.page - 1) * GIFTS_PAGE_SIZE);

    return { rows, total, summary };
  });
}

export interface GiftDetail {
  id: string;
  constituentId: string;
  donorName: string;
  amountCents: number;
  giftDate: string;
  fundId: string | null;
  campaignId: string | null;
  appealId: string | null;
  giftType: string;
  designation: string | null;
  receiptStatus: string | null;
}

export async function getGiftDetail(tenantId: string, id: string): Promise<GiftDetail | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: gifts.id,
        constituentId: gifts.constituentId,
        donorName: constituents.displayName,
        amountCents: gifts.amountCents,
        giftDate: gifts.giftDate,
        fundId: gifts.fundId,
        campaignId: gifts.campaignId,
        appealId: gifts.appealId,
        giftType: gifts.giftType,
        designation: gifts.designation,
        receiptStatus: gifts.receiptStatus,
      })
      .from(gifts)
      .innerJoin(constituents, eq(constituents.id, gifts.constituentId))
      .where(eq(gifts.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

function giftValues(input: GiftInput) {
  return {
    constituentId: input.constituentId,
    amountCents: input.amountCents,
    giftDate: input.giftDate,
    fundId: input.fundId ?? null,
    campaignId: input.campaignId ?? null,
    appealId: input.appealId ?? null,
    giftType: input.giftType,
    designation: input.designation ?? null,
    receiptStatus: input.receiptStatus,
  };
}

export async function createGift(tenantId: string, input: GiftInput): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(gifts)
      .values({ tenantId, ...giftValues(input) })
      .returning({ id: gifts.id });
    const row = rows[0];
    if (!row) throw new Error("createGift: insert returned no rows");
    return row.id;
  });
}

export async function updateGift(tenantId: string, id: string, input: GiftInput): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.update(gifts).set(giftValues(input)).where(eq(gifts.id, id));
  });
}

export async function deleteGift(tenantId: string, id: string): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .delete(gifts)
      .where(eq(gifts.id, id))
      .returning({ constituentId: gifts.constituentId });
    return rows[0]?.constituentId ?? null;
  });
}

export async function setGiftReceiptStatus(
  tenantId: string,
  id: string,
  receiptStatus: ReceiptStatus,
): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .update(gifts)
      .set({ receiptStatus })
      .where(eq(gifts.id, id))
      .returning({ constituentId: gifts.constituentId });
    return rows[0]?.constituentId ?? null;
  });
}

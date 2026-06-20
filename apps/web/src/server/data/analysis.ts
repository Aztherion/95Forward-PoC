import "server-only";
import { eq, gte, isNotNull, sql } from "drizzle-orm";
import { appeals, campaigns, funds, gifts, withTenant } from "@95forward/db";
import { getAppDb } from "@/server/db";
import { bucketGiftsByMonth, yearStartIso, type MonthlyTotal } from "@/lib/dashboard-metrics";
import {
  computeGoalProgress,
  summarizeRetention,
  topByAmount,
  type GoalProgress,
  type RetentionBreakdown,
} from "@/lib/analysis-metrics";

const TREND_MONTHS = 12;
const TOP_LIMIT = 6;

export interface RankedTotal {
  id: string;
  name: string;
  amountCents: number;
}

export interface FundraisingPerformance {
  totalRaisedCents: number;
  giftCount: number;
  averageGiftCents: number;
  yearToDateCents: number;
  monthlyTotals: MonthlyTotal[];
  topFunds: RankedTotal[];
  topCampaigns: RankedTotal[];
}

export async function getFundraisingPerformance(
  tenantId: string,
  reference: Date,
): Promise<FundraisingPerformance> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const totalsRows = await tx
      .select({
        total: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`,
        count: sql<number>`count(*)::int`,
      })
      .from(gifts);
    const totalRaisedCents = Number(totalsRows[0]?.total ?? 0);
    const giftCount = Number(totalsRows[0]?.count ?? 0);
    const averageGiftCents = giftCount === 0 ? 0 : Math.round(totalRaisedCents / giftCount);

    const ytdRows = await tx
      .select({ total: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint` })
      .from(gifts)
      .where(gte(gifts.giftDate, yearStartIso(reference)));
    const yearToDateCents = Number(ytdRows[0]?.total ?? 0);

    const trendStart = trendStartIso(reference, TREND_MONTHS);
    const trendRows = await tx
      .select({ giftDate: gifts.giftDate, amountCents: gifts.amountCents })
      .from(gifts)
      .where(gte(gifts.giftDate, trendStart));
    const monthlyTotals = bucketGiftsByMonth(reference, TREND_MONTHS, trendRows);

    const fundRows = await tx
      .select({
        id: funds.id,
        name: funds.name,
        amountCents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`,
      })
      .from(funds)
      .innerJoin(gifts, eq(gifts.fundId, funds.id))
      .groupBy(funds.id, funds.name);
    const topFunds = topByAmount(
      fundRows.map((row) => ({
        id: row.id,
        name: row.name,
        amountCents: Number(row.amountCents),
      })),
      TOP_LIMIT,
    );

    const campaignRows = await tx
      .select({
        id: campaigns.id,
        name: campaigns.name,
        amountCents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`,
      })
      .from(campaigns)
      .innerJoin(gifts, eq(gifts.campaignId, campaigns.id))
      .groupBy(campaigns.id, campaigns.name);
    const topCampaigns = topByAmount(
      campaignRows.map((row) => ({
        id: row.id,
        name: row.name,
        amountCents: Number(row.amountCents),
      })),
      TOP_LIMIT,
    );

    return {
      totalRaisedCents,
      giftCount,
      averageGiftCents,
      yearToDateCents,
      monthlyTotals,
      topFunds,
      topCampaigns,
    };
  });
}

export interface DonorRetention extends RetentionBreakdown {
  currentYear: number;
}

export async function getDonorRetention(
  tenantId: string,
  reference: Date,
): Promise<DonorRetention> {
  const currentYear = reference.getUTCFullYear();
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        constituentId: gifts.constituentId,
        firstGiftYear: sql<number>`extract(year from min(${gifts.giftDate}))::int`,
        gaveThisYear: sql<boolean>`bool_or(extract(year from ${gifts.giftDate}) = ${currentYear})`,
      })
      .from(gifts)
      .groupBy(gifts.constituentId);

    const donors = rows.map((row) => ({
      constituentId: row.constituentId,
      firstGiftYear: Number(row.firstGiftYear),
      gaveThisYear: Boolean(row.gaveThisYear),
    }));

    const breakdown = summarizeRetention(donors, currentYear);
    return { ...breakdown, currentYear };
  });
}

export interface GoalRow {
  id: string;
  name: string;
  progress: GoalProgress;
}

export interface CampaignProgress {
  campaigns: GoalRow[];
  appeals: GoalRow[];
}

export async function getCampaignProgress(tenantId: string): Promise<CampaignProgress> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const campaignRows = await tx
      .select({
        id: campaigns.id,
        name: campaigns.name,
        goalAmountCents: campaigns.goalAmountCents,
        raisedCents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`,
      })
      .from(campaigns)
      .leftJoin(gifts, eq(gifts.campaignId, campaigns.id))
      .where(isNotNull(campaigns.goalAmountCents))
      .groupBy(campaigns.id, campaigns.name, campaigns.goalAmountCents)
      .orderBy(campaigns.name);

    const appealRows = await tx
      .select({
        id: appeals.id,
        name: appeals.name,
        goalAmountCents: appeals.goalAmountCents,
        raisedCents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`,
      })
      .from(appeals)
      .leftJoin(gifts, eq(gifts.appealId, appeals.id))
      .where(isNotNull(appeals.goalAmountCents))
      .groupBy(appeals.id, appeals.name, appeals.goalAmountCents)
      .orderBy(appeals.name);

    return {
      campaigns: campaignRows.map((row) => ({
        id: row.id,
        name: row.name,
        progress: computeGoalProgress(Number(row.raisedCents), Number(row.goalAmountCents ?? 0)),
      })),
      appeals: appealRows.map((row) => ({
        id: row.id,
        name: row.name,
        progress: computeGoalProgress(Number(row.raisedCents), Number(row.goalAmountCents ?? 0)),
      })),
    };
  });
}

function trendStartIso(reference: Date, months: number): string {
  const date = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - (months - 1), 1),
  );
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${month < 10 ? `0${month}` : month}-01`;
}

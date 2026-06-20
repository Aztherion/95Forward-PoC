import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { constituents, gifts, interactions, users, withTenant } from "@95forward/db";
import { getAppDb } from "@/server/db";
import {
  MAJOR_GIFT_LIKELIHOOD_THRESHOLD,
  bucketGiftsByMonth,
  yearStartIso,
  type MonthlyTotal,
} from "@/lib/dashboard-metrics";

export interface DashboardStats {
  totalRaisedCents: number;
  giftCount: number;
  donorCount: number;
}

export interface RecentGift {
  id: string;
  constituentId: string;
  donorName: string;
  amountCents: number;
  giftType: string;
  giftDate: string;
}

export interface RecentActivity {
  id: string;
  constituentId: string;
  constituentName: string;
  type: string;
  occurredAt: Date;
  ownerName: string | null;
}

export interface DashboardData {
  stats: DashboardStats;
  recentGifts: RecentGift[];
  recentActivity: RecentActivity[];
  monthlyTotals: MonthlyTotal[];
  majorGiftLikelihoodCount: number;
}

const RECENT_LIMIT = 6;
const TREND_MONTHS = 6;

export async function getDashboardData(tenantId: string, reference: Date): Promise<DashboardData> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const yearStart = yearStartIso(reference);

    const statsRows = await tx
      .select({
        totalRaised: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`,
        giftCount: sql<number>`count(*)::int`,
        donorCount: sql<number>`count(distinct ${gifts.constituentId})::int`,
      })
      .from(gifts)
      .where(gte(gifts.giftDate, yearStart));

    const stats: DashboardStats = {
      totalRaisedCents: Number(statsRows[0]?.totalRaised ?? 0),
      giftCount: Number(statsRows[0]?.giftCount ?? 0),
      donorCount: Number(statsRows[0]?.donorCount ?? 0),
    };

    const recentGiftRows = await tx
      .select({
        id: gifts.id,
        constituentId: gifts.constituentId,
        donorName: constituents.displayName,
        amountCents: gifts.amountCents,
        giftType: gifts.giftType,
        giftDate: gifts.giftDate,
      })
      .from(gifts)
      .innerJoin(constituents, eq(constituents.id, gifts.constituentId))
      .orderBy(desc(gifts.giftDate), desc(gifts.createdAt))
      .limit(RECENT_LIMIT);

    const recentActivityRows = await tx
      .select({
        id: interactions.id,
        constituentId: interactions.constituentId,
        constituentName: constituents.displayName,
        type: interactions.type,
        occurredAt: interactions.occurredAt,
        ownerName: users.name,
      })
      .from(interactions)
      .innerJoin(constituents, eq(constituents.id, interactions.constituentId))
      .leftJoin(users, eq(users.id, interactions.ownerUserId))
      .orderBy(desc(interactions.occurredAt), desc(interactions.createdAt))
      .limit(RECENT_LIMIT);

    const trendStart = trendStartIso(reference, TREND_MONTHS);
    const trendRows = await tx
      .select({ giftDate: gifts.giftDate, amountCents: gifts.amountCents })
      .from(gifts)
      .where(gte(gifts.giftDate, trendStart));
    const monthlyTotals = bucketGiftsByMonth(reference, TREND_MONTHS, trendRows);

    const likelihoodRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(constituents)
      .where(
        and(
          gte(constituents.hostLikelihood, MAJOR_GIFT_LIKELIHOOD_THRESHOLD),
          sql`${constituents.archivedAt} is null`,
        ),
      );
    const majorGiftLikelihoodCount = Number(likelihoodRows[0]?.count ?? 0);

    return {
      stats,
      recentGifts: recentGiftRows,
      recentActivity: recentActivityRows,
      monthlyTotals,
      majorGiftLikelihoodCount,
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

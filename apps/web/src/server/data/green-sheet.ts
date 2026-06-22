import "server-only";
import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import {
  asks,
  followUpTasks,
  fundingInitiatives,
  prospects,
  prospectStrategy,
  users,
  visits,
  withTenant,
} from "@95forward/db";
import { canViewTeamScope, type CurrentUser } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import {
  compliancePct,
  coveragePct,
  monthStart,
  weekStart,
  type GreenSheetScope,
  type HorizonPipeline,
  type OutcomeSplit,
} from "@/lib/green-sheet-metrics";

type Tx = Parameters<Parameters<typeof withTenant<unknown>>[2]>[0];

export interface RmMetricsRow {
  userId: string;
  name: string;
  top33Coverage: number;
  visits: number;
  asks: number;
  followUpPct: number;
}

export interface GreenSheetMetrics {
  scope: GreenSheetScope;
  canViewTeam: boolean;
  visitsThisWeek: number;
  asksThisMonth: number;
  followUpCompliancePct: number;
  top33Total: number;
  top33WithRmPct: number;
  top33WithStrategyPct: number;
  asksByOutcome: OutcomeSplit;
  pipelineByHorizon: HorizonPipeline;
  byRm: RmMetricsRow[];
}

// "Me" restricts every metric to the caller's portfolio (prospects they manage); "team" spans the
// whole tenant. The filter is applied through the owning prospect's rm_user_id, never a frame column.
function prospectOwned(scope: GreenSheetScope, userId: string) {
  return scope === "me" ? eq(prospects.rmUserId, userId) : sql`true`;
}

export async function getGreenSheetMetrics(
  caller: Pick<CurrentUser, "id" | "tenantId" | "role">,
  scope: GreenSheetScope,
  now: Date = new Date(),
): Promise<GreenSheetMetrics> {
  const canViewTeam = canViewTeamScope(caller.role);
  const effectiveScope: GreenSheetScope = scope === "team" && canViewTeam ? "team" : "me";
  const owned = prospectOwned(effectiveScope, caller.id);
  const weekStartIso = weekStart(now);
  const monthStartIso = monthStart(now);

  return withTenant(getAppDb(), caller.tenantId, async (tx) => {
    const [visitsRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(visits)
      .innerJoin(prospects, eq(prospects.id, visits.prospectId))
      .where(and(owned, isNotNull(visits.occurredAt), gte(visits.occurredAt, weekStartIso)));

    const [asksRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(asks)
      .innerJoin(prospects, eq(prospects.id, asks.prospectId))
      .where(and(owned, gte(asks.createdAt, monthStartIso)));

    const followUps = await tx
      .select({ dueAt: followUpTasks.dueAt, status: followUpTasks.status })
      .from(followUpTasks)
      .innerJoin(visits, eq(visits.id, followUpTasks.visitId))
      .innerJoin(prospects, eq(prospects.id, visits.prospectId))
      .where(and(owned, lte(followUpTasks.dueAt, now)));
    const dueCount = followUps.length;
    const completedOnTime = followUps.filter((f) => f.status === "done").length;

    const top33Rows = await tx
      .select({ id: prospects.id, rmUserId: prospects.rmUserId })
      .from(prospects)
      .where(and(owned, eq(prospects.top33, true)));
    const top33Total = top33Rows.length;
    const top33WithRm = top33Rows.filter((p) => p.rmUserId !== null).length;
    const strategyRows = await tx
      .select({ prospectId: prospectStrategy.prospectId })
      .from(prospectStrategy)
      .innerJoin(prospects, eq(prospects.id, prospectStrategy.prospectId))
      .where(and(owned, eq(prospects.top33, true)));
    const top33WithStrategy = new Set(strategyRows.map((s) => s.prospectId)).size;

    const outcomeRows = await tx
      .select({
        outcome: asks.outcome,
        count: sql<number>`count(*)::int`,
      })
      .from(asks)
      .innerJoin(prospects, eq(prospects.id, asks.prospectId))
      .where(and(owned, isNotNull(asks.outcome)))
      .groupBy(asks.outcome);
    const asksByOutcome: OutcomeSplit = { commitment: 0, roadmap: 0, decline: 0 };
    for (const row of outcomeRows) {
      if (row.outcome && row.outcome in asksByOutcome) {
        asksByOutcome[row.outcome as keyof OutcomeSplit] = row.count;
      }
    }

    const horizonRows = await tx
      .select({
        frame: fundingInitiatives.frame,
        count: sql<number>`count(*)::int`,
      })
      .from(asks)
      .innerJoin(prospects, eq(prospects.id, asks.prospectId))
      .innerJoin(fundingInitiatives, eq(fundingInitiatives.id, asks.fundingInitiativeId))
      .where(owned)
      .groupBy(fundingInitiatives.frame);
    const pipelineByHorizon: HorizonPipeline = { today: 0, tomorrow: 0, forever: 0 };
    for (const row of horizonRows) {
      if (row.frame && row.frame in pipelineByHorizon) {
        pipelineByHorizon[row.frame as keyof HorizonPipeline] = row.count;
      }
    }

    const byRm = effectiveScope === "team" ? await loadByRm(tx, now) : [];

    return {
      scope: effectiveScope,
      canViewTeam,
      visitsThisWeek: visitsRow?.count ?? 0,
      asksThisMonth: asksRow?.count ?? 0,
      followUpCompliancePct: compliancePct(dueCount, completedOnTime),
      top33Total,
      top33WithRmPct: coveragePct(top33WithRm, top33Total),
      top33WithStrategyPct: coveragePct(top33WithStrategy, top33Total),
      asksByOutcome,
      pipelineByHorizon,
      byRm,
    };
  });
}

// The leadership-only by-RM breakdown: each relationship manager's coverage and activity.
async function loadByRm(tx: Tx, now: Date): Promise<RmMetricsRow[]> {
  const weekStartIso = weekStart(now);
  const monthStartIso = monthStart(now);
  const rmUsers = await tx
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.role, "major_gifts_officer"));
  const giftOfficers = await tx
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.role, "gift_officer"));
  const all = [...rmUsers, ...giftOfficers];

  const out: RmMetricsRow[] = [];
  for (const u of all) {
    const owned = eq(prospects.rmUserId, u.id);
    const top33Rows = await tx
      .select({ id: prospects.id })
      .from(prospects)
      .where(and(owned, eq(prospects.top33, true)));
    const [visitsRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(visits)
      .innerJoin(prospects, eq(prospects.id, visits.prospectId))
      .where(and(owned, isNotNull(visits.occurredAt), gte(visits.occurredAt, weekStartIso)));
    const [asksRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(asks)
      .innerJoin(prospects, eq(prospects.id, asks.prospectId))
      .where(and(owned, gte(asks.createdAt, monthStartIso)));
    const followUps = await tx
      .select({ status: followUpTasks.status })
      .from(followUpTasks)
      .innerJoin(visits, eq(visits.id, followUpTasks.visitId))
      .innerJoin(prospects, eq(prospects.id, visits.prospectId))
      .where(and(owned, lte(followUpTasks.dueAt, now)));
    out.push({
      userId: u.id,
      name: u.name,
      top33Coverage: top33Rows.length,
      visits: visitsRow?.count ?? 0,
      asks: asksRow?.count ?? 0,
      followUpPct: compliancePct(
        followUps.length,
        followUps.filter((f) => f.status === "done").length,
      ),
    });
  }
  return out;
}

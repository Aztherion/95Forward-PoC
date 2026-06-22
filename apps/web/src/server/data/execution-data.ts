import "server-only";
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { asks, followUpTasks, prospects, referrals, visits, withTenant } from "@95forward/db";
import { getAppDb } from "@/server/db";
import type { HeartbeatStatus } from "@/components/ds";
import { heartbeatStatus } from "@/lib/follow-up";

export type AskOutcome = "commitment" | "decline" | "roadmap";
export type FundingFrame = "today" | "tomorrow" | "forever";

export interface AskRow {
  id: string;
  amountMinCents: number | null;
  amountMaxCents: number | null;
  askType: string | null;
  numbersOnTable: boolean;
  outcome: AskOutcome | null;
  commitmentAmountCents: number | null;
  commitmentSchedule: string | null;
  roadmapNextSteps: string | null;
  initiativeId: string;
  initiativeName: string;
  // Derived read-through: the ask's frame is its initiative's frame, never stored on the ask.
  frame: FundingFrame;
  createdAt: Date;
}

export interface VisitRow {
  id: string;
  goal: string | null;
  discoveryQuestions: string | null;
  team: string | null;
  locationType: string | null;
  occurredAt: Date | null;
  outcome: AskOutcome | null;
  callMemo: string | null;
  nextStep: string | null;
  followUpDueAt: Date | null;
  planned: boolean;
}

export interface ReferralRow {
  id: string;
  referredName: string;
  mayUseName: boolean;
  willSendNote: boolean;
  relationshipNote: string | null;
  promotedProspectId: string | null;
}

export interface FollowUpRow {
  id: string;
  dueAt: Date;
  status: "open" | "done";
  heartbeat: HeartbeatStatus;
  visitId: string | null;
}

export interface ExecutionSummary {
  visits: VisitRow[];
  asks: AskRow[];
  referrals: ReferralRow[];
  openFollowUps: FollowUpRow[];
}

export async function getProspectExecution(
  tenantId: string,
  prospectId: string,
  now: Date = new Date(),
): Promise<ExecutionSummary> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const visitRows = await tx.query.visits.findMany({
      where: eq(visits.prospectId, prospectId),
      orderBy: [desc(visits.createdAt)],
    });

    const askRows = await tx.query.asks.findMany({
      where: eq(asks.prospectId, prospectId),
      orderBy: [desc(asks.createdAt)],
      with: { fundingInitiative: { columns: { id: true, name: true, frame: true } } },
    });

    const referralRows = await tx.query.referrals.findMany({
      where: eq(referrals.sourceProspectId, prospectId),
      orderBy: [asc(referrals.createdAt)],
    });

    const followUpRows = await tx
      .select({
        id: followUpTasks.id,
        dueAt: followUpTasks.dueAt,
        status: followUpTasks.status,
        visitId: followUpTasks.visitId,
      })
      .from(followUpTasks)
      .innerJoin(visits, eq(visits.id, followUpTasks.visitId))
      .where(and(eq(visits.prospectId, prospectId), eq(followUpTasks.status, "open")));

    return {
      visits: visitRows.map((v) => ({
        id: v.id,
        goal: v.goal,
        discoveryQuestions: v.discoveryQuestions,
        team: v.team,
        locationType: v.locationType,
        occurredAt: v.occurredAt,
        outcome: v.outcome as AskOutcome | null,
        callMemo: v.callMemo,
        nextStep: v.nextStep,
        followUpDueAt: v.followUpDueAt,
        planned: v.occurredAt === null,
      })),
      asks: askRows.map((a) => ({
        id: a.id,
        amountMinCents: a.amountMinCents,
        amountMaxCents: a.amountMaxCents,
        askType: a.askType,
        numbersOnTable: a.numbersOnTable,
        outcome: a.outcome as AskOutcome | null,
        commitmentAmountCents: a.commitmentAmountCents,
        commitmentSchedule: a.commitmentSchedule,
        roadmapNextSteps: a.roadmapNextSteps,
        initiativeId: a.fundingInitiative.id,
        initiativeName: a.fundingInitiative.name,
        frame: a.fundingInitiative.frame as FundingFrame,
        createdAt: a.createdAt,
      })),
      referrals: referralRows.map((r) => ({
        id: r.id,
        referredName: r.referredName,
        mayUseName: r.mayUseName,
        willSendNote: r.willSendNote,
        relationshipNote: r.relationshipNote,
        promotedProspectId: r.promotedProspectId,
      })),
      openFollowUps: followUpRows.map((f) => ({
        id: f.id,
        dueAt: f.dueAt,
        status: f.status as "open" | "done",
        heartbeat: heartbeatStatus(f.dueAt, now),
        visitId: f.visitId,
      })),
    };
  });
}

export interface VisitModeData {
  visitId: string;
  prospectId: string;
  goal: string | null;
  discoveryQuestions: string | null;
  team: string | null;
  locationType: string | null;
  occurredAt: Date | null;
}

// Loads the most relevant visit to run in Visit Mode for a prospect: the earliest still-planned
// visit, falling back to the most recent visit if none are planned.
export async function getVisitForMode(
  tenantId: string,
  prospectId: string,
): Promise<VisitModeData | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const planned = await tx.query.visits.findFirst({
      where: and(eq(visits.prospectId, prospectId), isNull(visits.occurredAt)),
      orderBy: [asc(visits.createdAt)],
    });
    const chosen =
      planned ??
      (await tx.query.visits.findFirst({
        where: and(eq(visits.prospectId, prospectId), isNotNull(visits.occurredAt)),
        orderBy: [desc(visits.occurredAt)],
      }));
    if (!chosen) return null;
    return {
      visitId: chosen.id,
      prospectId,
      goal: chosen.goal,
      discoveryQuestions: chosen.discoveryQuestions,
      team: chosen.team,
      locationType: chosen.locationType,
      occurredAt: chosen.occurredAt,
    };
  });
}

export async function getConstituentIdForProspect(
  tenantId: string,
  prospectId: string,
): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const row = await tx
      .select({ constituentId: prospects.constituentId })
      .from(prospects)
      .where(eq(prospects.id, prospectId))
      .limit(1);
    return row[0]?.constituentId ?? null;
  });
}

export async function getProspectIdForVisit(
  tenantId: string,
  visitId: string,
): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const row = await tx
      .select({ prospectId: visits.prospectId })
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1);
    return row[0]?.prospectId ?? null;
  });
}

// First prospect with a planned visit — the Visit Mode entry point when launched without a target.
export async function getDefaultVisitProspectId(tenantId: string): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const row = await tx
      .select({ prospectId: visits.prospectId })
      .from(visits)
      .innerJoin(prospects, eq(prospects.id, visits.prospectId))
      .where(isNull(visits.occurredAt))
      .orderBy(asc(prospects.rank))
      .limit(1);
    return row[0]?.prospectId ?? null;
  });
}

import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import {
  asks,
  constituents,
  followUpTasks,
  prospects,
  referrals,
  visits,
  withTenant,
} from "@95forward/db";
import type {
  AskInput,
  PromoteReferralInput,
  ReferralInput,
  VisitDebriefInput,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { followUpDueAt } from "@/lib/follow-up";

export async function createAsk(tenantId: string, input: AskInput): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(asks)
      .values({
        tenantId,
        prospectId: input.prospectId,
        visitId: input.visitId ?? null,
        fundingInitiativeId: input.fundingInitiativeId,
        amountMinCents: input.amountMinCents ?? null,
        amountMaxCents: input.amountMaxCents ?? null,
        askType: input.askType ?? null,
        numbersOnTable: input.numbersOnTable,
        outcome: input.outcome ?? null,
        commitmentAmountCents: input.commitmentAmountCents ?? null,
        commitmentSchedule: input.commitmentSchedule ?? null,
        roadmapNextSteps: input.roadmapNextSteps ?? null,
      })
      .returning({ id: asks.id });
    return rows[0]!.id;
  });
}

// Debriefing transitions a planned visit to executed: occurred_at is stamped server-side (never from
// the client), the outcome/memo/next-step are saved, and the 24-hour follow-up SLA is started.
export async function debriefVisit(
  tenantId: string,
  userId: string,
  input: VisitDebriefInput,
  now: Date = new Date(),
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const due = followUpDueAt(now);
    // Only an as-yet-undebriefed visit transitions: the isNull(occurredAt) guard makes a repeated
    // submit a no-op so it cannot stamp a fresh occurredAt or spawn a duplicate 24-hour follow-up.
    const transitioned = await tx
      .update(visits)
      .set({
        occurredAt: now,
        outcome: input.outcome ?? null,
        callMemo: input.callMemo ?? null,
        nextStep: input.nextStep ?? null,
        followUpDueAt: due,
      })
      .where(
        and(eq(visits.tenantId, tenantId), eq(visits.id, input.visitId), isNull(visits.occurredAt)),
      )
      .returning({ id: visits.id });

    if (transitioned.length === 0) {
      const existing = await tx
        .select({ id: followUpTasks.id })
        .from(followUpTasks)
        .where(and(eq(followUpTasks.tenantId, tenantId), eq(followUpTasks.visitId, input.visitId)));
      return existing[0]?.id ?? "";
    }

    const followUp = await tx
      .insert(followUpTasks)
      .values({
        tenantId,
        visitId: input.visitId,
        ownerUserId: userId,
        dueAt: due,
        status: "open",
      })
      .returning({ id: followUpTasks.id });
    return followUp[0]!.id;
  });
}

export async function saveCallMemo(
  tenantId: string,
  visitId: string,
  callMemo: string,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(visits)
      .set({ callMemo })
      .where(and(eq(visits.tenantId, tenantId), eq(visits.id, visitId)));
  });
}

export async function markFollowUpDone(tenantId: string, followUpTaskId: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(followUpTasks)
      .set({ status: "done" })
      .where(and(eq(followUpTasks.tenantId, tenantId), eq(followUpTasks.id, followUpTaskId)));
  });
}

export async function createReferral(tenantId: string, input: ReferralInput): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(referrals)
      .values({
        tenantId,
        sourceProspectId: input.sourceProspectId,
        sourceVisitId: input.sourceVisitId ?? null,
        referredName: input.referredName,
        mayUseName: input.mayUseName,
        willSendNote: input.willSendNote,
        relationshipNote: input.relationshipNote ?? null,
      })
      .returning({ id: referrals.id });
    return rows[0]!.id;
  });
}

// Promote a referral into the pipeline: create a constituent + a research-stage prospect, then link
// the new prospect back onto the referral. Returns the new prospect id for navigation.
export async function promoteReferral(
  tenantId: string,
  input: PromoteReferralInput,
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const referralRows = await tx
      .select({ id: referrals.id })
      .from(referrals)
      .where(and(eq(referrals.tenantId, tenantId), eq(referrals.id, input.referralId)))
      .limit(1);
    if (referralRows.length === 0) {
      throw new Error("promoteReferral: referral not found");
    }

    const constituentRows = await tx
      .insert(constituents)
      .values({ tenantId, type: input.type, displayName: input.displayName })
      .returning({ id: constituents.id });
    const constituentId = constituentRows[0]!.id;

    const prospectRows = await tx
      .insert(prospects)
      .values({ tenantId, constituentId, status: "research" })
      .returning({ id: prospects.id });
    const prospectId = prospectRows[0]!.id;

    await tx
      .update(referrals)
      .set({ promotedProspectId: prospectId })
      .where(and(eq(referrals.tenantId, tenantId), eq(referrals.id, input.referralId)));

    return prospectId;
  });
}

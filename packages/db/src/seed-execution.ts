import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { users } from "./schema/users";
import { asks, followUpTasks, referrals, visits } from "./schema/execution";
import { stableId } from "./seed-records-core";

const DAY = 24 * 60 * 60 * 1000;

type Outcome = "commitment" | "decline" | "roadmap";

interface ExecVisitSpec {
  key: string;
  prospectKey: string;
  daysAgo: number;
  goal: string;
  outcome: Outcome;
  callMemo: string;
  nextStep: string;
  rm: "dana" | "priya";
  // The follow-up the debrief triggered. dueOffsetDays from the visit: negative = overdue.
  followUp: { key: string; dueOffsetDays: number; done: boolean };
  ask?: {
    key: string;
    initiativeKey: string;
    amountMinCents?: number;
    amountMaxCents?: number;
    askType?: string;
    numbersOnTable: boolean;
    outcome: Outcome;
    commitmentAmountCents?: number;
    commitmentSchedule?: string;
    roadmapNextSteps?: string;
  };
  referral?: {
    key: string;
    referredName: string;
    mayUseName: boolean;
    willSendNote: boolean;
    note: string;
  };
}

// The coherent execution set. Hallworth is the demo centerpiece: an executed Bolivia visit, a roadmap
// ask with numbers on the table, and an OPEN follow-up that is due — so he surfaces on Today's banner
// and the cadence heartbeat. Cordova lands a commitment (lighting Kamuli's progress); Osgood declines.
const EXEC_VISITS: ExecVisitSpec[] = [
  {
    key: "hallworth-bolivia",
    prospectKey: "hallworth",
    daysAgo: 1,
    goal: "Confirm trustee interest in the Bolivia Scale-Up and surface who else decides.",
    outcome: "roadmap",
    callMemo:
      "Strong interest from David Hallworth; the board reviews multi-year commitments next quarter. He asked for program outcomes and a site-visit proposal.",
    nextStep:
      "Send the Bolivia outcomes deck and propose two site-visit dates before the committee meets.",
    rm: "dana",
    followUp: { key: "hallworth-bolivia", dueOffsetDays: 1, done: false },
    ask: {
      key: "hallworth-bolivia",
      initiativeKey: "bolivia",
      amountMinCents: 250_000_000,
      amountMaxCents: 320_000_000,
      askType: "multi-year lead grant",
      numbersOnTable: true,
      outcome: "roadmap",
      roadmapNextSteps:
        "Board reviews multi-year commitments next quarter; bring program outcomes + a site visit before the committee.",
    },
    referral: {
      key: "hallworth-okonkwo",
      referredName: "Dr. Maria Okonkwo",
      mayUseName: true,
      willSendNote: true,
      note: "Fellow trustee at a peer water funder; David offered to make the introduction.",
    },
  },
  {
    key: "cordova-kamuli",
    prospectKey: "cordova",
    daysAgo: 6,
    goal: "Close the corporate water-stewardship commitment to Kamuli.",
    outcome: "commitment",
    callMemo: "The ESG lead committed to a current-year grant for Everyone in Kamuli.",
    nextStep: "Send the grant agreement and the impact-reporting cadence.",
    rm: "dana",
    followUp: { key: "cordova-kamuli", dueOffsetDays: 1, done: true },
    ask: {
      key: "cordova-kamuli",
      initiativeKey: "kamuli",
      amountMinCents: 30_000_000,
      askType: "corporate grant",
      numbersOnTable: true,
      outcome: "commitment",
      commitmentAmountCents: 30_000_000,
      commitmentSchedule: "Single payment, this fiscal year",
    },
  },
  {
    key: "osgood-bolivia",
    prospectKey: "osgood",
    daysAgo: 9,
    goal: "Gauge appetite for a multi-year Bolivia grant this cycle.",
    outcome: "decline",
    callMemo: "Not this cycle — their committee has already allocated multi-year funds elsewhere.",
    nextStep: "Re-approach next grant cycle with a single-year pilot framing.",
    rm: "priya",
    followUp: { key: "osgood-bolivia", dueOffsetDays: 1, done: true },
    ask: {
      key: "osgood-bolivia",
      initiativeKey: "bolivia",
      amountMinCents: 50_000_000,
      askType: "multi-year grant",
      numbersOnTable: false,
      outcome: "decline",
    },
  },
];

export async function seedExecution(
  db: Database,
  tenantId: string,
  now: Date = new Date(),
): Promise<void> {
  const userRows = await db.query.users.findMany({ where: eq(users.tenantId, tenantId) });
  const rmIds: Record<"dana" | "priya", string | undefined> = {
    dana: userRows.find((u) => u.email === "dana.reese@waterforpeople.org")?.id,
    priya: userRows.find((u) => u.email === "priya.nair@waterforpeople.org")?.id,
  };

  for (const v of EXEC_VISITS) {
    const visitId = stableId(`visit:exec:${v.key}`);
    const prospectId = stableId(`prospect:${v.prospectKey}`);
    const occurredAt = new Date(now.getTime() - v.daysAgo * DAY);
    const followUpDueAt = new Date(occurredAt.getTime() + v.followUp.dueOffsetDays * DAY);

    await db
      .insert(visits)
      .values({
        id: visitId,
        tenantId,
        prospectId,
        occurredAt,
        goal: v.goal,
        outcome: v.outcome,
        callMemo: v.callMemo,
        nextStep: v.nextStep,
        followUpDueAt,
      })
      .onConflictDoUpdate({
        target: visits.id,
        set: {
          occurredAt,
          outcome: v.outcome,
          callMemo: v.callMemo,
          nextStep: v.nextStep,
          followUpDueAt,
        },
      });

    if (v.ask) {
      await db
        .insert(asks)
        .values({
          id: stableId(`ask:${v.ask.key}`),
          tenantId,
          prospectId,
          visitId,
          fundingInitiativeId: stableId(`initiative:${v.ask.initiativeKey}`),
          amountMinCents: v.ask.amountMinCents ?? null,
          amountMaxCents: v.ask.amountMaxCents ?? null,
          askType: v.ask.askType ?? null,
          numbersOnTable: v.ask.numbersOnTable,
          outcome: v.ask.outcome,
          commitmentAmountCents: v.ask.commitmentAmountCents ?? null,
          commitmentSchedule: v.ask.commitmentSchedule ?? null,
          roadmapNextSteps: v.ask.roadmapNextSteps ?? null,
        })
        .onConflictDoUpdate({
          target: asks.id,
          set: {
            outcome: v.ask.outcome,
            commitmentAmountCents: v.ask.commitmentAmountCents ?? null,
            roadmapNextSteps: v.ask.roadmapNextSteps ?? null,
          },
        });
    }

    await db
      .insert(followUpTasks)
      .values({
        id: stableId(`followup:${v.followUp.key}`),
        tenantId,
        visitId,
        ownerUserId: rmIds[v.rm] ?? userRows[0]!.id,
        dueAt: followUpDueAt,
        status: v.followUp.done ? "done" : "open",
      })
      .onConflictDoUpdate({
        target: followUpTasks.id,
        set: { dueAt: followUpDueAt, status: v.followUp.done ? "done" : "open" },
      });

    if (v.referral) {
      await db
        .insert(referrals)
        .values({
          id: stableId(`referral:${v.referral.key}`),
          tenantId,
          sourceProspectId: prospectId,
          sourceVisitId: visitId,
          referredName: v.referral.referredName,
          mayUseName: v.referral.mayUseName,
          willSendNote: v.referral.willSendNote,
          relationshipNote: v.referral.note,
        })
        .onConflictDoNothing({ target: referrals.id });
    }
  }
}

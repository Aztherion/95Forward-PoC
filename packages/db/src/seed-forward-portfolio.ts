// 95 Forward — the rest of the portfolio (Initiative 18b).
//
// WHY THIS IS A SEPARATE MODULE. `seed-forward.ts` holds the narrative records the demo is built
// on — Hallworth's 81-day silence and its three unilateral date moves, the three Fix-first
// pathologies, the won history. Those are load-bearing and must not drift. Keeping the expansion
// here makes that structural rather than a promise: nothing in this file edits a record in that one.
//
// WHY THE PROSPECTS ARE PROMOTED, NOT INVENTED. Every prospect below is an existing Keystone
// constituent with real giving history. That is both cheaper and more honest: a major-gifts officer
// builds a portfolio out of people already in the CRM, and the host record behind each one gives the
// `Open in Keystone` boundary something real to point at. It also avoids the Tom Bradley trap —
// inventing names that collide with the natural partners.
//
// The four partners (Tom Bradley, Sandra Kim, Sofia Lin, Marcus Webb) are deliberately absent from
// the promotion list. A partner who is also a prospect is a different story than the one being told.

import { eq } from "drizzle-orm";
import { DEFAULT_MILESTONE_DEFINITIONS } from "@95forward/shared";
import type { DateConfidence, ForwardStage, ProbabilityBand } from "@95forward/shared";
import type { Database } from "./client";
import { users } from "./schema/users";
import {
  forwardOpportunities,
  milestoneDefinitions,
  opportunityEvents,
  opportunityMilestones,
} from "./schema/forward";
import { knowledgeBase, naturalPartners, prospects, qpiAssessments } from "./schema/prospects";
import { visits } from "./schema/execution";
import { stableId } from "./seed-records-core";
import { DEMO_TODAY } from "./demo-clock";

const DAY = 24 * 60 * 60 * 1000;

function at(days: number): Date {
  return new Date(DEMO_TODAY.getTime() + days * DAY);
}

function isoDay(days: number): string {
  return at(days).toISOString().slice(0, 10);
}

type Rm = "dana" | "priya";

interface PortfolioSpec {
  /** Key of an existing Keystone constituent, promoted to a prospect. */
  constituentKey: string;
  /** Short slug for ids. */
  key: string;
  initiative: "kamuli" | "bolivia" | "forever-promise" | "unrestricted";
  amountCents: number;
  stage: ForwardStage;
  /** Days from the anchor; null when no date has been set with them. */
  closeDateDays: number | null;
  dateConfidence: DateConfidence;
  probability: ProbabilityBand;
  rm: Rm;
  /**
   * Confirmed milestones, as [key, daysAgo].
   *
   * A `confirmed_in_writing` entry here is given real evidence when it is written. The ONE record
   * that claims it with nothing attached is Cornerstone, in seed-forward.ts — that is Fix-first
   * pathology #3 and it is a story, not an oversight. Duplicating it across the portfolio would
   * turn a sharp finding into background noise.
   */
  milestones: [string, number][];
  /** Days since the last logged contact; null when nobody has logged one. */
  contactDays: number | null;
  /** Visits already had, in days ago. */
  visitsHad?: number[];
  /** A visit in the diary, in days ahead, and whether it has a real brief. */
  visitAhead?: { days: number; prepared: boolean };
  /** A natural partner, and the state of the warm path. */
  partner?: { constituentKey: string; role: string; note: string; introOfferedDays?: number };
  /** QPI ratings, capacity/relationship/timing/gift_history/philanthropy. */
  qpi: [number, number, number, number, number];
  /** One line for the Knowledge Base, so the record is not empty when opened. */
  capacity: string;
  /** Why this record exists in the seed. Read this before changing one. */
  role: string;
}

// -------------------------------------------------------------------------------------------
// The portfolio
// -------------------------------------------------------------------------------------------
//
// Shaped deliberately, not generated: a pyramid by stage (more early than late), lumpy by amount
// (two or three large, a long tail), and mostly UNQUALIFIED — which is the product's thesis, not a
// gap in the data.

export const PORTFOLIO: PortfolioSpec[] = [
  // -- follow_up_and_close ----------------------------------------------------------------------
  {
    key: "sterling-kamuli",
    constituentKey: "generic-5",
    initiative: "kamuli",
    amountCents: 50_000_000,
    stage: "follow_up_and_close",
    closeDateDays: 28,
    dateConfidence: "firm",
    probability: "bookable",
    rm: "dana",
    // Every blocking milestone confirmed by THEM, and the one thing missing is the one only we can
    // do. That is what makes the designed rationale true: "the biggest amount on your board and the
    // only milestone missing is the one only you can do."
    milestones: [
      ["specific_ask_made", 70],
      ["amount_agreed", 45],
      ["close_date_confirmed", 40],
      ["confirmed_in_writing", 38],
    ],
    contactDays: 5,
    qpi: [5, 4, 5, 4, 4],
    capacity: "Community trust with a $195M corpus; funds regional water infrastructure.",
    role: "Biggest on the board, and blocked on our own approval. Carries `prospect-ahead-of-us`.",
  },
  {
    key: "aldridge-bolivia",
    constituentKey: "generic-3",
    initiative: "bolivia",
    amountCents: 18_000_000,
    stage: "follow_up_and_close",
    closeDateDays: 40,
    dateConfidence: "firm",
    probability: "bookable",
    rm: "priya",
    milestones: [
      ["ask_approved_by_leader", 90],
      ["specific_ask_made", 75],
      ["amount_agreed", 50],
      ["close_date_confirmed", 48],
      ["confirmed_in_writing", 45],
    ],
    contactDays: 6,
    qpi: [4, 4, 4, 4, 3],
    capacity: "Family foundation; consistent six-figure WASH grants.",
    role: "A clean, qualified, late-stage record. Carries coverage without adding queue noise.",
  },
  {
    key: "bluemesa-unrestricted",
    constituentKey: "generic-1",
    initiative: "unrestricted",
    amountCents: 7_500_000,
    stage: "follow_up_and_close",
    closeDateDays: 18,
    dateConfidence: "semi_firm",
    probability: "high",
    rm: "dana",
    // Agreed out loud a month ago, nothing in writing, and contacted last week — so there is no
    // silence problem to outrank it. This is the record that makes `verbal-agreement-unwritten`
    // declare its own card.
    // `close_date_confirmed` is present deliberately: without it this would also trip I20's
    // `amount-agreed-no-confirmed-date`, which is Hallworth's pathology and should stay its own.
    // What is missing here is the WRITING, which is the whole point of the record.
    milestones: [
      ["ask_approved_by_leader", 60],
      ["specific_ask_made", 48],
      ["amount_agreed", 30],
      ["close_date_confirmed", 28],
    ],
    contactDays: 5,
    qpi: [4, 3, 4, 4, 3],
    capacity: "Manufacturer with a matching-gift programme and a local water mandate.",
    role: "Carries `verbal-agreement-unwritten` as primary.",
  },

  // -- visit_and_ask ----------------------------------------------------------------------------
  {
    key: "willowcreek-kamuli",
    constituentKey: "generic-4",
    initiative: "kamuli",
    amountCents: 14_000_000,
    stage: "visit_and_ask",
    closeDateDays: 55,
    dateConfidence: "loose",
    probability: "medium",
    rm: "priya",
    milestones: [
      ["ask_approved_by_leader", 80],
      ["specific_ask_made", 52],
    ],
    contactDays: 9,
    qpi: [4, 3, 3, 4, 4],
    capacity: "Family foundation; funds clean water and girls' education together.",
    role: "Unqualified live ask, recently contacted. Coverage and pipeline, not queue.",
  },
  {
    key: "cedarhollow-bolivia",
    constituentKey: "generic-2",
    initiative: "bolivia",
    amountCents: 9_500_000,
    stage: "visit_and_ask",
    closeDateDays: 32,
    dateConfidence: "firm",
    probability: "bookable",
    rm: "priya",
    milestones: [
      ["ask_approved_by_leader", 70],
      ["specific_ask_made", 55],
      ["amount_agreed", 30],
      ["close_date_confirmed", 28],
      ["confirmed_in_writing", 26],
    ],
    contactDays: 9,
    qpi: [3, 4, 4, 3, 3],
    capacity: "Employee-giving programme with a board-level water commitment.",
    role: "Qualified mid-size. Coverage, not queue.",
  },
  {
    key: "abernathy-forever-promise",
    constituentKey: "generic-8",
    initiative: "forever-promise",
    amountCents: 8_500_000,
    stage: "visit_and_ask",
    closeDateDays: 25,
    dateConfidence: "semi_firm",
    probability: "high",
    rm: "dana",
    // Internally cleared already, so `prospect-ahead-of-us` stays quiet and the missing brief is
    // the thing worth saying. This is the record that makes `visit-within-7d-unprepped` primary.
    milestones: [
      ["ask_approved_by_leader", 40],
      ["specific_ask_made", 30],
    ],
    contactDays: 4,
    visitAhead: { days: 3, prepared: false },
    qpi: [4, 5, 4, 3, 4],
    capacity: "Legacy donor exploring a named endowment for the Forever Promise.",
    role: "Carries `visit-within-7d-unprepped` as primary.",
  },
  {
    key: "hunderhill-unrestricted",
    constituentKey: "generic-6",
    initiative: "unrestricted",
    amountCents: 7_000_000,
    stage: "visit_and_ask",
    closeDateDays: 45,
    dateConfidence: "loose",
    probability: "medium",
    rm: "dana",
    milestones: [["specific_ask_made", 40]],
    contactDays: 9,
    qpi: [3, 3, 3, 4, 3],
    capacity: "Long-time annual donor; first major-gift conversation under way.",
    role: "Unqualified live ask, quiet past its stage cadence.",
  },
  {
    key: "yarbrough-kamuli",
    constituentKey: "generic-7",
    initiative: "kamuli",
    amountCents: 6_500_000,
    stage: "visit_and_ask",
    closeDateDays: 60,
    dateConfidence: "loose",
    probability: "high",
    rm: "priya",
    milestones: [
      ["ask_approved_by_leader", 55],
      ["specific_ask_made", 44],
      ["amount_agreed", 25],
      ["close_date_confirmed", 24],
    ],
    contactDays: 6,
    qpi: [3, 4, 3, 3, 4],
    capacity: "Retired engineer; funds district-level water systems.",
    role: "A second verbal agreement with nothing in writing.",
  },

  // -- prep_the_visit ---------------------------------------------------------------------------
  {
    key: "ellsworth-bolivia",
    constituentKey: "generic-9",
    initiative: "bolivia",
    amountCents: 15_000_000,
    stage: "prep_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "dana",
    milestones: [],
    contactDays: 26,
    visitsHad: [75, 33],
    qpi: [3, 4, 2, 3, 3],
    capacity: "Two meetings in, warm on the programme, never asked for anything specific.",
    role: "Two visits, no ask — the cardinal failure of the method, on a record of its own.",
  },
  {
    key: "iabernathy-forever-promise",
    constituentKey: "generic-16",
    initiative: "forever-promise",
    amountCents: 18_000_000,
    stage: "prep_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "dana",
    milestones: [],
    contactDays: 48,
    // The OLDEST unused introduction in the portfolio, which is what earns the designed line:
    // "A warm introduction that nobody acted on is the fastest asset you own to lose."
    partner: {
      constituentKey: "generic-8",
      role: "Sister, and already a donor",
      note: "Maya Abernathy offered to make the introduction.",
      introOfferedDays: 62,
    },
    qpi: [3, 3, 2, 2, 3],
    capacity: "Sister of an existing major donor; no direct relationship yet.",
    role: "Holds `oldestUnusedIntro`, so the best introduction rationale actually appears.",
  },
  {
    key: "ridgeway-unrestricted",
    constituentKey: "generic-13",
    initiative: "unrestricted",
    amountCents: 4_000_000,
    stage: "prep_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "priya",
    milestones: [],
    contactDays: 30,
    visitsHad: [90, 41],
    qpi: [2, 3, 2, 3, 2],
    capacity: "Sustained mid-level donor; capacity not yet screened.",
    role: "A second visits-without-an-ask record.",
  },
  {
    key: "holloway-kamuli",
    constituentKey: "generic-10",
    initiative: "kamuli",
    amountCents: 3_800_000,
    stage: "prep_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "dana",
    milestones: [],
    contactDays: 68,
    partner: {
      constituentKey: "generic-20",
      role: "Neighbour and fellow donor",
      note: "Could make the introduction; has never been asked.",
    },
    qpi: [3, 2, 2, 3, 2],
    capacity: "Denver donor with a decade of annual gifts and untested capacity.",
    role: "A warm path nobody has walked.",
  },

  // -- get_the_visit ----------------------------------------------------------------------------
  {
    key: "summitridge-bolivia",
    constituentKey: "generic-0",
    initiative: "bolivia",
    amountCents: 28_000_000,
    stage: "get_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "priya",
    milestones: [],
    contactDays: 52,
    partner: {
      constituentKey: "generic-1",
      role: "Supplier relationship",
      note: "Blue Mesa's CEO sits on their advisory board.",
    },
    qpi: [4, 2, 2, 3, 2],
    capacity: "Partnership with an existing corporate donor; capacity likely six figures.",
    role: "Warm path unwalked, at the top of the early stage.",
  },
  {
    key: "eunderhill-forever-promise",
    constituentKey: "generic-22",
    initiative: "forever-promise",
    amountCents: 3_000_000,
    stage: "get_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "dana",
    milestones: [],
    contactDays: 38,
    partner: {
      constituentKey: "generic-6",
      role: "Family connection",
      note: "Hannah Underhill offered to introduce the family.",
      introOfferedDays: 27,
    },
    qpi: [2, 3, 2, 2, 3],
    capacity: "Second-generation donor family; legacy intent unexplored.",
    role: "A second unused introduction, so the superlative has something to beat.",
  },
  {
    key: "lindqvist-unrestricted",
    constituentKey: "generic-19",
    initiative: "unrestricted",
    amountCents: 2_500_000,
    stage: "get_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "priya",
    milestones: [],
    contactDays: 85,
    qpi: [2, 2, 2, 2, 2],
    capacity: "Recent mid-level donor; research not started.",
    role: "Quiet early-stage filler. Fires nothing, and should not.",
  },
  {
    key: "tyarbrough-kamuli",
    constituentKey: "generic-15",
    initiative: "kamuli",
    amountCents: 2_200_000,
    stage: "get_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "dana",
    milestones: [],
    contactDays: 110,
    partner: {
      constituentKey: "generic-7",
      role: "Brother, already committed",
      note: "Isaac Yarbrough could open the door.",
    },
    qpi: [2, 3, 2, 2, 2],
    capacity: "Sibling of a committed donor; no direct approach made.",
    role: "Warm path unwalked, small.",
  },
  {
    key: "olindqvist-bolivia",
    constituentKey: "generic-11",
    initiative: "bolivia",
    amountCents: 2_000_000,
    stage: "get_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "priya",
    milestones: [],
    contactDays: 74,
    qpi: [2, 2, 2, 2, 2],
    capacity: "Boulder donor; giving steady but modest.",
    role: "Quiet early-stage filler.",
  },
  {
    key: "jellsworth-forever-promise",
    constituentKey: "generic-17",
    initiative: "forever-promise",
    amountCents: 1_800_000,
    stage: "get_the_visit",
    closeDateDays: null,
    dateConfidence: "loose",
    probability: "longshot",
    rm: "dana",
    milestones: [],
    contactDays: 96,
    qpi: [2, 2, 2, 2, 2],
    capacity: "Minneapolis donor; annual giving only so far.",
    role: "Quiet early-stage filler.",
  },
];

/**
 * Three more gifts already banked, in July, August and early September.
 *
 * The actuals line on the Forecast Room ran flat from June to the anchor — three months of a
 * horizontal line, which reads as a stall or a bug rather than as a year in progress. These are
 * small and additive; the point is the SHAPE of the curve, not the total, which moves from
 * $385,200 to $469,200.
 */
export const WON_TAIL: {
  key: string;
  /** The PORTFOLIO entry whose prospect this gift belongs to — named, not derived from `key`. */
  prospectKey: string;
  initiative: PortfolioSpec["initiative"];
  amountCents: number;
  closedDaysAgo: number;
  rm: Rm;
}[] = [
  {
    key: "aldridge-unrestricted-won",
    prospectKey: "aldridge-bolivia",
    initiative: "unrestricted",
    amountCents: 2_800_000,
    closedDaysAgo: 55,
    rm: "priya",
  },
  {
    key: "bluemesa-kamuli-won",
    prospectKey: "bluemesa-unrestricted",
    initiative: "kamuli",
    amountCents: 2_200_000,
    closedDaysAgo: 35,
    rm: "dana",
  },
  {
    key: "sterling-bolivia-won",
    prospectKey: "sterling-kamuli",
    initiative: "bolivia",
    amountCents: 3_400_000,
    closedDaysAgo: 8,
    rm: "dana",
  },
];

// -------------------------------------------------------------------------------------------
// Writing it
// -------------------------------------------------------------------------------------------

const QPI_DIMENSIONS = [
  "capacity",
  "relationship",
  "timing",
  "gift_history",
  "philanthropy",
] as const;

export async function seedForwardPortfolio(db: Database, tenantId: string): Promise<void> {
  const userRows = await db.select().from(users).where(eq(users.tenantId, tenantId));
  const rmIds: Record<Rm, string | undefined> = {
    dana: userRows.find((u) => u.email === "dana.reese@waterforpeople.org")?.id,
    priya: userRows.find((u) => u.email === "priya.nair@waterforpeople.org")?.id,
  };

  const definitionRows = await db
    .select()
    .from(milestoneDefinitions)
    .where(eq(milestoneDefinitions.tenantId, tenantId));
  const definitionByKey = new Map(definitionRows.map((row) => [row.key, row.id]));
  const knownKeys = new Set(DEFAULT_MILESTONE_DEFINITIONS.map((d) => d.key));

  // The existing prospects occupy ranks 1..8; these continue the list rather than fighting over it.
  let rank = 8;

  for (const spec of PORTFOLIO) {
    rank += 1;
    const prospectId = stableId(`prospect:${spec.key}`);
    const constituentId = stableId(`constituent:${spec.constituentKey}`);
    const rmUserId = rmIds[spec.rm] ?? null;

    await db
      .insert(prospects)
      .values({
        id: prospectId,
        tenantId,
        constituentId,
        rank,
        rmUserId,
        status: spec.stage === "get_the_visit" ? "research" : "cultivation",
        top33: spec.amountCents >= 10_000_000,
        momentum: false,
        connector: spec.partner !== undefined,
        leadership: false,
      })
      // Update, not DoNothing: which constituent a prospect points at is the whole identity of the
      // record, and a reseed that left an old link in place silently renames every card on the
      // board. Found exactly that way.
      .onConflictDoUpdate({
        target: prospects.id,
        set: {
          constituentId,
          rank,
          rmUserId,
          status: spec.stage === "get_the_visit" ? "research" : "cultivation",
          top33: spec.amountCents >= 10_000_000,
          connector: spec.partner !== undefined,
        },
      });

    await db
      .insert(knowledgeBase)
      .values({
        id: stableId(`kb:${spec.key}`),
        tenantId,
        prospectId,
        capacitySource: spec.capacity,
        relationshipToCause: null,
        connectorsNote: spec.partner?.note ?? null,
        giftHistorySummary: null,
        otherPhilanthropy: null,
        timingNote: null,
      })
      .onConflictDoUpdate({
        target: knowledgeBase.id,
        set: { capacitySource: spec.capacity, connectorsNote: spec.partner?.note ?? null },
      });

    for (const [index, dimension] of QPI_DIMENSIONS.entries()) {
      const rating = spec.qpi[index]!;
      await db
        .insert(qpiAssessments)
        .values({
          id: stableId(`qpi:${spec.key}:${dimension}`),
          tenantId,
          prospectId,
          dimension,
          rating,
          isUnknown: false,
          rationale: null,
          source: "Logged",
          updatedByUserId: rmUserId,
        })
        .onConflictDoUpdate({
          target: qpiAssessments.id,
          set: { rating, isUnknown: false },
        });
    }

    if (spec.partner) {
      const partnerValues = {
        role: spec.partner.role,
        warmPathNote: spec.partner.note,
        introOfferedAt:
          spec.partner.introOfferedDays === undefined
            ? null
            : at(-spec.partner.introOfferedDays),
        introUsedAt: null,
        askedToOpenDoorAt: null,
      };
      await db
        .insert(naturalPartners)
        .values({
          id: stableId(`np:${spec.key}:${spec.partner.constituentKey}`),
          tenantId,
          prospectId,
          constituentId: stableId(`constituent:${spec.partner.constituentKey}`),
          ...partnerValues,
        })
        // Update, not DoNothing: the warm-path timestamps are the whole content of two ranking
        // rules, and a reseed that left an old row in place would leave those rules silent.
        .onConflictDoUpdate({ target: naturalPartners.id, set: partnerValues });
    }

    for (const [index, daysAgo] of (spec.visitsHad ?? []).entries()) {
      const values = { occurredAt: at(-daysAgo), scheduledAt: null };
      await db
        .insert(visits)
        .values({
          id: stableId(`visit:${spec.key}:had-${index}`),
          tenantId,
          prospectId,
          goal: "Cultivation conversation — listening for what they care about.",
          discoveryQuestions: "What drew you to this? Who else in your circle cares about it?",
          team: spec.rm === "dana" ? "Dana Reese" : "Priya Nair",
          locationType: "In person",
          ...values,
        })
        .onConflictDoUpdate({ target: visits.id, set: values });
    }

    if (spec.visitAhead) {
      const values = { occurredAt: null, scheduledAt: at(spec.visitAhead.days) };
      await db
        .insert(visits)
        .values({
          id: stableId(`visit:${spec.key}:ahead`),
          tenantId,
          prospectId,
          goal: "Next conversation.",
          // An unprepped visit has a date and an intention and nothing else — which is exactly what
          // `visit-within-7d-unprepped` exists to catch.
          discoveryQuestions: spec.visitAhead.prepared
            ? "What would make this an easy yes? Who else weighs in?"
            : null,
          team: spec.rm === "dana" ? "Dana Reese" : "Priya Nair",
          locationType: "In person",
          ...values,
        })
        .onConflictDoUpdate({ target: visits.id, set: values });
    }

    // ---- The opportunity ----
    const opportunityId = stableId(`forward-opportunity:${spec.key}`);
    const opportunityValues = {
      tenantId,
      prospectId,
      initiativeId: stableId(`initiative:${spec.initiative}`),
      amountCents: spec.amountCents,
      amountNote: null,
      closeDate: spec.closeDateDays === null ? null : isoDay(spec.closeDateDays),
      dateConfidence: spec.dateConfidence,
      stage: spec.stage,
      probability: spec.probability,
      visitRating: null,
      ownerUserId: rmUserId,
      status: "open" as const,
    };
    await db
      .insert(forwardOpportunities)
      .values({ id: opportunityId, ...opportunityValues })
      .onConflictDoUpdate({ target: forwardOpportunities.id, set: opportunityValues });

    for (const [key, daysAgo] of spec.milestones) {
      if (!knownKeys.has(key)) throw new Error(`Unknown milestone key "${key}" on ${spec.key}`);
      const definitionId = definitionByKey.get(key);
      if (!definitionId) continue;
      const values = {
        confirmed: true,
        confirmedAt: at(-daysAgo),
        confirmedByUserId: rmUserId,
        confirmedByName: null,
        evidence: `Confirmed ${isoDay(-daysAgo)}`,
        documentUrl:
          key === "confirmed_in_writing" ? `https://files.example.org/${spec.key}-letter.pdf` : null,
      };
      await db
        .insert(opportunityMilestones)
        .values({
          id: stableId(`opportunity-milestone:${spec.key}:${key}`),
          tenantId,
          opportunityId,
          milestoneDefinitionId: definitionId,
          ...values,
        })
        .onConflictDoUpdate({ target: opportunityMilestones.id, set: values });
    }

    // One logged contact, which is what the silence counter measures from.
    if (spec.contactDays !== null) {
      const values = { occurredAt: at(-spec.contactDays) };
      await db
        .insert(opportunityEvents)
        .values({
          id: stableId(`opportunity-event:${spec.key}:contact`),
          tenantId,
          opportunityId,
          eventType: "contact_logged" as const,
          field: null,
          oldValue: null,
          newValue: null,
          actorUserId: rmUserId,
          actorName: null,
          prospectSourced: true,
          note: "Check-in",
          ...values,
        })
        .onConflictDoUpdate({ target: opportunityEvents.id, set: values });
    }
  }

  // ---- The won tail, for the shape of the actuals curve ----
  for (const won of WON_TAIL) {
    const prospectId = stableId(`prospect:${won.prospectKey}`);
    const values = {
      tenantId,
      prospectId,
      initiativeId: stableId(`initiative:${won.initiative}`),
      amountCents: won.amountCents,
      amountNote: null,
      closeDate: isoDay(-won.closedDaysAgo),
      dateConfidence: "firm" as const,
      stage: "repeat" as const,
      probability: "lock" as const,
      visitRating: null,
      ownerUserId: rmIds[won.rm] ?? null,
      status: "won" as const,
    };
    await db
      .insert(forwardOpportunities)
      .values({ id: stableId(`forward-opportunity:${won.key}`), ...values })
      .onConflictDoUpdate({ target: forwardOpportunities.id, set: values });
  }
}

/** Exported for the seed test, so the shape is asserted rather than assumed. */
export const PORTFOLIO_FACTS = {
  count: PORTFOLIO.length,
  byStage: PORTFOLIO.reduce<Record<string, number>>((acc, spec) => {
    acc[spec.stage] = (acc[spec.stage] ?? 0) + 1;
    return acc;
  }, {}),
  totalCents: PORTFOLIO.reduce((sum, spec) => sum + spec.amountCents, 0),
} as const;

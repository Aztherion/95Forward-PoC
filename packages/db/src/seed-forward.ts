// 95 Forward — seed for the opportunity-centric model (Initiative 18).
//
// Two things here are easy to get wrong and expensive to fix later:
//
//  1. BACKDATED EVENT HISTORY, not just current state. If only the present is seeded there is no
//     movement timeline, no slippage chain and no silence duration, and three screens lose their
//     most distinctive content on day one.
//
//  2. A DETERMINISTIC ANCHOR. Everything is expressed as an offset from DEMO_TODAY so the demo's
//     "81 days idle" stays 81 days no matter when the seed runs.
//
// The figures are internally coherent rather than screenshot-identical — see the header comment on
// FORWARD_OPPORTUNITIES for the arithmetic and where it departs from the designs.

import { eq } from "drizzle-orm";
import {
  DEFAULT_MILESTONE_DEFINITIONS,
  type DateConfidence,
  type ForwardStage,
  type OpportunityStatus,
  type ProbabilityBand,
  type VisitRating,
} from "@95forward/shared";
import type { Database } from "./client";
import { users } from "./schema/users";
import { fundingInitiatives } from "./schema/funding";
import {
  forwardOpportunities,
  goals,
  milestoneDefinitions,
  opportunityEvents,
  opportunityMilestones,
} from "./schema/forward";
import { stableId } from "./seed-records-core";
import { DEMO_TODAY } from "./demo-clock";

const DAY = 24 * 60 * 60 * 1000;

type Rm = "dana" | "priya";

interface MilestoneSeed {
  key: string;
  /** Offset in days from the anchor (negative = in the past). */
  atDays: number;
  byUser?: Rm;
  byName?: string;
  evidence?: string;
  documentUrl?: string;
}

interface EventSeed {
  atDays: number;
  eventType: "field_change" | "contact_logged" | "milestone_confirmed" | "stage_change" | "note";
  field?: string;
  oldValue?: string;
  newValue?: string;
  /** The whole slippage argument: was the prospect the source of this change, or did we invent it? */
  prospectSourced: boolean;
  actor?: Rm;
  actorName?: string;
  note?: string;
}

interface OpportunitySpec {
  key: string;
  prospectKey: string;
  initiativeKey: string;
  amountCents: number;
  amountNote?: string;
  /** Offset in days from the anchor; null when no close date has been set. */
  closeDateDays: number | null;
  dateConfidence: DateConfidence;
  stage: ForwardStage;
  probability: ProbabilityBand;
  visitRating?: VisitRating;
  status: OpportunityStatus;
  rm: Rm;
  milestones: MilestoneSeed[];
  events: EventSeed[];
}

// =================================================================================================
// The dataset, and its arithmetic.
//
//   Dana's FY26 goal                       $2,700,000   (the single goal — Contradiction 2)
//   Won so far                               $385,200   (3 won opportunities)
//   Basis (goal - won)                     $2,314,800
//   Needed at 3x coverage                  $6,944,400
//
//   Pre-close total (stage board, left)    $1,695,000   — matches the design exactly
//     of which QUALIFIED                     $945,000   — "qualified asks on the table"
//     of which unqualified                   $750,000   — real work, not yet a real ask
//   Closed work (right of divider)            $48,000   — matches the design exactly
//
//   Coverage gap = 6,944,400 - 945,000     $5,999,400
//   Coverage ratio = 945,000 / 2,314,800        0.41x
//
// The design showed $1,695,000 as "qualified asks on the table" and 0.7x coverage. Under
// Contradiction 1's resolution (qualification wins; qualified = pre-close AND milestone-qualified)
// that figure is the PRE-CLOSE total, and the qualified subset is $945,000. The shortfall is
// therefore larger than the design's — which is the product's own thesis made visible: most of what
// looks like pipeline is not yet a real ask.
// =================================================================================================

const FORWARD_OPPORTUNITIES: OpportunitySpec[] = [
  // -- The flagship: "Not a real ask yet". Late stage, largest live ask, silent longest, and its
  //    close date has been moved three times — every move by us, never confirmed by the prospect.
  {
    key: "hallworth-kamuli",
    prospectKey: "hallworth",
    initiativeKey: "kamuli",
    amountCents: 25_000_000,
    amountNote: "over three years",
    closeDateDays: 49, // 2026-10-31, the end of the Jul 29 -> Aug 31 -> Sep 30 -> Oct 31 chain
    dateConfidence: "loose",
    stage: "follow_up_and_close",
    probability: "high", // vs a milestone suggestion of "high" — see the report; I20 compares them
    visitRating: "good",
    status: "open",
    rm: "dana",
    milestones: [
      {
        key: "ask_approved_by_leader",
        atDays: -102,
        byUser: "priya",
        evidence: "Jun 2 · Priya Nair approved $250,000 over three years",
      },
      {
        key: "specific_ask_made",
        atDays: -92,
        byUser: "dana",
        evidence: "Jun 12 · $250,000 over three years, Denver visit",
      },
      {
        key: "amount_agreed",
        atDays: -81,
        byName: "Ellen Hallworth",
        evidence: "Jun 23 · Ellen Hallworth, verbally — nothing in writing",
      },
      // close_date_confirmed and confirmed_in_writing are deliberately ABSENT: two blocking
      // milestones missing is what makes this "not a real ask yet".
    ],
    events: [
      {
        atDays: -102,
        eventType: "milestone_confirmed",
        field: "ask_approved_by_leader",
        newValue: "true",
        prospectSourced: false,
        actor: "priya",
        note: "Priya Nair approved $250,000 over three years",
      },
      {
        atDays: -94,
        eventType: "stage_change",
        field: "stage",
        oldValue: "prep_the_visit",
        newValue: "visit_and_ask",
        prospectSourced: false,
        actor: "dana",
      },
      {
        atDays: -92,
        eventType: "milestone_confirmed",
        field: "specific_ask_made",
        newValue: "true",
        prospectSourced: false,
        actor: "dana",
        note: "$250,000 over three years, Denver visit",
      },
      {
        atDays: -92,
        eventType: "contact_logged",
        prospectSourced: true,
        actor: "dana",
        note: "Denver visit — the ask was made",
      },
      {
        atDays: -81,
        eventType: "milestone_confirmed",
        field: "amount_agreed",
        newValue: "true",
        prospectSourced: true,
        actorName: "Ellen Hallworth, on a call with Priya Nair",
        note: "Amount agreed verbally — $250,000 over three years",
      },
      // The last contact. 81 days before the anchor, which is where "81 days idle" comes from.
      {
        atDays: -81,
        eventType: "contact_logged",
        prospectSourced: true,
        actorName: "Ellen Hallworth, on a call with Priya Nair",
        note: "The verbal agreement call",
      },
      {
        atDays: -75,
        eventType: "field_change",
        field: "closeDate",
        oldValue: "2026-07-29",
        newValue: "2026-08-31",
        prospectSourced: false,
        actor: "dana",
      },
      {
        atDays: -75,
        eventType: "stage_change",
        field: "stage",
        oldValue: "visit_and_ask",
        newValue: "follow_up_and_close",
        prospectSourced: false,
        actor: "dana",
      },
      {
        atDays: -44,
        eventType: "field_change",
        field: "closeDate",
        oldValue: "2026-08-31",
        newValue: "2026-09-30",
        prospectSourced: false,
        actor: "dana",
      },
      {
        atDays: -22,
        eventType: "field_change",
        field: "closeDate",
        oldValue: "2026-09-30",
        newValue: "2026-10-31",
        prospectSourced: false,
        actor: "dana",
      },
    ],
  },

  // -- Qualified: every blocking milestone confirmed by the prospect, in writing.
  {
    key: "cordova-kamuli",
    prospectKey: "cordova",
    initiativeKey: "kamuli",
    amountCents: 42_500_000,
    closeDateDays: 35,
    dateConfidence: "firm",
    stage: "follow_up_and_close",
    probability: "bookable",
    visitRating: "strong",
    status: "open",
    rm: "dana",
    milestones: [
      { key: "ask_approved_by_leader", atDays: -70, byUser: "priya" },
      { key: "specific_ask_made", atDays: -56, byUser: "dana" },
      { key: "amount_agreed", atDays: -40, byName: "Marcus Cordova" },
      {
        key: "close_date_confirmed",
        atDays: -35,
        byName: "Marcus Cordova",
        evidence: "Confirmed the board signs at the October meeting",
      },
      {
        key: "confirmed_in_writing",
        atDays: -30,
        byName: "Marcus Cordova",
        evidence: "Countersigned letter of intent",
        documentUrl: "https://example.invalid/documents/cordova-loi.pdf",
      },
    ],
    events: [
      {
        atDays: -56,
        eventType: "milestone_confirmed",
        field: "specific_ask_made",
        newValue: "true",
        prospectSourced: false,
        actor: "dana",
      },
      {
        atDays: -40,
        eventType: "milestone_confirmed",
        field: "amount_agreed",
        newValue: "true",
        prospectSourced: true,
        actorName: "Marcus Cordova",
      },
      { atDays: -30, eventType: "contact_logged", prospectSourced: true, actor: "dana" },
      {
        atDays: -30,
        eventType: "milestone_confirmed",
        field: "confirmed_in_writing",
        newValue: "true",
        prospectSourced: true,
        actorName: "Marcus Cordova",
      },
      { atDays: -8, eventType: "contact_logged", prospectSourced: true, actor: "dana" },
    ],
  },

  // -- Fix-first pathology #2: close date in the PAST with an open stage. Pushed twice, by us.
  {
    key: "osgood-bolivia",
    prospectKey: "osgood",
    initiativeKey: "bolivia",
    amountCents: 18_000_000,
    closeDateDays: -28, // 2026-08-15 — already past
    dateConfidence: "loose",
    stage: "visit_and_ask",
    probability: "medium",
    status: "open",
    rm: "priya",
    milestones: [
      { key: "ask_approved_by_leader", atDays: -120, byUser: "priya" },
      { key: "specific_ask_made", atDays: -75, byUser: "priya" },
    ],
    events: [
      {
        atDays: -75,
        eventType: "milestone_confirmed",
        field: "specific_ask_made",
        newValue: "true",
        prospectSourced: false,
        actor: "priya",
      },
      { atDays: -61, eventType: "contact_logged", prospectSourced: true, actor: "priya" },
      {
        atDays: -60,
        eventType: "field_change",
        field: "closeDate",
        oldValue: "2026-06-30",
        newValue: "2026-07-31",
        prospectSourced: false,
        actor: "priya",
      },
      {
        atDays: -35,
        eventType: "field_change",
        field: "closeDate",
        oldValue: "2026-07-31",
        newValue: "2026-08-15",
        prospectSourced: false,
        actor: "priya",
      },
      { atDays: -20, eventType: "contact_logged", prospectSourced: true, actor: "priya" },
    ],
  },

  // -- Untouched 30+ days, alongside Hallworth: 95 days silent. 250,000 + 90,000 = $340,000 frozen.
  {
    key: "vega-forever-promise",
    prospectKey: "vega",
    initiativeKey: "forever-promise",
    amountCents: 9_000_000,
    closeDateDays: null, // a date was never set with her
    dateConfidence: "loose",
    stage: "prep_the_visit",
    probability: "longshot",
    status: "open",
    rm: "dana",
    milestones: [],
    events: [
      {
        atDays: -95,
        eventType: "contact_logged",
        prospectSourced: true,
        actor: "dana",
        note: "Introductory coffee — no ask made",
      },
    ],
  },

  // -- Fix-first pathology #3: confirmed in writing, but no document attached. Qualified on
  //    milestones, yet the evidence is missing — exactly the contradiction the board should catch.
  {
    key: "cornerstone-bolivia",
    prospectKey: "cornerstone",
    initiativeKey: "bolivia",
    amountCents: 30_000_000,
    closeDateDays: 21,
    dateConfidence: "semi_firm",
    stage: "follow_up_and_close",
    probability: "high",
    visitRating: "good",
    status: "open",
    rm: "priya",
    milestones: [
      { key: "ask_approved_by_leader", atDays: -90, byUser: "priya" },
      { key: "specific_ask_made", atDays: -64, byUser: "priya" },
      { key: "amount_agreed", atDays: -45, byName: "Cornerstone trustees" },
      { key: "close_date_confirmed", atDays: -40, byName: "Cornerstone trustees" },
      {
        key: "confirmed_in_writing",
        atDays: -38,
        byName: "Cornerstone trustees",
        evidence: "Trustee minute cited on a call — nothing attached",
        // documentUrl deliberately absent: "Attach or uncheck".
      },
    ],
    events: [
      {
        atDays: -45,
        eventType: "milestone_confirmed",
        field: "amount_agreed",
        newValue: "true",
        prospectSourced: true,
        actorName: "Cornerstone trustees",
      },
      {
        atDays: -38,
        eventType: "milestone_confirmed",
        field: "confirmed_in_writing",
        newValue: "true",
        prospectSourced: true,
        actorName: "Cornerstone trustees",
      },
      { atDays: -12, eventType: "contact_logged", prospectSourced: true, actor: "priya" },
    ],
  },

  // -- Demonstrates the source/blocking independence: permission_to_share is THEY-SAID but
  //    NON-BLOCKING, so this reads 1/4 they said and is still unqualified. Pushed twice.
  {
    key: "whitfield-unrestricted",
    prospectKey: "whitfield",
    initiativeKey: "unrestricted",
    amountCents: 6_000_000,
    closeDateDays: 14,
    dateConfidence: "semi_firm",
    stage: "visit_and_ask",
    probability: "medium",
    status: "open",
    rm: "dana",
    milestones: [
      { key: "specific_ask_made", atDays: -50, byUser: "dana" },
      {
        key: "permission_to_share",
        atDays: -30,
        byName: "Eleanor Whitfield",
        evidence: "Happy to be named if it helps — not blocking the gift",
      },
    ],
    events: [
      {
        atDays: -50,
        eventType: "milestone_confirmed",
        field: "specific_ask_made",
        newValue: "true",
        prospectSourced: false,
        actor: "dana",
      },
      {
        atDays: -30,
        eventType: "milestone_confirmed",
        field: "permission_to_share",
        newValue: "true",
        prospectSourced: true,
        actorName: "Eleanor Whitfield",
      },
      {
        atDays: -29,
        eventType: "field_change",
        field: "closeDate",
        oldValue: "2026-08-31",
        newValue: "2026-09-15",
        prospectSourced: false,
        actor: "dana",
      },
      {
        atDays: -10,
        eventType: "field_change",
        field: "closeDate",
        oldValue: "2026-09-15",
        newValue: "2026-09-26",
        prospectSourced: false,
        actor: "dana",
      },
      { atDays: -6, eventType: "contact_logged", prospectSourced: true, actor: "dana" },
    ],
  },

  // -- Qualified, and everything the prospect said is on the record.
  {
    key: "northwater-kamuli",
    prospectKey: "northwater",
    initiativeKey: "kamuli",
    amountCents: 22_000_000,
    closeDateDays: 42,
    dateConfidence: "firm",
    stage: "visit_and_ask",
    probability: "bookable",
    visitRating: "strong",
    status: "open",
    rm: "priya",
    milestones: [
      { key: "ask_approved_by_leader", atDays: -66, byUser: "priya" },
      { key: "specific_ask_made", atDays: -48, byUser: "priya" },
      { key: "amount_agreed", atDays: -26, byName: "Northwater Capital giving committee" },
      { key: "close_date_confirmed", atDays: -26, byName: "Northwater Capital giving committee" },
      {
        key: "confirmed_in_writing",
        atDays: -24,
        byName: "Northwater Capital giving committee",
        documentUrl: "https://example.invalid/documents/northwater-commitment.pdf",
      },
      { key: "permission_to_share", atDays: -24, byName: "Northwater Capital giving committee" },
    ],
    events: [
      {
        atDays: -26,
        eventType: "milestone_confirmed",
        field: "amount_agreed",
        newValue: "true",
        prospectSourced: true,
        actorName: "Northwater Capital giving committee",
      },
      { atDays: -24, eventType: "contact_logged", prospectSourced: true, actor: "priya" },
      { atDays: -3, eventType: "contact_logged", prospectSourced: true, actor: "priya" },
    ],
  },

  {
    key: "bello-forever-promise",
    prospectKey: "bello",
    initiativeKey: "forever-promise",
    amountCents: 12_000_000,
    closeDateDays: null,
    dateConfidence: "loose",
    stage: "get_the_visit",
    probability: "longshot",
    status: "open",
    rm: "dana",
    milestones: [],
    events: [
      {
        atDays: -18,
        eventType: "contact_logged",
        prospectSourced: true,
        actor: "dana",
        note: "Warm introduction made by a board member",
      },
    ],
  },

  // -- A SECOND opportunity for a prospect who already has one, against a different initiative.
  //    Proves there is no unique constraint on (prospect, initiative) or (prospect).
  {
    key: "cordova-bolivia",
    prospectKey: "cordova",
    initiativeKey: "bolivia",
    amountCents: 5_000_000,
    closeDateDays: null,
    dateConfidence: "loose",
    stage: "get_the_visit",
    probability: "longshot",
    status: "open",
    rm: "dana",
    milestones: [],
    events: [
      {
        atDays: -9,
        eventType: "contact_logged",
        prospectSourced: true,
        actor: "dana",
        note: "Mentioned Bolivia interest at the Kamuli signing",
      },
    ],
  },

  // -- Closed work, right of the stage-board divider: $48,000, outside the headline number.
  {
    key: "osgood-kamuli-steward",
    prospectKey: "osgood",
    initiativeKey: "kamuli",
    amountCents: 4_800_000,
    closeDateDays: -120,
    dateConfidence: "firm",
    stage: "celebrate_steward",
    probability: "lock",
    status: "open",
    rm: "priya",
    milestones: [
      { key: "ask_approved_by_leader", atDays: -200, byUser: "priya" },
      { key: "specific_ask_made", atDays: -180, byUser: "priya" },
      { key: "amount_agreed", atDays: -150, byName: "The Osgood Foundation" },
      { key: "close_date_confirmed", atDays: -150, byName: "The Osgood Foundation" },
      { key: "confirmed_in_writing", atDays: -140, byName: "The Osgood Foundation" },
    ],
    events: [
      { atDays: -140, eventType: "contact_logged", prospectSourced: true, actor: "priya" },
      {
        atDays: -120,
        eventType: "stage_change",
        field: "stage",
        oldValue: "follow_up_and_close",
        newValue: "celebrate_steward",
        prospectSourced: false,
        actor: "priya",
      },
    ],
  },

  // -- Won: $150,000 + $85,200 + $150,000 = $385,200, the design's "won so far".
  {
    key: "cordova-kamuli-won",
    prospectKey: "cordova",
    initiativeKey: "kamuli",
    amountCents: 15_000_000,
    closeDateDays: -210,
    dateConfidence: "firm",
    stage: "repeat",
    probability: "lock",
    status: "won",
    rm: "dana",
    milestones: [
      { key: "amount_agreed", atDays: -240, byName: "Marcus Cordova" },
      { key: "close_date_confirmed", atDays: -240, byName: "Marcus Cordova" },
      { key: "confirmed_in_writing", atDays: -230, byName: "Marcus Cordova" },
    ],
    events: [
      {
        atDays: -210,
        eventType: "field_change",
        field: "status",
        oldValue: "open",
        newValue: "won",
        prospectSourced: true,
        actor: "dana",
      },
    ],
  },
  {
    key: "whitfield-forever-promise-won",
    prospectKey: "whitfield",
    initiativeKey: "forever-promise",
    amountCents: 8_520_000,
    closeDateDays: -160,
    dateConfidence: "firm",
    stage: "repeat",
    probability: "lock",
    status: "won",
    rm: "dana",
    milestones: [
      { key: "amount_agreed", atDays: -190, byName: "Eleanor Whitfield" },
      { key: "close_date_confirmed", atDays: -190, byName: "Eleanor Whitfield" },
      { key: "confirmed_in_writing", atDays: -180, byName: "Eleanor Whitfield" },
    ],
    events: [
      {
        atDays: -160,
        eventType: "field_change",
        field: "status",
        oldValue: "open",
        newValue: "won",
        prospectSourced: true,
        actor: "dana",
      },
    ],
  },
  {
    key: "northwater-unrestricted-won",
    prospectKey: "northwater",
    initiativeKey: "unrestricted",
    amountCents: 15_000_000,
    closeDateDays: -95,
    dateConfidence: "firm",
    stage: "celebrate_steward",
    probability: "lock",
    status: "won",
    rm: "priya",
    milestones: [
      { key: "amount_agreed", atDays: -130, byName: "Northwater Capital giving committee" },
      { key: "close_date_confirmed", atDays: -130, byName: "Northwater Capital giving committee" },
      { key: "confirmed_in_writing", atDays: -120, byName: "Northwater Capital giving committee" },
    ],
    events: [
      {
        atDays: -95,
        eventType: "field_change",
        field: "status",
        oldValue: "open",
        newValue: "won",
        prospectSourced: true,
        actor: "priya",
      },
    ],
  },
];

/** Dana's FY26 goal — ONE value, read by both the Board and the Forecast Room (Contradiction 2). */
const DANA_FY26_GOAL_CENTS = 270_000_000;
const FISCAL_PERIOD = "FY26";

export async function seedForward(
  db: Database,
  tenantId: string,
  anchor: Date = DEMO_TODAY,
): Promise<void> {
  const at = (days: number): Date => new Date(anchor.getTime() + days * DAY);
  const day = (days: number): string => at(days).toISOString().slice(0, 10);

  const userRows = await db.query.users.findMany({ where: eq(users.tenantId, tenantId) });
  const rmIds: Record<Rm, string | undefined> = {
    dana: userRows.find((u) => u.email === "dana.reese@waterforpeople.org")?.id,
    priya: userRows.find((u) => u.email === "priya.nair@waterforpeople.org")?.id,
  };
  const rmNames: Record<Rm, string> = { dana: "Dana Reese", priya: "Priya Nair" };

  // ---- Milestone definitions. Data, not columns: I22 references these keys in rules. ----
  const definitionIdByKey = new Map<string, string>();
  for (const definition of DEFAULT_MILESTONE_DEFINITIONS) {
    const id = stableId(`milestone-definition:${definition.key}`);
    definitionIdByKey.set(definition.key, id);
    await db
      .insert(milestoneDefinitions)
      .values({
        id,
        tenantId,
        key: definition.key,
        label: definition.label,
        source: definition.source,
        blocking: definition.blocking,
        sortOrder: definition.sortOrder,
      })
      .onConflictDoUpdate({
        target: milestoneDefinitions.id,
        set: {
          label: definition.label,
          source: definition.source,
          blocking: definition.blocking,
          sortOrder: definition.sortOrder,
        },
      });
  }

  // ---- Goals: one per (scope, period). ----
  const danaId = rmIds.dana;
  if (danaId) {
    await db
      .insert(goals)
      .values({
        id: stableId(`goal:rep:dana:${FISCAL_PERIOD}`),
        tenantId,
        scope: "rep",
        scopeRefId: danaId,
        fiscalPeriod: FISCAL_PERIOD,
        amountCents: DANA_FY26_GOAL_CENTS,
      })
      .onConflictDoUpdate({
        target: goals.id,
        set: { amountCents: DANA_FY26_GOAL_CENTS },
      });
  }
  // The org goal. For scope "org" the ref is the tenant itself — see the schema comment.
  await db
    .insert(goals)
    .values({
      id: stableId(`goal:org:${FISCAL_PERIOD}`),
      tenantId,
      scope: "org",
      scopeRefId: tenantId,
      fiscalPeriod: FISCAL_PERIOD,
      amountCents: 900_000_00,
    })
    .onConflictDoUpdate({ target: goals.id, set: { amountCents: 900_000_00 } });

  // Per-initiative goals, so a scoped Forecast Room view has its own goal — except Forever Promise,
  // which is deliberately left WITHOUT one so I19 can exercise "no goal defined for this view"
  // rather than silently falling back to the org goal.
  const initiativeGoals: { key: string; amountCents: number }[] = [
    { key: "kamuli", amountCents: 120_000_00 },
    { key: "bolivia", amountCents: 90_000_00 },
    { key: "unrestricted", amountCents: 40_000_00 },
  ];
  for (const goal of initiativeGoals) {
    await db
      .insert(goals)
      .values({
        id: stableId(`goal:initiative:${goal.key}:${FISCAL_PERIOD}`),
        tenantId,
        scope: "initiative",
        scopeRefId: stableId(`initiative:${goal.key}`),
        fiscalPeriod: FISCAL_PERIOD,
        amountCents: goal.amountCents,
      })
      .onConflictDoUpdate({ target: goals.id, set: { amountCents: goal.amountCents } });
  }

  // ---- Opportunities, their milestone state, and their backdated history. ----
  const initiativeRows = await db.query.fundingInitiatives.findMany({
    where: eq(fundingInitiatives.tenantId, tenantId),
  });
  const knownInitiativeIds = new Set(initiativeRows.map((row) => row.id));

  for (const spec of FORWARD_OPPORTUNITIES) {
    const initiativeId = stableId(`initiative:${spec.initiativeKey}`);
    if (!knownInitiativeIds.has(initiativeId)) {
      throw new Error(
        `seedForward: initiative "${spec.initiativeKey}" is missing — seed funding initiatives first`,
      );
    }
    const id = stableId(`forward-opportunity:${spec.key}`);
    const values = {
      tenantId,
      prospectId: stableId(`prospect:${spec.prospectKey}`),
      initiativeId,
      amountCents: spec.amountCents,
      amountNote: spec.amountNote ?? null,
      closeDate: spec.closeDateDays === null ? null : day(spec.closeDateDays),
      dateConfidence: spec.dateConfidence,
      stage: spec.stage,
      probability: spec.probability,
      visitRating: spec.visitRating ?? null,
      ownerUserId: rmIds[spec.rm] ?? null,
      status: spec.status,
    };

    await db
      .insert(forwardOpportunities)
      .values({ id, ...values })
      .onConflictDoUpdate({ target: forwardOpportunities.id, set: values });

    for (const milestone of spec.milestones) {
      const definitionId = definitionIdByKey.get(milestone.key);
      if (!definitionId) {
        throw new Error(`seedForward: unknown milestone key "${milestone.key}"`);
      }
      const milestoneValues = {
        tenantId,
        opportunityId: id,
        milestoneDefinitionId: definitionId,
        confirmed: true,
        confirmedAt: at(milestone.atDays),
        confirmedByUserId: milestone.byUser ? (rmIds[milestone.byUser] ?? null) : null,
        confirmedByName: milestone.byName ?? (milestone.byUser ? rmNames[milestone.byUser] : null),
        evidence: milestone.evidence ?? null,
        documentUrl: milestone.documentUrl ?? null,
      };
      await db
        .insert(opportunityMilestones)
        .values({ id: stableId(`opportunity-milestone:${spec.key}:${milestone.key}`), ...milestoneValues })
        .onConflictDoUpdate({
          target: opportunityMilestones.id,
          set: milestoneValues,
        });
    }

    for (const [index, event] of spec.events.entries()) {
      const eventValues = {
        tenantId,
        opportunityId: id,
        eventType: event.eventType,
        field: event.field ?? null,
        oldValue: event.oldValue ?? null,
        newValue: event.newValue ?? null,
        actorUserId: event.actor ? (rmIds[event.actor] ?? null) : null,
        actorName: event.actorName ?? (event.actor ? rmNames[event.actor] : null),
        prospectSourced: event.prospectSourced,
        note: event.note ?? null,
        occurredAt: at(event.atDays),
      };
      await db
        .insert(opportunityEvents)
        .values({ id: stableId(`opportunity-event:${spec.key}:${index}`), ...eventValues })
        .onConflictDoUpdate({ target: opportunityEvents.id, set: eventValues });
    }
  }
}

/** Exported for the seed test, so the arithmetic in the header comment is asserted, not asserted-to. */
export const FORWARD_SEED_FACTS = {
  anchor: DEMO_TODAY,
  danaFy26GoalCents: DANA_FY26_GOAL_CENTS,
  fiscalPeriod: FISCAL_PERIOD,
  opportunityKeys: FORWARD_OPPORTUNITIES.map((o) => o.key),
  wonTotalCents: FORWARD_OPPORTUNITIES.filter((o) => o.status === "won").reduce(
    (sum, o) => sum + o.amountCents,
    0,
  ),
} as const;

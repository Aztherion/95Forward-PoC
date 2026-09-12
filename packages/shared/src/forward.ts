// 95 Forward — the opportunity-centric domain model (Initiative 18).
//
// This module is deliberately pure: no database, no framework. Qualification, stage ordering and the
// probability suggestion are the product's central claims, and they must be testable and reusable by
// the portfolio maths (I19), the consistency checker (I20), the simulation (I21) and the rules layer
// (I22) without any of them reaching into the data layer.

// ---------------------------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------------------------

/** The six stages, in order. The first four are pre-close; the last two are closed work. */
export const FORWARD_STAGES = [
  "get_the_visit",
  "prep_the_visit",
  "visit_and_ask",
  "follow_up_and_close",
  "celebrate_steward",
  "repeat",
] as const;

export type ForwardStage = (typeof FORWARD_STAGES)[number];

export interface ForwardStageMeta {
  readonly label: string;
  /** Pre-close stages are the only ones that can contribute to qualified asks on the table. */
  readonly preClose: boolean;
  readonly order: number;
}

// Encoded once, here. Three screens depend on the pre-close split — never re-derive it by taking
// "the first four" at a call site.
export const FORWARD_STAGE_META: Record<ForwardStage, ForwardStageMeta> = {
  get_the_visit: { label: "Get the visit", preClose: true, order: 0 },
  prep_the_visit: { label: "Prep the visit", preClose: true, order: 1 },
  visit_and_ask: { label: "Visit & ask", preClose: true, order: 2 },
  follow_up_and_close: { label: "Follow up & close", preClose: true, order: 3 },
  celebrate_steward: { label: "Celebrate / steward", preClose: false, order: 4 },
  repeat: { label: "Repeat", preClose: false, order: 5 },
};

export function isPreCloseStage(stage: ForwardStage): boolean {
  return FORWARD_STAGE_META[stage].preClose;
}

export const PRE_CLOSE_STAGES: readonly ForwardStage[] = FORWARD_STAGES.filter(isPreCloseStage);
export const CLOSED_WORK_STAGES: readonly ForwardStage[] = FORWARD_STAGES.filter(
  (stage) => !isPreCloseStage(stage),
);

// ---------------------------------------------------------------------------------------------
// Date confidence, probability, visit rating, status
// ---------------------------------------------------------------------------------------------

export const DATE_CONFIDENCES = ["firm", "semi_firm", "loose"] as const;
export type DateConfidence = (typeof DATE_CONFIDENCES)[number];

/**
 * DEFAULTS ONLY. The enum is stored on the opportunity; the ± day band it maps to is a *setting*
 * that belongs to the Rules of Robb layer (I22) and is consumed by the simulation (I21). Never read
 * these constants as though they were the model — read the tenant's configured values, falling back
 * to these. Reference values come from the source spreadsheet; semi-firm is ±21 days.
 */
export const DEFAULT_DATE_CONFIDENCE_DAYS: Record<DateConfidence, number> = {
  firm: 7,
  semi_firm: 21,
  loose: 60,
};

export const PROBABILITY_BANDS = ["longshot", "medium", "high", "bookable", "lock"] as const;
export type ProbabilityBand = (typeof PROBABILITY_BANDS)[number];

/**
 * DEFAULTS ONLY — same contract as the date bands. These percentages are a setting.
 *
 * Note these are the rep's *judgement*, not a forecast weight: the simulation closes each
 * opportunity in full or at zero and never multiplies amount by probability.
 */
export const DEFAULT_PROBABILITY_PCT: Record<ProbabilityBand, number> = {
  longshot: 10,
  medium: 40,
  high: 65,
  bookable: 85,
  lock: 95,
};

export const VISIT_RATINGS = ["poor", "mixed", "good", "strong"] as const;
export type VisitRating = (typeof VISIT_RATINGS)[number];

export const OPPORTUNITY_STATUSES = ["open", "won", "lost"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

// ---------------------------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------------------------

export const MILESTONE_SOURCES = ["they_said", "we_said"] as const;
export type MilestoneSource = (typeof MILESTONE_SOURCES)[number];

export interface MilestoneDefinition {
  readonly key: string;
  readonly label: string;
  readonly source: MilestoneSource;
  /** Qualification counts blocking milestones. INDEPENDENT of `source` — see the seed set below. */
  readonly blocking: boolean;
  readonly sortOrder: number;
}

/**
 * The seeded milestone set. Definitions are DATA, not columns: Robb's set will change, and I22
 * references these keys in rules.
 *
 * `permission_to_share` is the invariant that keeps people honest — it is they-said but NOT
 * blocking. The detail screen's "1/4 they said" counter uses the they-said denominator;
 * qualification uses the blocking denominator. Conflating them silently breaks both.
 */
export const DEFAULT_MILESTONE_DEFINITIONS: readonly MilestoneDefinition[] = [
  {
    key: "close_date_confirmed",
    label: "Close date confirmed by the prospect",
    source: "they_said",
    blocking: true,
    sortOrder: 0,
  },
  { key: "amount_agreed", label: "Amount agreed", source: "they_said", blocking: true, sortOrder: 1 },
  {
    key: "confirmed_in_writing",
    label: "Confirmed in writing",
    source: "they_said",
    blocking: true,
    sortOrder: 2,
  },
  {
    key: "permission_to_share",
    label: "Permission to share publicly",
    source: "they_said",
    blocking: false,
    sortOrder: 3,
  },
  {
    key: "ask_approved_by_leader",
    label: "Ask approved by leader",
    source: "we_said",
    blocking: false,
    sortOrder: 4,
  },
  {
    key: "specific_ask_made",
    label: "Specific ask made",
    source: "we_said",
    blocking: false,
    sortOrder: 5,
  },
] as const;

export const MILESTONE_KEYS = DEFAULT_MILESTONE_DEFINITIONS.map((d) => d.key);

// ---------------------------------------------------------------------------------------------
// Qualification — computed, never stored
// ---------------------------------------------------------------------------------------------

export interface QualificationResult {
  /** The verdict the board needs. */
  readonly qualified: boolean;
  /** The list the detail screen needs. */
  readonly missingBlocking: readonly MilestoneDefinition[];
  readonly blockingConfirmed: number;
  readonly blockingTotal: number;
  readonly theySaidConfirmed: number;
  readonly theySaidTotal: number;
  readonly weSaidConfirmed: number;
  readonly weSaidTotal: number;
}

/**
 * qualified = every blocking milestone is confirmed.
 *
 * No stored status, no free-typed status, no rep override. This is the product thesis: only what the
 * prospect said makes an ask real. An opportunity can sit in a late stage and still be unqualified —
 * that is a normal and important state, and it is what the board's #1 item is about.
 *
 * An opportunity with no blocking milestones defined cannot be "qualified" by vacuous truth; if the
 * definition set is empty we refuse rather than silently qualifying everything.
 */
export function computeQualification(
  definitions: readonly MilestoneDefinition[],
  confirmedKeys: Iterable<string>,
): QualificationResult {
  const confirmed = new Set(confirmedKeys);
  const blocking = definitions.filter((d) => d.blocking);
  const theySaid = definitions.filter((d) => d.source === "they_said");
  const weSaid = definitions.filter((d) => d.source === "we_said");
  const missingBlocking = blocking.filter((d) => !confirmed.has(d.key));

  return {
    qualified: blocking.length > 0 && missingBlocking.length === 0,
    missingBlocking,
    blockingConfirmed: blocking.length - missingBlocking.length,
    blockingTotal: blocking.length,
    theySaidConfirmed: theySaid.filter((d) => confirmed.has(d.key)).length,
    theySaidTotal: theySaid.length,
    weSaidConfirmed: weSaid.filter((d) => confirmed.has(d.key)).length,
    weSaidTotal: weSaid.length,
  };
}

// ---------------------------------------------------------------------------------------------
// Suggested probability — the gap that makes I20 and I22 possible
// ---------------------------------------------------------------------------------------------

/**
 * A *suggestion* derived from milestone state. The rep's own band is stored separately and is never
 * overwritten by this.
 *
 * Keeping both is the point: the divergence between them is what the consistency checker (I20) and
 * the coaching rules (I22) fire on — "amount agreed and confirmed in writing, but probability still
 * reads Medium". If probability were a pure function of milestones there would be nothing to check
 * and those rules would be unwritable.
 */
export function suggestProbabilityBand(
  definitions: readonly MilestoneDefinition[],
  confirmedKeys: Iterable<string>,
): ProbabilityBand {
  const confirmed = new Set(confirmedKeys);
  const { qualified } = computeQualification(definitions, confirmedKeys);

  if (qualified) return "lock";
  if (confirmed.has("amount_agreed") && confirmed.has("close_date_confirmed")) return "bookable";
  if (confirmed.has("amount_agreed")) return "high";
  if (confirmed.has("specific_ask_made")) return "medium";
  return "longshot";
}

/** True when the rep's stored band is more optimistic than the milestones justify. I20 reads this. */
export function probabilityBandRank(band: ProbabilityBand): number {
  return PROBABILITY_BANDS.indexOf(band);
}

// ---------------------------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------------------------

export const GOAL_SCOPES = ["org", "rep", "initiative"] as const;
export type GoalScope = (typeof GOAL_SCOPES)[number];

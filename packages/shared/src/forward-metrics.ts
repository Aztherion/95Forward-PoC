// 95 Forward — the derived metrics service (Initiative 19).
//
// ONE place computes each number. If two screens compute the same figure independently they will
// eventually disagree, and the first time a stakeholder does the arithmetic in the room and finds a
// contradiction, the tool's credibility is gone.
//
// This module is PURE over an input snapshot. That is what makes a what-if cheap: I20 asks "what
// would qualified asks be if this milestone were confirmed?" and I23 asks "what does this move do
// to the number?" — both are a recompute over an already-loaded snapshot, not another round trip.
//
// NO FORMATTING HAPPENS HERE. Exact integer cents out; thousands separators, $1.86M abbreviation and
// percentage rendering are presentation. Rounding in two places is how two screens come to disagree.

import {
  computeQualification,
  isPreCloseStage,
  type DateConfidence,
  type ForwardStage,
  type MilestoneDefinition,
  type OpportunityStatus,
  type ProbabilityBand,
  type VisitRating,
} from "./forward";
import {
  resolveFiscalPeriod,
  type Clock,
  type FiscalPeriod,
  type ForwardSettings,
} from "./forward-settings";

// -------------------------------------------------------------------------------------------
// Scope
// -------------------------------------------------------------------------------------------

export type ScopeSelector = string | "all";

/**
 * Every metric is computed against a scope. The Forecast Room's initiative tabs re-scope the whole
 * screen; The Board has a rep toggle.
 *
 * I21's simulation MUST filter by `scopeMatches` too — if the chart and the metric cards disagree
 * about which opportunities they describe, the screen contradicts itself.
 */
export interface MetricScope {
  readonly rep: ScopeSelector;
  readonly initiative: ScopeSelector;
  readonly period: string;
}

export const ALL_SCOPE: MetricScope = { rep: "all", initiative: "all", period: "FY26" };

// -------------------------------------------------------------------------------------------
// Snapshot — the input the computation is pure over
// -------------------------------------------------------------------------------------------

export interface SnapshotOpportunity {
  readonly id: string;
  readonly prospectId: string;
  readonly initiativeId: string;
  readonly ownerUserId: string | null;
  readonly amountCents: number;
  readonly stage: ForwardStage;
  readonly status: OpportunityStatus;
  /** ISO `YYYY-MM-DD`, or null when no date has been set with them. */
  readonly closeDate: string | null;
  /** Keys of the milestones confirmed on this opportunity. */
  readonly confirmedMilestoneKeys: readonly string[];

  // -- I20 additions. No metric reads these; the consistency checks do. -------------------------
  readonly dateConfidence: DateConfidence;
  /** The rep's stored band. Compare against suggestProbabilityBand() — that gap is a check. */
  readonly probability: ProbabilityBand;
  readonly visitRating: VisitRating | null;
  /**
   * Supporting evidence per CONFIRMED milestone, keyed by milestone key. A confirmed milestone with
   * neither evidence text nor a document is what `written-confirmation-no-evidence` detects.
   */
  readonly milestoneEvidence: Readonly<Record<string, MilestoneEvidence>>;
}

export interface MilestoneEvidence {
  readonly evidence: string | null;
  readonly documentUrl: string | null;
}

export interface SnapshotGoal {
  readonly scope: "org" | "rep" | "initiative";
  readonly scopeRefId: string;
  readonly fiscalPeriod: string;
  readonly amountCents: number;
}

export interface MetricsSnapshot {
  /** The ref a scope of rep=all + initiative=all resolves its goal against. */
  readonly orgRefId: string;
  readonly opportunities: readonly SnapshotOpportunity[];
  readonly definitions: readonly MilestoneDefinition[];
  readonly goals: readonly SnapshotGoal[];
}

// -------------------------------------------------------------------------------------------
// What-if overrides
// -------------------------------------------------------------------------------------------

export interface MetricsOverrides {
  /** Drop these from the computation entirely — "what if this were not on the table?" */
  readonly excludeOpportunityIds?: readonly string[];
  /** Hypothetical field values, e.g. a different stage or amount. */
  readonly opportunityPatches?: Readonly<
    Record<string, Partial<Omit<SnapshotOpportunity, "id">>>
  >;
  /** Hypothetical milestone state, keyed by opportunity id. Replaces the confirmed set. */
  readonly milestonePatches?: Readonly<Record<string, readonly string[]>>;
}

function applyOverrides(
  opportunities: readonly SnapshotOpportunity[],
  overrides: MetricsOverrides | undefined,
): readonly SnapshotOpportunity[] {
  if (!overrides) return opportunities;
  const excluded = new Set(overrides.excludeOpportunityIds ?? []);
  const patches = overrides.opportunityPatches ?? {};
  const milestones = overrides.milestonePatches ?? {};

  const result: SnapshotOpportunity[] = [];
  for (const opportunity of opportunities) {
    if (excluded.has(opportunity.id)) continue;
    const patch = patches[opportunity.id];
    const milestonePatch = milestones[opportunity.id];
    if (!patch && !milestonePatch) {
      result.push(opportunity);
      continue;
    }
    result.push({
      ...opportunity,
      ...(patch ?? {}),
      confirmedMilestoneKeys: milestonePatch ?? opportunity.confirmedMilestoneKeys,
    });
  }
  return result;
}

// -------------------------------------------------------------------------------------------
// Aggregates — value, count AND the names behind it
// -------------------------------------------------------------------------------------------

/**
 * No number exists without names.
 *
 * Every figure on these screens must decompose to the opportunities behind it ("Show the 11
 * opportunities behind it", "see the names", "who could close it"). Returning bare totals would
 * force every screen to re-query for the names, and the two would drift.
 */
export interface Aggregate {
  readonly cents: number;
  readonly count: number;
  readonly opportunityIds: readonly string[];
}

const EMPTY_AGGREGATE: Aggregate = { cents: 0, count: 0, opportunityIds: [] };

function aggregate(opportunities: readonly SnapshotOpportunity[]): Aggregate {
  let cents = 0;
  const ids: string[] = [];
  for (const opportunity of opportunities) {
    cents += opportunity.amountCents;
    ids.push(opportunity.id);
  }
  return { cents, count: ids.length, opportunityIds: ids };
}

// -------------------------------------------------------------------------------------------
// Predicates
// -------------------------------------------------------------------------------------------

export function scopeMatches(opportunity: SnapshotOpportunity, scope: MetricScope): boolean {
  if (scope.rep !== "all" && opportunity.ownerUserId !== scope.rep) return false;
  if (scope.initiative !== "all" && opportunity.initiativeId !== scope.initiative) return false;
  return true;
}

function withinPeriod(closeDate: string | null, period: FiscalPeriod): boolean {
  if (!closeDate) return false;
  return closeDate >= period.start && closeDate <= period.end;
}

function isQualified(
  opportunity: SnapshotOpportunity,
  definitions: readonly MilestoneDefinition[],
): boolean {
  return computeQualification(definitions, opportunity.confirmedMilestoneKeys).qualified;
}

// -------------------------------------------------------------------------------------------
// Goal resolution — strict, no fallback
// -------------------------------------------------------------------------------------------

export interface GoalResolution {
  readonly defined: boolean;
  readonly amountCents: number | null;
  /** Which goal row satisfied this scope, for the UI to label honestly. */
  readonly scope: "org" | "rep" | "initiative" | null;
}

/**
 * Look up the goal for EXACTLY this scope. If none exists, the answer is "absent".
 *
 * Deliberately no fallback and no apportionment. Henrik's spreadsheet falls back to the total goal
 * when you filter to a subset, and he flags it as needing explanation; in an app that is a silently
 * wrong number, which is worse than an absent one. Pro-rating a parent goal across a subset is the
 * same failure wearing a hat — it invents a denominator.
 *
 * A scope of one rep x one initiative will usually have NO goal. Rendering "no goal defined for
 * this view" there is correct and intended, not an error to engineer around.
 */
export function resolveGoalForScope(
  snapshot: MetricsSnapshot,
  scope: MetricScope,
): GoalResolution {
  const repAll = scope.rep === "all";
  const initiativeAll = scope.initiative === "all";

  let goalScope: "org" | "rep" | "initiative" | null = null;
  let refId: string | null = null;

  if (repAll && initiativeAll) {
    goalScope = "org";
    refId = snapshot.orgRefId;
  } else if (!repAll && initiativeAll) {
    goalScope = "rep";
    refId = scope.rep;
  } else if (repAll && !initiativeAll) {
    goalScope = "initiative";
    refId = scope.initiative;
  }
  // rep x initiative: no goal scope exists. Absent, by design.

  if (!goalScope || !refId) {
    return { defined: false, amountCents: null, scope: null };
  }

  const match = snapshot.goals.find(
    (goal) =>
      goal.scope === goalScope && goal.scopeRefId === refId && goal.fiscalPeriod === scope.period,
  );
  if (!match) return { defined: false, amountCents: null, scope: null };
  return { defined: true, amountCents: match.amountCents, scope: goalScope };
}

// -------------------------------------------------------------------------------------------
// weeksLeft
// -------------------------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole weeks from the clock's today to the end of the scope's fiscal period.
 *
 * The designs disagreed — The Board said "19 weeks left", the Forecast Room's "WEEK 38 OF 52"
 * implies 14 — and both were plugs. Neither is authoritative; this is.
 */
export function weeksLeftIn(period: FiscalPeriod, now: Date): number {
  const end = Date.parse(`${period.end}T23:59:59.999Z`);
  const remainingMs = end - now.getTime();
  if (remainingMs <= 0) return 0;
  return Math.floor(remainingMs / (7 * DAY_MS));
}

/** The 1-based week number within the period, for the Forecast Room eyebrow. */
export function weekOfPeriod(period: FiscalPeriod, now: Date): number {
  const start = Date.parse(`${period.start}T00:00:00.000Z`);
  const elapsedMs = now.getTime() - start;
  if (elapsedMs < 0) return 0;
  return Math.floor(elapsedMs / (7 * DAY_MS)) + 1;
}

/** Whole weeks the period contains — the "of 52" in "WEEK 38 OF 52". A 365-day year has 52. */
export function weeksInPeriod(period: FiscalPeriod): number {
  const start = Date.parse(`${period.start}T00:00:00.000Z`);
  const end = Date.parse(`${period.end}T23:59:59.999Z`);
  return Math.floor((end - start) / (7 * DAY_MS));
}

// -------------------------------------------------------------------------------------------
// The metric set
// -------------------------------------------------------------------------------------------

export interface NewAsksNeeded {
  /** Exact, unrounded cents. The UI rounds. */
  readonly perWeek: number;
  readonly perDay: number;
  /** "An hour in the chair" — Robb's number-one closing technique. */
  readonly perHour: number;
}

export interface ForwardMetrics {
  readonly scope: MetricScope;
  readonly asOf: Date;
  readonly period: FiscalPeriod;
  readonly weeksLeft: number;
  readonly weekOfPeriod: number;
  readonly weeksInPeriod: number;

  readonly won: Aggregate;
  /** Pre-close AND qualified. The headline metric. */
  readonly qualifiedAsks: Aggregate;
  /** All pre-close regardless of qualification — the stage board's left half. */
  readonly preCloseTotal: Aggregate;
  /** preCloseTotal minus qualifiedAsks, with ids. The stage board needs the split. */
  readonly unqualified: Aggregate;
  /** celebrate_steward + repeat. Explicitly outside the headline number. */
  readonly closedWork: Aggregate;

  readonly goalDefined: boolean;
  readonly goalCents: number | null;
  readonly goalScope: "org" | "rep" | "initiative" | null;
  /**
   * goal - won. The denominator for coverage, NEVER the bare goal.
   *
   * First-class so the UI can show the working: `$2,700,000 GOAL - $385,200 WON = $2,314,800 BASIS`.
   * Without it a reader checking the ratio against the goal beside it gets a different answer and
   * concludes the tool is broken.
   */
  readonly basisCents: number | null;
  readonly coverageRatio: number | null;
  readonly neededAtCoverageCents: number | null;
  /** qualifiedAsks - neededAtCoverage. SIGNED: negative means short. */
  readonly coverageGapCents: number | null;
  readonly newAsksNeeded: NewAsksNeeded | null;
}

export interface ComputeMetricsInput {
  readonly snapshot: MetricsSnapshot;
  readonly scope: MetricScope;
  readonly settings: ForwardSettings;
  readonly clock: Clock;
  readonly overrides?: MetricsOverrides;
}

export function computeMetrics(input: ComputeMetricsInput): ForwardMetrics {
  const { snapshot, scope, settings, clock, overrides } = input;
  const period = resolveFiscalPeriod(settings, scope.period);
  if (!period) {
    throw new Error(
      `computeMetrics: no fiscal period "${scope.period}" is defined in settings. ` +
        "Periods are a setting, not a constant — see FISCAL_PERIODS.",
    );
  }

  const now = clock.now();
  const opportunities = applyOverrides(snapshot.opportunities, overrides).filter((opportunity) =>
    scopeMatches(opportunity, scope),
  );

  // Won is period-bounded: it is what has closed INSIDE this fiscal period.
  const won = aggregate(
    opportunities.filter((o) => o.status === "won" && withinPeriod(o.closeDate, period)),
  );

  // The open pipeline is deliberately NOT close-date-bounded. "On the table" means currently live,
  // and an opportunity whose date slips past period end is still on the table — that slippage is
  // precisely what the movement panels are for.
  const open = opportunities.filter((o) => o.status === "open");
  const preCloseOpen = open.filter((o) => isPreCloseStage(o.stage));

  const qualifiedOpen = preCloseOpen.filter((o) => isQualified(o, snapshot.definitions));
  const unqualifiedOpen = preCloseOpen.filter((o) => !isQualified(o, snapshot.definitions));

  const preCloseTotal = aggregate(preCloseOpen);
  const qualifiedAsks = aggregate(qualifiedOpen);
  const unqualified = aggregate(unqualifiedOpen);
  const closedWork = aggregate(open.filter((o) => !isPreCloseStage(o.stage)));

  const goal = resolveGoalForScope(snapshot, scope);
  const weeksLeft = weeksLeftIn(period, now);

  let basisCents: number | null = null;
  let coverageRatio: number | null = null;
  let neededAtCoverageCents: number | null = null;
  let coverageGapCents: number | null = null;
  let newAsksNeeded: NewAsksNeeded | null = null;

  if (goal.defined && goal.amountCents !== null) {
    basisCents = goal.amountCents - won.cents;
    neededAtCoverageCents = settings.coverageMultiple * basisCents;
    coverageGapCents = qualifiedAsks.cents - neededAtCoverageCents;
    // A non-positive basis means the goal is already met; a coverage ratio against it is
    // meaningless rather than infinite, so it is absent.
    coverageRatio = basisCents > 0 ? qualifiedAsks.cents / basisCents : null;

    if (weeksLeft > 0 && coverageGapCents < 0) {
      const perWeek = Math.abs(coverageGapCents) / weeksLeft;
      const perDay = perWeek / settings.sellingDaysPerWeek;
      newAsksNeeded = {
        perWeek,
        perDay,
        perHour: perDay / settings.sellingHoursPerDay,
      };
    }
  }

  return {
    scope,
    asOf: now,
    period,
    weeksLeft,
    weekOfPeriod: weekOfPeriod(period, now),
    weeksInPeriod: weeksInPeriod(period),
    won,
    qualifiedAsks,
    preCloseTotal,
    unqualified,
    closedWork,
    goalDefined: goal.defined,
    goalCents: goal.amountCents,
    goalScope: goal.scope,
    basisCents,
    coverageRatio,
    neededAtCoverageCents,
    coverageGapCents,
    newAsksNeeded,
  };
}

// -------------------------------------------------------------------------------------------
// Per-initiative metrics (Opportunity Detail)
// -------------------------------------------------------------------------------------------

export interface InitiativeShare {
  readonly opportunityId: string;
  readonly initiativeId: string;
  /** This opportunity's share of its initiative's QUALIFIED asks, 0..1. Null when the initiative has none. */
  readonly share: number | null;
  readonly initiativeQualifiedCents: number;
  readonly opportunityCents: number;
  readonly isLargest: boolean;
  /**
   * False when this opportunity is not itself qualified — it then contributes nothing to the
   * initiative's qualified asks, and `share` is 0 rather than its raw amount over the total.
   */
  readonly counted: boolean;
}

export function initiativeShare(
  snapshot: MetricsSnapshot,
  opportunityId: string,
  settings: ForwardSettings,
  clock: Clock,
): InitiativeShare | undefined {
  const opportunity = snapshot.opportunities.find((o) => o.id === opportunityId);
  if (!opportunity) return undefined;

  const metrics = computeMetrics({
    snapshot,
    scope: { rep: "all", initiative: opportunity.initiativeId, period: "FY26" },
    settings,
    clock,
  });

  const counted = metrics.qualifiedAsks.opportunityIds.includes(opportunityId);
  const qualifiedCents = metrics.qualifiedAsks.cents;
  const contributions = metrics.qualifiedAsks.opportunityIds.map(
    (id) => snapshot.opportunities.find((o) => o.id === id)?.amountCents ?? 0,
  );
  const largest = contributions.length > 0 ? Math.max(...contributions) : 0;

  return {
    opportunityId,
    initiativeId: opportunity.initiativeId,
    share: qualifiedCents > 0 ? (counted ? opportunity.amountCents / qualifiedCents : 0) : null,
    initiativeQualifiedCents: qualifiedCents,
    opportunityCents: opportunity.amountCents,
    isLargest: counted && opportunity.amountCents === largest,
    counted,
  };
}

export interface CoverageWithout {
  readonly opportunityId: string;
  readonly initiativeId: string;
  readonly coverageRatio: number | null;
  readonly coverageRatioWithout: number | null;
  /** Null when either ratio is absent (no goal, or non-positive basis). */
  readonly delta: number | null;
}

/**
 * The initiative's coverage recomputed without this opportunity —
 * "Lose this one and Kamuli drops from 1.4x to 0.9x coverage".
 *
 * Note: excluding an UNQUALIFIED opportunity changes nothing, because it was never in the numerator.
 * That is correct under milestone-derived qualification, and it is worth knowing before writing that
 * sentence about an unqualified ask.
 */
export function coverageWithout(
  snapshot: MetricsSnapshot,
  opportunityId: string,
  settings: ForwardSettings,
  clock: Clock,
): CoverageWithout | undefined {
  const opportunity = snapshot.opportunities.find((o) => o.id === opportunityId);
  if (!opportunity) return undefined;

  const scope: MetricScope = {
    rep: "all",
    initiative: opportunity.initiativeId,
    period: "FY26",
  };
  const withIt = computeMetrics({ snapshot, scope, settings, clock });
  const withoutIt = computeMetrics({
    snapshot,
    scope,
    settings,
    clock,
    overrides: { excludeOpportunityIds: [opportunityId] },
  });

  const delta =
    withIt.coverageRatio !== null && withoutIt.coverageRatio !== null
      ? withoutIt.coverageRatio - withIt.coverageRatio
      : null;

  return {
    opportunityId,
    initiativeId: opportunity.initiativeId,
    coverageRatio: withIt.coverageRatio,
    coverageRatioWithout: withoutIt.coverageRatio,
    delta,
  };
}

// -------------------------------------------------------------------------------------------
// What-if — the entry point I20 and I23 need
// -------------------------------------------------------------------------------------------

export interface WhatIfResult {
  readonly before: ForwardMetrics;
  readonly after: ForwardMetrics;
  /** after - before, on the headline metric. Negative means the hypothesis reduces the number. */
  readonly qualifiedAsksDeltaCents: number;
  readonly preCloseDeltaCents: number;
  readonly coverageGapDeltaCents: number | null;
}

/**
 * Evaluate a hypothesis against the ACTUAL numbers.
 *
 * I20 quantifies each consistency finding this way ("INFLATES ASKS ON THE TABLE BY $25,000",
 * "DISTORTS BEST/WORST BY $60,000") and I23 ranks by impact on qualified asks. Both are a pure
 * recompute over an already-loaded snapshot — O(n) per hypothesis with no database access — so
 * evaluating a hypothesis per opportunity across the portfolio is cheap.
 */
export function evaluateWhatIf(
  input: ComputeMetricsInput & { readonly overrides: MetricsOverrides },
): WhatIfResult {
  const before = computeMetrics({ ...input, overrides: undefined });
  const after = computeMetrics(input);

  return {
    before,
    after,
    qualifiedAsksDeltaCents: after.qualifiedAsks.cents - before.qualifiedAsks.cents,
    preCloseDeltaCents: after.preCloseTotal.cents - before.preCloseTotal.cents,
    coverageGapDeltaCents:
      after.coverageGapCents !== null && before.coverageGapCents !== null
        ? after.coverageGapCents - before.coverageGapCents
        : null,
  };
}

export { EMPTY_AGGREGATE };

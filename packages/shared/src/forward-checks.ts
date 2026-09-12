// 95 Forward — forecast consistency checks (Initiative 20).
//
// "Fix first" sits above all relationship work on The Board because bad data undermines every other
// number: a coverage ratio computed over self-contradicting records is a confident-looking lie.
//
// THE BOUNDARY THAT PROTECTS THIS FEATURE. A finding is a record CONTRADICTING ITSELF. It is not
// bad news and it is not a coaching opportunity. The test each check must pass:
//
//     Could a reasonable rep look at this record and say "yes, that's correct as it stands"?
//
// If yes, it is not a finding. One false positive in a three-item list that claims to be the most
// important thing on the screen teaches the user to skip the block permanently — so prefer missing
// a real contradiction to inventing a false one. Where a check below is deliberately narrowed, the
// comment says which false positive the narrowing avoids.
//
// Every finding states what it costs, computed against the ACTUAL portfolio via I19's whatIf.
// Never a generic warning, never a hardcoded figure — that is what turns a chore into an obviously
// worthwhile thirty seconds.

import {
  computeQualification,
  isPreCloseStage,
  probabilityBandRank,
  suggestProbabilityBand,
  type MilestoneDefinition,
  type ProbabilityBand,
  type QualificationResult,
} from "./forward";
import type { ForwardSettings } from "./forward-settings";
import { type Clock } from "./forward-settings";
import {
  evaluateWhatIf,
  scopeMatches,
  type MetricScope,
  type MetricsOverrides,
  type MetricsSnapshot,
  type SnapshotOpportunity,
} from "./forward-metrics";

// -------------------------------------------------------------------------------------------
// Shapes
// -------------------------------------------------------------------------------------------

export type ConsequenceKind =
  /** The record contributes nothing as it stands; the cents are what it WOULD contribute. */
  | "excluded-from-forecast"
  /** The record is counted but should not be; the cents are the inflation. */
  | "inflates-asks"
  /** The amount is real but its timing is not; needs the simulation (I21) to size properly. */
  | "distorts-simulation";

export interface Consequence {
  readonly kind: ConsequenceKind;
  /** Exact cents. Null only when no evaluator could size it. */
  readonly cents: number | null;
  /** Plain statement of the cost. The UI styles it; it does not compose it. */
  readonly text: string;
  /**
   * True when this is the honest metric-backed stand-in for a consequence that wants the Monte
   * Carlo. I21 registers a simulation-backed evaluator and the same finding upgrades in place.
   */
  readonly provisional: boolean;
}

export type ResolutionKind =
  | "confirm-milestone"
  | "re-date-or-close"
  | "attach-or-uncheck"
  | "record-ask"
  | "set-field"
  | "reconcile-status"
  | "review-likelihood";

/**
 * Structured so I25 can render a real control rather than parse a string. I20 defines the contract;
 * the wiring is I25/I26.
 */
export interface ResolutionAction {
  readonly kind: ResolutionKind;
  readonly label: string;
  readonly targetField?: string;
  readonly targetMilestone?: string;
}

export interface Finding {
  /** Stable. Becomes the clickable `RULE · …` chip and is referenced by I22. Changing one is breaking. */
  readonly ruleId: string;
  readonly opportunityId: string;
  readonly prospectId: string;
  readonly initiativeId: string;
  readonly amountCents: number;
  readonly statement: string;
  readonly consequence: Consequence;
  readonly effortSeconds: number;
  readonly resolution: ResolutionAction;
}

export interface CheckResult {
  readonly findings: readonly Finding[];
  readonly count: number;
  /** Summed effort. The UI phrases it ("under three minutes"); the engine returns seconds. */
  readonly totalEffortSeconds: number;
}

// -------------------------------------------------------------------------------------------
// Check definitions
// -------------------------------------------------------------------------------------------

export interface CheckContext {
  readonly opportunity: SnapshotOpportunity;
  readonly snapshot: MetricsSnapshot;
  readonly scope: MetricScope;
  readonly settings: ForwardSettings;
  readonly now: Date;
  readonly definitions: readonly MilestoneDefinition[];
  readonly qualification: QualificationResult;
  readonly suggestedProbability: ProbabilityBand;
  readonly today: string;
}

export interface CheckDefinition {
  readonly id: string;
  readonly consequenceKind: ConsequenceKind;
  /** Does this record contradict itself in this specific way? */
  applies(ctx: CheckContext): boolean;
  statement(ctx: CheckContext): string;
  resolution(ctx: CheckContext): ResolutionAction;
  /**
   * The what-if that expresses the contradiction's cost.
   *
   * For `excluded-from-forecast` it describes the record CORRECTED (delta is upside being left on
   * the table). For `inflates-asks` it describes the unsupported claim REMOVED (delta is the
   * inflation). For `distorts-simulation` it removes the record whose timing is unusable.
   */
  hypothesis(ctx: CheckContext): MetricsOverrides;
}

function confirmed(ctx: CheckContext, key: string): boolean {
  return ctx.opportunity.confirmedMilestoneKeys.includes(key);
}

function blockingKeys(ctx: CheckContext): string[] {
  return ctx.definitions.filter((d) => d.blocking).map((d) => d.key);
}

function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ");
}

export const CHECK_DEFINITIONS: readonly CheckDefinition[] = [
  // 1 --------------------------------------------------------------------------------------
  {
    id: "amount-agreed-no-confirmed-date",
    consequenceKind: "excluded-from-forecast",
    applies: (ctx) => confirmed(ctx, "amount_agreed") && !confirmed(ctx, "close_date_confirmed"),
    statement: () => "Amount agreed, but no close date confirmed by the prospect.",
    resolution: () => ({
      kind: "confirm-milestone",
      label: "Confirm close date",
      targetMilestone: "close_date_confirmed",
    }),
    // Corrected = every blocking milestone confirmed, so the ask becomes real.
    hypothesis: (ctx) => ({
      milestonePatches: { [ctx.opportunity.id]: blockingKeys(ctx) },
    }),
  },

  // 2 --------------------------------------------------------------------------------------
  {
    id: "close-date-past-stage-open",
    consequenceKind: "distorts-simulation",
    applies: (ctx) =>
      ctx.opportunity.closeDate !== null &&
      ctx.opportunity.closeDate < ctx.today &&
      isPreCloseStage(ctx.opportunity.stage),
    statement: (ctx) =>
      `Close date ${ctx.opportunity.closeDate} is in the past while the stage still reads ${stageLabel(ctx.opportunity.stage)}.`,
    resolution: () => ({
      kind: "re-date-or-close",
      label: "Re-date or close out",
      targetField: "closeDate",
    }),
    hypothesis: (ctx) => ({ excludeOpportunityIds: [ctx.opportunity.id] }),
  },

  // 3 --------------------------------------------------------------------------------------
  {
    id: "written-confirmation-no-evidence",
    consequenceKind: "inflates-asks",
    applies: (ctx) => {
      if (!confirmed(ctx, "confirmed_in_writing")) return false;
      // Narrowed to PRE-CLOSE. The contradiction is "counting as qualified on our word alone",
      // which presupposes it is being counted — closed work is outside the headline number, so the
      // same missing document there costs nothing and is a records gap, not a contradiction.
      // The engine proves it: on a stewarding record this check's consequence computes to $0, and a
      // zero-cost finding is exactly the nag that teaches users to skip the block.
      if (!isPreCloseStage(ctx.opportunity.stage)) return false;
      const evidence = ctx.opportunity.milestoneEvidence["confirmed_in_writing"];
      // "In writing" with no document is the contradiction. Evidence TEXT is a note about the
      // claim, not the writing itself — the whole point of the milestone is the artefact.
      return !evidence?.documentUrl;
    },
    statement: () =>
      "Marked confirmed in writing with no document attached — counting as qualified on our word alone.",
    resolution: () => ({
      kind: "attach-or-uncheck",
      label: "Attach or uncheck",
      targetMilestone: "confirmed_in_writing",
    }),
    // Remove the unsupported claim: whatever the number drops by is what it was inflating.
    hypothesis: (ctx) => ({
      milestonePatches: {
        [ctx.opportunity.id]: ctx.opportunity.confirmedMilestoneKeys.filter(
          (key) => key !== "confirmed_in_writing",
        ),
      },
    }),
  },

  // 4 --------------------------------------------------------------------------------------
  {
    id: "probability-below-evidence",
    consequenceKind: "excluded-from-forecast",
    applies: (ctx) => {
      // Narrowed deliberately: only a QUALIFIED opportunity reading below the floor. Holding at
      // "high" rather than "lock" is a defensible judgement and must not fire; reading "medium"
      // when the prospect has confirmed everything in writing is not.
      if (!ctx.qualification.qualified) return false;
      const floor = ctx.settings.checks.probabilityEvidenceFloor as ProbabilityBand;
      return probabilityBandRank(ctx.opportunity.probability) < probabilityBandRank(floor);
    },
    statement: (ctx) =>
      `Every blocking milestone is confirmed, but the likelihood still reads ${ctx.opportunity.probability}.`,
    resolution: () => ({
      kind: "review-likelihood",
      label: "Review the likelihood",
      targetField: "probability",
    }),
    // The record is already counted, so nothing moves in the metric set; the consequence evaluator
    // reports the amount whose forecast weighting is understated.
    hypothesis: (ctx) => ({ excludeOpportunityIds: [ctx.opportunity.id] }),
  },

  // 5 --------------------------------------------------------------------------------------
  {
    id: "probability-above-visit-rating",
    consequenceKind: "distorts-simulation",
    applies: (ctx) => {
      const rating = ctx.opportunity.visitRating;
      if (!rating) return false;
      if (!ctx.settings.checks.concerningVisitRatings.includes(rating)) return false;
      const ceiling = ctx.settings.checks.probabilityOptimismCeiling as ProbabilityBand;
      return probabilityBandRank(ctx.opportunity.probability) >= probabilityBandRank(ceiling);
    },
    statement: (ctx) =>
      `Likelihood reads ${ctx.opportunity.probability}, but the visit rating was ${ctx.opportunity.visitRating}.`,
    resolution: () => ({
      kind: "review-likelihood",
      label: "Review the likelihood",
      targetField: "probability",
    }),
    hypothesis: (ctx) => ({ excludeOpportunityIds: [ctx.opportunity.id] }),
  },

  // 6 --------------------------------------------------------------------------------------
  {
    id: "amount-agreed-no-ask-made",
    consequenceKind: "inflates-asks",
    applies: (ctx) => confirmed(ctx, "amount_agreed") && !confirmed(ctx, "specific_ask_made"),
    statement: () => "The prospect agreed an amount we have no record of asking for.",
    resolution: () => ({
      kind: "record-ask",
      label: "Record the ask",
      targetMilestone: "specific_ask_made",
    }),
    hypothesis: (ctx) => ({
      milestonePatches: {
        [ctx.opportunity.id]: ctx.opportunity.confirmedMilestoneKeys.filter(
          (key) => key !== "amount_agreed",
        ),
      },
    }),
  },

  // 7 --------------------------------------------------------------------------------------
  {
    id: "missing-forecast-inputs",
    consequenceKind: "excluded-from-forecast",
    applies: (ctx) => {
      // Gated on stage. A prospect you have not asked yet legitimately has no close date, and
      // flagging that would be exactly the false positive that kills the block's credibility.
      if (!ctx.settings.checks.forecastInputRequiredStages.includes(ctx.opportunity.stage)) {
        return false;
      }
      return ctx.opportunity.amountCents <= 0 || ctx.opportunity.closeDate === null;
    },
    statement: (ctx) => {
      const missing: string[] = [];
      if (ctx.opportunity.amountCents <= 0) missing.push("Amount");
      if (ctx.opportunity.closeDate === null) missing.push("Close date");
      return `${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} blank — this opportunity cannot be forecast.`;
    },
    resolution: (ctx) => ({
      kind: "set-field",
      label: ctx.opportunity.closeDate === null ? "Set a close date" : "Set the amount",
      targetField: ctx.opportunity.closeDate === null ? "closeDate" : "amountCents",
    }),
    hypothesis: (ctx) => ({
      milestonePatches: { [ctx.opportunity.id]: blockingKeys(ctx) },
    }),
  },

  // 8 --------------------------------------------------------------------------------------
  {
    id: "status-stage-disagreement",
    consequenceKind: "inflates-asks",
    applies: (ctx) => {
      // Only the unambiguous direction: a WON or LOST record sitting in a pre-close stage.
      //
      // The mirror case — status open in a closed-work stage — is NOT flagged, because it is a
      // legitimate modelled state: I19 counts exactly that as "closed work right of the divider",
      // work past the ask whose gift has not landed yet. Flagging it would contradict the model.
      if (ctx.opportunity.status === "open") return false;
      return isPreCloseStage(ctx.opportunity.stage);
    },
    statement: (ctx) =>
      `Status reads ${ctx.opportunity.status} while the stage reads ${stageLabel(ctx.opportunity.stage)}.`,
    resolution: () => ({
      kind: "reconcile-status",
      label: "Reconcile status and stage",
      targetField: "status",
    }),
    hypothesis: (ctx) => ({ excludeOpportunityIds: [ctx.opportunity.id] }),
  },
];

// -------------------------------------------------------------------------------------------
// Consequence evaluators — pluggable so I21 can upgrade without touching a check definition
// -------------------------------------------------------------------------------------------

export interface ConsequenceEvaluatorInput {
  readonly check: CheckDefinition;
  readonly ctx: CheckContext;
  readonly clock: Clock;
}

export interface ConsequenceEvaluator {
  readonly kind: ConsequenceKind;
  evaluate(input: ConsequenceEvaluatorInput): Consequence;
}

function runHypothesis(input: ConsequenceEvaluatorInput) {
  const { check, ctx, clock } = input;
  return evaluateWhatIf({
    snapshot: ctx.snapshot,
    scope: ctx.scope,
    settings: ctx.settings,
    clock,
    overrides: check.hypothesis(ctx),
  });
}

const excludedEvaluator: ConsequenceEvaluator = {
  kind: "excluded-from-forecast",
  evaluate: (input) => {
    // The hypothesis is the record CORRECTED, so a positive delta is the upside being left out.
    const delta = runHypothesis(input).qualifiedAsksDeltaCents;
    const cents = Math.max(0, delta);
    return {
      kind: "excluded-from-forecast",
      cents,
      text:
        cents > 0
          ? `Excluded from the forecast — worth ${formatCentsPlain(cents)} once corrected.`
          : "Excluded from the forecast.",
      provisional: false,
    };
  },
};

const inflatesEvaluator: ConsequenceEvaluator = {
  kind: "inflates-asks",
  evaluate: (input) => {
    // The hypothesis removes the unsupported claim, so the drop is the inflation.
    const delta = runHypothesis(input).qualifiedAsksDeltaCents;
    const cents = Math.max(0, -delta);
    return {
      kind: "inflates-asks",
      cents,
      text:
        cents > 0
          ? `Inflates asks on the table by ${formatCentsPlain(cents)}.`
          : "Counted on an unsupported claim.",
      provisional: false,
    };
  },
};

/**
 * The honest stand-in until I21 exists.
 *
 * It does NOT fabricate a best/worst spread. It states the thing it can actually know: the amount
 * being forecast on timing we already know is wrong. When I21 registers a simulation-backed
 * evaluator for this kind, the same finding upgrades to "DISTORTS BEST/WORST BY $X" with no change
 * to the check definition.
 */
const distortsFallbackEvaluator: ConsequenceEvaluator = {
  kind: "distorts-simulation",
  evaluate: (input) => {
    const cents = input.ctx.opportunity.amountCents;
    return {
      kind: "distorts-simulation",
      cents,
      text: `${formatCentsPlain(cents)} is forecast on a close date we know is wrong.`,
      provisional: true,
    };
  },
};

export const DEFAULT_EVALUATORS: readonly ConsequenceEvaluator[] = [
  excludedEvaluator,
  inflatesEvaluator,
  distortsFallbackEvaluator,
];

/** Whole dollars, no separators — the engine does not format, this is only for the plain text. */
function formatCentsPlain(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

// -------------------------------------------------------------------------------------------
// The engine
// -------------------------------------------------------------------------------------------

export interface CheckScopeInput {
  readonly snapshot: MetricsSnapshot;
  readonly scope: MetricScope;
  readonly settings: ForwardSettings;
  readonly clock: Clock;
  /** Override or extend the defaults. I21 passes its simulation-backed evaluator here. */
  readonly evaluators?: readonly ConsequenceEvaluator[];
  readonly checks?: readonly CheckDefinition[];
}

export function checkScope(input: CheckScopeInput): CheckResult {
  const { snapshot, scope, settings, clock } = input;
  const checks = input.checks ?? CHECK_DEFINITIONS;
  const now = clock.now();
  const today = now.toISOString().slice(0, 10);

  // Later registrations win, so I21 can replace the fallback by appending one evaluator.
  const evaluators = new Map<ConsequenceKind, ConsequenceEvaluator>();
  for (const evaluator of [...DEFAULT_EVALUATORS, ...(input.evaluators ?? [])]) {
    evaluators.set(evaluator.kind, evaluator);
  }

  const findings: Finding[] = [];

  for (const opportunity of snapshot.opportunities) {
    // Findings apply to OPEN opportunities only — won and lost records are history. The one
    // exception is status-stage-disagreement, whose whole subject is a closed record in the wrong
    // stage, so it opts back in below.
    if (!scopeMatches(opportunity, scope)) continue;

    const ctx: CheckContext = {
      opportunity,
      snapshot,
      scope,
      settings,
      now,
      today,
      definitions: snapshot.definitions,
      qualification: computeQualification(
        snapshot.definitions,
        opportunity.confirmedMilestoneKeys,
      ),
      suggestedProbability: suggestProbabilityBand(
        snapshot.definitions,
        opportunity.confirmedMilestoneKeys,
      ),
    };

    for (const check of checks) {
      const closedRecord = opportunity.status !== "open";
      if (closedRecord && check.id !== "status-stage-disagreement") continue;
      if (!check.applies(ctx)) continue;

      const evaluator = evaluators.get(check.consequenceKind);
      const consequence: Consequence = evaluator
        ? evaluator.evaluate({ check, ctx, clock })
        : { kind: check.consequenceKind, cents: null, text: "Contradiction detected.", provisional: true };

      findings.push({
        ruleId: check.id,
        opportunityId: opportunity.id,
        prospectId: opportunity.prospectId,
        initiativeId: opportunity.initiativeId,
        amountCents: opportunity.amountCents,
        statement: check.statement(ctx),
        consequence,
        effortSeconds: settings.checks.effortSeconds[check.id] ?? 60,
        resolution: check.resolution(ctx),
      });
    }
  }

  // Consequence magnitude descending, then effort ascending so quick wins come first.
  findings.sort((a, b) => {
    const byCents = (b.consequence.cents ?? 0) - (a.consequence.cents ?? 0);
    if (byCents !== 0) return byCents;
    const byEffort = a.effortSeconds - b.effortSeconds;
    if (byEffort !== 0) return byEffort;
    return a.ruleId.localeCompare(b.ruleId);
  });

  return {
    findings,
    count: findings.length,
    totalEffortSeconds: findings.reduce((sum, f) => sum + f.effortSeconds, 0),
  };
}

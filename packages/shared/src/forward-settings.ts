// 95 Forward — the settings behind every derived number (Initiative 19).
//
// Every constant that would otherwise be hardcoded at a call site lives here, with a named key and
// a documented meaning. This module is deliberately shaped so I22 (the Rules of Robb layer) can
// absorb it with minimal churn: the descriptors below carry everything an editor needs to render
// and validate a setting, and `DEFAULT_FORWARD_SETTINGS` is only the fallback for a tenant that has
// not authored its own.
//
// The chip on The Board reads `3× IS THE RULE` because somebody authored that rule — not because
// it is compiled in. Keep it that way: never inline these numbers.

export type SettingUnit =
  | "multiple"
  | "days"
  | "hours"
  | "weeks"
  | "date-range"
  | "seconds"
  | "band"
  | "enum-list"
  | "count"
  | "percentile"
  | "fraction";

export interface SettingDescriptor<TValue> {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly unit: SettingUnit;
  readonly defaultValue: TValue;
  /**
   * False for options that are documented but deliberately NOT wired up yet. I22 can surface them
   * as "available", and nothing computes with them until it does.
   */
  readonly implemented: boolean;
}

/** A fiscal period, resolved to concrete calendar bounds. `end` is inclusive. */
export interface FiscalPeriod {
  readonly key: string;
  readonly label: string;
  /** ISO `YYYY-MM-DD`. */
  readonly start: string;
  /** ISO `YYYY-MM-DD`, inclusive. */
  readonly end: string;
}

export interface ForwardSettings {
  /** The coverage rule: how many times the remaining basis must be on the table. */
  readonly coverageMultiple: number;
  /** Selling days in a week — the divisor turning a weekly gap into a daily one. */
  readonly sellingDaysPerWeek: number;
  /** Selling hours in a day — the divisor behind "an hour in the chair". */
  readonly sellingHoursPerDay: number;
  readonly fiscalPeriods: readonly FiscalPeriod[];
  /** Thresholds and effort estimates for the consistency checks (I20). */
  readonly checks: CheckSettings;
  /** Monte Carlo forecast parameters (I21). */
  readonly simulation: SimulationSettings;
  /**
   * DOCUMENTED, NOT IMPLEMENTED. See ASK_MATURATION_WEEKS below.
   * Leave undefined; nothing reads it.
   */
  readonly askMaturationWeeks?: number;
}

// -------------------------------------------------------------------------------------------
// Consistency checks (I20)
// -------------------------------------------------------------------------------------------

export interface CheckSettings {
  /** Seconds to resolve, per check id. Constants, never computed — they sum into "three minutes". */
  readonly effortSeconds: Readonly<Record<string, number>>;
  /**
   * A QUALIFIED opportunity reading below this band is a contradiction, not a judgement.
   * Set at "high": every blocking milestone confirmed while the rep still reads "medium" or
   * "longshot" is indefensible, but holding at "high" rather than "lock" is a defensible call and
   * must not fire. This is the Rules of Robb row "amount agreed and confirmed in writing, but
   * probability still reads Medium".
   */
  readonly probabilityEvidenceFloor: string;
  /** Visit ratings that contradict an optimistic band. */
  readonly concerningVisitRatings: readonly string[];
  /** Bands at or above which a concerning visit rating is a contradiction. */
  readonly probabilityOptimismCeiling: string;
  /**
   * Stages at which missing forecast inputs are a contradiction rather than a normal early state.
   * A prospect you have not asked yet legitimately has no close date — flagging that would be the
   * false positive that teaches users to skip the whole block.
   */
  readonly forecastInputRequiredStages: readonly string[];
}

export const CHECK_EFFORT_SECONDS: SettingDescriptor<Readonly<Record<string, number>>> = {
  key: "checks.effortSeconds",
  label: "Effort to resolve, per check",
  description:
    "How long each contradiction takes to clear. Summed across the findings to make the 'clear " +
    "them in under three minutes' claim, so these are a promise to the user — keep them honest.",
  unit: "seconds",
  defaultValue: {
    "amount-agreed-no-confirmed-date": 30,
    "close-date-past-stage-open": 60,
    "written-confirmation-no-evidence": 60,
    "probability-below-evidence": 30,
    "probability-above-visit-rating": 30,
    "amount-agreed-no-ask-made": 30,
    "missing-forecast-inputs": 30,
    "status-stage-disagreement": 60,
  },
  implemented: true,
};

export const PROBABILITY_EVIDENCE_FLOOR: SettingDescriptor<string> = {
  key: "checks.probabilityEvidenceFloor",
  label: "Minimum band for a qualified ask",
  description:
    "A qualified opportunity reading below this band contradicts its own evidence. 'high' lets a " +
    "rep hold short of 'lock' without being nagged.",
  unit: "band",
  defaultValue: "high",
  implemented: true,
};

export const CONCERNING_VISIT_RATINGS: SettingDescriptor<readonly string[]> = {
  key: "checks.concerningVisitRatings",
  label: "Visit ratings that undercut optimism",
  description: "A visit rated this badly contradicts a confident likelihood band.",
  unit: "enum-list",
  defaultValue: ["poor"],
  implemented: true,
};

export const PROBABILITY_OPTIMISM_CEILING: SettingDescriptor<string> = {
  key: "checks.probabilityOptimismCeiling",
  label: "Band that a poor visit contradicts",
  description:
    "At or above this band, a concerning visit rating is a contradiction rather than a judgement.",
  unit: "band",
  defaultValue: "high",
  implemented: true,
};

export const FORECAST_INPUT_REQUIRED_STAGES: SettingDescriptor<readonly string[]> = {
  key: "checks.forecastInputRequiredStages",
  label: "Stages that require forecast inputs",
  description:
    "Stages by which an opportunity must have an amount and a close date. Deliberately excludes " +
    "the early stages: a prospect you have not asked yet has no date to give, and flagging that " +
    "would be a false positive.",
  unit: "enum-list",
  defaultValue: ["visit_and_ask", "follow_up_and_close"],
  implemented: true,
};

export const DEFAULT_CHECK_SETTINGS: CheckSettings = {
  effortSeconds: CHECK_EFFORT_SECONDS.defaultValue,
  probabilityEvidenceFloor: PROBABILITY_EVIDENCE_FLOOR.defaultValue,
  concerningVisitRatings: CONCERNING_VISIT_RATINGS.defaultValue,
  probabilityOptimismCeiling: PROBABILITY_OPTIMISM_CEILING.defaultValue,
  forecastInputRequiredStages: FORECAST_INPUT_REQUIRED_STAGES.defaultValue,
};

// -------------------------------------------------------------------------------------------
// Monte Carlo forecast (I21)
// -------------------------------------------------------------------------------------------

export interface SimulationPercentiles {
  /** Deliberately asymmetric — 90/50/5, from the source model. Not a typo for 95. */
  readonly best: number;
  readonly mostLikely: number;
  readonly worst: number;
}

export interface SimulationSettings {
  readonly trialCount: number;
  readonly percentiles: SimulationPercentiles;
  /** Fraction of trials taken as the neighbourhood around each percentile for membership. */
  readonly membershipNeighbourhoodFraction: number;
  /** Inclusion rate at or above which an opportunity counts as "in" a scenario. */
  readonly membershipThreshold: number;
  /** Reduced trial count for I20 consequence estimates — they run once per finding. */
  readonly consequenceTrialCount: number;
  /** The +/- day band each date-confidence value maps to. */
  readonly dateConfidenceDays: Readonly<Record<string, number>>;
  /** Probability band -> percentage. The rep's judgement, drawn against per trial. */
  readonly probabilityPct: Readonly<Record<string, number>>;
}

export const TRIAL_COUNT: SettingDescriptor<number> = {
  key: "simulation.trialCount",
  label: "Simulated years",
  description:
    "Trials per run. The chart subtitle states this number ('10,000 simulated years'), so it must " +
    "be read from here rather than hardcoded in the UI.",
  unit: "count",
  defaultValue: 10_000,
  implemented: true,
};

export const SIMULATION_PERCENTILES: SettingDescriptor<SimulationPercentiles> = {
  key: "simulation.percentiles",
  label: "Best / Most likely / Worst percentiles",
  description:
    "Read per month across trials. The asymmetry (90/50/5) is intentional and comes from the " +
    "source model: the downside is cut further out than the upside.",
  unit: "percentile",
  defaultValue: { best: 90, mostLikely: 50, worst: 5 },
  implemented: true,
};

export const MEMBERSHIP_NEIGHBOURHOOD_FRACTION: SettingDescriptor<number> = {
  key: "simulation.membershipNeighbourhoodFraction",
  label: "Scenario neighbourhood size",
  description:
    "Fraction of trials taken as the neighbourhood around each percentile when deciding scenario " +
    "membership. Nearest-k rather than a fixed window so the set is never empty.",
  unit: "fraction",
  defaultValue: 0.05,
  implemented: true,
};

export const MEMBERSHIP_THRESHOLD: SettingDescriptor<number> = {
  key: "simulation.membershipThreshold",
  label: "Scenario inclusion threshold",
  description:
    "An opportunity is 'in' a scenario when it closed within the period in at least this fraction " +
    "of that scenario's neighbourhood trials.",
  unit: "fraction",
  defaultValue: 0.5,
  implemented: true,
};

export const CONSEQUENCE_TRIAL_COUNT: SettingDescriptor<number> = {
  key: "simulation.consequenceTrialCount",
  label: "Trials for consistency-check consequences",
  description:
    "Reduced trial count for I20's distorts-simulation consequences. These are estimates and run " +
    "once per finding, so full fidelity is not worth the time.",
  unit: "count",
  defaultValue: 2_000,
  implemented: true,
};

export const DATE_CONFIDENCE_DAYS: SettingDescriptor<Readonly<Record<string, number>>> = {
  key: "simulation.dateConfidenceDays",
  label: "Date confidence bands",
  description:
    "The +/- days each date-confidence value varies by in a trial. Semi-firm is ~21 days, per the " +
    "source spreadsheet. Moved here from the model in I21 — the model stores the enum, the rules " +
    "layer owns what it means.",
  unit: "days",
  defaultValue: { firm: 7, semi_firm: 21, loose: 60 },
  implemented: true,
};

export const PROBABILITY_PCT: SettingDescriptor<Readonly<Record<string, number>>> = {
  key: "simulation.probabilityPct",
  label: "Probability band percentages",
  description:
    "The chance each band represents. Used ONLY as the per-trial draw threshold — never as a " +
    "multiplier. A 50% chance of $1M books $1M or nothing, never $500,000.",
  unit: "percentile",
  defaultValue: { longshot: 10, medium: 40, high: 65, bookable: 85, lock: 95 },
  implemented: true,
};

export const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
  trialCount: TRIAL_COUNT.defaultValue,
  percentiles: SIMULATION_PERCENTILES.defaultValue,
  membershipNeighbourhoodFraction: MEMBERSHIP_NEIGHBOURHOOD_FRACTION.defaultValue,
  membershipThreshold: MEMBERSHIP_THRESHOLD.defaultValue,
  consequenceTrialCount: CONSEQUENCE_TRIAL_COUNT.defaultValue,
  dateConfidenceDays: DATE_CONFIDENCE_DAYS.defaultValue,
  probabilityPct: PROBABILITY_PCT.defaultValue,
};

export const COVERAGE_MULTIPLE: SettingDescriptor<number> = {
  key: "coverageMultiple",
  label: "Coverage multiple",
  description:
    "How many times the remaining basis (goal minus won) must sit on the table as qualified asks. " +
    "Robb's rule is 3x: a third of qualified asks is what actually closes.",
  unit: "multiple",
  defaultValue: 3,
  implemented: true,
};

export const SELLING_DAYS_PER_WEEK: SettingDescriptor<number> = {
  key: "sellingDaysPerWeek",
  label: "Selling days per week",
  description:
    "Days per week a gift officer is actually in front of donors. Divides the weekly new-ask " +
    "requirement into a daily one.",
  unit: "days",
  defaultValue: 5,
  implemented: true,
};

export const SELLING_HOURS_PER_DAY: SettingDescriptor<number> = {
  key: "sellingHoursPerDay",
  label: "Selling hours per day",
  description:
    "Hours per selling day spent in the chair. Produces the 'an hour in the chair' figure, which " +
    "reframes the coverage gap as something a person does on a Tuesday.",
  unit: "hours",
  defaultValue: 4,
  implemented: true,
};

/**
 * DOCUMENTED FUTURE OPTION — deliberately not implemented.
 *
 * `weeksLeft` currently counts whole weeks to the end of the fiscal period. A more methodologically
 * honest variant is "weeks until the last close date a NEW ask could still reach", i.e. period end
 * minus an ask-maturation period: asking for money in the final fortnight of the year will not land
 * inside it, so counting those weeks flatters the daily requirement.
 *
 * Better coaching, but it needs a maturation constant that nobody has authored yet. I22 owns that
 * decision. Until then nothing reads this and `weeksLeft` ignores it.
 */
export const ASK_MATURATION_WEEKS: SettingDescriptor<number> = {
  key: "askMaturationWeeks",
  label: "Ask maturation period",
  description:
    "Weeks between making an ask and the earliest realistic close. When implemented, weeksLeft " +
    "becomes (period end - today - maturation) so the new-ask requirement reflects asks that can " +
    "still land inside the period. NOT YET IMPLEMENTED — no value is authored and nothing reads it.",
  unit: "weeks",
  defaultValue: 6,
  implemented: false,
};

/**
 * FY26 is the 2026 calendar year, matching the seeded initiative timelines
 * (`timeline_start` 2026-01-01 / `timeline_end` 2026-12-31).
 */
export const FY26: FiscalPeriod = {
  key: "FY26",
  label: "FY26",
  start: "2026-01-01",
  end: "2026-12-31",
};

export const FISCAL_PERIODS: SettingDescriptor<readonly FiscalPeriod[]> = {
  key: "fiscalPeriods",
  label: "Fiscal periods",
  description:
    "The periods goals are scoped to. A period's end date is what weeksLeft counts down to, so " +
    "this is not merely a label — changing it changes the new-ask requirement.",
  unit: "date-range",
  defaultValue: [FY26],
  implemented: true,
};

/** Everything I22 needs to enumerate, render and validate the settings. */
export const FORWARD_SETTING_DESCRIPTORS = [
  COVERAGE_MULTIPLE,
  SELLING_DAYS_PER_WEEK,
  SELLING_HOURS_PER_DAY,
  FISCAL_PERIODS,
  ASK_MATURATION_WEEKS,
  CHECK_EFFORT_SECONDS,
  PROBABILITY_EVIDENCE_FLOOR,
  CONCERNING_VISIT_RATINGS,
  PROBABILITY_OPTIMISM_CEILING,
  FORECAST_INPUT_REQUIRED_STAGES,
  TRIAL_COUNT,
  SIMULATION_PERCENTILES,
  MEMBERSHIP_NEIGHBOURHOOD_FRACTION,
  MEMBERSHIP_THRESHOLD,
  CONSEQUENCE_TRIAL_COUNT,
  DATE_CONFIDENCE_DAYS,
  PROBABILITY_PCT,
] as const;

export const DEFAULT_FORWARD_SETTINGS: ForwardSettings = {
  coverageMultiple: COVERAGE_MULTIPLE.defaultValue,
  sellingDaysPerWeek: SELLING_DAYS_PER_WEEK.defaultValue,
  sellingHoursPerDay: SELLING_HOURS_PER_DAY.defaultValue,
  fiscalPeriods: FISCAL_PERIODS.defaultValue,
  checks: DEFAULT_CHECK_SETTINGS,
  simulation: DEFAULT_SIMULATION_SETTINGS,
  // askMaturationWeeks intentionally omitted — see ASK_MATURATION_WEEKS.
};

export function resolveFiscalPeriod(
  settings: ForwardSettings,
  key: string,
): FiscalPeriod | undefined {
  return settings.fiscalPeriods.find((period) => period.key === key);
}

// -------------------------------------------------------------------------------------------
// Clock
// -------------------------------------------------------------------------------------------

/**
 * "Today" is injected, never read from the wall clock inside the service.
 *
 * Two reasons. The demo is anchored (see DEMO_TODAY in @95forward/db) so its figures reproduce, and
 * `weeksLeft` must be pinnable in tests. A service that called `new Date()` internally would be
 * untestable and would make the demo drift.
 */
export interface Clock {
  now(): Date;
}

export function fixedClock(at: Date): Clock {
  return { now: () => new Date(at.getTime()) };
}

export const systemClock: Clock = { now: () => new Date() };

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
  | "enum-list";

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
] as const;

export const DEFAULT_FORWARD_SETTINGS: ForwardSettings = {
  coverageMultiple: COVERAGE_MULTIPLE.defaultValue,
  sellingDaysPerWeek: SELLING_DAYS_PER_WEEK.defaultValue,
  sellingHoursPerDay: SELLING_HOURS_PER_DAY.defaultValue,
  fiscalPeriods: FISCAL_PERIODS.defaultValue,
  checks: DEFAULT_CHECK_SETTINGS,
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

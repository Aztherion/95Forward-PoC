// 95 Forward — what the Rules of Robb catalogue contains (Initiative 22).
//
// Every constant I19, I20 and I21 were built against is absorbed here as a catalogue entry, and
// `settingsFromCatalogue` turns the effective values back into the `ForwardSettings` those modules
// already consume. Nothing downstream changed shape: the settings object they read is now assembled
// from org-editable doctrine instead of from a hardcoded default.
//
// I23 adds its ranking rules by calling `registerCatalogueEntries` with rule entries of its own —
// see REGISTERING NEW RULES at the bottom.

import { FORWARD_STAGES, PROBABILITY_BANDS, VISIT_RATINGS } from "./forward";
import { CHECK_DEFINITIONS, type CheckDefinition } from "./forward-checks";
import {
  ASK_MATURATION_WEEKS,
  DEFAULT_FORWARD_SETTINGS,
  type ForwardSettings,
} from "./forward-settings";
import { CHECK_FIRING_SOURCE, registerFiringSource } from "./rules-firing";
import {
  registerCatalogueEntries,
  type CatalogueEntry,
  type ResolvedEntry,
} from "./rules-catalogue";

const D = DEFAULT_FORWARD_SETTINGS;

// -------------------------------------------------------------------------------------------
// Parameters — tunables with no predicate
// -------------------------------------------------------------------------------------------

const PARAMETER_ENTRIES: readonly CatalogueEntry[] = [
  {
    id: "coverage-multiple",
    kind: "parameter",
    category: "coverage-parameters",
    label: "Coverage multiple",
    statement:
      "Qualified asks on the table should be three times what is still to raise. A third of what " +
      "you ask for is what actually closes.",
    source: "I19",
    defaultEnabled: true,
    readBy: ["coverage ratio", "needed at coverage", "coverage gap", "new asks needed"],
    parameters: [
      {
        key: "multiple",
        label: "Multiple",
        unit: "x",
        type: "number",
        defaultValue: D.coverageMultiple,
        min: 1,
        max: 10,
        step: 0.5,
        description:
          "Below 1 the rule asks for less coverage than the goal itself, which makes the gap " +
          "meaningless. Zero or negative breaks every coverage figure on both screens.",
      },
    ],
  },
  {
    id: "selling-days-per-week",
    kind: "parameter",
    category: "coverage-parameters",
    label: "Selling days per week",
    statement: "A gift officer is in front of donors five days a week.",
    source: "I19",
    defaultEnabled: true,
    readBy: ["new asks needed per day"],
    parameters: [
      {
        key: "days",
        label: "Days",
        unit: "days",
        type: "number",
        defaultValue: D.sellingDaysPerWeek,
        min: 1,
        max: 7,
        step: 1,
      },
    ],
  },
  {
    id: "selling-hours-per-day",
    kind: "parameter",
    category: "coverage-parameters",
    label: "Selling hours per day",
    statement: "Four of those hours are actually in the chair, in front of someone.",
    source: "I19",
    defaultEnabled: true,
    readBy: ["new asks needed per hour — the in-the-chair figure"],
    parameters: [
      {
        key: "hours",
        label: "Hours",
        unit: "hours",
        type: "number",
        defaultValue: D.sellingHoursPerDay,
        min: 1,
        max: 12,
        step: 1,
      },
    ],
  },
  {
    id: "ask-maturation-weeks",
    kind: "parameter",
    category: "coverage-parameters",
    label: "Ask maturation period",
    statement:
      "A new ask made today cannot realistically close for several weeks, so the weeks left to " +
      "raise money are fewer than the weeks left in the year.",
    source: "I19 — documented, NOT implemented",
    // Off by default and nothing reads it: turning it on changes no behaviour until a later
    // initiative implements it. Present so the doctrine is visible rather than forgotten.
    defaultEnabled: false,
    readBy: ["nothing yet — weeks left ignores this"],
    parameters: [
      {
        key: "weeks",
        label: "Weeks",
        unit: "weeks",
        type: "number",
        defaultValue: ASK_MATURATION_WEEKS.defaultValue,
        min: 0,
        max: 26,
        step: 1,
      },
    ],
  },
  {
    id: "simulation-trials",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Simulated years",
    statement:
      "The forecast runs ten thousand simulated years. Every dollar closes in full or not at all.",
    source: "I21",
    defaultEnabled: true,
    readBy: ["the BMW curve", "the chart subtitle"],
    parameters: [
      {
        key: "trials",
        label: "Trials",
        unit: "runs",
        type: "number",
        defaultValue: D.simulation.trialCount,
        min: 500,
        max: 50_000,
        step: 500,
        description: "Fewer than about 500 makes the percentiles jumpy between edits.",
      },
    ],
  },
  {
    id: "percentile-best",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Best case percentile",
    statement: "The best case is the 90th percentile of simulated years.",
    source: "I21",
    defaultEnabled: true,
    readBy: ["the Best line", "scenario membership"],
    parameters: [
      {
        key: "percentile",
        label: "Percentile",
        unit: "%",
        type: "number",
        defaultValue: D.simulation.percentiles.best,
        min: 51,
        max: 99,
        step: 1,
      },
    ],
  },
  {
    id: "percentile-most-likely",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Most likely percentile",
    statement: "The most likely case is the median simulated year.",
    source: "I21",
    defaultEnabled: true,
    readBy: ["the Most likely line", "the headline forecast figure"],
    parameters: [
      {
        key: "percentile",
        label: "Percentile",
        unit: "%",
        type: "number",
        defaultValue: D.simulation.percentiles.mostLikely,
        min: 20,
        max: 80,
        step: 1,
      },
    ],
  },
  {
    id: "percentile-worst",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Worst case percentile",
    statement:
      "The worst case is the 5th percentile — the downside is cut further out than the upside, " +
      "deliberately.",
    source: "I21",
    defaultEnabled: true,
    readBy: ["the Worst line", "scenario membership"],
    parameters: [
      {
        key: "percentile",
        label: "Percentile",
        unit: "%",
        type: "number",
        defaultValue: D.simulation.percentiles.worst,
        min: 1,
        max: 49,
        step: 1,
      },
    ],
  },
  {
    id: "membership-threshold",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Scenario inclusion threshold",
    statement:
      "An opportunity counts as being in a scenario when it closed in at least half of that " +
      "scenario's simulated years.",
    source: "I21",
    defaultEnabled: true,
    readBy: ["the names ledger badges"],
    parameters: [
      {
        key: "threshold",
        label: "Threshold",
        unit: "fraction",
        type: "number",
        defaultValue: D.simulation.membershipThreshold,
        min: 0.1,
        max: 0.9,
        step: 0.05,
      },
    ],
  },
  {
    id: "membership-neighbourhood",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Scenario neighbourhood size",
    statement:
      "Scenario membership is judged against the simulated years closest to each percentile.",
    source: "I21",
    defaultEnabled: true,
    readBy: ["the names ledger badges"],
    parameters: [
      {
        key: "fraction",
        label: "Fraction of trials",
        unit: "fraction",
        type: "number",
        defaultValue: D.simulation.membershipNeighbourhoodFraction,
        min: 0.01,
        max: 0.5,
        step: 0.01,
      },
    ],
  },
  {
    id: "consequence-trials",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Trials for finding consequences",
    statement:
      "Sizing what a broken forecast costs is an estimate, so it runs on fewer simulated years.",
    source: "I21",
    defaultEnabled: true,
    readBy: ["the DISTORTS BEST/WORST consequence on Fix first"],
    parameters: [
      {
        key: "trials",
        label: "Trials",
        unit: "runs",
        type: "number",
        defaultValue: D.simulation.consequenceTrialCount,
        min: 200,
        max: 20_000,
        step: 100,
      },
    ],
  },
  {
    id: "movement-untouched-days",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Untouched threshold",
    statement:
      "How long an open opportunity can go without contact before the Forecast Room flags it by " +
      "name.",
    source: "I27",
    defaultEnabled: true,
    readBy: ["the Untouched 30+ days panel"],
    parameters: [
      {
        key: "days",
        label: "Days without contact",
        unit: "days",
        type: "number",
        defaultValue: 30,
        min: 1,
        max: 365,
        step: 1,
      },
    ],
  },
  {
    id: "movement-pushes",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Slipping threshold",
    statement:
      "How many times a close date can move before the Forecast Room flags the opportunity as " +
      "slipping.",
    source: "I27",
    defaultEnabled: true,
    readBy: ["the Close date pushed twice or more panel"],
    parameters: [
      {
        key: "pushes",
        label: "Close-date moves",
        unit: "moves",
        type: "number",
        defaultValue: 2,
        min: 1,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    id: "date-confidence-days",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Date confidence bands",
    statement:
      "How far a close date can move in either direction, depending on how firm the date is.",
    source: "I21",
    defaultEnabled: true,
    readBy: ["date variation in every simulated year", "slip beyond the period"],
    parameters: [
      {
        key: "firm",
        label: "Firm",
        unit: "days",
        type: "number",
        defaultValue: D.simulation.dateConfidenceDays.firm ?? 7,
        min: 0,
        max: 120,
        step: 1,
      },
      {
        key: "semi_firm",
        label: "Semi-firm",
        unit: "days",
        type: "number",
        defaultValue: D.simulation.dateConfidenceDays.semi_firm ?? 21,
        min: 0,
        max: 180,
        step: 1,
      },
      {
        key: "loose",
        label: "Loose",
        unit: "days",
        type: "number",
        defaultValue: D.simulation.dateConfidenceDays.loose ?? 60,
        min: 0,
        max: 365,
        step: 1,
      },
    ],
  },
  {
    id: "probability-band-pct",
    kind: "parameter",
    category: "forecasting-parameters",
    label: "Likelihood band percentages",
    statement:
      "What each likelihood band is worth as a chance of closing. Used only as the odds of a " +
      "simulated year booking the gift — never as a multiplier on the amount.",
    source: "I21",
    defaultEnabled: true,
    readBy: ["the per-trial draw in every simulated year"],
    parameters: PROBABILITY_BANDS.map((band) => ({
      key: band,
      label: band.replace(/_/g, " "),
      unit: "%",
      type: "number" as const,
      defaultValue: D.simulation.probabilityPct[band] ?? 50,
      min: 1,
      max: 99,
      step: 1,
    })),
  },
];

// -------------------------------------------------------------------------------------------
// Rules — I20's consistency checks, with their thresholds exposed
// -------------------------------------------------------------------------------------------

const CHECK_META: Record<
  string,
  { label: string; statement: string; category: CatalogueEntry["category"] }
> = {
  "amount-agreed-no-confirmed-date": {
    label: "Amount agreed, no confirmed date",
    statement:
      "The forecast should be clean and consistent: an amount they agreed to is not a forecast " +
      "until they have also given you a date.",
    category: "forecast-hygiene",
  },
  "close-date-past-stage-open": {
    label: "Close date has passed",
    // The Rules of Robb line "following up is very time sensitive" lands here rather than on a new
    // rule of its own: an open opportunity whose close date has already gone by is, precisely, a
    // deal nobody has been back to. I23's cadence ranking will register further rules under this
    // same doctrine; this is the one that already has a predicate behind it.
    statement:
      "Following up is very time sensitive: a close date that has already gone by on an open " +
      "opportunity is a deal nobody has been back to.",
    category: "relationship-cadence",
  },
  "written-confirmation-no-evidence": {
    label: "Confirmed in writing, nothing attached",
    statement:
      "The forecast should be clean and consistent: if it is confirmed in writing, the writing " +
      "should be attached.",
    category: "forecast-hygiene",
  },
  "probability-below-evidence": {
    label: "Likelihood below the evidence",
    statement:
      "If Amount Agreed To — or any of the follow-on criteria — is checked yes, the likelihood " +
      "of booking should be High.",
    category: "forecast-hygiene",
  },
  "probability-above-visit-rating": {
    label: "Likelihood above the visit rating",
    statement: "If the Visit rating is poor, the likelihood of booking should be rather low.",
    category: "forecast-hygiene",
  },
  "amount-agreed-no-ask-made": {
    label: "Amount agreed, no ask recorded",
    statement:
      "The forecast should be clean and consistent: record the ask you made, not just the " +
      "answer you got.",
    category: "forecast-hygiene",
  },
  "missing-forecast-inputs": {
    label: "Missing forecast inputs",
    statement:
      "Prepping for the visit is essential: by the time you are asking, the amount and the date " +
      "should both be on the record.",
    category: "relationship-cadence",
  },
  "status-stage-disagreement": {
    label: "Status and stage disagree",
    statement:
      "The forecast should be clean and consistent: a won or lost gift does not sit in a stage " +
      "that is still working toward the ask.",
    category: "forecast-hygiene",
  },
};

/** Per-check parameters beyond the effort estimate every rule carries. */
const CHECK_EXTRA_PARAMETERS: Record<string, CatalogueEntry["parameters"]> = {
  "probability-below-evidence": [
    {
      key: "floorBand",
      label: "Minimum band for a qualified ask",
      unit: "band",
      type: "enum",
      options: PROBABILITY_BANDS,
      defaultValue: D.checks.probabilityEvidenceFloor,
      description:
        "Set this to 'lock' and every qualified ask not marked a certainty is flagged — which is " +
        "most of them. 'high' lets a rep hold short of certainty without being nagged.",
    },
  ],
  "probability-above-visit-rating": [
    {
      key: "ceilingBand",
      label: "Band a poor visit contradicts",
      unit: "band",
      type: "enum",
      options: PROBABILITY_BANDS,
      defaultValue: D.checks.probabilityOptimismCeiling,
    },
    {
      key: "concerningRatings",
      label: "Visit ratings that undercut optimism",
      unit: "ratings",
      type: "enum-list",
      options: VISIT_RATINGS,
      defaultValue: D.checks.concerningVisitRatings,
    },
  ],
  "missing-forecast-inputs": [
    {
      key: "requiredStages",
      label: "Stages that require forecast inputs",
      unit: "stages",
      type: "enum-list",
      options: FORWARD_STAGES,
      defaultValue: D.checks.forecastInputRequiredStages,
      description:
        "Add the early stages and every prospect you have not asked yet is flagged for having no " +
        "close date — the false positive that teaches people to ignore the whole block.",
    },
  ],
};

function checkEntry(check: CheckDefinition): CatalogueEntry {
  const meta = CHECK_META[check.id];
  return {
    id: check.id,
    kind: "rule",
    category: meta?.category ?? "forecast-hygiene",
    label: meta?.label ?? check.id,
    statement: meta?.statement ?? check.id,
    source: "I20",
    defaultEnabled: true,
    parameters: [
      {
        key: "effortSeconds",
        label: "Time to resolve",
        unit: "seconds",
        type: "number",
        defaultValue: D.checks.effortSeconds[check.id] ?? 60,
        min: 5,
        max: 3600,
        step: 5,
        description:
          "Summed across findings to make the 'clear them in under three minutes' promise, so " +
          "keep it honest.",
      },
      ...(CHECK_EXTRA_PARAMETERS[check.id] ?? []),
    ],
  };
}

/** Registers everything I19/I20/I21 own. Idempotent, so tests may call it freely. */
export function registerBuiltInRules(): void {
  registerCatalogueEntries(PARAMETER_ENTRIES);
  registerCatalogueEntries(CHECK_DEFINITIONS.map(checkEntry));
  registerFiringSource(CHECK_FIRING_SOURCE);
}

// -------------------------------------------------------------------------------------------
// Catalogue -> ForwardSettings
// -------------------------------------------------------------------------------------------

function num(
  entries: Map<string, ResolvedEntry>,
  id: string,
  key: string,
  fallback: number,
): number {
  const value = entries.get(id)?.values[key];
  return typeof value === "number" ? value : fallback;
}

function str(
  entries: Map<string, ResolvedEntry>,
  id: string,
  key: string,
  fallback: string,
): string {
  const value = entries.get(id)?.values[key];
  return typeof value === "string" ? value : fallback;
}

function list(
  entries: Map<string, ResolvedEntry>,
  id: string,
  key: string,
  fallback: readonly string[],
): readonly string[] {
  const value = entries.get(id)?.values[key];
  return Array.isArray(value) ? (value as readonly string[]) : fallback;
}

/**
 * Assemble the settings object I19/I20/I21 already read, from the org's effective doctrine.
 *
 * Deliberately explicit rather than clever: every mapping is written out, so a reader can see which
 * rule feeds which constant without tracing a generic transform.
 */
export function settingsFromCatalogue(resolved: readonly ResolvedEntry[]): ForwardSettings {
  const byId = new Map(resolved.map((entry) => [entry.id, entry]));

  const effortSeconds: Record<string, number> = { ...D.checks.effortSeconds };
  for (const entry of resolved) {
    if (entry.kind !== "rule") continue;
    const value = entry.values["effortSeconds"];
    if (typeof value === "number") effortSeconds[entry.id] = value;
  }

  const dateConfidenceDays: Record<string, number> = { ...D.simulation.dateConfidenceDays };
  for (const key of Object.keys(dateConfidenceDays)) {
    dateConfidenceDays[key] = num(byId, "date-confidence-days", key, dateConfidenceDays[key] ?? 0);
  }

  const probabilityPct: Record<string, number> = { ...D.simulation.probabilityPct };
  for (const key of Object.keys(probabilityPct)) {
    probabilityPct[key] = num(byId, "probability-band-pct", key, probabilityPct[key] ?? 50);
  }

  return {
    coverageMultiple: num(byId, "coverage-multiple", "multiple", D.coverageMultiple),
    sellingDaysPerWeek: num(byId, "selling-days-per-week", "days", D.sellingDaysPerWeek),
    sellingHoursPerDay: num(byId, "selling-hours-per-day", "hours", D.sellingHoursPerDay),
    fiscalPeriods: D.fiscalPeriods,
    checks: {
      effortSeconds,
      probabilityEvidenceFloor: str(
        byId,
        "probability-below-evidence",
        "floorBand",
        D.checks.probabilityEvidenceFloor,
      ),
      probabilityOptimismCeiling: str(
        byId,
        "probability-above-visit-rating",
        "ceilingBand",
        D.checks.probabilityOptimismCeiling,
      ),
      concerningVisitRatings: list(
        byId,
        "probability-above-visit-rating",
        "concerningRatings",
        D.checks.concerningVisitRatings,
      ),
      forecastInputRequiredStages: list(
        byId,
        "missing-forecast-inputs",
        "requiredStages",
        D.checks.forecastInputRequiredStages,
      ),
    },
    simulation: {
      trialCount: num(byId, "simulation-trials", "trials", D.simulation.trialCount),
      percentiles: {
        best: num(byId, "percentile-best", "percentile", D.simulation.percentiles.best),
        mostLikely: num(
          byId,
          "percentile-most-likely",
          "percentile",
          D.simulation.percentiles.mostLikely,
        ),
        worst: num(byId, "percentile-worst", "percentile", D.simulation.percentiles.worst),
      },
      membershipNeighbourhoodFraction: num(
        byId,
        "membership-neighbourhood",
        "fraction",
        D.simulation.membershipNeighbourhoodFraction,
      ),
      membershipThreshold: num(
        byId,
        "membership-threshold",
        "threshold",
        D.simulation.membershipThreshold,
      ),
      consequenceTrialCount: num(
        byId,
        "consequence-trials",
        "trials",
        D.simulation.consequenceTrialCount,
      ),
      dateConfidenceDays,
      probabilityPct,
    },
  };
}

/**
 * The checks an org has left switched on.
 *
 * I20's engine already accepts a `checks` array, so disabling a rule is a filter here rather than a
 * change to the engine — and its findings, count and summed effort all follow automatically.
 */
export function enabledCheckDefinitions(
  resolved: readonly ResolvedEntry[],
): readonly CheckDefinition[] {
  const disabled = new Set(
    resolved.filter((entry) => entry.kind === "rule" && !entry.enabled).map((entry) => entry.id),
  );
  return CHECK_DEFINITIONS.filter((check) => !disabled.has(check.id));
}

// -------------------------------------------------------------------------------------------
// REGISTERING NEW RULES — what I23 has to do
// -------------------------------------------------------------------------------------------
//
//   import { registerCatalogueEntries } from "@95forward/shared";
//
//   registerCatalogueEntries([
//     {
//       id: "live-ask-silence",            // exactly what the RULE chip will read
//       kind: "rule",
//       category: "relationship-cadence",
//       label: "Live ask silence",
//       statement: "Following up is very time sensitive.",
//       source: "I23",
//       defaultEnabled: true,
//       parameters: [
//         { key: "days", label: "Silent for", unit: "days", type: "number",
//           defaultValue: 30, min: 1, max: 365, step: 1 },
//       ],
//     },
//   ]);
//
// That is the whole integration: the entry appears in the editor, gains override and audit support,
// and becomes addressable at /rules/live-ask-silence. Two further steps are I23's own:
//
//   1. Read its parameters from the resolved catalogue rather than from constants.
//   2. Register a firing source (see `registerFiringSource` in rules-firing.ts) so the chip can
//      answer "show me everything this is firing on".

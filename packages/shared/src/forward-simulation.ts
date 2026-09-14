// 95 Forward — the Monte Carlo forecast (Initiative 21).
//
// THE HARDEST CONSTRAINT IN THE METHODOLOGY LIVES HERE: never forecast amount x probability.
//
// A 50% chance of $1M is not $500,000. You will book a million or nothing, and the average is a
// number that cannot occur — Robb calls it the half-pregnant rule, and the tool's credibility with
// him rests on it. The simulation is the correct answer: every trial books FULL or ZERO, and what
// you show is the distribution of those trials. The chart says so out loud: "10,000 simulated
// years. Every dollar closes in full or not at all."
//
// If you are ever tempted to multiply an amount by a probability in this file, the answer is no.

import { isPreCloseStage } from "./forward";
import type { SimulationSettings } from "./forward-settings";
import { resolveFiscalPeriod, type Clock, type ForwardSettings } from "./forward-settings";
import {
  scopeMatches,
  type MetricScope,
  type MetricsOverrides,
  type MetricsSnapshot,
  type SnapshotOpportunity,
} from "./forward-metrics";

// -------------------------------------------------------------------------------------------
// Deterministic randomness
// -------------------------------------------------------------------------------------------

/**
 * FNV-1a. Stable across platforms and locales — no Date, no locale collation, no object key order.
 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** mulberry32 — small, fast, and identical on every engine. Never Math.random(). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The seed input. Sorted and explicitly serialised so the same portfolio always produces the same
 * string — object key order and array order are never trusted.
 */
export function simulationSeedInput(
  opportunities: readonly SnapshotOpportunity[],
  vintageDate: string,
  settings: SimulationSettings,
): string {
  const rows = opportunities
    .map((o) =>
      [
        o.id,
        o.amountCents,
        o.probability,
        o.closeDate ?? "none",
        o.dateConfidence,
        o.status,
        o.stage,
      ].join("|"),
    )
    .sort();
  const config = [
    settings.trialCount,
    settings.percentiles.best,
    settings.percentiles.mostLikely,
    settings.percentiles.worst,
  ].join("|");
  return `v1;${vintageDate};${config};${rows.join(";")}`;
}

// -------------------------------------------------------------------------------------------
// Shapes
// -------------------------------------------------------------------------------------------

export type ScenarioBadge = "IN_ALL_THREE" | "MOST_LIKELY_PLUS" | "BEST_ONLY" | "OUTSIDE_BEST";

export interface MonthPoint {
  /** `YYYY-MM`. */
  readonly month: string;
  /** Cumulative won to date. Absent for months after today — actuals do not run into the future. */
  readonly actualCents?: number;
  readonly bestCents: number;
  readonly mostLikelyCents: number;
  readonly worstCents: number;
}

export interface InclusionRates {
  readonly best: number;
  readonly mostLikely: number;
  readonly worst: number;
}

export interface MembershipRow {
  readonly opportunityId: string;
  readonly badge: ScenarioBadge;
  readonly inclusionRates: InclusionRates;
  readonly qualified: boolean;
  readonly amountCents: number;
}

export interface SimulationResult {
  readonly months: readonly MonthPoint[];
  readonly yearEnd: { readonly bestCents: number; readonly mostLikelyCents: number; readonly worstCents: number };
  readonly membership: readonly MembershipRow[];
  /** The ledger footer: "$225,000 of hope, nothing prospect-confirmed behind it." */
  readonly bestOnly: {
    readonly count: number;
    readonly cents: number;
    readonly unqualifiedCents: number;
  };
  /** Money whose varied close date landed after period end. The source model tracks "slip into '28". */
  readonly slipBeyondPeriod: {
    readonly bestCents: number;
    readonly mostLikelyCents: number;
    readonly worstCents: number;
  };
  readonly meta: {
    readonly seed: number;
    readonly trialCount: number;
    readonly percentiles: SimulationSettings["percentiles"];
    readonly vintageDate: string;
  };
}

export interface SimulateInput {
  readonly snapshot: MetricsSnapshot;
  readonly scope: MetricScope;
  readonly settings: ForwardSettings;
  readonly clock: Clock;
  readonly overrides?: MetricsOverrides;
  /** Override the trial count — I20's consequence evaluator uses a reduced one. */
  readonly trialCount?: number;
}

// -------------------------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function monthsOfPeriod(start: string, end: string): string[] {
  const months: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = `${end.slice(0, 7)}`;
  for (let guard = 0; guard < 240; guard++) {
    const key = monthKey(cursor);
    months.push(key);
    if (key === last) break;
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

/** Nearest-rank percentile over a numeric sample. */
export function percentileOf(sorted: readonly number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((percentile / 100) * sorted.length);
  const index = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[index] ?? 0;
}

function applyOverrides(
  opportunities: readonly SnapshotOpportunity[],
  overrides: MetricsOverrides | undefined,
): readonly SnapshotOpportunity[] {
  if (!overrides) return opportunities;
  const excluded = new Set(overrides.excludeOpportunityIds ?? []);
  const patches = overrides.opportunityPatches ?? {};
  const milestones = overrides.milestonePatches ?? {};
  const out: SnapshotOpportunity[] = [];
  for (const o of opportunities) {
    if (excluded.has(o.id)) continue;
    const patch = patches[o.id];
    const milestonePatch = milestones[o.id];
    if (!patch && !milestonePatch) {
      out.push(o);
      continue;
    }
    out.push({
      ...o,
      ...(patch ?? {}),
      confirmedMilestoneKeys: milestonePatch ?? o.confirmedMilestoneKeys,
    });
  }
  return out;
}

// -------------------------------------------------------------------------------------------
// The simulation
// -------------------------------------------------------------------------------------------

export function simulate(input: SimulateInput): SimulationResult {
  const { snapshot, scope, settings, clock } = input;
  const sim = settings.simulation;
  const period = resolveFiscalPeriod(settings, scope.period);
  if (!period) {
    throw new Error(`simulate: no fiscal period "${scope.period}" is defined in settings.`);
  }

  const now = clock.now();
  const vintageDate = now.toISOString().slice(0, 10);
  const trialCount = input.trialCount ?? sim.trialCount;
  const months = monthsOfPeriod(period.start, period.end);
  const monthIndex = new Map(months.map((m, i) => [m, i]));
  const periodEndMs = Date.parse(`${period.end}T23:59:59.999Z`);

  const inScope = applyOverrides(snapshot.opportunities, input.overrides).filter((o) =>
    scopeMatches(o, scope),
  );

  // ---- Actuals: cumulative won, by month, up to today. Not recomputed — read from the snapshot.
  const wonCumulative = new Array<number>(months.length).fill(0);
  for (const o of inScope) {
    if (o.status !== "won" || !o.closeDate) continue;
    const index = monthIndex.get(o.closeDate.slice(0, 7));
    if (index === undefined) continue;
    wonCumulative[index] = (wonCumulative[index] ?? 0) + o.amountCents;
  }
  for (let i = 1; i < wonCumulative.length; i++) {
    wonCumulative[i] = (wonCumulative[i] ?? 0) + (wonCumulative[i - 1] ?? 0);
  }
  const wonTotal = wonCumulative[wonCumulative.length - 1] ?? 0;
  const currentMonthIndex = monthIndex.get(monthKey(now)) ?? months.length - 1;

  // ---- Who enters the simulation: every OPEN PRE-CLOSE opportunity, qualified or not.
  //
  // Deliberately broader than the headline metric, which counts qualified only. The simulation
  // answers "what will happen", and an unqualified ask can still close — and including them is what
  // makes "3 of these 9 only appear in Best, $225,000 of hope" computable at all.
  const candidates = inScope.filter((o) => o.status === "open" && isPreCloseStage(o.stage));

  // COMMON RANDOM NUMBERS. Seed from the BASELINE portfolio, never from the overridden one.
  //
  // This looks like a bug to anyone who has not hit the problem, so: the seed is a hash of the
  // portfolio's state, and if an overridden run seeds from the overridden state then changing one
  // close date changes the hash, which reshuffles every random draw in every trial. The whole
  // curve then moves — including the parts your change could not possibly have affected — and you
  // cannot tell what your edit did, only that something did.
  //
  // Seeding both runs from the same baseline gives them identical draws, so the difference
  // between the two curves is genuinely attributable to the override. It is the standard
  // technique for exactly this comparison (common random numbers), and it is what makes the
  // what-if sandbox's ghosted-baseline comparison mean anything at all. It also sharpens I20's
  // consequence quantification, which runs this with overrides for the same purpose.
  //
  // The baseline set is scope-filtered but NOT override-filtered.
  const seedBasis = snapshot.opportunities.filter((o) => scopeMatches(o, scope));
  const seed = hashString(simulationSeedInput(seedBasis, vintageDate, { ...sim, trialCount }));
  const random = mulberry32(seed);

  // Per-trial monthly INCREMENTS from simulated closes, plus what slipped out of the period.
  const trialMonthly: number[][] = [];
  const trialSlip: number[] = [];
  // closedInPeriod[trial] = set of opportunity ids that landed inside the period.
  const closedInPeriod: Array<Set<string>> = [];

  for (let trial = 0; trial < trialCount; trial++) {
    const monthly = new Array<number>(months.length).fill(0);
    const landed = new Set<string>();
    let slipped = 0;

    for (const opportunity of candidates) {
      const chancePct = sim.probabilityPct[opportunity.probability] ?? 0;
      // THE BINARY DRAW. Full amount or zero — never a fraction, never an expected value.
      if (random() * 100 >= chancePct) continue;

      const bandDays = sim.dateConfidenceDays[opportunity.dateConfidence] ?? 0;
      // A close date we never set with them cannot be varied around; treat it as period end, which
      // is the least flattering honest assumption.
      const baseMs = opportunity.closeDate
        ? Date.parse(`${opportunity.closeDate}T12:00:00.000Z`)
        : periodEndMs;
      // Uniform across the band. Symmetric: the date is as likely to pull in as to push out.
      const offsetDays = Math.round((random() * 2 - 1) * bandDays);
      const landedMs = baseMs + offsetDays * DAY_MS;

      if (landedMs > periodEndMs) {
        slipped += opportunity.amountCents;
        continue;
      }
      const key = monthKey(new Date(landedMs));
      const index = monthIndex.get(key);
      if (index === undefined) {
        // Before period start — clamp into the first month rather than dropping the money.
        monthly[0] = (monthly[0] ?? 0) + opportunity.amountCents;
      } else {
        monthly[index] = (monthly[index] ?? 0) + opportunity.amountCents;
      }
      landed.add(opportunity.id);
    }

    trialMonthly.push(monthly);
    trialSlip.push(slipped);
    closedInPeriod.push(landed);
  }

  // ---- Per-month percentiles across trials, on the CUMULATIVE series continued from won-to-date.
  const cumulativeByTrial: number[][] = trialMonthly.map((monthly) => {
    const cumulative: number[] = [];
    let running = 0;
    for (let i = 0; i < months.length; i++) {
      running += monthly[i] ?? 0;
      cumulative.push((wonCumulative[i] ?? 0) + running);
    }
    return cumulative;
  });

  const monthPoints: MonthPoint[] = months.map((month, i) => {
    const column = cumulativeByTrial.map((c) => c[i] ?? 0).sort((a, b) => a - b);
    const point: MonthPoint = {
      month,
      bestCents: percentileOf(column, sim.percentiles.best),
      mostLikelyCents: percentileOf(column, sim.percentiles.mostLikely),
      worstCents: percentileOf(column, sim.percentiles.worst),
    };
    return i <= currentMonthIndex ? { ...point, actualCents: wonCumulative[i] ?? 0 } : point;
  });

  const yearEndTotals = cumulativeByTrial.map((c) => c[c.length - 1] ?? wonTotal);
  const sortedYearEnd = [...yearEndTotals].sort((a, b) => a - b);
  const yearEnd = {
    bestCents: percentileOf(sortedYearEnd, sim.percentiles.best),
    mostLikelyCents: percentileOf(sortedYearEnd, sim.percentiles.mostLikely),
    worstCents: percentileOf(sortedYearEnd, sim.percentiles.worst),
  };

  const sortedSlip = [...trialSlip].sort((a, b) => a - b);
  const slipBeyondPeriod = {
    bestCents: percentileOf(sortedSlip, sim.percentiles.best),
    mostLikelyCents: percentileOf(sortedSlip, sim.percentiles.mostLikely),
    worstCents: percentileOf(sortedSlip, sim.percentiles.worst),
  };

  // ---- Scenario membership, conditional on near-percentile trials.
  const neighbourhood = Math.max(
    1,
    Math.round(trialCount * sim.membershipNeighbourhoodFraction),
  );

  // Nearest-k by year-end TOTAL, as specified. (A rank-based window was tried and measured: it did
  // not reduce non-monotone inclusion rates and it shrank the BEST_ONLY set, so the specified rule
  // stands. See the PR notes on lumpy subset-sum totals.)
  function neighbourhoodTrials(targetTotal: number): number[] {
    return yearEndTotals
      .map((total, index) => ({ index, distance: Math.abs(total - targetTotal) }))
      // Tie-break on index so the neighbourhood is deterministic, not insertion-order dependent.
      .sort((a, b) => a.distance - b.distance || a.index - b.index)
      .slice(0, neighbourhood)
      .map((entry) => entry.index);
  }

  const neighbourhoods = {
    best: neighbourhoodTrials(yearEnd.bestCents),
    mostLikely: neighbourhoodTrials(yearEnd.mostLikelyCents),
    worst: neighbourhoodTrials(yearEnd.worstCents),
  };

  function inclusionRate(opportunityId: string, trials: readonly number[]): number {
    if (trials.length === 0) return 0;
    let hits = 0;
    for (const trial of trials) {
      if (closedInPeriod[trial]?.has(opportunityId)) hits++;
    }
    return hits / trials.length;
  }

  const blockingKeys = snapshot.definitions.filter((d) => d.blocking).map((d) => d.key);
  const threshold = sim.membershipThreshold;

  const membership: MembershipRow[] = candidates.map((opportunity) => {
    const rates: InclusionRates = {
      best: inclusionRate(opportunity.id, neighbourhoods.best),
      mostLikely: inclusionRate(opportunity.id, neighbourhoods.mostLikely),
      worst: inclusionRate(opportunity.id, neighbourhoods.worst),
    };
    // Assigned by the LOWEST-percentile scenario it qualifies for, which makes the badge ordering
    // monotone by construction rather than by hoping the trials cooperate.
    const badge: ScenarioBadge =
      rates.worst >= threshold
        ? "IN_ALL_THREE"
        : rates.mostLikely >= threshold
          ? "MOST_LIKELY_PLUS"
          : rates.best >= threshold
            ? "BEST_ONLY"
            : "OUTSIDE_BEST";

    const confirmed = new Set(opportunity.confirmedMilestoneKeys);
    return {
      opportunityId: opportunity.id,
      badge,
      inclusionRates: rates,
      qualified: blockingKeys.length > 0 && blockingKeys.every((key) => confirmed.has(key)),
      amountCents: opportunity.amountCents,
    };
  });

  const bestOnlyRows = membership.filter((row) => row.badge === "BEST_ONLY");
  const bestOnly = {
    count: bestOnlyRows.length,
    cents: bestOnlyRows.reduce((sum, row) => sum + row.amountCents, 0),
    unqualifiedCents: bestOnlyRows
      .filter((row) => !row.qualified)
      .reduce((sum, row) => sum + row.amountCents, 0),
  };

  return {
    months: monthPoints,
    yearEnd,
    membership,
    bestOnly,
    slipBeyondPeriod,
    meta: {
      seed,
      trialCount,
      percentiles: sim.percentiles,
      vintageDate,
    },
  };
}

// -------------------------------------------------------------------------------------------
// Modelling simplification, stated rather than hidden
// -------------------------------------------------------------------------------------------
//
// Trials draw each opportunity INDEPENDENTLY. Real portfolios are correlated — a recession, a
// board that funds two asks together, a rep who goes on leave. Correlation would widen the band,
// so the current band is, if anything, optimistically narrow. Modelling it needs a correlation
// structure nobody has authored; noted here rather than silently assumed away.

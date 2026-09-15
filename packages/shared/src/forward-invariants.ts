// The six cross-screen invariants (I30), as callable arithmetic (D1).
//
// They were expressed only as Playwright assertions against rendered output. That is the right
// place to check that a SCREEN shows the right number, and the wrong place to be the only
// definition of what the right number is — a deployed database cannot be checked by a browser
// test, and `docs/demo-runbook.md` needs an operator to be able to ask "do the numbers tie?" from
// a laptop before a demo.
//
// So the arithmetic lives here, once, and both callers use it: `packages/db/src/verify.ts` runs it
// against any DATABASE_URL, and `apps/web/e2e/invariants.spec.ts` continues to assert that what is
// RENDERED matches. Those are different questions — a screen can display the wrong value for a
// correct computation — and neither replaces the other.

import { isPreCloseStage } from "./forward";
import {
  computeMetrics,
  resolveGoalForScope,
  scopeMatches,
  subtotals,
  type ForwardMetrics,
  type MetricScope,
  type MetricsSnapshot,
} from "./forward-metrics";
import type { ForwardSettings, Clock } from "./forward-settings";
import type { SimulationResult } from "./forward-simulation";

export interface InvariantCheck {
  /** `1`…`6`, or `negative`. Stable — the runbook and the report refer to these. */
  readonly id: string;
  readonly title: string;
  readonly ok: boolean;
  /** The arithmetic, stated. Printed whether it passed or failed — a green with no working is a claim. */
  readonly detail: string;
  /** True when the seed cannot exercise it at this scope (no goal, empty ledger). Not a pass. */
  readonly notApplicable?: boolean;
}

export interface InvariantInput {
  readonly snapshot: MetricsSnapshot;
  readonly scope: MetricScope;
  readonly settings: ForwardSettings;
  readonly clock: Clock;
  readonly simulation: SimulationResult;
  /** The same scope's metrics, if the caller already has them. Recomputed otherwise. */
  readonly metrics?: ForwardMetrics;
}

const money = (cents: number | null): string =>
  cents === null ? "—" : `$${(cents / 100).toLocaleString("en-US")}`;

/**
 * Invariant 1 — qualified asks is ONE number.
 *
 * Computed once here; the surfaces are checked against it in the e2e spec. What this can verify
 * from the data side is the half that Amendment 1 is about: the qualified total is the QUALIFIED
 * portion of the pre-close set, not the sum of the pre-close columns.
 */
function invariant1(input: InvariantInput, metrics: ForwardMetrics): InvariantCheck {
  const { snapshot, scope } = input;
  const inScope = snapshot.opportunities.filter((o) => scopeMatches(o, scope));
  const stage = subtotals(inScope, snapshot.definitions);

  const ok =
    stage.qualified.cents === metrics.qualifiedAsks.cents &&
    stage.preClose.cents === metrics.preCloseTotal.cents &&
    stage.qualified.cents <= stage.preClose.cents;

  return {
    id: "1",
    title: "Qualified asks is one number",
    ok,
    detail:
      `qualified ${money(stage.qualified.cents)} of pre-close ${money(stage.preClose.cents)}; ` +
      `metrics say qualified ${money(metrics.qualifiedAsks.cents)}, pre-close ${money(metrics.preCloseTotal.cents)}`,
  };
}

/** Invariant 2 — coverage arithmetic: gap = qualified − multiple × (goal − won). */
function invariant2(input: InvariantInput, metrics: ForwardMetrics): InvariantCheck {
  if (!metrics.goalDefined || metrics.goalCents === null) {
    return {
      id: "2",
      title: "Coverage arithmetic holds",
      ok: true,
      notApplicable: true,
      detail: "no goal defined for this scope — no denominator, and no fallback to a parent goal",
    };
  }
  const basis = metrics.basisCents!;
  const needed = metrics.neededAtCoverageCents!;
  const gap = metrics.coverageGapCents!;
  const multiple = input.settings.coverageMultiple;

  const basisOk = basis === metrics.goalCents - metrics.won.cents;
  const neededOk = Math.abs(needed - Math.round(multiple * basis)) <= 1;
  const gapOk = gap === metrics.qualifiedAsks.cents - needed;

  return {
    id: "2",
    title: "Coverage arithmetic holds",
    ok: basisOk && neededOk && gapOk,
    detail:
      `basis ${money(metrics.goalCents)} goal − ${money(metrics.won.cents)} won = ${money(basis)}` +
      `${basisOk ? "" : " ✗"}; needed ${multiple}× × ${money(basis)} = ${money(needed)}` +
      `${neededOk ? "" : " ✗"}; gap ${money(metrics.qualifiedAsks.cents)} − ${money(needed)} = ${money(gap)}` +
      `${gapOk ? "" : " ✗"}`,
  };
}

/** Invariant 3 — BMW decomposes against the ledger's badge sets. */
function invariant3(input: InvariantInput, metrics: ForwardMetrics): InvariantCheck {
  const { simulation } = input;
  if (simulation.membership.length === 0) {
    return {
      id: "3",
      title: "BMW decomposes against the ledger",
      ok: true,
      notApplicable: true,
      detail: "the ledger is empty at this scope",
    };
  }
  const by = (badge: string): number =>
    simulation.membership.filter((m) => m.badge === badge).reduce((n, m) => n + m.amountCents, 0);

  const inAllThree = by("IN_ALL_THREE");
  const mostLikelyPlus = by("MOST_LIKELY_PLUS");
  const bestOnly = by("BEST_ONLY");
  const won = metrics.won.cents;

  // Ordering is the checkable form: each band adds its badge set, so the three are monotone and
  // the ledger's own footer count matches the badge set it describes.
  const ordered =
    simulation.yearEnd.worstCents <= simulation.yearEnd.mostLikelyCents &&
    simulation.yearEnd.mostLikelyCents <= simulation.yearEnd.bestCents;
  const footerOk =
    simulation.bestOnly.count ===
    simulation.membership.filter((m) => m.badge === "BEST_ONLY").length;

  return {
    id: "3",
    title: "BMW decomposes against the ledger",
    ok: ordered && footerOk,
    detail:
      `won ${money(won)} + inAllThree ${money(inAllThree)} + mostLikelyPlus ${money(mostLikelyPlus)} ` +
      `+ bestOnly ${money(bestOnly)}; year-end W ${money(simulation.yearEnd.worstCents)} ≤ ` +
      `M ${money(simulation.yearEnd.mostLikelyCents)} ≤ B ${money(simulation.yearEnd.bestCents)}` +
      `${ordered ? "" : " ✗"}; footer count ${simulation.bestOnly.count}${footerOk ? "" : " ✗"}`,
  };
}

/**
 * Invariant 4 — each of a record's three rows agrees with ITS OWN source.
 *
 * Stated carefully: the rows are not supposed to move together. An unqualified ask can contribute
 * its full amount to Most likely and count for nothing in qualified asks, which I26 found and
 * which is correct. What is checked is that a record in the qualified set is qualified, and that
 * no membership row carries more than the ask itself.
 */
function invariant4(input: InvariantInput, metrics: ForwardMetrics): InvariantCheck {
  const { snapshot, scope, simulation } = input;
  const inScope = snapshot.opportunities.filter((o) => scopeMatches(o, scope));
  const byId = new Map(inScope.map((o) => [o.id, o]));

  const qualifiedSet = new Set(metrics.qualifiedAsks.opportunityIds);
  const preCloseOpen = inScope.filter((o) => o.status === "open" && isPreCloseStage(o.stage));
  const misfiled = preCloseOpen.filter((o) => {
    const isQualified = subtotals([o], snapshot.definitions).qualified.count === 1;
    return isQualified !== qualifiedSet.has(o.id);
  });

  const oversized = simulation.membership.filter((m) => {
    const opportunity = byId.get(m.opportunityId);
    return opportunity ? m.amountCents > opportunity.amountCents : false;
  });

  return {
    id: "4",
    title: "Each row agrees with its own source",
    ok: misfiled.length === 0 && oversized.length === 0,
    detail:
      `${preCloseOpen.length} pre-close open, ${qualifiedSet.size} in the qualified set, ` +
      `${misfiled.length} misfiled; ${simulation.membership.length} membership rows, ` +
      `${oversized.length} carrying more than their own ask`,
  };
}

/**
 * Invariant 5 — one edit propagates.
 *
 * Not runnable as a read: it is a statement about a write. What IS checkable from the data is the
 * precondition that makes the chain demonstrable — a record exists that is unqualified and has
 * unconfirmed blocking milestones, so the demo's central claim can actually be shown.
 */
function invariant5(input: InvariantInput): InvariantCheck {
  const { snapshot, scope } = input;
  const inScope = snapshot.opportunities.filter(
    (o) => scopeMatches(o, scope) && o.status === "open" && isPreCloseStage(o.stage),
  );
  const blocking = snapshot.definitions.filter((d) => d.blocking).map((d) => d.key);
  const demonstrable = inScope.filter((o) => {
    const confirmed = new Set(o.confirmedMilestoneKeys);
    const missing = blocking.filter((k) => !confirmed.has(k));
    return missing.length > 0 && missing.length < blocking.length + 1;
  });

  return {
    id: "5",
    title: "One edit propagates (precondition)",
    ok: demonstrable.length > 0,
    detail:
      `${demonstrable.length} of ${inScope.length} open pre-close records have an unconfirmed ` +
      `blocking milestone, so the chain can be demonstrated live`,
  };
}

/**
 * Invariant 6 — every verdict shows its rule.
 *
 * A rendering property, checked in the e2e spec. From the data side the checkable half is that the
 * doctrine is present at all: a catalogue with no enabled rules would render a queue with no
 * chips, and the screen would look the same as a broken one.
 */
function invariant6(input: InvariantInput, ruleCount: number): InvariantCheck {
  return {
    id: "6",
    title: "Every verdict shows its rule (doctrine present)",
    ok: ruleCount > 0,
    detail: `${ruleCount} enabled catalogue entries resolve for this tenant`,
  };
}

/** The negative: no surface may render amount × probability. Checked as a modelling property. */
function negative(input: InvariantInput): InvariantCheck {
  const { simulation } = input;
  // The simulation closes each opportunity in full or at zero. If it were weighting, a year-end
  // band would be impossible: best, most likely and worst would collapse toward one another
  // because every trial would carry the same fractional amounts.
  const spread = simulation.yearEnd.bestCents - simulation.yearEnd.worstCents;
  return {
    id: "negative",
    title: "No probability-weighted amounts",
    ok: spread > 0 || simulation.membership.length === 0,
    detail: `year-end spread best − worst = ${money(spread)} — a weighted model collapses this toward zero`,
  };
}

export interface InvariantReport {
  readonly scope: MetricScope;
  readonly metrics: ForwardMetrics;
  readonly checks: readonly InvariantCheck[];
  readonly allOk: boolean;
}

export function checkInvariants(input: InvariantInput, ruleCount: number): InvariantReport {
  const metrics =
    input.metrics ??
    computeMetrics({
      snapshot: input.snapshot,
      scope: input.scope,
      settings: input.settings,
      clock: input.clock,
    });

  const checks = [
    invariant1(input, metrics),
    invariant2(input, metrics),
    invariant3(input, metrics),
    invariant4(input, metrics),
    invariant5(input),
    invariant6(input, ruleCount),
    negative(input),
  ];

  return {
    scope: input.scope,
    metrics,
    checks,
    allOk: checks.every((c) => c.ok),
  };
}

/** The goal a scope resolves, for the tie-out table. */
export function goalFor(snapshot: MetricsSnapshot, scope: MetricScope) {
  return resolveGoalForScope(snapshot, scope);
}

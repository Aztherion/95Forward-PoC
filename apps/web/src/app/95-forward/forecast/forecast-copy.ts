import type { ForwardMetrics, SimulationResult, StageBoard } from "@95forward/shared";
import { formatCurrencyAbbreviatedFromCents, formatCurrencyFromCents } from "@/lib/format";

// The Forecast Room's composed copy, pure so the arithmetic it asserts can be tested without a
// browser. Someone will check these numbers in the room; every sentence here has to tie.

/**
 * *"Everything · most likely $2.43M against a $2.70M goal — $270,800 short on today's numbers."*
 *
 * Abbreviated for the two large figures, EXACT for the shortfall: the first two are context and the
 * third is the thing a reader will write down.
 */
export function forecastSubtitle(
  scopeLabel: string,
  metrics: ForwardMetrics,
  simulation: SimulationResult,
): string {
  const likely = formatCurrencyAbbreviatedFromCents(simulation.yearEnd.mostLikelyCents);
  if (!metrics.goalDefined || metrics.goalCents === null) {
    return `${scopeLabel} · most likely ${likely}. No goal defined for this view.`;
  }
  const goal = formatCurrencyAbbreviatedFromCents(metrics.goalCents);
  const delta = simulation.yearEnd.mostLikelyCents - metrics.goalCents;
  if (delta >= 0) {
    return `${scopeLabel} · most likely ${likely} against a ${goal} goal — ${formatCurrencyFromCents(delta)} clear on today's numbers.`;
  }
  return `${scopeLabel} · most likely ${likely} against a ${goal} goal — ${formatCurrencyFromCents(-delta)} short on today's numbers.`;
}

/** `$2,700,000 GOAL − $469,200 WON = $2,230,800 BASIS` — the working, shown. */
export function basisLine(metrics: ForwardMetrics): string | null {
  if (metrics.goalCents === null || metrics.basisCents === null) return null;
  return (
    `${formatCurrencyFromCents(metrics.goalCents)} GOAL − ` +
    `${formatCurrencyFromCents(metrics.won.cents)} WON = ` +
    `${formatCurrencyFromCents(metrics.basisCents)} BASIS`
  );
}

/** `3× × $2,230,800 REMAINING = $6,692,400 NEEDED` */
export function neededLine(metrics: ForwardMetrics, multiple: number): string | null {
  if (metrics.basisCents === null || metrics.neededAtCoverageCents === null) return null;
  return (
    `${multiple}× × ${formatCurrencyFromCents(metrics.basisCents)} REMAINING = ` +
    `${formatCurrencyFromCents(metrics.neededAtCoverageCents)} NEEDED`
  );
}

/** *"0.77× coverage of the $2,230,800 still to raise"* — never a ratio without its denominator. */
export function coverageSubline(metrics: ForwardMetrics): string {
  if (metrics.coverageRatio === null || metrics.basisCents === null) {
    return "no goal defined for this view";
  }
  return `${metrics.coverageRatio.toFixed(2)}× coverage of the ${formatCurrencyFromCents(metrics.basisCents)} still to raise`;
}

/**
 * *"10,000 simulated years. Every dollar closes in full or not at all."*
 *
 * The trial count is rendered from `meta.trialCount`, not written down: an org that lowers it in
 * the rules editor would otherwise be reading a sentence that is no longer true. The second half
 * answers the half-pregnant objection inside the interface, before anyone raises it.
 */
export function simulationSubtitle(simulation: SimulationResult): string {
  return `${simulation.meta.trialCount.toLocaleString("en-US")} simulated years. Every dollar closes in full or not at all.`;
}

/**
 * *"Most likely lands $270,800 short. Only $430,000 of best-case sits outside it — and it is all
 * unqualified."*
 *
 * The second sentence's tail is conditional: claiming "all unqualified" when some of it is
 * qualified would be the kind of small lie that costs the whole screen its credibility.
 */
export function forecastVerdict(
  metrics: ForwardMetrics,
  simulation: SimulationResult,
): string | null {
  if (metrics.goalCents === null) return null;
  const delta = simulation.yearEnd.mostLikelyCents - metrics.goalCents;
  const head =
    delta >= 0
      ? `Most likely clears the goal by ${formatCurrencyFromCents(delta)}.`
      : `Most likely lands ${formatCurrencyFromCents(-delta)} short.`;

  const outside = simulation.yearEnd.bestCents - simulation.yearEnd.mostLikelyCents;
  if (outside <= 0) return head;

  const { cents, unqualifiedCents } = simulation.bestOnly;
  const tail =
    cents > 0 && unqualifiedCents === cents
      ? " — and it is all unqualified."
      : unqualifiedCents > 0
        ? ` — ${formatCurrencyFromCents(unqualifiedCents)} of it unqualified.`
        : ".";
  return `${head} Only ${formatCurrencyFromCents(outside)} of best-case sits outside it${tail}`;
}

/**
 * *"3 of these 9 only appear in Best. $430,000 of hope, nothing prospect-confirmed behind it."*
 *
 * The second sentence is withheld unless the best-only money really is unconfirmed.
 */
export function ledgerFooter(simulation: SimulationResult, total: number): string | null {
  const { count, cents, unqualifiedCents } = simulation.bestOnly;
  if (count === 0) return null;
  const head = `${count} of these ${total} only appear in Best.`;
  if (unqualifiedCents <= 0) return head;
  return `${head} ${formatCurrencyFromCents(unqualifiedCents)} of hope, nothing prospect-confirmed behind it.`;
}

/**
 * The left half of the reconciliation footer.
 *
 * Amendment 1 in a sentence: the four pre-close columns are not the headline metric — their
 * QUALIFIED SUBSET is. Without this line, summing the columns appears to contradict the header,
 * and the first person to do that arithmetic stops believing the rest of the screen.
 */
export function stageReconciliation(stage: StageBoard): string {
  return (
    `Get the visit → Follow up & close = ${formatCurrencyFromCents(stage.preCloseCents)} pre-close, ` +
    `of which ${formatCurrencyFromCents(stage.qualifiedCents)} is qualified — the asks on the table above.`
  );
}

/** `CLOSED WORK RIGHT OF THE DIVIDER · $48,000 · NOT IN THE HEADLINE NUMBER` */
export function closedWorkLine(stage: StageBoard): string {
  return `CLOSED WORK RIGHT OF THE DIVIDER · ${formatCurrencyFromCents(stage.closedWorkCents)} · NOT IN THE HEADLINE NUMBER`;
}

/**
 * Money whose simulated close date landed after period end.
 *
 * A caption, not a sixth card and not a second chart. Henrik's model tracks it explicitly — "slip
 * into '28" — and a year-end total that quietly omits it is a forecast with a hole in it.
 */
export function slipBeyondLine(simulation: SimulationResult): string | null {
  const { mostLikelyCents } = simulation.slipBeyondPeriod;
  if (mostLikelyCents <= 0) return null;
  return `${formatCurrencyFromCents(mostLikelyCents)} of most-likely money lands after period end — it is not in the total above.`;
}

/** `81d silent` · `15d ago` · `pushed 2×` — the chip's one fact. */
export function chipStaleness(chip: {
  readonly silenceDays: number | null;
  readonly closeDateMoves: number;
}): string {
  if (chip.closeDateMoves >= 2) return `pushed ${chip.closeDateMoves}×`;
  if (chip.silenceDays === null) return "never contacted";
  if (chip.silenceDays >= 30) return `${chip.silenceDays}d silent`;
  return `${chip.silenceDays}d ago`;
}

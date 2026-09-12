// 95 Forward — the simulation-backed consequence evaluator (Initiative 21 completing Initiative 20).
//
// I20 shipped the evaluator interface and an honest metric-backed fallback for `distorts-simulation`
// findings, because the Monte Carlo did not exist yet. That fallback says the thing it could know —
// "$180,000 is forecast on a close date we know is wrong" — and marks itself provisional.
//
// This is the real one. Registering it upgrades the same finding to "Distorts best/worst by $X"
// with provisional: false, and I20 re-sorts the Fix-first block by the new magnitude. The check
// definitions are untouched, which is the whole point of the interface.

import type { Consequence, ConsequenceEvaluator, ConsequenceEvaluatorInput } from "./forward-checks";
import { simulate } from "./forward-simulation";

function spreadOf(input: ConsequenceEvaluatorInput, overrides: Parameters<typeof simulate>[0]["overrides"]) {
  const { ctx, clock } = input;
  const result = simulate({
    snapshot: ctx.snapshot,
    scope: ctx.scope,
    settings: ctx.settings,
    clock,
    overrides,
    // Reduced fidelity on purpose: this is an estimate and it runs once per finding.
    trialCount: ctx.settings.simulation.consequenceTrialCount,
  });
  return result.yearEnd.bestCents - result.yearEnd.worstCents;
}

function formatCentsPlain(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/**
 * How much the record's contradiction is widening or narrowing the forecast band.
 *
 * Measured as the change in the best-to-worst spread between the portfolio as it stands and the
 * portfolio with the offending record corrected — which for a close date we know is wrong means
 * taking it out, since its timing is what the simulation cannot use.
 */
export const simulationConsequenceEvaluator: ConsequenceEvaluator = {
  kind: "distorts-simulation",
  evaluate: (input): Consequence => {
    const asIs = spreadOf(input, undefined);
    const corrected = spreadOf(input, input.check.hypothesis(input.ctx));
    const cents = Math.abs(asIs - corrected);

    return {
      kind: "distorts-simulation",
      cents,
      text:
        cents > 0
          ? `Distorts best/worst by ${formatCentsPlain(cents)}.`
          : "Its timing is unusable, though the band barely moves.",
      provisional: false,
    };
  },
};

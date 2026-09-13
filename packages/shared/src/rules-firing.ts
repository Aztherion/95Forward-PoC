// 95 Forward — "show me everything this rule is firing on" (Initiative 22).
//
// This is the payoff for the central constraint. Because a rule is code with editable parameters
// rather than free text compiled into behaviour, the question has an exact answer: run the
// predicate over the scope and list what it matched. No sampling, no approximation, no model.
//
// The answer is NOT recomputed here. The firing source registered for I20's checks delegates to
// I20's engine, so the /rules screen and the Fix-first block can never disagree — one predicate,
// evaluated by one code path, read by both screens. A parallel implementation here would be a
// second source of truth and would drift within a release.

import {
  checkScope,
  CHECK_DEFINITIONS,
  type CheckScopeInput,
  type Finding,
} from "./forward-checks";
import { catalogueEntry, type ResolvedEntry } from "./rules-catalogue";

export interface FiringInput extends CheckScopeInput {
  /** The org's resolved doctrine, so a disabled rule reports as disabled rather than as clean. */
  readonly resolved: readonly ResolvedEntry[];
}

/**
 * How one rule answers "what are you firing on?".
 *
 * I23 registers its own when it lands; until then the only source is I20's check engine. Returning
 * `Finding`s rather than a bespoke shape means the /rules screen renders every rule identically.
 */
export interface FiringSource {
  readonly ruleIds: readonly string[];
  findings(ruleId: string, input: FiringInput): readonly Finding[];
}

const sources = new Map<string, FiringSource>();

export function registerFiringSource(source: FiringSource): void {
  for (const id of source.ruleIds) sources.set(id, source);
}

/** Test-support only — the registry is module-global. */
export function resetFiringSources(): void {
  sources.clear();
}

/** I20's engine, restricted to the single named check. Registered by `registerBuiltInRules`. */
export const CHECK_FIRING_SOURCE: FiringSource = {
  ruleIds: CHECK_DEFINITIONS.map((check) => check.id),
  findings(ruleId, input) {
    const definition = CHECK_DEFINITIONS.find((check) => check.id === ruleId);
    if (!definition) return [];
    // Filtered at the input, not the output: identical code path to the Fix-first block, with the
    // set of checks narrowed to one. Consequences, effort and ordering all come out the same.
    return checkScope({ ...input, checks: [definition] }).findings;
  },
};

export interface FiringResult {
  readonly ruleId: string;
  /** `rule` entries fire; `parameter` entries are read. */
  readonly kind: "fires" | "is-read";
  /** Empty for `is-read`. */
  readonly findings: readonly Finding[];
  readonly count: number;
  readonly totalEffortSeconds: number;
  /** For `is-read`: what consumes the value. Empty for `fires`. */
  readonly readBy: readonly string[];
  /**
   * Why there is nothing to show, when there is nothing to show. Distinguishes "switched off" from
   * "on, and clean" — the same empty list otherwise means opposite things.
   */
  readonly note?: string;
}

function empty(ruleId: string, note: string, kind: FiringResult["kind"] = "fires"): FiringResult {
  return { ruleId, kind, findings: [], count: 0, totalEffortSeconds: 0, readBy: [], note };
}

/** What `ruleId` is currently firing on, within `input.scope`. */
export function firingFor(ruleId: string, input: FiringInput): FiringResult {
  const entry = input.resolved.find((e) => e.id === ruleId) ?? catalogueEntry(ruleId);

  if (!entry) return empty(ruleId, `No rule with id "${ruleId}" is registered.`);

  if (entry.kind === "parameter") {
    return {
      ...empty(
        ruleId,
        "A parameter has no predicate — it is read by the numbers listed, not fired.",
        "is-read",
      ),
      readBy: entry.readBy ?? [],
    };
  }

  if ("enabled" in entry && !(entry as ResolvedEntry).enabled) {
    return empty(
      ruleId,
      "Switched off, so it is firing on nothing. Turn it on to see what it would catch.",
    );
  }

  const source = sources.get(ruleId);
  if (!source) {
    return empty(
      ruleId,
      `"${ruleId}" is in the catalogue but no firing source is registered for it. ` +
        "Its owning initiative has not wired up the predicate yet.",
    );
  }

  const findings = source.findings(ruleId, input);
  return {
    ruleId,
    kind: "fires",
    findings,
    count: findings.length,
    totalEffortSeconds: findings.reduce((sum, f) => sum + f.effortSeconds, 0),
    readBy: [],
    note: findings.length === 0 ? "On, and currently catching nothing in this scope." : undefined,
  };
}

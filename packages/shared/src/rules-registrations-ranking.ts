// 95 Forward — the seven ranking rules, registered into the Rules of Robb catalogue (Initiative 23).
//
// This is the integration I22 built the registry for: two calls, and seven rules gain an editable
// statement, editable thresholds, override and audit support, a page at /rules/:ruleId, and an
// answer to "show me everything this is firing on". Nothing in I22 changed to accommodate them.
//
// Every threshold and every multiplier lives here rather than in forward-ranking.ts, so an
// organisation that disagrees with our coaching can say so without a release.

import { FORWARD_STAGES } from "./forward";
import {
  RANKING_RULES,
  RANKING_RULES_BY_ID,
  type RankingContext,
  type RankingRuleId,
} from "./forward-ranking";
import { registerCatalogueEntries, type CatalogueEntry, type ParameterSpec } from "./rules-catalogue";
import { registerFiringSource, type FiringInput, type FiringSource } from "./rules-firing";
import { computeQualification } from "./forward";
import { scopeMatches, type SnapshotOpportunity } from "./forward-metrics";
import type { Finding } from "./forward-checks";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The multiplier every ranking rule carries.
 *
 * The spread across the seven is deliberately narrow (1.1 to 2.0) so that IMPACT DOMINATES: a
 * $250,000 opportunity firing the weakest rule still outranks a $50,000 one firing the strongest.
 * That is the intended behaviour — the multiplier says which of two comparable opportunities to do
 * first, not that a small problem of an urgent kind beats a large one of a calm kind.
 */
function multiplierSpec(defaultValue: number, why: string): ParameterSpec {
  return {
    key: "multiplier",
    label: "Weight",
    unit: "x",
    type: "number",
    defaultValue,
    min: 0.1,
    max: 5,
    step: 0.1,
    description: why,
  };
}

const EFFORT_NOTE =
  "Raising this above about 2.5 lets the rule outrank opportunities several times its size, which " +
  "is usually not what anybody means.";

/** Cadence per stage, in days. `follow_up_and_close` is the design's "every 14 days". */
const DEFAULT_CADENCE: Record<string, number> = {
  get_the_visit: 30,
  prep_the_visit: 21,
  visit_and_ask: 14,
  follow_up_and_close: 14,
  celebrate_steward: 60,
  repeat: 90,
};

const ENTRIES: readonly CatalogueEntry[] = [
  {
    id: "live-ask-silence",
    kind: "rule",
    category: "relationship-cadence",
    label: "Live ask gone silent",
    statement:
      "Following up is very time sensitive: an ask you have already made and then gone quiet on is " +
      "the most expensive thing on your board.",
    source: "I23",
    defaultEnabled: true,
    parameters: [
      multiplierSpec(
        2,
        "The heaviest of the seven: the money is already on the table and decaying. " + EFFORT_NOTE,
      ),
      // Per-stage, not one global number. The design says "cadence for this stage · every 14 days",
      // and a get-the-visit prospect legitimately goes a month without contact while an ask waiting
      // on a yes does not.
      ...FORWARD_STAGES.map((stage) => ({
        key: `cadence.${stage}`,
        label: `Cadence — ${stage.replace(/_/g, " ")}`,
        unit: "days",
        type: "number" as const,
        defaultValue: DEFAULT_CADENCE[stage] ?? 21,
        min: 1,
        max: 365,
        step: 1,
      })),
    ],
  },
  {
    id: "prospect-ahead-of-us",
    kind: "rule",
    category: "forecast-hygiene",
    label: "Prospect is ahead of us",
    statement:
      "If they have given you a date or put a meeting in the diary, the ask should already be " +
      "approved internally. They have moved and we have not.",
    source: "I23",
    defaultEnabled: true,
    parameters: [
      multiplierSpec(
        1.8,
        "Second heaviest: the clock is theirs, not ours, and the fix is entirely within our walls.",
      ),
    ],
  },
  {
    id: "visits-without-specific-ask",
    kind: "rule",
    category: "relationship-cadence",
    label: "Visits without a specific ask",
    statement:
      "Two visits in and nothing specific asked for is a relationship you are paying for and not " +
      "using.",
    source: "I23",
    defaultEnabled: true,
    parameters: [
      multiplierSpec(
        1.9,
        "Above `prospect-ahead-of-us` (1.8) deliberately, from I23's review: two visits with no ask " +
          "is the cardinal failure of the method, and where both fire the amber BLOCKED label was " +
          "hiding a red UNASKED one. The more serious fact should declare the card.",
      ),
      {
        key: "visitThreshold",
        label: "Visits before this fires",
        unit: "visits",
        type: "number",
        defaultValue: 2,
        min: 1,
        max: 10,
        step: 1,
        description:
          "Set this to 1 and every second meeting is flagged, including the one where asking would " +
          "have been premature.",
      },
    ],
  },
  {
    id: "visit-within-7d-unprepped",
    kind: "rule",
    category: "relationship-cadence",
    label: "Visit coming, not prepped",
    statement:
      "Prepping for the visit is essential: a meeting in the diary with no brief and no agreed " +
      "number is a meeting you will leave empty-handed.",
    source: "I23",
    defaultEnabled: true,
    parameters: [
      multiplierSpec(
        1.4,
        "Time-boxed and cheap to fix, but its ceiling is one meeting rather than the whole ask.",
      ),
      {
        key: "windowDays",
        label: "How far ahead to look",
        unit: "days",
        type: "number",
        defaultValue: 7,
        min: 1,
        max: 60,
        step: 1,
        description: "Widen this and it fires on visits nobody could reasonably have prepped yet.",
      },
    ],
  },
  {
    id: "verbal-agreement-unwritten",
    kind: "rule",
    category: "forecast-hygiene",
    label: "Agreed out loud, never in writing",
    statement:
      "The forecast should be clean and consistent: a verbal yes that nobody has written down is " +
      "not yet a gift.",
    source: "I23",
    defaultEnabled: true,
    parameters: [
      multiplierSpec(
        1.6,
        "Nearly closed and cheap to finish, and the loss if it evaporates is the whole amount.",
      ),
      {
        key: "graceDays",
        label: "Grace period",
        unit: "days",
        type: "number",
        defaultValue: 14,
        min: 0,
        max: 180,
        step: 1,
        description:
          "Days between them agreeing and this becoming a problem. Zero flags an agreement made " +
          "this morning, which reads as nagging rather than coaching.",
      },
    ],
  },
  {
    id: "intro-offered-unused",
    kind: "rule",
    category: "relationship-cadence",
    label: "Introduction offered, never used",
    statement:
      "Following up is very time sensitive: an introduction somebody offered and nobody took up is " +
      "the fastest asset you own to lose.",
    source: "I23",
    defaultEnabled: true,
    parameters: [
      multiplierSpec(
        1.3,
        "A decaying asset, but there is no money on the table yet — so it sits below the live asks.",
      ),
      {
        key: "graceDays",
        label: "Grace period",
        unit: "days",
        type: "number",
        defaultValue: 14,
        min: 0,
        max: 180,
        step: 1,
      },
    ],
  },
  {
    id: "partner-path-unused",
    kind: "rule",
    category: "relationship-cadence",
    label: "Warm path never walked",
    statement:
      "Somebody on your side already knows them and has never been asked to open the door.",
    source: "I23",
    defaultEnabled: true,
    parameters: [
      multiplierSpec(
        1.1,
        "Lightest of the seven: a partner existing is the weakest evidence of intent on the board, " +
          "and this fires on records where nothing has happened yet.",
      ),
    ],
  },

  // -- Queue-level parameters, not rules ---------------------------------------------------------
  {
    id: "queue-size",
    kind: "parameter",
    category: "coverage-parameters",
    label: "Moves on the board",
    statement: "The board shows the handful of moves that are actually worth today.",
    source: "I23",
    defaultEnabled: true,
    readBy: ["the action queue", "the below-the-cut count"],
    parameters: [
      {
        key: "items",
        label: "Items",
        unit: "moves",
        type: "number",
        defaultValue: 7,
        min: 1,
        max: 50,
        step: 1,
        description:
          "Past about a dozen this stops being a coach and goes back to being a list, which is the " +
          "thing it replaced.",
      },
    ],
  },
  {
    id: "queue-urgency",
    kind: "parameter",
    category: "coverage-parameters",
    label: "Urgency from the close date",
    statement:
      "The nearer a close date, the more today's move matters. A date that has already passed is " +
      "the most urgent thing on the board, not the least.",
    source: "I23",
    defaultEnabled: true,
    readBy: ["every queue score"],
    parameters: [
      {
        key: "horizonDays",
        label: "Horizon",
        unit: "days",
        type: "number",
        defaultValue: 90,
        min: 7,
        max: 365,
        step: 1,
        description: "Beyond this, a close date adds no urgency at all.",
      },
      {
        key: "maxMultiplier",
        label: "Most urgency can weigh",
        unit: "x",
        type: "number",
        defaultValue: 2,
        min: 1,
        max: 5,
        step: 0.1,
        description:
          "Reached on the close date and held past it. Set to 1 to rank on impact alone.",
      },
    ],
  },
];

/**
 * The firing source for the seven.
 *
 * I20's checks return `Finding`s, so these do too — the /rules screen renders every rule the same
 * way and does not need to know which initiative owns which. The predicate is the SAME `applies`
 * the ranker calls; a second copy here would drift from the queue within a release, and "show me
 * everything this is firing on" would quietly start lying.
 */
export const RANKING_FIRING_SOURCE: FiringSource = {
  ruleIds: RANKING_RULES.map((rule) => rule.id),
  findings(ruleId, input: FiringInput): readonly Finding[] {
    const rule = RANKING_RULES_BY_ID.get(ruleId);
    if (!rule) return [];

    const entry = input.resolved.find((e) => e.id === ruleId);
    const params = entry?.values ?? {};
    const now = input.clock.now();
    const today = now.toISOString().slice(0, 10);
    const findings: Finding[] = [];

    for (const opportunity of input.snapshot.opportunities) {
      if (!scopeMatches(opportunity, input.scope)) continue;
      if (opportunity.status !== "open") continue;

      const ctx = rankingContext(opportunity, input, now, today, params);
      if (!rule.applies(ctx)) continue;

      findings.push({
        ruleId,
        opportunityId: opportunity.id,
        prospectId: opportunity.prospectId,
        initiativeId: opportunity.initiativeId,
        amountCents: opportunity.amountCents,
        statement: rule.nextAction(ctx).label,
        consequence: {
          kind: "excluded-from-forecast",
          cents: null,
          // Deliberately not a dollar figure. I20's consequences are what a CONTRADICTION costs;
          // a coaching rule is a move not yet made, and pricing it here would invent a number the
          // queue computes properly through I19's what-if.
          text: "A move the board is asking for.",
          provisional: true,
        },
        effortSeconds: 0,
        resolution: rule.resolution(ctx),
      });
    }
    return findings;
  },
};

function rankingContext(
  opportunity: SnapshotOpportunity,
  input: FiringInput,
  now: Date,
  today: string,
  params: RankingContext["params"],
): RankingContext {
  const qualification = computeQualification(
    input.snapshot.definitions,
    opportunity.confirmedMilestoneKeys,
  );
  const silence =
    opportunity.lastContactAt === null
      ? null
      : Math.max(
          0,
          Math.floor((now.getTime() - new Date(opportunity.lastContactAt).getTime()) / DAY_MS),
        );
  const daysToClose = opportunity.closeDate
    ? Math.round(
        (new Date(`${opportunity.closeDate}T00:00:00.000Z`).getTime() -
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) /
          DAY_MS,
      )
    : null;

  return {
    opportunity,
    snapshot: input.snapshot,
    now,
    today,
    qualified: qualification.qualified,
    missingBlockingKeys: qualification.missingBlocking.map((d) => d.key),
    silenceDays: silence,
    daysToClose,
    params,
  };
}

/** Idempotent, like I22's own. */
export function registerRankingRules(): void {
  registerCatalogueEntries(ENTRIES);
  registerFiringSource(RANKING_FIRING_SOURCE);
}

export const RANKING_RULE_MULTIPLIER_DEFAULTS: Readonly<Record<RankingRuleId, number>> = {
  "live-ask-silence": 2,
  "visits-without-specific-ask": 1.9,
  "prospect-ahead-of-us": 1.8,
  "verbal-agreement-unwritten": 1.6,
  "visit-within-7d-unprepped": 1.4,
  "intro-offered-unused": 1.3,
  "partner-path-unused": 1.1,
};

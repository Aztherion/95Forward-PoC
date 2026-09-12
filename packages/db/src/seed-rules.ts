// 95 Forward — seeding the doctrine (Initiative 22).
//
// Two things get seeded, and NEITHER of them is a rule override:
//
//   • The GOALS, in priority order. These are statements of what the organisation is trying to do.
//     They have no code default — the catalogue ships predicates and parameters, not ambitions —
//     so without a seed the goals section is empty and the priority order has nothing to order.
//
//   • Nothing else. Every rule statement in the Rules of Robb is already the shipped default text
//     of its catalogue entry, so seeding an override for it would be a lie in the editor: the rule
//     would show "changed from default" on a fresh install, and resetting it would "restore" text
//     the org never saw. See rules-registrations.ts for where those sentences actually live.
//
// In particular, the two Rules of Robb lines about likelihood
//
//     "If Amount Agreed To — or any of the follow-on criteria — is checked yes, the likelihood of
//      booking should be High"
//     "If the Visit rating is poor, the likelihood of booking should be rather low"
//
// are the default statements of I20's `probability-below-evidence` and
// `probability-above-visit-rating`. They are NOT seeded here as new rules. Creating a second copy
// would mean two rows firing the same predicate, two RULE chips for one finding, and an org that
// switches one off and sees no change.

import type { Database } from "./client";
import { ruleGoals } from "./schema/rules";
import { stableId } from "./seed-records-core";

/**
 * The organisation's goals, most important first.
 *
 * Order is the point. I23 ranks work against the top goal; "by end of year" outranking "next
 * quarter" is what makes a January opportunity worth surfacing at all.
 */
export const RULE_GOAL_SEED: readonly { key: string; statement: string }[] = [
  { key: "most-likely-year", statement: "Total Most Likely bookings by end of year" },
  { key: "most-likely-quarter", statement: "Total Most Likely bookings for next quarter" },
];

export async function seedRules(db: Database, tenantId: string): Promise<void> {
  for (const [index, goal] of RULE_GOAL_SEED.entries()) {
    const values = { tenantId, statement: goal.statement, priority: index + 1 };
    await db
      .insert(ruleGoals)
      .values({ id: stableId(`rule-goal:${goal.key}`), ...values })
      // Update rather than DoNothing: the priority order is the whole content of this table, and a
      // reseed that left a hand-reordered demo in place would make the seed untrustworthy.
      .onConflictDoUpdate({ target: ruleGoals.id, set: values });
  }
}

/** Exported for the seed test. */
export const RULE_SEED_FACTS = {
  goalStatementsInPriorityOrder: RULE_GOAL_SEED.map((g) => g.statement),
} as const;

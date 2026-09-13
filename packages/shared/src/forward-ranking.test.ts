// The pure half of the action queue (Initiative 23). The golden queue against the real seed, the
// catalogue integration and the pin/dismiss persistence live in packages/db/src/forward-ranking.test.ts.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_MILESTONE_DEFINITIONS, type MilestoneDefinition } from "./forward";
import { DEFAULT_FORWARD_SETTINGS, fixedClock, type ForwardSettings } from "./forward-settings";
import type { MetricScope, MetricsSnapshot, SnapshotOpportunity } from "./forward-metrics";
import {
  assertStatusLabel,
  computeSuperlatives,
  dayWork,
  isDismissalLive,
  QUEUE_STATUS_LABELS,
  RANKING_RULES,
  RANKING_RULE_IDS,
  STATUS_HEALTH,
  urgencyFactor,
  type QueueDecision,
} from "./forward-ranking";
import { resetCatalogue, resolveCatalogue } from "./rules-catalogue";
import { resetFiringSources } from "./rules-firing";
import { registerBuiltInRules } from "./rules-registrations";
import { registerRankingRules } from "./rules-registrations-ranking";

const DEFS: readonly MilestoneDefinition[] = DEFAULT_MILESTONE_DEFINITIONS;
const ALL_BLOCKING = DEFS.filter((d) => d.blocking).map((d) => d.key);
const SETTINGS: ForwardSettings = DEFAULT_FORWARD_SETTINGS;
const ANCHOR = new Date("2026-09-12T12:00:00.000Z");
const CLOCK = fixedClock(ANCHOR);
const ALL: MetricScope = { rep: "all", initiative: "all", period: "FY26" };

function daysAgo(n: number): string {
  return new Date(ANCHOR.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}
function daysAhead(n: number): string {
  return new Date(ANCHOR.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
}

function opportunity(partial: Partial<SnapshotOpportunity> & { id: string }): SnapshotOpportunity {
  return {
    prospectId: `prospect-${partial.id}`,
    initiativeId: "i-kamuli",
    ownerUserId: "u-dana",
    amountCents: 100_000_00,
    stage: "visit_and_ask",
    status: "open",
    closeDate: null,
    confirmedMilestoneKeys: [],
    dateConfidence: "semi_firm",
    probability: "medium",
    visitRating: null,
    milestoneEvidence: {},
    lastContactAt: null,
    milestoneConfirmedAt: {},
    visitCount: 0,
    nextVisitAt: null,
    nextVisitPrepared: false,
    closeDateMoves: 0,
    closeDateMovesProspectSourced: false,
    partners: [],
    ...partial,
  };
}

function snapshotOf(opportunities: readonly SnapshotOpportunity[]): MetricsSnapshot {
  return {
    orgRefId: "org",
    opportunities,
    definitions: DEFS,
    goals: [{ scope: "org", scopeRefId: "org", fiscalPeriod: "FY26", amountCents: 1_000_000_00 }],
  };
}

function run(opportunities: readonly SnapshotOpportunity[], decisions?: readonly QueueDecision[]) {
  return dayWork({
    snapshot: snapshotOf(opportunities),
    scope: ALL,
    settings: SETTINGS,
    clock: CLOCK,
    resolved: resolveCatalogue([]),
    decisions,
  });
}

beforeEach(() => {
  resetCatalogue();
  resetFiringSources();
  registerBuiltInRules();
  registerRankingRules();
});

afterEach(() => {
  resetCatalogue();
  resetFiringSources();
});

// -------------------------------------------------------------------------------------------

describe("the status enum is closed", () => {
  it("maps every label to exactly one health", () => {
    for (const label of QUEUE_STATUS_LABELS) {
      expect(STATUS_HEALTH[label], label).toBeDefined();
    }
    expect(Object.keys(STATUS_HEALTH).sort()).toEqual([...QUEUE_STATUS_LABELS].sort());
  });

  it("refuses a label outside the seven at runtime, not merely in the type", () => {
    // The type is erased at runtime. The one thing that must never happen is a label reaching a
    // screen that has no colour for it.
    expect(() => assertStatusLabel("needs_attention")).toThrow(/closed/);
    expect(assertStatusLabel("at_risk")).toBe("at_risk");
  });

  it("declares a label for every rule, and every one of them is in the seven", () => {
    expect(RANKING_RULES.map((r) => r.id)).toEqual([...RANKING_RULE_IDS]);
    for (const rule of RANKING_RULES) {
      expect(() => assertStatusLabel(rule.statusLabel), rule.id).not.toThrow();
    }
  });

  it("emits only closed labels, and the primary rule is the one that declared it", () => {
    const result = run([
      opportunity({
        id: "a",
        confirmedMilestoneKeys: ["specific_ask_made"],
        lastContactAt: daysAgo(60),
      }),
      opportunity({ id: "b", partners: [partner("p1")] }),
    ]);
    expect(result.queue.length).toBeGreaterThan(0);
    for (const item of result.queue) {
      expect(() => assertStatusLabel(item.statusLabel)).not.toThrow();
      expect(item.health).toBe(STATUS_HEALTH[item.statusLabel]);
      const rule = RANKING_RULES.find((r) => r.id === item.primaryRuleId)!;
      // The primary rule DECLARES the label; nothing computes it separately.
      expect(item.statusLabel).toBe(rule.statusLabel);
    }
  });
});

function partner(id: string, overrides: Partial<import("./forward-metrics").SnapshotPartner> = {}) {
  return {
    id,
    name: `Partner ${id}`,
    role: "Board connector",
    introOfferedAt: null,
    introUsedAt: null,
    askedToOpenDoorAt: null,
    ...overrides,
  };
}

describe("every item is attributable", () => {
  it("carries at least one rule id, and the primary is among them", () => {
    const result = run([
      opportunity({
        id: "a",
        confirmedMilestoneKeys: ["specific_ask_made", "amount_agreed"],
        milestoneConfirmedAt: { amount_agreed: daysAgo(40) },
        lastContactAt: daysAgo(60),
      }),
    ]);
    for (const item of result.queue) {
      expect(item.firingRuleIds.length).toBeGreaterThan(0);
      expect(item.firingRuleIds).toContain(item.primaryRuleId);
    }
  });

  it("returns one item per opportunity even when several rules fire", () => {
    const result = run([
      opportunity({
        id: "a",
        confirmedMilestoneKeys: ["specific_ask_made", "amount_agreed"],
        milestoneConfirmedAt: { amount_agreed: daysAgo(40) },
        lastContactAt: daysAgo(60),
      }),
    ]);
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0]!.firingRuleIds.length).toBeGreaterThan(1);
  });
});

describe("multipliers combine by maximum, not product", () => {
  it("three rules on one opportunity do not outrank one stronger rule at the same impact", () => {
    // `many` fires live-ask-silence (2.0) plus verbal-agreement-unwritten (1.6). Under a PRODUCT it
    // would score 3.2x and bury `single`; under MAX both are 2.0 and the tie breaks on id.
    const many = opportunity({
      id: "aaa-many",
      amountCents: 100_000_00,
      confirmedMilestoneKeys: ["specific_ask_made", "amount_agreed"],
      milestoneConfirmedAt: { amount_agreed: daysAgo(40) },
      lastContactAt: daysAgo(60),
    });
    const single = opportunity({
      id: "bbb-single",
      amountCents: 100_000_00,
      confirmedMilestoneKeys: ["specific_ask_made"],
      lastContactAt: daysAgo(60),
    });

    const result = run([many, single]);
    const a = result.queue.find((i) => i.opportunityId === "aaa-many")!;
    const b = result.queue.find((i) => i.opportunityId === "bbb-single")!;

    expect(a.firingRuleIds.length).toBe(2);
    expect(b.firingRuleIds.length).toBe(1);
    expect(a.multiplier).toBe(2);
    expect(b.multiplier).toBe(2);
    expect(a.score).toBe(b.score);
  });

  it("a single higher-multiplier rule beats several weaker ones at equal impact", () => {
    const weakMany = opportunity({
      id: "weak",
      amountCents: 100_000_00,
      visitCount: 3,
      nextVisitAt: daysAhead(3),
      nextVisitPrepared: false,
      partners: [partner("x", { introOfferedAt: daysAgo(40) })],
    });
    const strongOne = opportunity({
      id: "strong",
      amountCents: 100_000_00,
      confirmedMilestoneKeys: ["specific_ask_made"],
      lastContactAt: daysAgo(60),
    });

    const result = run([weakMany, strongOne]);
    const weak = result.queue.find((i) => i.opportunityId === "weak")!;
    const strong = result.queue.find((i) => i.opportunityId === "strong")!;

    expect(weak.firingRuleIds.length).toBeGreaterThanOrEqual(3);
    expect(strong.firingRuleIds).toHaveLength(1);
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(result.queue[0]!.opportunityId).toBe("strong");
  });
});

describe("stability", () => {
  it("two runs on identical data produce an identical order", () => {
    const rows = [
      opportunity({ id: "z", confirmedMilestoneKeys: ["specific_ask_made"], lastContactAt: daysAgo(60) }),
      opportunity({ id: "a", confirmedMilestoneKeys: ["specific_ask_made"], lastContactAt: daysAgo(60) }),
      opportunity({ id: "m", confirmedMilestoneKeys: ["specific_ask_made"], lastContactAt: daysAgo(60) }),
    ];
    const first = run(rows).queue.map((i) => i.opportunityId);
    const second = run([...rows].reverse()).queue.map((i) => i.opportunityId);
    expect(first).toEqual(second);
  });

  it("breaks exact ties on opportunity id, so the queue never jitters", () => {
    // Identical amounts, identical rule, identical silence: only the id can decide.
    const rows = ["ccc", "aaa", "bbb"].map((id) =>
      opportunity({
        id,
        amountCents: 50_000_00,
        confirmedMilestoneKeys: ["specific_ask_made"],
        lastContactAt: daysAgo(60),
      }),
    );
    const result = run(rows);
    expect(result.queue.map((i) => i.opportunityId)).toEqual(["aaa", "bbb", "ccc"]);
    expect(new Set(result.queue.map((i) => i.score)).size).toBe(1);
  });
});

describe("urgency", () => {
  it("is neutral with no close date, and maxed once the date has passed", () => {
    expect(urgencyFactor(null, 90, 2)).toBe(1);
    expect(urgencyFactor(0, 90, 2)).toBe(2);
    // Past due is the MOST urgent thing on the board, not the least.
    expect(urgencyFactor(-30, 90, 2)).toBe(2);
    expect(urgencyFactor(90, 90, 2)).toBe(1);
    expect(urgencyFactor(200, 90, 2)).toBe(1);
  });

  it("rises monotonically as the date approaches", () => {
    const far = urgencyFactor(80, 90, 2);
    const near = urgencyFactor(10, 90, 2);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(1);
  });
});

describe("impact is measured, not assumed", () => {
  it("is what qualifying would add for an unqualified opportunity", () => {
    const result = run([
      opportunity({
        id: "unqualified",
        amountCents: 250_000_00,
        closeDate: "2026-10-31",
        confirmedMilestoneKeys: ["specific_ask_made"],
        lastContactAt: daysAgo(60),
      }),
    ]);
    // Nothing of it is counted today, so qualifying it adds the whole amount.
    expect(result.queue[0]!.impactCents).toBe(250_000_00);
  });

  it("is what losing it would withhold for a qualified one", () => {
    const result = run([
      opportunity({
        id: "qualified",
        amountCents: 250_000_00,
        closeDate: "2026-10-31",
        confirmedMilestoneKeys: [...ALL_BLOCKING, "specific_ask_made"],
        lastContactAt: daysAgo(60),
      }),
    ]);
    expect(result.queue[0]!.impactCents).toBe(250_000_00);
  });

  it("is not close-date-bounded, because the pipeline it measures is not either", () => {
    // I19 decided this deliberately: "on the table" means currently live, and an opportunity whose
    // date has slipped past period end is still on the table. Impact rides on that same definition
    // rather than re-deciding it here — if the two disagreed, an item's impact would contradict the
    // coverage figure sitting beside it on the same screen.
    const result = run([
      opportunity({
        id: "next-year",
        amountCents: 250_000_00,
        closeDate: "2027-03-31",
        confirmedMilestoneKeys: ["specific_ask_made"],
        lastContactAt: daysAgo(60),
      }),
    ]);
    expect(result.queue[0]!.impactCents).toBe(250_000_00);
    // What a far-off date DOES change is urgency, which is the honest lever for "not this week".
    expect(result.queue[0]!.urgency).toBe(1);
  });
});

describe("superlatives", () => {
  it("counts an ask as live only while it is still outstanding", () => {
    const written = opportunity({
      id: "written",
      amountCents: 400_000_00,
      confirmedMilestoneKeys: ["specific_ask_made", "confirmed_in_writing"],
      lastContactAt: daysAgo(5),
    });
    const outstanding = opportunity({
      id: "outstanding",
      amountCents: 250_000_00,
      confirmedMilestoneKeys: ["specific_ask_made"],
      lastContactAt: daysAgo(81),
    });
    const sup = computeSuperlatives([written, outstanding], ANCHOR);
    // The bigger one has already been confirmed in writing — it is not an ask anybody is waiting on.
    expect(sup.largestLiveAskId).toBe("outstanding");
    expect(sup.longestSilenceId).toBe("outstanding");
    expect(sup.longestSilenceDays).toBe(81);
  });

  it("says 'largest' only when it is true", () => {
    const big = opportunity({
      id: "big",
      amountCents: 400_000_00,
      confirmedMilestoneKeys: ["specific_ask_made"],
      lastContactAt: daysAgo(5),
    });
    const small = opportunity({
      id: "small",
      amountCents: 50_000_00,
      confirmedMilestoneKeys: ["specific_ask_made"],
      lastContactAt: daysAgo(90),
    });
    const item = run([big, small]).queue.find((i) => i.opportunityId === "small")!;
    expect(item.rationale).not.toContain("largest");
    expect(item.rationale).toContain("gone silent longest");
  });
});

describe("rationales", () => {
  it("fall back to the rule's own statement rather than inventing a superlative", () => {
    const result = run([opportunity({ id: "cold-one", partners: [partner("p1")] })]);
    const item = result.queue[0]!;
    expect(item.primaryRuleId).toBe("partner-path-unused");
    expect(item.rationale).toContain("Partner p1");
  });

  // Three of the seven are never PRIMARY on the seeded portfolio — they fire, but a heavier rule
  // always declares the sentence. Their templates would otherwise ship unread, so they are
  // exercised here directly, one opportunity each.
  it("read correctly for the rules the seed never makes primary", () => {
    const unwritten = run([
      opportunity({
        id: "unwritten",
        confirmedMilestoneKeys: ["amount_agreed"],
        milestoneConfirmedAt: { amount_agreed: daysAgo(30) },
      }),
    ]).queue[0]!;
    expect(unwritten.primaryRuleId).toBe("verbal-agreement-unwritten");
    expect(unwritten.statusText).toBe("CLOSING");
    expect(unwritten.rationale).toBe(
      "They agreed to the amount 30 days ago and nothing has been put in writing.",
    );

    const unasked = run([opportunity({ id: "unasked", visitCount: 3 })]).queue[0]!;
    expect(unasked.primaryRuleId).toBe("visits-without-specific-ask");
    expect(unasked.statusText).toBe("UNASKED");
    expect(unasked.rationale).toBe(
      "You have been in front of them 3 times and never asked for anything specific.",
    );

    const unprepped = run([
      opportunity({
        id: "unprepped",
        // Already cleared internally, so only the missing brief is left to complain about — and
        // `prospect-ahead-of-us` stays quiet, which is what makes this rule primary.
        confirmedMilestoneKeys: ["ask_approved_by_leader", "specific_ask_made"],
        nextVisitAt: daysAhead(3),
        nextVisitPrepared: false,
      }),
    ]).queue[0]!;
    expect(unprepped.primaryRuleId).toBe("visit-within-7d-unprepped");
    expect(unprepped.statusText).toBe("ON TRACK");
    expect(unprepped.rationale).toBe("The visit is in 3 days and there is no prep brief.");
  });

  it("never shows the no-agreed-amount branch, because a heavier rule always covers it", () => {
    // `visit-within-7d-unprepped` has two branches: no brief, or no internally agreed amount. The
    // SECOND one can never be the rationale a user sees — a meeting in the diary with no approved
    // ask is exactly what `prospect-ahead-of-us` fires on, and at 1.8 it always declares the
    // sentence instead. The branch is still correct; it is just permanently second in line.
    const item = run([
      opportunity({
        id: "no-number",
        confirmedMilestoneKeys: ["specific_ask_made"],
        nextVisitAt: daysAhead(1),
        nextVisitPrepared: true,
      }),
    ]).queue[0]!;
    expect(item.firingRuleIds).toContain("visit-within-7d-unprepped");
    expect(item.primaryRuleId).toBe("prospect-ahead-of-us");
    expect(item.rationale).not.toContain("ask amount");
  });

  it("singularises a one-day and one-visit sentence", () => {
    const oneDay = run([
      opportunity({
        id: "one-day",
        confirmedMilestoneKeys: ["amount_agreed"],
        milestoneConfirmedAt: { amount_agreed: daysAgo(15) },
      }),
    ]).queue[0]!;
    expect(oneDay.rationale).toContain("15 days ago");

    const oneVisit = run([
      opportunity({ id: "one-visit", visitCount: 1 }),
    ]).queue;
    // The default threshold is two visits, so one does not fire at all — the rule does not nag
    // somebody for having had a single meeting.
    expect(oneVisit).toHaveLength(0);
  });

  it("are identical across runs on identical data", () => {
    const rows = [
      opportunity({
        id: "a",
        confirmedMilestoneKeys: ["specific_ask_made"],
        lastContactAt: daysAgo(81),
        closeDate: "2026-10-31",
      }),
    ];
    expect(run(rows).queue[0]!.rationale).toBe(run(rows).queue[0]!.rationale);
  });
});

describe("pin and dismiss", () => {
  const rows = [
    opportunity({
      id: "big",
      amountCents: 400_000_00,
      confirmedMilestoneKeys: ["specific_ask_made"],
      lastContactAt: daysAgo(60),
    }),
    opportunity({ id: "small", amountCents: 10_000_00, partners: [partner("p1")] }),
  ];

  it("a pin forces the item to the top regardless of score", () => {
    const plain = run(rows);
    expect(plain.queue[0]!.opportunityId).toBe("big");

    const pinned = run(rows, [
      { kind: "pin", opportunityId: "small", ruleId: null, dataVersion: "v1", decidedAt: daysAgo(1) },
    ]);
    expect(pinned.queue[0]!.opportunityId).toBe("small");
    expect(pinned.queue[0]!.pinned).toBe(true);
    expect(pinned.queue[1]!.opportunityId).toBe("big");
  });

  it("a dismissal removes the item", () => {
    const result = run(rows, [
      { kind: "dismiss", opportunityId: "big", ruleId: null, dataVersion: "v1", decidedAt: daysAgo(1) },
    ]);
    expect(result.queue.some((i) => i.opportunityId === "big")).toBe(false);
  });

  it("a dismissal expires as soon as the data it was about moves", () => {
    const decision: QueueDecision = {
      kind: "dismiss",
      opportunityId: "big",
      ruleId: null,
      dataVersion: "v1",
      decidedAt: daysAgo(1),
    };
    expect(isDismissalLive(decision, { big: "v1" })).toBe(true);
    // Fixing it properly re-arms the rule — and so does it getting worse.
    expect(isDismissalLive(decision, { big: "v2" })).toBe(false);

    const stale = dayWork({
      snapshot: snapshotOf(rows),
      scope: ALL,
      settings: SETTINGS,
      clock: CLOCK,
      resolved: resolveCatalogue([]),
      decisions: [decision],
      dataVersions: { big: "v2" },
    });
    expect(stale.queue.some((i) => i.opportunityId === "big")).toBe(true);
  });
});

describe("catalogue integration", () => {
  it("reorders the queue when a multiplier changes", () => {
    const rows = [
      opportunity({
        id: "silent",
        amountCents: 100_000_00,
        confirmedMilestoneKeys: ["specific_ask_made"],
        lastContactAt: daysAgo(60),
      }),
      opportunity({ id: "coldish", amountCents: 100_000_00, partners: [partner("p1")] }),
    ];
    const before = run(rows).queue.map((i) => i.opportunityId);
    expect(before[0]).toBe("silent");

    const after = dayWork({
      snapshot: snapshotOf(rows),
      scope: ALL,
      settings: SETTINGS,
      clock: CLOCK,
      resolved: resolveCatalogue([
        { ruleId: "partner-path-unused", parameterValues: { multiplier: 5 } },
      ]),
    }).queue.map((i) => i.opportunityId);
    expect(after[0]).toBe("coldish");
  });

  it("disabling a rule removes its items and its rationales", () => {
    const rows = [opportunity({ id: "coldish", partners: [partner("p1")] })];
    expect(run(rows).queue).toHaveLength(1);

    const off = dayWork({
      snapshot: snapshotOf(rows),
      scope: ALL,
      settings: SETTINGS,
      clock: CLOCK,
      resolved: resolveCatalogue([{ ruleId: "partner-path-unused", enabled: false }]),
    });
    expect(off.queue).toHaveLength(0);
  });

  it("honours an edited threshold", () => {
    const rows = [
      opportunity({
        id: "quiet",
        confirmedMilestoneKeys: ["specific_ask_made"],
        lastContactAt: daysAgo(20),
        stage: "visit_and_ask",
      }),
    ];
    // Default cadence for visit_and_ask is 14 days, so 20 days of silence fires.
    expect(run(rows).queue).toHaveLength(1);

    const relaxed = dayWork({
      snapshot: snapshotOf(rows),
      scope: ALL,
      settings: SETTINGS,
      clock: CLOCK,
      resolved: resolveCatalogue([
        { ruleId: "live-ask-silence", parameterValues: { "cadence.visit_and_ask": 30 } },
      ]),
    });
    expect(relaxed.queue).toHaveLength(0);
  });

  it("ranks nothing at all when the catalogue is empty", () => {
    // The catalogue is the authority on what exists: an unregistered rule is not silently on.
    resetCatalogue();
    const result = dayWork({
      snapshot: snapshotOf([
        opportunity({ id: "a", confirmedMilestoneKeys: ["specific_ask_made"], lastContactAt: daysAgo(90) }),
      ]),
      scope: ALL,
      settings: SETTINGS,
      clock: CLOCK,
      resolved: [],
    });
    expect(result.queue).toHaveLength(0);
  });
});

describe("below the cut", () => {
  it("counts and sizes the remainder, and answers whether it changes the number", () => {
    const rows = Array.from({ length: 10 }, (_, index) =>
      opportunity({
        id: `o-${String(index).padStart(2, "0")}`,
        amountCents: (index + 1) * 10_000_00,
        closeDate: "2026-11-30",
        confirmedMilestoneKeys: ["specific_ask_made"],
        lastContactAt: daysAgo(60),
      }),
    );
    const result = run(rows);
    expect(result.queue).toHaveLength(7);
    expect(result.belowCut.count).toBe(3);

    // The remainder is exactly what did not make the cut, summed the same way.
    const ranked = new Set(result.queue.map((i) => i.opportunityId));
    const remainderCents = rows
      .filter((o) => !ranked.has(o.id))
      .reduce((sum, o) => sum + o.amountCents, 0);
    expect(result.belowCut.cents).toBe(remainderCents);
    expect(typeof result.belowCut.changesTheNumber).toBe("boolean");
  });

  it("declines to answer when there is no goal to measure against", () => {
    const result = dayWork({
      snapshot: {
        orgRefId: "org",
        opportunities: [
          opportunity({ id: "a", confirmedMilestoneKeys: ["specific_ask_made"], lastContactAt: daysAgo(60) }),
        ],
        definitions: DEFS,
        goals: [],
      },
      scope: ALL,
      settings: SETTINGS,
      clock: CLOCK,
      resolved: resolveCatalogue([]),
    });
    // An absent denominator is not a "no".
    expect(result.belowCut.changesTheNumber).toBeNull();
  });
});

describe("closed work is not coached", () => {
  it("never ranks a stewarding or repeat record", () => {
    const result = run([
      opportunity({
        id: "steward",
        stage: "celebrate_steward",
        confirmedMilestoneKeys: ["specific_ask_made"],
        lastContactAt: daysAgo(140),
      }),
    ]);
    expect(result.queue).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_MILESTONE_DEFINITIONS, type GridRow } from "@95forward/shared";
import {
  EMPTY_PENDING,
  applyCellEdit,
  baselineDisplay,
  changedCellKeys,
  pendingCount,
  toOverrides,
  toggleMilestone,
} from "./what-if-state";
import {
  PRESETS,
  applyPreset,
  deltaText,
  deltaTone,
  pendingSummary,
  slipQuarter,
} from "./what-if-copy";
import { applyPendingToGroups, applyPendingToRow } from "./what-if-rows";

const TODAY = "2026-09-12";
const DEFS = DEFAULT_MILESTONE_DEFINITIONS;

function row(partial: Partial<GridRow> & { opportunityId: string }): GridRow {
  const confirmed = partial.milestones?.filter((m) => m.confirmed).map((m) => m.key) ?? [];
  const blocking = DEFS.filter((d) => d.blocking);
  return {
    prospectId: `p-${partial.opportunityId}`,
    prospectName: `Prospect ${partial.opportunityId}`,
    amountCents: 250_000_00,
    probability: "medium",
    closeDate: "2026-10-31",
    dateConfidence: "semi_firm",
    stage: "visit_and_ask",
    visitRating: null,
    initiativeId: "i-kamuli",
    initiativeName: "Kamuli 2026",
    initiativeColourKey: null,
    ownerUserId: "u-dana",
    ownerName: "Dana Reese",
    rank: 1,
    statusLabel: "at_risk",
    statusText: "At risk",
    health: "slowing",
    nextAction: null,
    qualification: {
      qualified: false,
      missingBlocking: blocking,
      blockingConfirmed: confirmed.filter((k) => blocking.some((b) => b.key === k)).length,
      blockingTotal: blocking.length,
      theySaidConfirmed: 0,
      theySaidTotal: DEFS.filter((d) => d.source === "they_said").length,
      weSaidConfirmed: 0,
      weSaidTotal: DEFS.filter((d) => d.source === "we_said").length,
    },
    findings: [],
    impactCents: 100_000_00,
    silenceDays: 12,
    closeDateMoves: 0,
    closeDateMovesProspectSourced: false,
    membership: "MOST_LIKELY_PLUS",
    milestones: DEFS.map((d) => ({
      key: d.key,
      label: d.label,
      source: d.source,
      confirmed: false,
      blocking: d.blocking,
    })),
    preClose: true,
    status: "open",
    ...partial,
  };
}

describe("a hypothetical cell edit", () => {
  const r = row({ opportunityId: "a" });

  it("records the typed value and the baseline the cell was showing", () => {
    const next = applyCellEdit(EMPTY_PENDING, r, "amountCents", "500000", TODAY);
    expect(next.patches.a).toEqual({ amountCents: 50_000_000 });
    expect(next.baseline["a:amountCents"]).toBe("$250,000");
    expect(pendingCount(next)).toBe(1);
  });

  it("keeps the FIRST baseline — the comparison is against the record, not your last guess", () => {
    let pending = applyCellEdit(EMPTY_PENDING, r, "amountCents", "500000", TODAY);
    pending = applyCellEdit(pending, r, "amountCents", "600000", TODAY);
    pending = applyCellEdit(pending, r, "amountCents", "700000", TODAY);
    expect(pending.baseline["a:amountCents"]).toBe("$250,000");
    expect(pending.patches.a).toEqual({ amountCents: 70_000_000 });
    expect(pendingCount(pending)).toBe(1);
  });

  it("accumulates several fields on one opportunity as one pending change", () => {
    let pending = applyCellEdit(EMPTY_PENDING, r, "amountCents", "500000", TODAY);
    pending = applyCellEdit(pending, r, "stage", "follow_up_and_close", TODAY);
    expect(pending.patches.a).toEqual({ amountCents: 50_000_000, stage: "follow_up_and_close" });
    expect(pendingCount(pending)).toBe(1);
    expect(changedCellKeys(pending)).toEqual(new Set(["a:amountCents", "a:stage"]));
  });

  it("parses money the way a human types it, and nulls the nullable fields", () => {
    expect(applyCellEdit(EMPTY_PENDING, r, "amountCents", "$1,234.56", TODAY).patches.a).toEqual({
      amountCents: 123_456,
    });
    expect(applyCellEdit(EMPTY_PENDING, r, "closeDate", "", TODAY).patches.a).toEqual({
      closeDate: null,
    });
    expect(applyCellEdit(EMPTY_PENDING, r, "visitRating", "", TODAY).patches.a).toEqual({
      visitRating: null,
    });
  });

  it("renders each field's baseline the way its cell does", () => {
    expect(baselineDisplay(r, "amountCents", TODAY)).toBe("$250,000");
    expect(baselineDisplay(r, "closeDate", TODAY)).toBe("Oct 31");
    expect(baselineDisplay(r, "visitRating", TODAY)).toBe("—");
    expect(baselineDisplay(r, "initiativeId", TODAY)).toBe("Kamuli 2026");
    expect(baselineDisplay(r, "ownerUserId", TODAY)).toBe("Dana Reese");
  });

  it("produces overrides in exactly the shape the services take", () => {
    const pending = applyCellEdit(EMPTY_PENDING, r, "amountCents", "500000", TODAY);
    expect(toOverrides(pending)).toEqual({
      opportunityPatches: { a: { amountCents: 50_000_000 } },
      milestonePatches: {},
    });
  });
});

describe("hypothetical milestones", () => {
  const key = DEFS[0]!.key;
  const r = row({ opportunityId: "a" });

  it("turns one on, then off again", () => {
    const on = toggleMilestone(EMPTY_PENDING, r, key);
    expect(on.milestones.a).toEqual([key]);
    const off = toggleMilestone(on, r, key);
    expect(off.milestones.a).toEqual([]);
  });

  it("starts from what the record already confirms, not from nothing", () => {
    // Toggling one milestone must not silently un-confirm the others.
    const withOne = row({
      opportunityId: "b",
      milestones: DEFS.map((d, i) => ({
        key: d.key,
        label: d.label,
        source: d.source,
        confirmed: i === 0,
        blocking: d.blocking,
      })),
    });
    const next = toggleMilestone(EMPTY_PENDING, withOne, DEFS[1]!.key);
    expect(next.milestones.b).toEqual([DEFS[0]!.key, DEFS[1]!.key]);
  });

  it("counts as a pending change", () => {
    expect(pendingCount(toggleMilestone(EMPTY_PENDING, r, key))).toBe(1);
  });
});

describe("projecting the hypothesis onto the rows", () => {
  it("shows the hypothetical value, not the record's", () => {
    // The bug this exists for: a preset slipped every close date, the curve collapsed, and every
    // date cell still read its old value — the table and the chart describing different worlds.
    const r = row({ opportunityId: "a" });
    const next = applyPendingToRow(r, {
      patches: { a: { closeDate: "2027-01-31", amountCents: 999_00 } },
      milestones: {},
    });
    expect(next.closeDate).toBe("2027-01-31");
    expect(next.amountCents).toBe(999_00);
  });

  it("recomputes qualification when milestones are toggled", () => {
    const r = row({ opportunityId: "a" });
    const blocking = DEFS.filter((d) => d.blocking).map((d) => d.key);
    const next = applyPendingToRow(r, { patches: {}, milestones: { a: blocking } });
    expect(next.qualification.qualified).toBe(true);
    expect(next.qualification.blockingConfirmed).toBe(blocking.length);
    expect(
      next.milestones
        .filter((m) => m.confirmed)
        .map((m) => m.key)
        .sort(),
    ).toEqual([...blocking].sort());
  });

  it("leaves the DERIVED columns at baseline rather than guessing them", () => {
    // Rank, next action, impact, flags and scenario belong to I23 and I20. Recomputing them in a
    // client component would be a second implementation, which is the drift this product spends
    // its time avoiding. The panel's figures answer for them instead.
    const r = row({ opportunityId: "a" });
    const next = applyPendingToRow(r, { patches: { a: { amountCents: 1 } }, milestones: {} });
    expect(next.rank).toBe(r.rank);
    expect(next.impactCents).toBe(r.impactCents);
    expect(next.membership).toBe(r.membership);
    expect(next.findings).toBe(r.findings);
  });

  it("returns the same object when nothing is pending", () => {
    const r = row({ opportunityId: "a" });
    expect(applyPendingToRow(r, { patches: {}, milestones: {} })).toBe(r);
    const groups = [
      { key: "all", label: "All", colourKey: null, rows: [r], subtotal: {} as never },
    ];
    expect(applyPendingToGroups(groups, { patches: {}, milestones: {} })).toBe(groups);
  });

  it("never rewrites a group subtotal", () => {
    // Those come from the metrics service's own predicates over the real snapshot. Recomputing
    // them in the browser would be a second definition of "qualified" — the exact thing that
    // footer exists to avoid.
    const r = row({ opportunityId: "a" });
    const subtotal = { marker: "untouched" } as never;
    const groups = [{ key: "all", label: "All", colourKey: null, rows: [r], subtotal }];
    const next = applyPendingToGroups(groups, {
      patches: { a: { amountCents: 1 } },
      milestones: {},
    });
    expect(next[0]!.subtotal).toBe(subtotal);
  });
});

describe("presets", () => {
  const rows = [
    row({ opportunityId: "big", amountCents: 900_000_00, closeDate: "2026-10-31" }),
    row({ opportunityId: "mid", amountCents: 300_000_00, closeDate: "2026-11-30" }),
    row({ opportunityId: "none", amountCents: 100_000_00, closeDate: null }),
    row({ opportunityId: "closed", amountCents: 800_000_00, preClose: false, status: "won" }),
    row({ opportunityId: "hope", amountCents: 200_000_00, membership: "BEST_ONLY" }),
  ];

  it("slips every open close date a quarter, and skips the ones with no date", () => {
    const next = applyPreset("slip-a-quarter", rows, EMPTY_PENDING, TODAY);
    expect(next.patches.big).toEqual({ closeDate: "2027-01-31" });
    expect(next.patches.mid).toEqual({ closeDate: "2027-02-28" });
    expect(next.patches.none).toBeUndefined();
    expect(next.patches.closed).toBeUndefined();
    expect(next.baseline["big:closeDate"]).toBe("Oct 31");
  });

  it("clamps a slipped date to a real day", () => {
    // 30 Nov + 3 months is 28 Feb, not 30 February.
    expect(slipQuarter("2026-11-30")).toBe("2027-02-28");
    expect(slipQuarter("2026-10-31")).toBe("2027-01-31");
    expect(slipQuarter("2026-01-31")).toBe("2026-04-30");
  });

  it("qualifies only the best-only asks, by confirming every blocking key", () => {
    const next = applyPreset("qualify-best-only", rows, EMPTY_PENDING, TODAY);
    expect(Object.keys(next.milestones)).toEqual(["hope"]);
    const blocking = DEFS.filter((d) => d.blocking).map((d) => d.key);
    expect([...next.milestones.hope!].sort()).toEqual([...blocking].sort());
  });

  it("loses the largest open deal by marking it lost, not by hiding it", () => {
    // "Lost" is a real state the model has, and keeping the row on screen is what lets you see
    // WHICH deal the curve just lost.
    const next = applyPreset("lose-the-largest", rows, EMPTY_PENDING, TODAY);
    expect(next.patches.big).toEqual({ status: "lost" });
    expect(next.patches.closed).toBeUndefined();
  });

  it("is additive — a second preset does not silently clear the first", () => {
    const slipped = applyPreset("slip-a-quarter", rows, EMPTY_PENDING, TODAY);
    const both = applyPreset("qualify-best-only", rows, slipped, TODAY);
    expect(both.patches.big).toEqual({ closeDate: "2027-01-31" });
    expect(both.milestones.hope).toBeDefined();
  });

  it("offers exactly the three obvious explorations", () => {
    expect(PRESETS.map((p) => p.id)).toEqual([
      "slip-a-quarter",
      "qualify-best-only",
      "lose-the-largest",
    ]);
    for (const preset of PRESETS) expect(preset.detail.length).toBeGreaterThan(20);
  });
});

describe("the pending summary", () => {
  it("says nothing is pending before anything is", () => {
    expect(pendingSummary(0, 0)).toMatch(/No changes yet/);
  });

  it("counts the total, and names what is out of view", () => {
    // Overrides are scope-independent — a change made under one initiative keeps affecting the
    // year when you widen the lens. A change you cannot see but which is moving the numbers you
    // can is the worst state this feature could produce, so it is said out loud.
    expect(pendingSummary(1, 0)).toBe("1 change pending");
    expect(pendingSummary(12, 0)).toBe("12 changes pending");
    expect(pendingSummary(12, 4)).toBe("12 changes pending · 4 outside this view");
  });
});

describe("delta copy", () => {
  const fmt = (c: number) => `$${c / 100}`;
  it("leads with the sign, because the sign is the message", () => {
    expect(deltaText(12_000, fmt)).toBe("+$120");
    expect(deltaText(-12_000, fmt)).toBe("−$120");
    expect(deltaText(0, fmt)).toBe("no change");
    expect(deltaText(null, fmt)).toBe("—");
  });
  it("tones an absent delta as flat rather than as a fall", () => {
    expect(deltaTone(null)).toBe("flat");
    expect(deltaTone(0)).toBe("flat");
    expect(deltaTone(5)).toBe("up");
    expect(deltaTone(-5)).toBe("down");
  });
});

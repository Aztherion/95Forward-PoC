// 95 Forward — the Opportunities grid (Initiative 29).
//
// A DATA GRID BOUND TO THE TYPED MODEL, not a spreadsheet. There is no formula engine here, no
// dependency graph between cells, no user-authored expressions and no free-form structure: eight
// typed editable fields, a set of read-only columns, and grouping. That line is the product
// decision, and this module is where it is held in code.
//
// The win over a spreadsheet is stated in one sentence and enforced in this file: the grid, the
// chart and the queue show the same numbers BECAUSE THEY ARE COMPUTED ONCE FROM ONE MODEL. So
// nothing below computes a verdict. Every derived value is lifted from the service that owns it —
// I19's metrics, I20's checks, I21's simulation, I23's ranking — and this module only arranges
// them into rows. If you find yourself writing an `if` about qualification or a `sum` over amounts
// in here, the number you are about to invent already exists somewhere else.

import type { Finding } from "./forward-checks";
import { silenceDays } from "./forward-events";
import {
  scopeMatches,
  subtotals,
  type GroupSubtotal,
  type MetricScope,
  type MetricsSnapshot,
  type SnapshotOpportunity,
} from "./forward-metrics";
import type { RankedItem, NextAction, QueueHealth, QueueStatusLabel } from "./forward-ranking";
import type { ScenarioBadge } from "./forward-simulation";
import {
  computeQualification,
  FORWARD_STAGE_META,
  type DateConfidence,
  type ForwardStage,
  type MilestoneDefinition,
  type MilestoneSource,
  type ProbabilityBand,
  type QualificationResult,
  type VisitRating,
} from "./forward";

/** The eight fields a cell may edit. Every one is already in TRACKED_OPPORTUNITY_FIELDS. */
export const GRID_EDITABLE_FIELDS = [
  "amountCents",
  "probability",
  "closeDate",
  "dateConfidence",
  "stage",
  "visitRating",
  "initiativeId",
  "ownerUserId",
] as const;

export type GridEditableField = (typeof GRID_EDITABLE_FIELDS)[number];

/**
 * One milestone as the grid shows it. Editing routes through I26 — see the cell for why.
 *
 * `source` travels with it because the grid cannot drop that channel. Filled-versus-empty already
 * means they-said-versus-we-said everywhere else in this product (design-system.md §10.5), so a
 * dot that used fill for "confirmed" alone would render a we-said milestone as though the prospect
 * had said it — in the densest, most-scanned place on the screen.
 */
export interface GridMilestone {
  readonly key: string;
  readonly label: string;
  readonly source: MilestoneSource;
  readonly confirmed: boolean;
  readonly blocking: boolean;
}

export interface GridRow {
  readonly opportunityId: string;
  readonly prospectId: string;
  readonly prospectName: string;

  // -- The eight editable values, as stored. ----------------------------------------------------
  readonly amountCents: number;
  readonly probability: ProbabilityBand;
  readonly closeDate: string | null;
  readonly dateConfidence: DateConfidence;
  readonly stage: ForwardStage;
  readonly visitRating: VisitRating | null;
  readonly initiativeId: string;
  readonly initiativeName: string;
  readonly initiativeColourKey: string | null;
  readonly ownerUserId: string | null;
  readonly ownerName: string;

  // -- Read-only, every one lifted from the service that owns it. -------------------------------
  /** Position in the ranking, over the WHOLE portfolio. Null when no rule fires on this record. */
  readonly rank: number | null;
  readonly statusLabel: QueueStatusLabel | null;
  readonly statusText: string | null;
  readonly health: QueueHealth | null;
  readonly nextAction: NextAction | null;
  readonly qualification: QualificationResult;
  /** I20's findings on THIS record. Empty when it does not contradict itself. */
  readonly findings: readonly Finding[];
  /** What acting on it is worth, from the ranking engine. Null when unranked. */
  readonly impactCents: number | null;
  readonly silenceDays: number | null;
  readonly closeDateMoves: number;
  readonly closeDateMovesProspectSourced: boolean;
  /** Which scenario I21 puts it in. Null when the simulation does not carry it. */
  readonly membership: ScenarioBadge | null;
  readonly milestones: readonly GridMilestone[];
  readonly preClose: boolean;
  readonly status: SnapshotOpportunity["status"];
}

export interface GridLabel {
  readonly prospectName: string;
  readonly initiativeName: string;
  readonly initiativeColourKey: string | null;
}

export interface BuildGridInput {
  readonly snapshot: MetricsSnapshot;
  readonly scope: MetricScope;
  /** I23's full ranking, not the top seven — `dayWork(...).ranked`. */
  readonly ranked: readonly RankedItem[];
  /** I20's findings across the scope, exactly as `checkScope` returned them. */
  readonly findings: readonly Finding[];
  /** I21's membership rows, exactly as the simulation returned them. */
  readonly membership: readonly { readonly opportunityId: string; readonly badge: ScenarioBadge }[];
  readonly labels: ReadonlyMap<string, GridLabel>;
  readonly ownerNames: ReadonlyMap<string, string>;
  readonly now: Date;
}

/**
 * One row per opportunity in scope. No verdict is computed here; every one is looked up.
 */
export function buildGridRows(input: BuildGridInput): readonly GridRow[] {
  const { snapshot, scope, ranked, findings, membership, labels, ownerNames, now } = input;

  const rankedById = new Map(ranked.map((item) => [item.opportunityId, item]));
  const badgeById = new Map(membership.map((row) => [row.opportunityId, row.badge]));
  const findingsById = new Map<string, Finding[]>();
  for (const finding of findings) {
    const list = findingsById.get(finding.opportunityId);
    if (list) list.push(finding);
    else findingsById.set(finding.opportunityId, [finding]);
  }

  return snapshot.opportunities
    .filter((o) => scopeMatches(o, scope))
    .map((o) => {
      const item = rankedById.get(o.id);
      const label = labels.get(o.id);
      const qualification = computeQualification(snapshot.definitions, o.confirmedMilestoneKeys);
      return {
        opportunityId: o.id,
        prospectId: o.prospectId,
        prospectName: label?.prospectName ?? "Unknown prospect",

        amountCents: o.amountCents,
        probability: o.probability,
        closeDate: o.closeDate,
        dateConfidence: o.dateConfidence,
        stage: o.stage,
        visitRating: o.visitRating,
        initiativeId: o.initiativeId,
        initiativeName: label?.initiativeName ?? "—",
        initiativeColourKey: label?.initiativeColourKey ?? null,
        ownerUserId: o.ownerUserId,
        ownerName: (o.ownerUserId ? ownerNames.get(o.ownerUserId) : undefined) ?? "Unassigned",

        rank: item?.rank ?? null,
        statusLabel: item?.statusLabel ?? null,
        statusText: item?.statusText ?? null,
        health: item?.health ?? null,
        nextAction: item?.nextAction ?? null,
        qualification,
        findings: findingsById.get(o.id) ?? [],
        impactCents: item?.impactCents ?? null,
        silenceDays: silenceDays(o.lastContactAt ? new Date(o.lastContactAt) : null, now),
        closeDateMoves: o.closeDateMoves,
        closeDateMovesProspectSourced: o.closeDateMovesProspectSourced,
        membership: badgeById.get(o.id) ?? null,
        milestones: snapshot.definitions.map((d: MilestoneDefinition) => ({
          key: d.key,
          label: d.label,
          source: d.source,
          confirmed: o.confirmedMilestoneKeys.includes(d.key),
          blocking: d.blocking,
        })),
        preClose: FORWARD_STAGE_META[o.stage].preClose,
        status: o.status,
      } satisfies GridRow;
    });
}

// ---------------------------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------------------------

export const GRID_SORT_FIELDS = [
  "rank",
  "prospect",
  "amount",
  "stage",
  "closeDate",
  "probability",
  "dateConfidence",
  "visitRating",
  "initiative",
  "owner",
  "qualification",
  "silence",
  "moves",
  "impact",
  "findings",
  "membership",
] as const;
export type GridSortField = (typeof GRID_SORT_FIELDS)[number];

export function isGridSortField(value: string): value is GridSortField {
  return (GRID_SORT_FIELDS as readonly string[]).includes(value);
}

const BAND_ORDER: Record<ProbabilityBand, number> = {
  longshot: 0,
  medium: 1,
  high: 2,
  bookable: 3,
  lock: 4,
};
const CONFIDENCE_ORDER: Record<DateConfidence, number> = { loose: 0, semi_firm: 1, firm: 2 };
const RATING_ORDER: Record<VisitRating, number> = { poor: 0, mixed: 1, good: 2, strong: 3 };
const BADGE_ORDER: Record<ScenarioBadge, number> = {
  IN_ALL_THREE: 3,
  MOST_LIKELY_PLUS: 2,
  BEST_ONLY: 1,
  OUTSIDE_BEST: 0,
};

/** A null sorts last in BOTH directions: an absent value is not a small one. */
function nullsLast(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * dir;
}

export function sortGridRows(
  rows: readonly GridRow[],
  field: GridSortField,
  dir: "asc" | "desc",
): readonly GridRow[] {
  const d: 1 | -1 = dir === "asc" ? 1 : -1;
  const value = (row: GridRow): number | null => {
    switch (field) {
      case "rank":
        return row.rank;
      case "amount":
        return row.amountCents;
      case "stage":
        return FORWARD_STAGE_META[row.stage].order;
      case "probability":
        return BAND_ORDER[row.probability];
      case "dateConfidence":
        return CONFIDENCE_ORDER[row.dateConfidence];
      case "visitRating":
        return row.visitRating ? RATING_ORDER[row.visitRating] : null;
      case "qualification":
        return row.qualification.qualified ? 1 : 0;
      case "silence":
        return row.silenceDays;
      case "moves":
        return row.closeDateMoves;
      case "impact":
        return row.impactCents;
      case "findings":
        return row.findings.length;
      case "membership":
        return row.membership ? BADGE_ORDER[row.membership] : null;
      default:
        return null;
    }
  };

  const text = (row: GridRow): string | null => {
    switch (field) {
      case "prospect":
        return row.prospectName;
      case "initiative":
        return row.initiativeName;
      case "owner":
        return row.ownerName;
      case "closeDate":
        return row.closeDate;
      default:
        return null;
    }
  };

  // Stable, and the id tie-break is not decoration: identical data must produce an identical
  // order, or the grid reshuffles under the cursor of someone mid-edit.
  return [...rows].sort((a, b) => {
    const ta = text(a);
    if (ta !== null || text(b) !== null) {
      const tb = text(b);
      if (ta === null) return 1;
      if (tb === null) return -1;
      const cmp = ta.localeCompare(tb) * d;
      if (cmp !== 0) return cmp;
      return a.opportunityId.localeCompare(b.opportunityId);
    }
    const cmp = nullsLast(value(a), value(b), d);
    if (cmp !== 0) return cmp;
    return a.opportunityId.localeCompare(b.opportunityId);
  });
}

// ---------------------------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------------------------

export interface GridFilter {
  readonly stage?: readonly ForwardStage[];
  readonly probability?: readonly ProbabilityBand[];
  readonly dateConfidence?: readonly DateConfidence[];
  readonly initiative?: readonly string[];
  readonly owner?: readonly string[];
  /** "qualified" | "unqualified" */
  readonly qualification?: "qualified" | "unqualified";
  /** Only rows I20 has something to say about. */
  readonly hasFindings?: boolean;
  readonly health?: readonly QueueHealth[];
  readonly search?: string;
}

export function filterGridRows(rows: readonly GridRow[], filter: GridFilter): readonly GridRow[] {
  const needle = filter.search?.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter.stage?.length && !filter.stage.includes(row.stage)) return false;
    if (filter.probability?.length && !filter.probability.includes(row.probability)) return false;
    if (filter.dateConfidence?.length && !filter.dateConfidence.includes(row.dateConfidence)) {
      return false;
    }
    if (filter.initiative?.length && !filter.initiative.includes(row.initiativeId)) return false;
    if (filter.owner?.length && !filter.owner.includes(row.ownerUserId ?? "")) return false;
    if (filter.qualification === "qualified" && !row.qualification.qualified) return false;
    if (filter.qualification === "unqualified" && row.qualification.qualified) return false;
    if (filter.hasFindings && row.findings.length === 0) return false;
    if (filter.health?.length && (row.health === null || !filter.health.includes(row.health))) {
      return false;
    }
    if (needle && !row.prospectName.toLowerCase().includes(needle)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------------------------

export const GRID_GROUP_BYS = ["none", "owner", "initiative", "stage"] as const;
export type GridGroupBy = (typeof GRID_GROUP_BYS)[number];

export function isGridGroupBy(value: string): value is GridGroupBy {
  return (GRID_GROUP_BYS as readonly string[]).includes(value);
}

export interface GridGroup {
  readonly key: string;
  readonly label: string;
  readonly colourKey: string | null;
  readonly rows: readonly GridRow[];
  /**
   * Two totals, never one.
   *
   * A single "subtotal" over a stage group silently includes unqualified records, so the groups
   * would sum to more than the headline and a leader checking the arithmetic finds the tool wrong.
   * Both halves are computed by the metrics module's own predicates — see `subtotals`.
   */
  readonly subtotal: GroupSubtotal;
}

/**
 * Group the rows and subtotal each group through the metrics service.
 *
 * `snapshot` is passed rather than derived from the rows because subtotalling is the metrics
 * module's job and it works on `SnapshotOpportunity`, not on view models. The grid never adds up
 * its own column.
 */
export function groupGridRows(
  rows: readonly GridRow[],
  groupBy: GridGroupBy,
  snapshot: MetricsSnapshot,
): readonly GridGroup[] {
  const byId = new Map(snapshot.opportunities.map((o) => [o.id, o]));
  const opportunitiesFor = (subset: readonly GridRow[]): SnapshotOpportunity[] =>
    subset.map((r) => byId.get(r.opportunityId)).filter((o): o is SnapshotOpportunity => !!o);

  if (groupBy === "none") {
    return [
      {
        key: "all",
        label: "All opportunities",
        colourKey: null,
        rows,
        subtotal: subtotals(opportunitiesFor(rows), snapshot.definitions),
      },
    ];
  }

  const buckets = new Map<string, { label: string; colourKey: string | null; rows: GridRow[] }>();
  for (const row of rows) {
    const [key, label, colourKey] =
      groupBy === "owner"
        ? [row.ownerUserId ?? "unassigned", row.ownerName, null]
        : groupBy === "initiative"
          ? [row.initiativeId, row.initiativeName, row.initiativeColourKey]
          : [row.stage, FORWARD_STAGE_META[row.stage].label, null];
    const bucket = buckets.get(key);
    if (bucket) bucket.rows.push(row);
    else buckets.set(key, { label, colourKey: colourKey as string | null, rows: [row] });
  }

  const groups = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: bucket.label,
    colourKey: bucket.colourKey,
    rows: bucket.rows as readonly GridRow[],
    subtotal: subtotals(opportunitiesFor(bucket.rows), snapshot.definitions),
  }));

  // Stages in pipeline order; everything else alphabetically. A stage group list sorted by name
  // would read "Follow up & close, Get the visit, Prep the visit, Visit & ask", which is nobody's
  // mental model of a pipeline.
  if (groupBy === "stage") {
    return groups.sort(
      (a, b) =>
        FORWARD_STAGE_META[a.key as ForwardStage].order -
        FORWARD_STAGE_META[b.key as ForwardStage].order,
    );
  }
  return groups.sort((a, b) => a.label.localeCompare(b.label));
}

/** The whole-view totals, for the footer that ties the grid to the headline metric. */
export function gridTotals(rows: readonly GridRow[], snapshot: MetricsSnapshot): GroupSubtotal {
  const byId = new Map(snapshot.opportunities.map((o) => [o.id, o]));
  return subtotals(
    rows.map((r) => byId.get(r.opportunityId)).filter((o): o is SnapshotOpportunity => !!o),
    snapshot.definitions,
  );
}

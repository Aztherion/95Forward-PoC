// 95 Forward — the Forecast Room's two derived views (Initiative 27).
//
// The stage board and the movement panels, computed PURE over the metrics snapshot so that neither
// can disagree with the headline number it sits under. Both were specified in SCREENS.md and both
// are reads over data I18–I21 already produce; nothing here queries anything.
//
// The stage board's hard problem is amendment 1: qualified asks is the QUALIFIED SUBSET of the four
// pre-close columns, not their sum. A column total that silently contradicted the headline metric
// would be the single most damaging thing this screen could do in a room where someone is checking
// the arithmetic — so the split is computed here and both halves are returned.

import {
  computeQualification,
  isPreCloseStage,
  FORWARD_STAGES,
  type ForwardStage,
} from "./forward";
import type { Clock } from "./forward-settings";
import {
  scopeMatches,
  type MetricScope,
  type MetricsSnapshot,
  type SnapshotOpportunity,
} from "./forward-metrics";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now.getTime() - then) / DAY_MS));
}

// -------------------------------------------------------------------------------------------
// Stage board
// -------------------------------------------------------------------------------------------

export interface StageChip {
  readonly opportunityId: string;
  readonly amountCents: number;
  readonly qualified: boolean;
  /** Days since the last logged contact. Null when nobody has ever logged one. */
  readonly silenceDays: number | null;
  readonly closeDateMoves: number;
  readonly closeDate: string | null;
}

export interface StageColumn {
  readonly stage: ForwardStage;
  /** False for celebrate_steward and repeat — closed work, outside the headline number. */
  readonly preClose: boolean;
  readonly chips: readonly StageChip[];
  readonly count: number;
  readonly totalCents: number;
  /** The qualified subset of this column. Zero for the two closed-work columns. */
  readonly qualifiedCents: number;
  readonly qualifiedCount: number;
}

export interface StageBoard {
  readonly columns: readonly StageColumn[];
  /** Everything in the four pre-close columns, qualified or not. */
  readonly preCloseCents: number;
  /** The qualified subset of that — and the headline metric, by construction. */
  readonly qualifiedCents: number;
  /** celebrate_steward + repeat. Right of the divider, and deliberately outside the headline. */
  readonly closedWorkCents: number;
}

/**
 * Every open opportunity in scope, as a chip in its stage column.
 *
 * Open only: a won or lost opportunity is not work on a board. The four pre-close columns and the
 * two closed-work ones are separated by `preClose` rather than by position, so the divider and the
 * "OUTSIDE THE HEADLINE" subtitle are rendered from the model rather than from an index.
 */
export function stageBoard(
  snapshot: MetricsSnapshot,
  scope: MetricScope,
  clock: Clock,
): StageBoard {
  const now = clock.now();
  const inScope = snapshot.opportunities.filter(
    (o) => scopeMatches(o, scope) && o.status === "open",
  );

  const byStage = new Map<ForwardStage, StageChip[]>();
  for (const stage of FORWARD_STAGES) byStage.set(stage, []);

  for (const opportunity of inScope) {
    const qualified = computeQualification(
      snapshot.definitions,
      opportunity.confirmedMilestoneKeys,
    ).qualified;
    byStage.get(opportunity.stage)?.push({
      opportunityId: opportunity.id,
      amountCents: opportunity.amountCents,
      qualified,
      silenceDays: daysSince(opportunity.lastContactAt, now),
      closeDateMoves: opportunity.closeDateMoves,
      closeDate: opportunity.closeDate,
    });
  }

  const columns: StageColumn[] = FORWARD_STAGES.map((stage) => {
    // Biggest first: a wall of chips is scanned, and the money should be where the eye lands.
    const chips = (byStage.get(stage) ?? []).sort((a, b) => b.amountCents - a.amountCents);
    const preClose = isPreCloseStage(stage);
    const qualifiedChips = preClose ? chips.filter((c) => c.qualified) : [];
    return {
      stage,
      preClose,
      chips,
      count: chips.length,
      totalCents: chips.reduce((sum, c) => sum + c.amountCents, 0),
      qualifiedCents: qualifiedChips.reduce((sum, c) => sum + c.amountCents, 0),
      qualifiedCount: qualifiedChips.length,
    };
  });

  const preCloseColumns = columns.filter((c) => c.preClose);
  return {
    columns,
    preCloseCents: preCloseColumns.reduce((sum, c) => sum + c.totalCents, 0),
    qualifiedCents: preCloseColumns.reduce((sum, c) => sum + c.qualifiedCents, 0),
    closedWorkCents: columns.filter((c) => !c.preClose).reduce((sum, c) => sum + c.totalCents, 0),
  };
}

// -------------------------------------------------------------------------------------------
// Movement panels
// -------------------------------------------------------------------------------------------

export interface MovementRow {
  readonly opportunityId: string;
  readonly amountCents: number;
  readonly stage: ForwardStage;
  readonly silenceDays: number | null;
  readonly closeDateMoves: number;
  readonly closeDate: string | null;
}

export interface MovementPanel {
  readonly rows: readonly MovementRow[];
  readonly count: number;
  readonly cents: number;
}

export interface MovementPanels {
  readonly untouched: MovementPanel;
  readonly slipping: MovementPanel;
}

export interface MovementThresholds {
  /** Days without contact before an opportunity is flagged. Doctrine, from the catalogue. */
  readonly untouchedDays: number;
  /** Close-date moves before an opportunity is flagged as slipping. */
  readonly pushes: number;
}

/**
 * The two movement panels, by name.
 *
 * This is the resolution of the one real stakeholder conflict in the project. Henrik wants an early
 * warning on forecast quality; Robb rejects aggregate forecast tracking because a reliability trend
 * is retrospective and blame-free, and it invites a meeting about how good the numbers are instead
 * of a call to a named prospect. A flag attached to a name serves both — you cannot read it without
 * knowing who to ring.
 *
 * Pre-close only: stewardship going quiet is not a forecast risk, and letting it in would steal the
 * panel from a live ask where the silence means something.
 */
export function movementPanels(
  snapshot: MetricsSnapshot,
  scope: MetricScope,
  clock: Clock,
  thresholds: MovementThresholds,
): MovementPanels {
  const now = clock.now();
  const inScope = snapshot.opportunities.filter(
    (o) => scopeMatches(o, scope) && o.status === "open" && isPreCloseStage(o.stage),
  );

  const toRow = (o: SnapshotOpportunity): MovementRow => ({
    opportunityId: o.id,
    amountCents: o.amountCents,
    stage: o.stage,
    silenceDays: daysSince(o.lastContactAt, now),
    closeDateMoves: o.closeDateMoves,
    closeDate: o.closeDate,
  });

  const panel = (rows: MovementRow[]): MovementPanel => ({
    rows,
    count: rows.length,
    cents: rows.reduce((sum, r) => sum + r.amountCents, 0),
  });

  // Never contacted counts as untouched. An opportunity nobody has ever spoken to is the strongest
  // case the panel has, and treating a null as "not yet overdue" would hide exactly those.
  const untouched = inScope
    .map(toRow)
    .filter((r) => r.silenceDays === null || r.silenceDays >= thresholds.untouchedDays)
    .sort(
      (a, b) =>
        (b.silenceDays ?? Number.MAX_SAFE_INTEGER) - (a.silenceDays ?? Number.MAX_SAFE_INTEGER),
    );

  const slipping = inScope
    .map(toRow)
    .filter((r) => r.closeDateMoves >= thresholds.pushes)
    .sort((a, b) => b.closeDateMoves - a.closeDateMoves || b.amountCents - a.amountCents);

  return { untouched: panel(untouched), slipping: panel(slipping) };
}

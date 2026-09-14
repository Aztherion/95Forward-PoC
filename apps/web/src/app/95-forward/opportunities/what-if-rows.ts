import type { GridGroup, GridRow } from "@95forward/shared";

/**
 * Project pending overrides onto the rendered rows.
 *
 * Without this the grid keeps showing the record while the chart shows the hypothesis, which is
 * the most confusing state the sandbox could be in — and it is what the first build did: a preset
 * slipped every close date, the curve collapsed, and every date cell still read its old value
 * with its old value struck through beside it.
 *
 * Deliberately pure and deliberately client-side. The server is never asked to re-render the grid
 * under a hypothesis, because the only way to do that would be to hand the overrides to something
 * that loads rows — and every such thing in this codebase sits next to a write.
 */

export interface PendingProjection {
  readonly patches: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly milestones: Readonly<Record<string, readonly string[]>>;
}

/** Recompute the qualification counter from a hypothetical confirmed set. */
function requalify(row: GridRow, confirmed: readonly string[]): GridRow["qualification"] {
  const keys = new Set(confirmed);
  const blocking = row.milestones.filter((m) => m.blocking);
  const theySaid = row.milestones.filter((m) => m.source === "they_said");
  const weSaid = row.milestones.filter((m) => m.source === "we_said");
  const blockingConfirmed = blocking.filter((m) => keys.has(m.key)).length;
  return {
    qualified: blockingConfirmed === blocking.length && blocking.length > 0,
    missingBlocking: row.qualification.missingBlocking.filter((d) => !keys.has(d.key)),
    blockingConfirmed,
    blockingTotal: blocking.length,
    theySaidConfirmed: theySaid.filter((m) => keys.has(m.key)).length,
    theySaidTotal: theySaid.length,
    weSaidConfirmed: weSaid.filter((m) => keys.has(m.key)).length,
    weSaidTotal: weSaid.length,
  };
}

/**
 * One row under the hypothesis.
 *
 * Only the fields a user can edit are projected. The DERIVED columns — rank, next action, impact,
 * flags, scenario — are deliberately left at their baseline values, because recomputing them here
 * would mean a second implementation of I23's ranking and I20's checks living in a client
 * component, which is exactly the drift this product spends its time avoiding. They are the
 * columns the panel's own figures answer for.
 */
export function applyPendingToRow(row: GridRow, pending: PendingProjection): GridRow {
  const patch = pending.patches[row.opportunityId];
  const milestones = pending.milestones[row.opportunityId];
  if (!patch && !milestones) return row;

  let next: GridRow = { ...row };

  if (patch) {
    const p = patch as Partial<
      Record<
        | "amountCents"
        | "closeDate"
        | "stage"
        | "probability"
        | "dateConfidence"
        | "visitRating"
        | "initiativeId"
        | "ownerUserId"
        | "status",
        unknown
      >
    >;
    next = {
      ...next,
      amountCents: typeof p.amountCents === "number" ? p.amountCents : next.amountCents,
      closeDate: "closeDate" in p ? (p.closeDate as string | null) : next.closeDate,
      stage: (p.stage as GridRow["stage"]) ?? next.stage,
      probability: (p.probability as GridRow["probability"]) ?? next.probability,
      dateConfidence: (p.dateConfidence as GridRow["dateConfidence"]) ?? next.dateConfidence,
      visitRating:
        "visitRating" in p ? (p.visitRating as GridRow["visitRating"]) : next.visitRating,
      initiativeId: (p.initiativeId as string) ?? next.initiativeId,
      ownerUserId: (p.ownerUserId as string) ?? next.ownerUserId,
      status: (p.status as GridRow["status"]) ?? next.status,
    };
  }

  if (milestones) {
    const keys = new Set(milestones);
    next = {
      ...next,
      milestones: next.milestones.map((m) => ({ ...m, confirmed: keys.has(m.key) })),
      qualification: requalify(next, milestones),
    };
  }

  return next;
}

export function applyPendingToGroups(
  groups: readonly GridGroup[],
  pending: PendingProjection,
): readonly GridGroup[] {
  const touched =
    Object.keys(pending.patches).length + Object.keys(pending.milestones).length === 0;
  if (touched) return groups;
  return groups.map((group) => ({
    ...group,
    rows: group.rows.map((row) => applyPendingToRow(row, pending)),
    // The group SUBTOTALS are left alone on purpose. They come from the metrics service's own
    // predicates over the real snapshot (I29), and recomputing them in the browser would be a
    // second definition of "qualified" — the exact thing that footer exists to avoid. The panel's
    // before/after pair is where the hypothetical totals are answered.
  }));
}

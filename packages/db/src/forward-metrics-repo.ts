// 95 Forward — loading the metrics snapshot (Initiative 19).
//
// The only job here is IO. Everything that computes lives in @95forward/shared/forward-metrics and
// is pure over the snapshot this module builds, which is what makes a what-if a recompute rather
// than another round trip: load once, then evaluate as many hypotheses as I20 and I23 need.

import { eq } from "drizzle-orm";
import {
  computeMetrics,
  coverageWithout,
  evaluateWhatIf,
  initiativeShare,
  type Clock,
  type ForwardMetrics,
  type ForwardSettings,
  type MetricScope,
  type MetricsOverrides,
  type MetricsSnapshot,
  type MilestoneEvidence,
  type SnapshotGoal,
  type SnapshotOpportunity,
  type WhatIfResult,
} from "@95forward/shared";
import type { Database } from "./client";
import {
  forwardOpportunities,
  goals,
  milestoneDefinitions,
  opportunityMilestones,
} from "./schema/forward";
import { confirmedMilestoneKeys, listMilestoneDefinitions } from "./forward-repo";
import { and, inArray } from "drizzle-orm";

/** Evidence for each CONFIRMED milestone, so the checks can spot a claim with nothing behind it. */
async function milestoneEvidenceByOpportunity(
  db: Database,
  tenantId: string,
  opportunityIds: readonly string[],
): Promise<Map<string, Record<string, MilestoneEvidence>>> {
  const byOpportunity = new Map<string, Record<string, MilestoneEvidence>>();
  if (opportunityIds.length === 0) return byOpportunity;

  const rows = await db
    .select({
      opportunityId: opportunityMilestones.opportunityId,
      key: milestoneDefinitions.key,
      confirmed: opportunityMilestones.confirmed,
      evidence: opportunityMilestones.evidence,
      documentUrl: opportunityMilestones.documentUrl,
    })
    .from(opportunityMilestones)
    .innerJoin(
      milestoneDefinitions,
      eq(milestoneDefinitions.id, opportunityMilestones.milestoneDefinitionId),
    )
    .where(
      and(
        eq(opportunityMilestones.tenantId, tenantId),
        inArray(opportunityMilestones.opportunityId, [...opportunityIds]),
      ),
    );

  for (const row of rows) {
    if (!row.confirmed) continue;
    const existing = byOpportunity.get(row.opportunityId) ?? {};
    existing[row.key] = { evidence: row.evidence, documentUrl: row.documentUrl };
    byOpportunity.set(row.opportunityId, existing);
  }
  return byOpportunity;
}

/**
 * Load everything the metric set needs, in three queries.
 *
 * Deliberately loads the whole tenant rather than a scoped subset: the scope predicate is applied
 * in the pure layer, so one snapshot serves every initiative tab and every rep toggle on a screen
 * without re-querying — and a what-if over it costs nothing extra.
 */
export async function loadMetricsSnapshot(
  db: Database,
  tenantId: string,
): Promise<MetricsSnapshot> {
  const [opportunityRows, definitionRows, goalRows] = await Promise.all([
    db.select().from(forwardOpportunities).where(eq(forwardOpportunities.tenantId, tenantId)),
    listMilestoneDefinitions(db, tenantId),
    db.select().from(goals).where(eq(goals.tenantId, tenantId)),
  ]);

  const confirmed = await confirmedMilestoneKeys(
    db,
    tenantId,
    opportunityRows.map((row) => row.id),
  );
  const evidence = await milestoneEvidenceByOpportunity(
    db,
    tenantId,
    opportunityRows.map((row) => row.id),
  );

  const opportunities: SnapshotOpportunity[] = opportunityRows.map((row) => ({
    id: row.id,
    prospectId: row.prospectId,
    initiativeId: row.initiativeId,
    ownerUserId: row.ownerUserId,
    amountCents: row.amountCents,
    stage: row.stage,
    status: row.status,
    closeDate: row.closeDate,
    confirmedMilestoneKeys: confirmed.get(row.id) ?? [],
    dateConfidence: row.dateConfidence,
    probability: row.probability,
    visitRating: row.visitRating,
    milestoneEvidence: evidence.get(row.id) ?? {},
  }));

  const snapshotGoals: SnapshotGoal[] = goalRows.map((row) => ({
    scope: row.scope,
    scopeRefId: row.scopeRefId,
    fiscalPeriod: row.fiscalPeriod,
    amountCents: row.amountCents,
  }));

  return {
    // A scope of rep=all + initiative=all resolves its goal against the org, and the org IS the
    // tenant — see the schema comment on `goals.scope_ref_id`.
    orgRefId: tenantId,
    opportunities,
    definitions: definitionRows.map((row) => ({
      key: row.key,
      label: row.label,
      source: row.source,
      blocking: row.blocking,
      sortOrder: row.sortOrder,
    })),
    goals: snapshotGoals,
  };
}

export interface MetricsServiceOptions {
  readonly settings: ForwardSettings;
  readonly clock: Clock;
}

/**
 * A thin handle over a loaded snapshot.
 *
 * Callers (I20, I21, I23 and every screen from I25 on) take one of these per request and ask it as
 * many questions as they need. The snapshot is loaded once; nothing below touches the database.
 */
export class ForwardMetricsService {
  constructor(
    private readonly snapshot: MetricsSnapshot,
    private readonly options: MetricsServiceOptions,
  ) {}

  static async load(
    db: Database,
    tenantId: string,
    options: MetricsServiceOptions,
  ): Promise<ForwardMetricsService> {
    return new ForwardMetricsService(await loadMetricsSnapshot(db, tenantId), options);
  }

  /** The snapshot, for callers that need to walk the opportunities themselves (I21, I23). */
  get data(): MetricsSnapshot {
    return this.snapshot;
  }

  metrics(scope: MetricScope, overrides?: MetricsOverrides): ForwardMetrics {
    return computeMetrics({
      snapshot: this.snapshot,
      scope,
      settings: this.options.settings,
      clock: this.options.clock,
      overrides,
    });
  }

  whatIf(scope: MetricScope, overrides: MetricsOverrides): WhatIfResult {
    return evaluateWhatIf({
      snapshot: this.snapshot,
      scope,
      settings: this.options.settings,
      clock: this.options.clock,
      overrides,
    });
  }

  initiativeShare(opportunityId: string) {
    return initiativeShare(
      this.snapshot,
      opportunityId,
      this.options.settings,
      this.options.clock,
    );
  }

  coverageWithout(opportunityId: string) {
    return coverageWithout(
      this.snapshot,
      opportunityId,
      this.options.settings,
      this.options.clock,
    );
  }
}

export { milestoneDefinitions };

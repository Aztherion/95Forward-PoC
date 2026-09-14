// 95 Forward — loading the metrics snapshot (Initiative 19).
//
// The only job here is IO. Everything that computes lives in @95forward/shared/forward-metrics and
// is pure over the snapshot this module builds, which is what makes a what-if a recompute rather
// than another round trip: load once, then evaluate as many hypotheses as I20 and I23 need.

import { eq } from "drizzle-orm";
import {
  computeMetrics,
  coverageWith,
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
  type SnapshotPartner,
  type WhatIfResult,
} from "@95forward/shared";
import type { Database } from "./client";
import {
  forwardOpportunities,
  goals,
  milestoneDefinitions,
  opportunityEvents,
  opportunityMilestones,
} from "./schema/forward";
import { naturalPartners } from "./schema/prospects";
import { visits } from "./schema/execution";
import { constituents } from "./schema/constituents";
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

// -------------------------------------------------------------------------------------------
// I23 inputs — the facts the ranking rules read and nothing else does
// -------------------------------------------------------------------------------------------

interface CoachingFacts {
  readonly lastContactAt: string | null;
  readonly closeDateMoves: number;
  readonly closeDateMovesProspectSourced: boolean;
}

/**
 * One pass over the event log for the two things the queue needs from it.
 *
 * Deliberately one query and one loop rather than two: the event log is the largest table in the
 * forward set and the snapshot is loaded per request.
 */
async function coachingFactsByOpportunity(
  db: Database,
  tenantId: string,
): Promise<Map<string, CoachingFacts>> {
  const rows = await db
    .select({
      opportunityId: opportunityEvents.opportunityId,
      eventType: opportunityEvents.eventType,
      field: opportunityEvents.field,
      prospectSourced: opportunityEvents.prospectSourced,
      occurredAt: opportunityEvents.occurredAt,
    })
    .from(opportunityEvents)
    .where(eq(opportunityEvents.tenantId, tenantId));

  const facts = new Map<string, { last: Date | null; moves: number; prospectSourced: boolean }>();
  for (const row of rows) {
    const current = facts.get(row.opportunityId) ?? {
      last: null,
      moves: 0,
      prospectSourced: false,
    };
    if (row.eventType === "contact_logged") {
      if (!current.last || row.occurredAt > current.last) current.last = row.occurredAt;
    }
    if (row.field === "closeDate") {
      current.moves += 1;
      if (row.prospectSourced) current.prospectSourced = true;
    }
    facts.set(row.opportunityId, current);
  }

  const out = new Map<string, CoachingFacts>();
  for (const [id, value] of facts) {
    out.set(id, {
      lastContactAt: value.last?.toISOString() ?? null,
      closeDateMoves: value.moves,
      closeDateMovesProspectSourced: value.prospectSourced,
    });
  }
  return out;
}

interface VisitFacts {
  readonly visitCount: number;
  readonly nextVisitAt: string | null;
  readonly nextVisitPrepared: boolean;
}

/**
 * Visits are per PROSPECT, not per opportunity.
 *
 * That is the right grain for the question the rules ask: "how many times have you been in front of
 * this person" is about the relationship, not about one initiative. Two opportunities against the
 * same prospect therefore share a visit count, which is correct — you did not visit twice because
 * you were selling two things.
 *
 * "Prepared" means a stated goal AND discovery questions. A brief with a goal and no questions is a
 * calendar entry with ambition, which is exactly what the rule is trying to catch.
 */
async function visitFactsByProspect(
  db: Database,
  tenantId: string,
  now: Date,
): Promise<Map<string, VisitFacts>> {
  const rows = await db
    .select({
      prospectId: visits.prospectId,
      occurredAt: visits.occurredAt,
      scheduledAt: visits.scheduledAt,
      goal: visits.goal,
      discoveryQuestions: visits.discoveryQuestions,
    })
    .from(visits)
    .where(eq(visits.tenantId, tenantId));

  const byProspect = new Map<string, { count: number; next: Date | null; prepared: boolean }>();
  for (const row of rows) {
    const current = byProspect.get(row.prospectId) ?? { count: 0, next: null, prepared: false };
    if (row.occurredAt && row.occurredAt <= now) current.count += 1;
    if (row.scheduledAt && row.scheduledAt >= now) {
      if (!current.next || row.scheduledAt < current.next) {
        current.next = row.scheduledAt;
        current.prepared = Boolean(row.goal?.trim()) && Boolean(row.discoveryQuestions?.trim());
      }
    }
    byProspect.set(row.prospectId, current);
  }

  const out = new Map<string, VisitFacts>();
  for (const [id, value] of byProspect) {
    out.set(id, {
      visitCount: value.count,
      nextVisitAt: value.next?.toISOString() ?? null,
      nextVisitPrepared: value.prepared,
    });
  }
  return out;
}

/** Natural partners, with the display name resolved from whichever source the row carries. */
async function partnersByProspect(
  db: Database,
  tenantId: string,
): Promise<Map<string, SnapshotPartner[]>> {
  const rows = await db
    .select({
      id: naturalPartners.id,
      prospectId: naturalPartners.prospectId,
      externalName: naturalPartners.externalName,
      role: naturalPartners.role,
      introOfferedAt: naturalPartners.introOfferedAt,
      introUsedAt: naturalPartners.introUsedAt,
      askedToOpenDoorAt: naturalPartners.askedToOpenDoorAt,
      constituentName: constituents.displayName,
    })
    .from(naturalPartners)
    .leftJoin(constituents, eq(constituents.id, naturalPartners.constituentId))
    .where(eq(naturalPartners.tenantId, tenantId));

  const out = new Map<string, SnapshotPartner[]>();
  for (const row of rows) {
    const list = out.get(row.prospectId) ?? [];
    list.push({
      id: row.id,
      name: row.constituentName ?? row.externalName ?? "A colleague",
      role: row.role,
      introOfferedAt: row.introOfferedAt?.toISOString() ?? null,
      introUsedAt: row.introUsedAt?.toISOString() ?? null,
      askedToOpenDoorAt: row.askedToOpenDoorAt?.toISOString() ?? null,
    });
    // Stable order so the "first unused partner" a rule picks never changes between runs.
    list.sort((a, b) => a.id.localeCompare(b.id));
    out.set(row.prospectId, list);
  }
  return out;
}

/** When each CONFIRMED milestone was confirmed — `verbal-agreement-unwritten` counts days from it. */
async function milestoneConfirmedAtByOpportunity(
  db: Database,
  tenantId: string,
  opportunityIds: readonly string[],
): Promise<Map<string, Record<string, string>>> {
  const out = new Map<string, Record<string, string>>();
  if (opportunityIds.length === 0) return out;

  const rows = await db
    .select({
      opportunityId: opportunityMilestones.opportunityId,
      key: milestoneDefinitions.key,
      confirmed: opportunityMilestones.confirmed,
      confirmedAt: opportunityMilestones.confirmedAt,
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
    if (!row.confirmed || !row.confirmedAt) continue;
    const existing = out.get(row.opportunityId) ?? {};
    existing[row.key] = row.confirmedAt.toISOString();
    out.set(row.opportunityId, existing);
  }
  return out;
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
  options?: { readonly now?: Date },
): Promise<MetricsSnapshot> {
  const now = options?.now ?? new Date();
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
  const [coaching, visitFacts, partners, confirmedAt] = await Promise.all([
    coachingFactsByOpportunity(db, tenantId),
    visitFactsByProspect(db, tenantId, now),
    partnersByProspect(db, tenantId),
    milestoneConfirmedAtByOpportunity(
      db,
      tenantId,
      opportunityRows.map((row) => row.id),
    ),
  ]);

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
    lastContactAt: coaching.get(row.id)?.lastContactAt ?? null,
    milestoneConfirmedAt: confirmedAt.get(row.id) ?? {},
    visitCount: visitFacts.get(row.prospectId)?.visitCount ?? 0,
    nextVisitAt: visitFacts.get(row.prospectId)?.nextVisitAt ?? null,
    nextVisitPrepared: visitFacts.get(row.prospectId)?.nextVisitPrepared ?? false,
    closeDateMoves: coaching.get(row.id)?.closeDateMoves ?? 0,
    closeDateMovesProspectSourced: coaching.get(row.id)?.closeDateMovesProspectSourced ?? false,
    partners: partners.get(row.prospectId) ?? [],
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
    return initiativeShare(this.snapshot, opportunityId, this.options.settings, this.options.clock);
  }

  /** "Qualify this and Kamuli goes from 0.61x to 0.87x" — the question worth asking of an ask
      that is not real yet, which is the one Opportunity Detail is built around. */
  coverageWith(opportunityId: string) {
    return coverageWith(this.snapshot, opportunityId, this.options.settings, this.options.clock);
  }

  coverageWithout(opportunityId: string) {
    return coverageWithout(this.snapshot, opportunityId, this.options.settings, this.options.clock);
  }
}

export { milestoneDefinitions };

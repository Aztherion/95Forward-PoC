// 95 Forward — running and caching the Monte Carlo (Initiative 21).
//
// The simulation itself is pure (@95forward/shared/forward-simulation). This module supplies the two
// things it cannot compute for itself: a DATA VERSION that changes whenever the scoped portfolio
// changes, and a cache keyed on it.
//
// Cost is not the reason to cache — 10,000 trials over ~50 opportunities is about 500k draws plus
// twelve sorts, which is milliseconds. The reason is DETERMINISM OF EXPERIENCE: the chart must not
// recompute per render, because a curve that redraws while you look at it is a curve nobody trusts.

import { count, eq, max } from "drizzle-orm";
import {
  simulate,
  type ForwardSettings,
  type MetricScope,
  type MetricsOverrides,
  type MetricsSnapshot,
  type SimulationResult,
  type Clock,
} from "@95forward/shared";
import type { Database } from "./client";
import { forwardOpportunities, opportunityEvents, opportunityMilestones } from "./schema/forward";

/**
 * A monotonic marker over the tenant's forward data.
 *
 * The event log gives this naturally: every tracked write appends a row, so max(occurredAt) plus the
 * row count moves on any change. `forward_opportunities.updated_at` is included because a direct
 * edit bumps it via drizzle's $onUpdate even when the write path is bypassed (the seed does this),
 * and the milestone count because confirming one changes qualification without touching either.
 */
export async function dataVersion(db: Database, tenantId: string): Promise<string> {
  const [events] = await db
    .select({ latest: max(opportunityEvents.occurredAt), rows: count() })
    .from(opportunityEvents)
    .where(eq(opportunityEvents.tenantId, tenantId));
  const [opportunities] = await db
    .select({ latest: max(forwardOpportunities.updatedAt), rows: count() })
    .from(forwardOpportunities)
    .where(eq(forwardOpportunities.tenantId, tenantId));
  const [milestones] = await db
    .select({ rows: count() })
    .from(opportunityMilestones)
    .where(eq(opportunityMilestones.tenantId, tenantId));

  return [
    events?.latest?.toISOString() ?? "none",
    events?.rows ?? 0,
    opportunities?.latest?.toISOString() ?? "none",
    opportunities?.rows ?? 0,
    milestones?.rows ?? 0,
  ].join("|");
}

/**
 * The cache key.
 *
 * `rulesVersion` (I22) is separate from `dataVersion` on purpose. The settings fields below cover
 * every parameter the simulation reads, so a percentile edit would move the key on its own — but a
 * rule being switched off, or a statement being rewritten, changes what the org is looking at
 * without changing any of them. One counter that moves on ANY doctrine write means a cache added
 * later has exactly one thing to remember to include.
 */
export function simulationCacheKey(
  scope: MetricScope,
  dataVersion: string,
  settings: ForwardSettings,
  trialCount: number,
  rulesVersion: string,
): string {
  const sim = settings.simulation;
  return [
    scope.rep,
    scope.initiative,
    scope.period,
    dataVersion,
    rulesVersion,
    trialCount,
    sim.percentiles.best,
    sim.percentiles.mostLikely,
    sim.percentiles.worst,
    sim.membershipNeighbourhoodFraction,
    sim.membershipThreshold,
    JSON.stringify(sim.dateConfidenceDays),
    JSON.stringify(sim.probabilityPct),
  ].join("::");
}

export interface SimulationServiceOptions {
  readonly settings: ForwardSettings;
  readonly clock: Clock;
  readonly dataVersion: string;
  /** From `rulesVersion(db, tenantId)` (I22). Moves on any doctrine write. */
  readonly rulesVersion: string;
  /** Supply a shared Map to keep the cache across requests; omit for a per-instance cache. */
  readonly cache?: Map<string, SimulationResult>;
}

export interface SimulationRunStats {
  readonly hits: number;
  readonly misses: number;
}

/**
 * A handle over one loaded snapshot plus a cache.
 *
 * Mirrors ForwardMetricsService deliberately — I27 will hold both, and they MUST agree about which
 * opportunities they describe. Both filter with the same `scopeMatches`, over the same snapshot.
 */
export class ForwardSimulationService {
  private readonly cache: Map<string, SimulationResult>;
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly snapshot: MetricsSnapshot,
    private readonly options: SimulationServiceOptions,
  ) {
    this.cache = options.cache ?? new Map();
  }

  get stats(): SimulationRunStats {
    return { hits: this.hits, misses: this.misses };
  }

  /**
   * A what-if simulation is never cached: overrides are hypothetical and unbounded, so caching them
   * would grow without limit for no reuse. Only the plain scoped run is cached.
   */
  run(scope: MetricScope, overrides?: MetricsOverrides, trialCount?: number): SimulationResult {
    const trials = trialCount ?? this.options.settings.simulation.trialCount;
    if (overrides) {
      this.misses++;
      return this.compute(scope, overrides, trials);
    }

    const key = simulationCacheKey(
      scope,
      this.options.dataVersion,
      this.options.settings,
      trials,
      this.options.rulesVersion,
    );
    const cached = this.cache.get(key);
    if (cached) {
      this.hits++;
      return cached;
    }
    this.misses++;
    const result = this.compute(scope, undefined, trials);
    this.cache.set(key, result);
    return result;
  }

  private compute(
    scope: MetricScope,
    overrides: MetricsOverrides | undefined,
    trialCount: number,
  ): SimulationResult {
    return simulate({
      snapshot: this.snapshot,
      scope,
      settings: this.options.settings,
      clock: this.options.clock,
      overrides,
      trialCount,
    });
  }
}

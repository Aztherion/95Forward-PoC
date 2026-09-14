import "server-only";
import {
  dataVersion,
  ForwardSimulationService,
  loadMetricsSnapshot,
  loadOpportunityLabels,
  resolveTenantCatalogue,
  rulesVersion,
  withTenant,
} from "@95forward/db";
import {
  computeMetrics,
  settingsFromCatalogue,
  type ForwardSettings,
  type MetricScope,
  type MetricsOverrides,
  type SimulationResult,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { demoClock } from "@/server/data/forward-context";

/**
 * The what-if sandbox's compute path — READ ONLY, and that is the whole feature.
 *
 * This module exists so the guarantee is structural rather than procedural. It imports no
 * repository write function, opens no write transaction and calls nothing that mutates: the only
 * things it can do are load a snapshot and hand it to two pure functions that take overrides as
 * arguments. There is no commit path from a hypothesis to the database because there is no code
 * here that could be one — the same reasoning as I28's drafted actions, where "never auto-send"
 * holds because no send integration exists at all.
 *
 * A commit path may be worth adding once the sandbox is trusted. It would be its own initiative,
 * with its own review of the per-edit guards it has to respect (the close-date prospect-confirmed
 * question, the milestone `confirmedBy` requirement). It does not belong here.
 */

/** The simulation cache, shared with nothing — see the note on keying in the repo. */
const SIMULATION_CACHE = new Map<string, SimulationResult>();

export interface WhatIfMetricRow {
  readonly label: string;
  readonly baselineCents: number | null;
  readonly whatIfCents: number | null;
  readonly deltaCents: number | null;
  /** A ratio rather than money — rendered as `0.38×`. */
  readonly kind: "money" | "ratio";
  readonly baselineRatio?: number | null;
  readonly whatIfRatio?: number | null;
}

export interface WhatIfPoint {
  readonly date: string;
  readonly actualCents: number | null;
  readonly mostLikelyCents: number;
  readonly bestCents: number;
  readonly worstCents: number;
  readonly baselineMostLikelyCents: number;
}

export interface WhatIfResultView {
  readonly points: readonly WhatIfPoint[];
  readonly goalCents: number | null;
  readonly goalDefined: boolean;
  readonly metrics: readonly WhatIfMetricRow[];
  /** Year-end most likely, both ways, for the one-line summary. */
  readonly yearEnd: { readonly baselineCents: number; readonly whatIfCents: number };
  readonly todayIso: string;
  /** How many of the pending changes are outside this scope, so the UI can say so. */
  readonly outOfViewCount: number;
  readonly inViewCount: number;
  /** Names for the changed rows in view, for the one-line summary. */
  readonly changedNames: readonly string[];
}

function currentPeriod(settings: ForwardSettings, now: Date): string {
  const today = now.toISOString().slice(0, 10);
  const periods = settings.fiscalPeriods;
  return (periods.find((p) => p.start <= today && today <= p.end) ?? periods[0])?.label ?? "FY26";
}

/** Every opportunity a set of overrides touches. */
function touchedIds(overrides: MetricsOverrides): string[] {
  return [
    ...new Set([
      ...(overrides.excludeOpportunityIds ?? []),
      ...Object.keys(overrides.opportunityPatches ?? {}),
      ...Object.keys(overrides.milestonePatches ?? {}),
    ]),
  ];
}

/**
 * Compute a hypothesis. Nothing is written, and nothing can be.
 *
 * Both the baseline and the what-if are computed from ONE loaded snapshot in ONE transaction, so
 * the pair is a genuine comparison rather than two reads a moment apart.
 */
export async function computeWhatIf(
  tenantId: string,
  repUserId: string,
  scopeInput: { readonly rep: string; readonly initiative: string },
  overrides: MetricsOverrides,
): Promise<WhatIfResultView> {
  const clock = demoClock();
  const now = clock.now();

  const { resolved, snapshot, labels, version, rules } = await withTenant(
    getAppDb(),
    tenantId,
    async (tx) => {
      const [resolved, snapshot, labels, version, rules] = await Promise.all([
        resolveTenantCatalogue(tx, tenantId),
        loadMetricsSnapshot(tx, tenantId, { now }),
        loadOpportunityLabels(tx, tenantId),
        dataVersion(tx, tenantId),
        rulesVersion(tx, tenantId),
      ]);
      return { resolved, snapshot, labels, version, rules };
    },
  );

  const settings = settingsFromCatalogue(resolved);
  const scope: MetricScope = {
    rep: scopeInput.rep || repUserId,
    initiative: scopeInput.initiative || "all",
    period: currentPeriod(settings, now),
  };

  const service = new ForwardSimulationService(snapshot, {
    settings,
    clock,
    dataVersion: version,
    rulesVersion: rules,
    cache: SIMULATION_CACHE,
  });

  // Both runs share a seed by construction — `simulate` hashes the BASELINE in-scope portfolio,
  // never the overridden one, so the only thing separating these two curves is the hypothesis.
  const baselineSim = service.run(scope);
  const whatIfSim = service.run(scope, overrides);

  const baseline = computeMetrics({ snapshot, scope, settings, clock });
  const after = computeMetrics({ snapshot, scope, settings, clock, overrides });

  const baselineByMonth = new Map(baselineSim.months.map((m) => [m.month, m.mostLikelyCents]));
  const points: WhatIfPoint[] = whatIfSim.months.map((month) => ({
    date: `${month.month}-01`,
    actualCents: month.actualCents ?? null,
    mostLikelyCents: month.mostLikelyCents,
    bestCents: month.bestCents,
    worstCents: month.worstCents,
    baselineMostLikelyCents: baselineByMonth.get(month.month) ?? month.mostLikelyCents,
  }));

  // The no-goal path is real and must degrade rather than break: an initiative deliberately has
  // no goal, and I19 forbids falling back to a parent's. Coverage and the gap are simply absent
  // there — a silently wrong number is worse than an absent one.
  const goalDefined = baseline.goalDefined && baseline.goalCents !== null;

  const metrics: WhatIfMetricRow[] = [
    {
      label: "Qualified asks on the table",
      kind: "money",
      baselineCents: baseline.qualifiedAsks.cents,
      whatIfCents: after.qualifiedAsks.cents,
      deltaCents: after.qualifiedAsks.cents - baseline.qualifiedAsks.cents,
    },
    {
      label: "Most likely at year end",
      kind: "money",
      baselineCents: baselineSim.yearEnd.mostLikelyCents,
      whatIfCents: whatIfSim.yearEnd.mostLikelyCents,
      deltaCents: whatIfSim.yearEnd.mostLikelyCents - baselineSim.yearEnd.mostLikelyCents,
    },
  ];

  if (goalDefined) {
    metrics.push(
      {
        label: "Coverage",
        kind: "ratio",
        baselineCents: null,
        whatIfCents: null,
        deltaCents: null,
        baselineRatio: baseline.coverageRatio,
        whatIfRatio: after.coverageRatio,
      },
      {
        label: "Coverage gap",
        kind: "money",
        baselineCents: baseline.coverageGapCents,
        whatIfCents: after.coverageGapCents,
        deltaCents:
          after.coverageGapCents !== null && baseline.coverageGapCents !== null
            ? after.coverageGapCents - baseline.coverageGapCents
            : null,
      },
    );
  }

  // Overrides are scope-INDEPENDENT; the scope is a lens over them. A change made under one
  // initiative keeps affecting the year when you widen to Everything — that is the more valuable
  // question. The cost is that some pending changes may be invisible, which is the worst state
  // this feature could produce, so it is counted and surfaced rather than left implicit.
  const inScopeIds = new Set(
    snapshot.opportunities
      .filter(
        (o) =>
          (scope.rep === "all" || o.ownerUserId === scope.rep) &&
          (scope.initiative === "all" || o.initiativeId === scope.initiative),
      )
      .map((o) => o.id),
  );
  const touched = touchedIds(overrides);
  const inView = touched.filter((id) => inScopeIds.has(id));

  return {
    points,
    goalCents: goalDefined ? baseline.goalCents : null,
    goalDefined,
    metrics,
    yearEnd: {
      baselineCents: baselineSim.yearEnd.mostLikelyCents,
      whatIfCents: whatIfSim.yearEnd.mostLikelyCents,
    },
    todayIso: now.toISOString().slice(0, 10),
    inViewCount: inView.length,
    outOfViewCount: touched.length - inView.length,
    changedNames: inView
      .map((id) => labels.get(id)?.prospectName ?? "an opportunity")
      .sort()
      .slice(0, 4),
  };
}

import "server-only";
import { and, eq } from "drizzle-orm";
import {
  dataVersion,
  ForwardSimulationService,
  fundingInitiatives,
  listEventsForOpportunities,
  loadMetricsSnapshot,
  loadOpportunityLabels,
  resolveTenantCatalogue,
  rulesVersion,
  withTenant,
  type OpportunityLabel,
} from "@95forward/db";
import {
  closeDateChanges,
  computeMetrics,
  movementPanels,
  registerBuiltInRules,
  registerRankingRules,
  settingsFromCatalogue,
  stageBoard,
  type CloseDateChainResult,
  type ForwardMetrics,
  type MetricScope,
  type MovementPanels,
  type SimulationResult,
  type StageBoard,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { demoClock } from "@/server/data/forward-context";

registerBuiltInRules();
registerRankingRules();

/**
 * The simulation cache, shared across requests AND across scopes.
 *
 * The key already carries the scope, so each tab caches independently — switching to Kamuli and
 * back does not recompute either. This screen IS the simulation; I26 shipped a detail page running
 * an uncached 10,000-trial run per render for one row of one panel, which stalled the dev server
 * under two workers and took the suite from 3.9m to 8.4m. Here it would be far worse.
 */
const SIMULATION_CACHE = new Map<string, SimulationResult>();

export interface ForecastTab {
  readonly id: string;
  readonly label: string;
  readonly colourKey: string | null;
  /** `all` for Everything; an initiative id otherwise. */
  readonly initiative: string;
}

export interface LedgerRow {
  readonly opportunityId: string;
  readonly prospectName: string;
  readonly initiativeName: string;
  readonly initiativeColourKey: string | null;
  readonly badge: SimulationResult["membership"][number]["badge"];
  readonly amountCents: number;
  readonly qualified: boolean;
}

export interface MovementRowView {
  readonly opportunityId: string;
  readonly prospectName: string;
  readonly initiativeName: string;
  readonly stage: string;
  readonly amountCents: number;
  readonly silenceDays: number | null;
  readonly closeDate: string | null;
  readonly closeDateMoves: number;
  /** The date chain for the slipping panel — `Jun → Aug → Oct 31`. Empty for the untouched one. */
  readonly chain: readonly string[];
}

export interface ForecastData {
  readonly scope: MetricScope;
  readonly tabs: readonly ForecastTab[];
  readonly activeTab: ForecastTab;
  readonly metrics: ForwardMetrics;
  readonly simulation: SimulationResult;
  readonly stage: StageBoard;
  readonly ledger: readonly LedgerRow[];
  readonly untouched: readonly MovementRowView[];
  readonly slipping: readonly MovementRowView[];
  readonly untouchedTotal: MovementPanels["untouched"];
  readonly slippingTotal: MovementPanels["slipping"];
  readonly labels: ReadonlyMap<string, OpportunityLabel>;
  readonly coverageMultiple: number;
  readonly untouchedDays: number;
  readonly pushes: number;
  /** The goal owner's name, for `DANA'S FY26 GOAL · ALL INITIATIVES`. */
  readonly repName: string;
  readonly asOf: Date;
  /** Cache telemetry, so a test can assert the simulation is served rather than recomputed. */
  readonly simulationStats: { readonly hits: number; readonly misses: number };
}

function paramNumber(
  resolved: readonly { id: string; values: Readonly<Record<string, unknown>> }[],
  ruleId: string,
  key: string,
  fallback: number,
): number {
  const value = resolved.find((entry) => entry.id === ruleId)?.values[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Everything the Forecast Room renders, for one scope, in ONE tenant transaction.
 *
 * Every figure on this screen has to tie to every other one, and the fastest way to break that is
 * to read the same tenant at two moments. One snapshot, one simulation over it, one stage board
 * over it.
 */
export async function getForecastData(
  tenantId: string,
  repUserId: string,
  repName: string,
  initiative: string,
): Promise<ForecastData> {
  const clock = demoClock();
  const now = clock.now();

  const { resolved, snapshot, labels, initiatives, version, rules } = await withTenant(
    getAppDb(),
    tenantId,
    async (tx) => {
      const [resolved, snapshot, labels, initiatives, version, rules] = await Promise.all([
        resolveTenantCatalogue(tx, tenantId),
        loadMetricsSnapshot(tx, tenantId, { now }),
        loadOpportunityLabels(tx, tenantId),
        tx
          .select({
            id: fundingInitiatives.id,
            name: fundingInitiatives.name,
            colourKey: fundingInitiatives.colourKey,
          })
          .from(fundingInitiatives)
          .where(
            and(eq(fundingInitiatives.tenantId, tenantId), eq(fundingInitiatives.restricted, true)),
          ),
        dataVersion(tx, tenantId),
        rulesVersion(tx, tenantId),
      ]);
      return { resolved, snapshot, labels, initiatives, version, rules };
    },
  );

  const settings = settingsFromCatalogue(resolved);
  const period = settings.fiscalPeriods[0]?.label ?? "FY26";

  // Every initiative that carries opportunities, plus Everything. `restricted` excludes nothing
  // here — Unrestricted is an ordinary initiative — so the list is built from what the portfolio
  // actually references rather than from a flag.
  const referenced = new Set(snapshot.opportunities.map((o) => o.initiativeId));
  const byId = new Map(
    [...labels.values()].map((l) => [
      l.initiativeId,
      { name: l.initiativeName, colourKey: l.initiativeColourKey },
    ]),
  );
  for (const row of initiatives) byId.set(row.id, { name: row.name, colourKey: row.colourKey });

  const tabs: ForecastTab[] = [
    { id: "everything", label: "Everything", colourKey: null, initiative: "all" },
    ...[...referenced]
      .map((id) => ({
        id,
        label: byId.get(id)?.name ?? "Unknown initiative",
        colourKey: byId.get(id)?.colourKey ?? null,
        initiative: id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
  const activeTab = tabs.find((t) => t.initiative === initiative) ?? tabs[0]!;

  const scope: MetricScope = { rep: repUserId, initiative: activeTab.initiative, period };

  const service = new ForwardSimulationService(snapshot, {
    settings,
    clock,
    dataVersion: version,
    rulesVersion: rules,
    cache: SIMULATION_CACHE,
  });
  const simulation = service.run(scope);
  const metrics = computeMetrics({ snapshot, scope, settings, clock });
  const stage = stageBoard(snapshot, scope, clock);

  const untouchedDays = paramNumber(resolved, "movement-untouched-days", "days", 30);
  const pushes = paramNumber(resolved, "movement-pushes", "pushes", 2);
  const movement = movementPanels(snapshot, scope, clock, { untouchedDays, pushes });

  // The date chains, for the slipping panel only — a handful of rows, one query.
  const chains = await withTenant(getAppDb(), tenantId, async (tx) => {
    const events = await listEventsForOpportunities(
      tx,
      tenantId,
      movement.slipping.rows.map((r) => r.opportunityId),
    );
    const out = new Map<string, CloseDateChainResult>();
    for (const [id, rows] of events) {
      out.set(
        id,
        closeDateChanges(
          rows.map((row) => ({
            eventType: row.eventType,
            field: row.field,
            oldValue: row.oldValue,
            newValue: row.newValue,
            prospectSourced: row.prospectSourced,
            occurredAt: row.occurredAt,
            actorUserId: row.actorUserId,
            actorName: row.actorName,
            note: row.note,
          })),
        ),
      );
    }
    return out;
  });

  const view = (
    row: MovementPanels["untouched"]["rows"][number],
    chain: readonly string[] = [],
  ): MovementRowView => {
    const label = labels.get(row.opportunityId);
    return {
      opportunityId: row.opportunityId,
      prospectName: label?.prospectName ?? "Unknown prospect",
      initiativeName: label?.initiativeName ?? "—",
      stage: row.stage,
      amountCents: row.amountCents,
      silenceDays: row.silenceDays,
      closeDate: row.closeDate,
      closeDateMoves: row.closeDateMoves,
      chain,
    };
  };

  // The ledger: every opportunity the simulation stands on, biggest first. Names, not aggregates —
  // "if there's no names, there's no value in the graphic".
  const ledger: LedgerRow[] = simulation.membership
    .map((row) => {
      const label = labels.get(row.opportunityId);
      return {
        opportunityId: row.opportunityId,
        prospectName: label?.prospectName ?? "Unknown prospect",
        initiativeName: label?.initiativeName ?? "—",
        initiativeColourKey: label?.initiativeColourKey ?? null,
        badge: row.badge,
        amountCents: row.amountCents,
        qualified: row.qualified,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);

  return {
    scope,
    tabs,
    activeTab,
    metrics,
    simulation,
    stage,
    ledger,
    untouched: movement.untouched.rows.map((r) => view(r)),
    slipping: movement.slipping.rows.map((r) => view(r, chains.get(r.opportunityId)?.chain ?? [])),
    untouchedTotal: movement.untouched,
    slippingTotal: movement.slipping,
    labels,
    coverageMultiple: settings.coverageMultiple,
    untouchedDays,
    pushes,
    repName,
    asOf: now,
    simulationStats: service.stats,
  };
}

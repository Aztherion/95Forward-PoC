import "server-only";
import { eq } from "drizzle-orm";
import {
  dataVersion,
  ForwardSimulationService,
  fundingInitiatives,
  listQueueDecisions,
  loadMetricsSnapshot,
  loadOpportunityLabels,
  opportunityDataVersions,
  resolveTenantCatalogue,
  rulesVersion,
  users,
  withTenant,
} from "@95forward/db";
import {
  buildGridRows,
  checkScope,
  computeMetrics,
  dayWork,
  enabledCheckDefinitions,
  filterGridRows,
  gridTotals,
  groupGridRows,
  registerBuiltInRules,
  registerRankingRules,
  settingsFromCatalogue,
  sortGridRows,
  type ForwardMetrics,
  type ForwardSettings,
  type GridFilter,
  type GridGroup,
  type GridGroupBy,
  type GridLabel,
  type GridRow,
  type GridSortField,
  type GroupSubtotal,
  type MetricScope,
  type SimulationResult,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { demoClock } from "@/server/data/forward-context";

registerBuiltInRules();
registerRankingRules();

/**
 * The simulation cache, shared across requests and scopes — the same instance discipline as the
 * Forecast Room's.
 *
 * The grid carries a scenario-membership column, so every render implies a 10,000-trial Monte
 * Carlo. Keyed on data version AND rules version, so an edit invalidates it and nothing else
 * does. Unfiltered navigation — sorting, grouping, paging through scopes you have already seen —
 * is therefore free; only an edit pays. See `service.run` below for the measurement.
 */
const SIMULATION_CACHE = new Map<string, SimulationResult>();

export interface GridOption {
  readonly value: string;
  readonly label: string;
  readonly colourKey?: string | null;
}

export interface GridView {
  readonly scope: MetricScope;
  readonly groups: readonly GridGroup[];
  readonly groupBy: GridGroupBy;
  readonly sort: { readonly field: GridSortField; readonly dir: "asc" | "desc" };
  readonly filter: GridFilter;
  /** Totals over the rows actually shown, for the footer that ties back to the headline. */
  readonly shown: GroupSubtotal;
  /** The scope's metrics, unfiltered — what The Board and the Forecast Room show. */
  readonly metrics: ForwardMetrics;
  readonly rowCount: number;
  readonly totalCount: number;
  readonly initiatives: readonly GridOption[];
  readonly owners: readonly GridOption[];
  readonly repName: string;
  readonly asOf: Date;
  /** Cache telemetry, so a test can assert the simulation is served rather than recomputed. */
  readonly simulationStats: { readonly hits: number; readonly misses: number };
}

function currentPeriod(settings: ForwardSettings, now: Date): string {
  const today = now.toISOString().slice(0, 10);
  const periods = settings.fiscalPeriods;
  const containing = periods.find((p) => p.start <= today && today <= p.end);
  return (containing ?? periods[0])?.label ?? "FY26";
}

export interface GridQuery {
  readonly initiative: string;
  readonly rep: string;
  readonly groupBy: GridGroupBy;
  readonly sortField: GridSortField;
  readonly sortDir: "asc" | "desc";
  readonly filter: GridFilter;
}

/**
 * Everything the grid renders, for one scope, in ONE tenant transaction.
 *
 * Nothing here computes a verdict. The ranking comes from I23 (the FULL ranked list, of which The
 * Board's queue is the first seven — so the grid's rank column and the board's #1 cannot disagree),
 * the findings from I20, the membership from I21 and every subtotal from I19's own predicates.
 * That identity is the grid's entire claim over a spreadsheet, and it is structural here rather
 * than asserted in a comment: there is no second query that sums anything.
 */
export async function getGridView(
  tenantId: string,
  repUserId: string,
  repName: string,
  query: GridQuery,
): Promise<GridView> {
  const clock = demoClock();
  const now = clock.now();

  const {
    resolved,
    snapshot,
    labels,
    initiativeRows,
    userRows,
    decisions,
    versions,
    version,
    rules,
  } = await withTenant(getAppDb(), tenantId, async (tx) => {
    const [
      resolved,
      snapshot,
      labels,
      initiativeRows,
      userRows,
      decisions,
      versions,
      version,
      rules,
    ] = await Promise.all([
      resolveTenantCatalogue(tx, tenantId),
      loadMetricsSnapshot(tx, tenantId, { now }),
      loadOpportunityLabels(tx, tenantId),
      tx
        .select({
          id: fundingInitiatives.id,
          name: fundingInitiatives.name,
          shortName: fundingInitiatives.shortName,
          colourKey: fundingInitiatives.colourKey,
        })
        .from(fundingInitiatives)
        .where(eq(fundingInitiatives.tenantId, tenantId)),
      tx
        .select({ id: users.id, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.tenantId, tenantId)),
      listQueueDecisions(tx, tenantId),
      opportunityDataVersions(tx, tenantId),
      dataVersion(tx, tenantId),
      rulesVersion(tx, tenantId),
    ]);
    return {
      resolved,
      snapshot,
      labels,
      initiativeRows,
      userRows,
      decisions,
      versions,
      version,
      rules,
    };
  });

  const settings = settingsFromCatalogue(resolved);
  const scope: MetricScope = {
    rep: query.rep,
    initiative: query.initiative,
    period: currentPeriod(settings, now),
  };

  // I28's short_name, for the same reason the Forecast Room uses it: the full marketing name does
  // not fit a control and truncating it produces two labels nobody can tell apart.
  const initiatives: GridOption[] = initiativeRows
    .map((row) => ({
      value: row.id,
      label: row.shortName ?? row.name,
      colourKey: row.colourKey,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const initiativeLabel = new Map(initiatives.map((i) => [i.value, i.label]));

  const owners: GridOption[] = userRows
    .map((row) => ({ value: row.id, label: row.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const ownerNames = new Map(owners.map((o) => [o.value, o.label]));

  const gridLabels = new Map<string, GridLabel>(
    [...labels.entries()].map(([id, label]) => [
      id,
      {
        prospectName: label.prospectName,
        // The initiative's short name where it has one, so the column and the scope control agree.
        initiativeName: initiativeLabel.get(label.initiativeId) ?? label.initiativeName,
        initiativeColourKey: label.initiativeColourKey,
      },
    ]),
  );

  const checks = enabledCheckDefinitions(resolved);
  const work = dayWork({
    snapshot,
    scope,
    settings,
    clock,
    resolved,
    decisions: decisions.map((d) => ({
      opportunityId: d.opportunityId,
      ruleId: d.ruleId,
      kind: d.kind,
      decidedAt: d.decidedAt.toISOString(),
      dataVersion: d.dataVersion,
    })),
    dataVersions: versions,
    checks,
  });
  const findings = checkScope({ snapshot, scope, settings, clock, checks }).findings;

  const service = new ForwardSimulationService(snapshot, {
    settings,
    clock,
    dataVersion: version,
    rulesVersion: rules,
    cache: SIMULATION_CACHE,
  });
  // Synchronously, and deliberately so.
  //
  // An edit bumps the data version and therefore misses this cache every time, which looked like
  // a problem worth engineering around — I26 shipped an uncached simulation per render and took
  // the suite from 3.9m to 8.4m. So it was measured before it was designed for: over the seeded
  // 34-opportunity portfolio a COLD 10,000-trial run is ~87ms, against ~56ms to load the snapshot
  // and ~14ms for the ranking. It does not dominate the round trip, so the scenario column is
  // computed with everything else rather than behind an asynchronous catch-up the numbers do not
  // justify. If the portfolio grows an order of magnitude, this is the line to revisit.
  const simulation = service.run(scope);

  const rows = buildGridRows({
    snapshot,
    scope,
    ranked: work.ranked,
    findings,
    membership: simulation.membership,
    labels: gridLabels,
    ownerNames,
    now,
  });

  const filtered = filterGridRows(rows, query.filter);
  const sorted = sortGridRows(filtered, query.sortField, query.sortDir);
  const groups = groupGridRows(sorted, query.groupBy, snapshot);

  return {
    scope,
    groups,
    groupBy: query.groupBy,
    sort: { field: query.sortField, dir: query.sortDir },
    filter: query.filter,
    shown: gridTotals(sorted, snapshot),
    metrics: computeMetrics({ snapshot, scope, settings, clock }),
    rowCount: sorted.length,
    totalCount: rows.length,
    initiatives,
    owners,
    repName,
    asOf: now,
    simulationStats: service.stats,
  };
}

export type { GridRow, GridGroup, GridGroupBy, GridSortField, GridFilter };

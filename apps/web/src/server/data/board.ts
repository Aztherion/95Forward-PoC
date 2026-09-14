import "server-only";
import {
  decideQueueItem,
  listQueueDecisions,
  loadMetricsSnapshot,
  loadOpportunityLabels,
  opportunityDataVersions,
  resolveTenantCatalogue,
  undecideQueueItem,
  withTenant,
  type QueueActor,
  type OpportunityLabel,
  type QueueDecisionRow,
} from "@95forward/db";
import {
  computeMetrics,
  dayWork,
  enabledCheckDefinitions,
  isDismissalLive,
  registerBuiltInRules,
  registerRankingRules,
  settingsFromCatalogue,
  type DayWorkResult,
  type DecisionKind,
  type ForwardMetrics,
  type ForwardSettings,
  type MetricScope,
  type QueueDecision,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { demoClock } from "@/server/data/forward-context";

// The catalogue registry is module-global and populated by import side effect. Calling this on
// every entry point is intentional and cheap — Next.js can tear down and rebuild a server module
// between requests, and a half-registered catalogue would rank against missing doctrine rather
// than fail loudly. `/rules` does the same, for the same reason.
registerBuiltInRules();
registerRankingRules();

export interface BoardData {
  readonly scope: MetricScope;
  readonly dayWork: DayWorkResult;
  readonly metrics: ForwardMetrics;
  /** Prospect and initiative names, by opportunity id. The snapshot carries ids only. */
  readonly labels: ReadonlyMap<string, OpportunityLabel>;
  /** From the rules catalogue, never a literal — the benchmark chip is a verdict, not decoration. */
  readonly coverageMultiple: number;
  /**
   * ruleId -> the org's effective statement of it, for the second half of a rule chip.
   *
   * From the resolved catalogue, so an org that has reworded a rule sees its own words on the card.
   * A chip whose text was typed into a screen goes stale the first time anyone edits the rule,
   * which is the failure the chip exists to prevent.
   */
  readonly ruleStatements: Readonly<Record<string, string | null>>;
  /** Dismissals still in force, so the restore affordance can name them. */
  readonly dismissed: readonly DismissedEntry[];
  readonly asOf: Date;
}

export interface DismissedEntry {
  readonly opportunityId: string;
  /** Null for the whole queue item; a rule id for one Fix-first finding about it. */
  readonly ruleId: string | null;
  readonly prospectName: string;
  readonly decidedAt: string;
}

function toDecision(row: QueueDecisionRow): QueueDecision {
  return {
    kind: row.kind,
    opportunityId: row.opportunityId,
    ruleId: row.ruleId,
    dataVersion: row.dataVersion,
    decidedAt: row.decidedAt.toISOString(),
  };
}

/** The period containing today, falling back to the first one the doctrine defines. */
function currentPeriod(settings: ForwardSettings, now: Date): string {
  const today = now.toISOString().slice(0, 10);
  const periods = settings.fiscalPeriods;
  const containing = periods.find((p) => p.start <= today && today <= p.end);
  return (containing ?? periods[0])?.label ?? "FY26";
}

/**
 * Everything The Board renders, in ONE tenant transaction.
 *
 * `/rules` was three serial `withTenant` round trips to build one page, and three was enough to
 * outrun a 5-second assertion under two parallel workers — each trip opens a transaction and sets
 * the tenant GUC. It is also simply correct: three reads of the same tenant taken at three moments
 * can disagree with each other, and this screen's whole claim is that its numbers reconcile.
 *
 * The decisions and data versions are read here rather than through `loadDayWork`, which would read
 * both again: the screen needs them twice — once to rank, and once to tell a rep what they have
 * dismissed. Reading them once is what guarantees those two halves agree.
 */
export async function getBoardData(tenantId: string, repUserId: string): Promise<BoardData> {
  const clock = demoClock();
  const now = clock.now();

  const { resolved, snapshot, labels, decisionRows, dataVersions } = await withTenant(
    getAppDb(),
    tenantId,
    async (tx) => {
      const [resolved, snapshot, labels, decisionRows, dataVersions] = await Promise.all([
        resolveTenantCatalogue(tx, tenantId),
        loadMetricsSnapshot(tx, tenantId, { now }),
        loadOpportunityLabels(tx, tenantId),
        listQueueDecisions(tx, tenantId),
        opportunityDataVersions(tx, tenantId),
      ]);
      return { resolved, snapshot, labels, decisionRows, dataVersions };
    },
  );

  const settings = settingsFromCatalogue(resolved);
  const scope: MetricScope = {
    rep: repUserId,
    initiative: "all",
    period: currentPeriod(settings, now),
  };
  const decisions = decisionRows.map(toDecision);

  const work = dayWork({
    snapshot,
    scope,
    settings,
    clock,
    resolved,
    decisions,
    dataVersions,
    // Threaded through so switching an I20 check off in the rules editor removes it from Fix first
    // here too — one doctrine, read by both halves of the screen.
    checks: enabledCheckDefinitions(resolved),
  });

  // Only dismissals that are still live, and only for opportunities in this rep's scope — a
  // dismissal on somebody else's opportunity is not this board's business to offer back.
  const inScope = new Set(snapshot.opportunities.map((o) => o.id));
  const dismissed: DismissedEntry[] = decisions
    .filter((d) => d.kind === "dismiss" && isDismissalLive(d, dataVersions))
    .filter((d) => inScope.has(d.opportunityId))
    .map((d) => ({
      opportunityId: d.opportunityId,
      ruleId: d.ruleId,
      prospectName: labels.get(d.opportunityId)?.prospectName ?? "This opportunity",
      decidedAt: d.decidedAt,
    }))
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));

  return {
    scope,
    dayWork: work,
    metrics: computeMetrics({ snapshot, scope, settings, clock }),
    labels,
    coverageMultiple: settings.coverageMultiple,
    ruleStatements: Object.fromEntries(resolved.map((entry) => [entry.id, entry.statement])),
    dismissed,
    asOf: now,
  };
}

// -------------------------------------------------------------------------------------------
// Writes — through withTenant, so RLS applies to a pin the same way it applies to a read.
// -------------------------------------------------------------------------------------------

/**
 * Record a pin or a dismissal.
 *
 * `decideQueueItem` writes the decision and the event-log entry in one transaction, and that is
 * deliberate: a rep rejecting guidance is INFORMATION — it is what lets a leader later see that
 * coaching was shown and declined rather than never surfaced — so neither half can be forgotten
 * without the other.
 */
export async function decideBoardItem(
  tenantId: string,
  input: { opportunityId: string; ruleId: string | null; kind: DecisionKind },
  actor: QueueActor,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) =>
    decideQueueItem(tx, tenantId, {
      opportunityId: input.opportunityId,
      ruleId: input.ruleId,
      kind: input.kind,
      actor,
      clock: demoClock(),
    }),
  );
}

/** Undo a pin or restore a dismissal, rather than waiting for the data to move. */
export async function undecideBoardItem(
  tenantId: string,
  input: { opportunityId: string; ruleId: string | null; kind: DecisionKind },
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) =>
    undecideQueueItem(tx, tenantId, {
      opportunityId: input.opportunityId,
      ruleId: input.ruleId,
      kind: input.kind,
    }),
  );
}

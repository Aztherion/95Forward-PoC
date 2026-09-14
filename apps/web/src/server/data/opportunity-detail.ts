import "server-only";
import {
  confirmMilestone,
  dataVersion,
  ForwardSimulationService,
  getForwardOpportunity,
  listOpportunityEvents,
  logContact,
  listQueueDecisions,
  loadMetricsSnapshot,
  loadMilestoneStates,
  loadOpportunityFacts,
  opportunityDataVersions,
  resolveTenantCatalogue,
  rulesVersion,
  updateForwardOpportunity,
  withTenant,
  type ForwardOpportunityRow,
  type MilestoneState,
  type OpportunityFacts,
} from "@95forward/db";
import {
  closeDateChanges,
  computeQualification,
  coverageWith,
  coverageWithout,
  dayWork,
  enabledCheckDefinitions,
  initiativeShare,
  lastContactAt,
  movementTimeline,
  rankOne,
  registerBuiltInRules,
  registerRankingRules,
  settingsFromCatalogue,
  silenceDays,
  stageCadenceDays,
  stageNextAction,
  type CloseDateChainResult,
  type CoverageWith,
  type CoverageWithout,
  type InitiativeShare,
  type MetricScope,
  type NextAction,
  type OpportunityEventLike,
  type QualificationResult,
  type ScenarioBadge,
  type SnapshotOpportunity,
  type SimulationResult,
  type SnapshotPartner,
  type UnrankedItem,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { demoClock } from "@/server/data/forward-context";

// The catalogue registry is module-global and populated by import side effect — see board.ts for
// why calling this on every entry point is intentional.
registerBuiltInRules();
registerRankingRules();

/**
 * The simulation cache, shared across requests.
 *
 * Opportunity Detail needs ONE row of "what this ask counts as" from a 10,000-trial Monte Carlo.
 * Running it per render made the dev server stall badly enough under two parallel workers that two
 * Board tests timed out at 3.9 minutes and then passed on retry in 1.5 seconds — a retry masking a
 * real cost rather than a flake. The service and its key exist for exactly this, keyed on data
 * version AND rules version, so a milestone confirmation or a doctrine edit invalidates it and
 * nothing else does.
 */
const SIMULATION_CACHE = new Map<string, SimulationResult>();

export interface QueuePosition {
  readonly rank: number;
  readonly total: number;
}

export interface OpportunityDetailData {
  readonly opportunity: ForwardOpportunityRow;
  readonly facts: OpportunityFacts;
  readonly snapshotOpportunity: SnapshotOpportunity;
  readonly milestones: readonly MilestoneState[];
  readonly qualification: QualificationResult;
  /** Null when this record is not in today's queue — then no position is invented. */
  readonly queuePosition: QueuePosition | null;
  /**
   * The ranking verdict for THIS record, from the same engine the board runs. Null when no rule
   * fires; the screen then falls back to `fallbackAction`.
   */
  readonly ranked: UnrankedItem | null;
  readonly fallbackAction: NextAction;
  readonly share: InitiativeShare | undefined;
  readonly coverageIfLost: CoverageWithout | undefined;
  readonly coverageIfQualified: CoverageWith | undefined;
  /** Which scenario the simulation puts this record in. Null when it is outside every one. */
  readonly membership: ScenarioBadge | null;
  readonly partners: readonly SnapshotPartner[];
  readonly closeDateChain: CloseDateChainResult;
  readonly silenceDays: number | null;
  readonly lastContactAt: Date | null;
  readonly cadenceDays: number;
  readonly timeline: readonly OpportunityEventLike[];
  readonly ruleStatements: Readonly<Record<string, string | null>>;
  readonly asOf: Date;
}

function toEventLike(row: {
  eventType: OpportunityEventLike["eventType"];
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  prospectSourced: boolean;
  occurredAt: Date;
  actorUserId: string | null;
  actorName: string | null;
  note: string | null;
}): OpportunityEventLike {
  return row;
}

/**
 * Everything Opportunity Detail renders, in ONE tenant transaction.
 *
 * The screen's whole argument is that its numbers reconcile — the milestone counter, the headline
 * contribution, the initiative share and the simulation membership are four views of one record —
 * so they are read from one snapshot taken at one moment. Two reads at two moments can disagree,
 * and this is the screen where being caught disagreeing costs the most.
 */
export async function getOpportunityDetail(
  tenantId: string,
  opportunityId: string,
  repUserId: string,
): Promise<OpportunityDetailData | null> {
  const clock = demoClock();
  const now = clock.now();

  const loaded = await withTenant(getAppDb(), tenantId, async (tx) => {
    const opportunity = await getForwardOpportunity(tx, tenantId, opportunityId);
    if (!opportunity) return null;
    const [
      resolved,
      snapshot,
      facts,
      milestones,
      events,
      decisionRows,
      dataVersions,
      version,
      rules,
    ] = await Promise.all([
      resolveTenantCatalogue(tx, tenantId),
      loadMetricsSnapshot(tx, tenantId, { now }),
      loadOpportunityFacts(tx, tenantId, opportunityId),
      loadMilestoneStates(tx, tenantId, opportunityId),
      listOpportunityEvents(tx, tenantId, opportunityId),
      listQueueDecisions(tx, tenantId),
      opportunityDataVersions(tx, tenantId),
      dataVersion(tx, tenantId),
      rulesVersion(tx, tenantId),
    ]);
    return {
      opportunity,
      resolved,
      snapshot,
      facts,
      milestones,
      events,
      decisionRows,
      dataVersions,
      version,
      rules,
    };
  });

  if (loaded === null || !loaded.facts) return null;
  const {
    opportunity,
    resolved,
    snapshot,
    facts,
    milestones,
    events,
    decisionRows,
    dataVersions,
    version,
    rules,
  } = loaded;

  const settings = settingsFromCatalogue(resolved);
  const period = settings.fiscalPeriods[0]?.label ?? "FY26";
  const snapshotOpportunity = snapshot.opportunities.find((o) => o.id === opportunityId);
  if (!snapshotOpportunity) return null;

  const eventLikes = events.map(toEventLike);
  const contactAt = lastContactAt(eventLikes);

  // The same scope The Board runs, so "#1 of 7" means the same seven the rep just came from.
  const scope: MetricScope = { rep: repUserId, initiative: "all", period };
  const work = dayWork({
    snapshot,
    scope,
    settings,
    clock,
    resolved,
    decisions: decisionRows.map((row) => ({
      kind: row.kind,
      opportunityId: row.opportunityId,
      ruleId: row.ruleId,
      dataVersion: row.dataVersion,
      decidedAt: row.decidedAt.toISOString(),
    })),
    dataVersions,
    checks: enabledCheckDefinitions(resolved),
  });
  const inQueue = work.queue.find((item) => item.opportunityId === opportunityId);

  // Rank the record itself regardless — it may sit below the cut, or be one the rep reached from a
  // search. `rankOne` is the board's own scoring, so the two can never contradict each other.
  const ranked = rankOne({ snapshot, scope, settings, clock, resolved, opportunityId });

  // The simulation is scoped to the whole portfolio: which scenario a record lands in is a claim
  // about the forecast the Forecast Room draws, not about one initiative.
  const simulation = new ForwardSimulationService(snapshot, {
    settings,
    clock,
    dataVersion: version,
    rulesVersion: rules,
    cache: SIMULATION_CACHE,
  }).run({ rep: "all", initiative: "all", period });
  const membership =
    simulation.membership.find((row) => row.opportunityId === opportunityId)?.badge ?? null;

  return {
    opportunity,
    facts,
    snapshotOpportunity,
    milestones,
    qualification: computeQualification(
      snapshot.definitions,
      snapshotOpportunity.confirmedMilestoneKeys,
    ),
    queuePosition: inQueue ? { rank: inQueue.rank, total: work.queue.length } : null,
    ranked,
    fallbackAction: stageNextAction(snapshotOpportunity.stage, {
      opportunityId,
      prospectId: snapshotOpportunity.prospectId,
    }),
    share: initiativeShare(snapshot, opportunityId, settings, clock, period),
    coverageIfLost: coverageWithout(snapshot, opportunityId, settings, clock, period),
    coverageIfQualified: coverageWith(snapshot, opportunityId, settings, clock, period),
    membership,
    partners: snapshotOpportunity.partners,
    closeDateChain: closeDateChanges(eventLikes),
    silenceDays: silenceDays(contactAt, now),
    lastContactAt: contactAt,
    cadenceDays: stageCadenceDays(resolved, snapshotOpportunity.stage),
    timeline: movementTimeline(eventLikes),
    ruleStatements: Object.fromEntries(resolved.map((entry) => [entry.id, entry.statement])),
    asOf: now,
  };
}

// -------------------------------------------------------------------------------------------
// Writes — every one through withTenant, and every one recording whether the prospect was the
// source. That flag is the whole slippage argument: without capturing it at the point of edit,
// "all three moves made by us" can only ever be true of seeded data.
// -------------------------------------------------------------------------------------------

export interface ConfirmInput {
  readonly opportunityId: string;
  readonly key: string;
  readonly confirmed: boolean;
  readonly prospectSourced: boolean;
  /** Who said it — a named external person for a they-said milestone, the user otherwise. */
  readonly confirmedByName: string | null;
  readonly evidence: string | null;
  readonly documentUrl: string | null;
}

export async function confirmOpportunityMilestone(
  tenantId: string,
  input: ConfirmInput,
  actor: { userId: string; name: string },
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) =>
    confirmMilestone(tx, tenantId, {
      opportunityId: input.opportunityId,
      key: input.key,
      confirmed: input.confirmed,
      confirmedByUserId: actor.userId,
      confirmedByName: input.confirmedByName,
      evidence: input.evidence,
      documentUrl: input.documentUrl,
      prospectSourced: input.prospectSourced,
      actor: { userId: actor.userId, name: actor.name },
      occurredAt: demoClock().now(),
    }),
  );
}

export interface MoveCloseDateInput {
  readonly opportunityId: string;
  readonly closeDate: string;
  /** Did the prospect give you this date, or did we pick it? */
  readonly prospectSourced: boolean;
}

export async function moveCloseDate(
  tenantId: string,
  input: MoveCloseDateInput,
  actor: { userId: string; name: string },
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) =>
    updateForwardOpportunity(tx, tenantId, {
      id: input.opportunityId,
      patch: { closeDate: input.closeDate },
      prospectSourced: input.prospectSourced,
      actor,
      occurredAt: demoClock().now(),
    }),
  );
}

export async function changeAmount(
  tenantId: string,
  input: { opportunityId: string; amountCents: number; amountNote: string | null },
  actor: { userId: string; name: string },
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) =>
    updateForwardOpportunity(tx, tenantId, {
      id: input.opportunityId,
      patch: { amountCents: input.amountCents, amountNote: input.amountNote },
      // An amount WE change is ours. A figure they agreed to is the `amount_agreed` milestone,
      // which is a different record with a different meaning.
      prospectSourced: false,
      actor,
      occurredAt: demoClock().now(),
    }),
  );
}

export async function logWhatHappened(
  tenantId: string,
  input: { opportunityId: string; note: string | null },
  actor: { userId: string; name: string },
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) =>
    logContact(tx, tenantId, {
      opportunityId: input.opportunityId,
      occurredAt: demoClock().now(),
      note: input.note,
      actor,
    }),
  );
}

// 95 Forward — the opportunity repository (Initiative 18).
//
// Every write path here appends to the event log. That is the whole point of the module: the
// slippage chain, the silence duration and both Forecast Room movement panels are reads over
// `opportunity_events`, and they can only exist if the writes record as they go.
//
// Capture is at the WRITE PATH, not by diffing snapshots: each call diffs its own before/after, so
// an opportunity updated twice between reads produces two sets of events rather than one collapsed
// diff.

import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import {
  closeDateChanges,
  computeQualification,
  diffOpportunityFields,
  isPreCloseStage,
  lastContactAt,
  movementTimeline,
  silenceDays,
  suggestProbabilityBand,
  type CloseDateChainResult,
  type DateConfidence,
  type ForwardStage,
  type GoalScope,
  type MilestoneDefinition,
  type OpportunityEventLike,
  type OpportunityEventType,
  type OpportunityStatus,
  type ProbabilityBand,
  type QualificationResult,
  type TrackedOpportunityValues,
  type VisitRating,
} from "@95forward/shared";
import type { Database } from "./client";
import {
  forwardOpportunities,
  goals,
  milestoneDefinitions,
  opportunityEvents,
  opportunityMilestones,
} from "./schema/forward";
import { constituents } from "./schema/constituents";
import { users } from "./schema/users";
import { fundingInitiatives } from "./schema/funding";
import { prospects } from "./schema/prospects";

export type ForwardOpportunityRow = typeof forwardOpportunities.$inferSelect;
export type OpportunityEventRow = typeof opportunityEvents.$inferSelect;
export type MilestoneDefinitionRow = typeof milestoneDefinitions.$inferSelect;
export type OpportunityMilestoneRow = typeof opportunityMilestones.$inferSelect;

/** Who made a change, and whether the prospect was the source of it. */
export interface Actor {
  readonly userId?: string | null;
  readonly name?: string | null;
}

function tenantScope(tenantId: string): SQL {
  const scope = eq(forwardOpportunities.tenantId, tenantId);
  return scope;
}

// -------------------------------------------------------------------------------------------
// Milestone definitions
// -------------------------------------------------------------------------------------------

export async function listMilestoneDefinitions(
  db: Database,
  tenantId: string,
): Promise<MilestoneDefinitionRow[]> {
  return db
    .select()
    .from(milestoneDefinitions)
    .where(eq(milestoneDefinitions.tenantId, tenantId))
    .orderBy(milestoneDefinitions.sortOrder);
}

function toDomainDefinitions(rows: readonly MilestoneDefinitionRow[]): MilestoneDefinition[] {
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    source: row.source,
    blocking: row.blocking,
    sortOrder: row.sortOrder,
  }));
}

// -------------------------------------------------------------------------------------------
// Event log
// -------------------------------------------------------------------------------------------

export interface AppendEventInput {
  readonly opportunityId: string;
  readonly eventType: OpportunityEventType;
  readonly field?: string | null;
  readonly oldValue?: string | null;
  readonly newValue?: string | null;
  readonly prospectSourced: boolean;
  readonly actor?: Actor;
  readonly note?: string | null;
  readonly occurredAt: Date;
}

/**
 * The low-level append. Used by the write paths below, and directly by the seed to lay down
 * backdated history — without which there is no movement timeline, no slippage chain and no
 * silence duration on day one.
 */
export async function appendOpportunityEvent(
  db: Database,
  tenantId: string,
  input: AppendEventInput,
): Promise<OpportunityEventRow> {
  const [row] = await db
    .insert(opportunityEvents)
    .values({
      tenantId,
      opportunityId: input.opportunityId,
      eventType: input.eventType,
      field: input.field ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      actorUserId: input.actor?.userId ?? null,
      actorName: input.actor?.name ?? null,
      prospectSourced: input.prospectSourced,
      note: input.note ?? null,
      occurredAt: input.occurredAt,
    })
    .returning();
  if (!row) throw new Error("appendOpportunityEvent: insert returned no row");
  return row;
}

export async function listOpportunityEvents(
  db: Database,
  tenantId: string,
  opportunityId: string,
): Promise<OpportunityEventRow[]> {
  return db
    .select()
    .from(opportunityEvents)
    .where(
      and(
        eq(opportunityEvents.tenantId, tenantId),
        eq(opportunityEvents.opportunityId, opportunityId),
      ),
    )
    .orderBy(desc(opportunityEvents.occurredAt));
}

// -------------------------------------------------------------------------------------------
// Writes
// -------------------------------------------------------------------------------------------

export interface CreateOpportunityInput {
  readonly prospectId: string;
  readonly initiativeId: string;
  readonly amountCents: number;
  readonly amountNote?: string | null;
  readonly closeDate?: string | null;
  readonly dateConfidence?: DateConfidence;
  readonly stage?: ForwardStage;
  readonly probability?: ProbabilityBand;
  readonly visitRating?: VisitRating | null;
  readonly ownerUserId?: string | null;
  readonly status?: OpportunityStatus;
}

export async function createForwardOpportunity(
  db: Database,
  tenantId: string,
  input: CreateOpportunityInput,
  actor: Actor = {},
  occurredAt: Date = new Date(),
): Promise<ForwardOpportunityRow> {
  const [row] = await db
    .insert(forwardOpportunities)
    .values({
      tenantId,
      prospectId: input.prospectId,
      initiativeId: input.initiativeId,
      amountCents: input.amountCents,
      amountNote: input.amountNote ?? null,
      closeDate: input.closeDate ?? null,
      dateConfidence: input.dateConfidence ?? "semi_firm",
      stage: input.stage ?? "get_the_visit",
      probability: input.probability ?? "medium",
      visitRating: input.visitRating ?? null,
      ownerUserId: input.ownerUserId ?? null,
      status: input.status ?? "open",
    })
    .returning();
  if (!row) throw new Error("createForwardOpportunity: insert returned no row");

  await appendOpportunityEvent(db, tenantId, {
    opportunityId: row.id,
    eventType: "note",
    prospectSourced: false,
    actor,
    note: "Opportunity created",
    occurredAt,
  });

  return row;
}

export interface UpdateOpportunityInput {
  readonly id: string;
  readonly patch: TrackedOpportunityValues;
  readonly actor?: Actor;
  /** Was the prospect the source of this change? Drives the entire slippage argument. */
  readonly prospectSourced: boolean;
  readonly occurredAt?: Date;
}

export interface UpdateOpportunityResult {
  readonly opportunity: ForwardOpportunityRow;
  readonly events: OpportunityEventRow[];
}

/**
 * The tracked write path. Loads the current row, diffs only the fields present in `patch`, writes,
 * then appends one event per changed field.
 */
export async function updateForwardOpportunity(
  db: Database,
  tenantId: string,
  input: UpdateOpportunityInput,
): Promise<UpdateOpportunityResult> {
  const before = await getForwardOpportunity(db, tenantId, input.id);
  if (!before) throw new Error(`updateForwardOpportunity: ${input.id} not found`);

  const events = diffOpportunityFields(
    before as unknown as TrackedOpportunityValues,
    input.patch,
    input.prospectSourced,
  );

  if (events.length === 0) return { opportunity: before, events: [] };

  const [updated] = await db
    .update(forwardOpportunities)
    .set(input.patch as Partial<typeof forwardOpportunities.$inferInsert>)
    .where(and(eq(forwardOpportunities.tenantId, tenantId), eq(forwardOpportunities.id, input.id)))
    .returning();
  if (!updated) throw new Error("updateForwardOpportunity: update returned no row");

  const occurredAt = input.occurredAt ?? new Date();
  const written: OpportunityEventRow[] = [];
  for (const event of events) {
    written.push(
      await appendOpportunityEvent(db, tenantId, {
        opportunityId: input.id,
        eventType: event.eventType,
        field: event.field,
        oldValue: event.oldValue,
        newValue: event.newValue,
        prospectSourced: event.prospectSourced,
        actor: input.actor,
        occurredAt,
      }),
    );
  }

  return { opportunity: updated, events: written };
}

export interface ConfirmMilestoneInput {
  readonly opportunityId: string;
  readonly key: string;
  readonly confirmed?: boolean;
  readonly confirmedByUserId?: string | null;
  readonly confirmedByName?: string | null;
  readonly evidence?: string | null;
  readonly documentUrl?: string | null;
  readonly prospectSourced: boolean;
  readonly actor?: Actor;
  readonly occurredAt?: Date;
}

export async function confirmMilestone(
  db: Database,
  tenantId: string,
  input: ConfirmMilestoneInput,
): Promise<OpportunityMilestoneRow> {
  const [definition] = await db
    .select()
    .from(milestoneDefinitions)
    .where(
      and(eq(milestoneDefinitions.tenantId, tenantId), eq(milestoneDefinitions.key, input.key)),
    );
  if (!definition) throw new Error(`confirmMilestone: unknown milestone key "${input.key}"`);

  const confirmed = input.confirmed ?? true;
  const occurredAt = input.occurredAt ?? new Date();

  const [row] = await db
    .insert(opportunityMilestones)
    .values({
      tenantId,
      opportunityId: input.opportunityId,
      milestoneDefinitionId: definition.id,
      confirmed,
      confirmedAt: confirmed ? occurredAt : null,
      confirmedByUserId: input.confirmedByUserId ?? null,
      confirmedByName: input.confirmedByName ?? null,
      evidence: input.evidence ?? null,
      documentUrl: input.documentUrl ?? null,
    })
    .onConflictDoUpdate({
      target: [
        opportunityMilestones.tenantId,
        opportunityMilestones.opportunityId,
        opportunityMilestones.milestoneDefinitionId,
      ],
      set: {
        confirmed,
        confirmedAt: confirmed ? occurredAt : null,
        confirmedByUserId: input.confirmedByUserId ?? null,
        confirmedByName: input.confirmedByName ?? null,
        evidence: input.evidence ?? null,
        documentUrl: input.documentUrl ?? null,
      },
    })
    .returning();
  if (!row) throw new Error("confirmMilestone: upsert returned no row");

  await appendOpportunityEvent(db, tenantId, {
    opportunityId: input.opportunityId,
    eventType: "milestone_confirmed",
    field: input.key,
    oldValue: null,
    newValue: String(confirmed),
    prospectSourced: input.prospectSourced,
    actor: input.actor,
    note: input.evidence ?? null,
    occurredAt,
  });

  return row;
}

export interface LogContactInput {
  readonly opportunityId: string;
  readonly occurredAt: Date;
  readonly actor?: Actor;
  readonly note?: string | null;
  readonly prospectSourced?: boolean;
}

/** Contact is what `silenceDays` measures from. */
export async function logContact(
  db: Database,
  tenantId: string,
  input: LogContactInput,
): Promise<OpportunityEventRow> {
  return appendOpportunityEvent(db, tenantId, {
    opportunityId: input.opportunityId,
    eventType: "contact_logged",
    prospectSourced: input.prospectSourced ?? true,
    actor: input.actor,
    note: input.note ?? null,
    occurredAt: input.occurredAt,
  });
}

// -------------------------------------------------------------------------------------------
// Reads
// -------------------------------------------------------------------------------------------

export async function getForwardOpportunity(
  db: Database,
  tenantId: string,
  id: string,
): Promise<ForwardOpportunityRow | undefined> {
  const [row] = await db
    .select()
    .from(forwardOpportunities)
    .where(and(tenantScope(tenantId), eq(forwardOpportunities.id, id)));
  return row;
}

export async function listForwardOpportunities(
  db: Database,
  tenantId: string,
  extraWhere?: SQL,
): Promise<ForwardOpportunityRow[]> {
  const where = extraWhere ? and(tenantScope(tenantId), extraWhere) : tenantScope(tenantId);
  return db.select().from(forwardOpportunities).where(where);
}

export async function confirmedMilestoneKeys(
  db: Database,
  tenantId: string,
  opportunityIds: readonly string[],
): Promise<Map<string, string[]>> {
  const byOpportunity = new Map<string, string[]>();
  if (opportunityIds.length === 0) return byOpportunity;

  const rows = await db
    .select({
      opportunityId: opportunityMilestones.opportunityId,
      key: milestoneDefinitions.key,
      confirmed: opportunityMilestones.confirmed,
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
    const existing = byOpportunity.get(row.opportunityId) ?? [];
    existing.push(row.key);
    byOpportunity.set(row.opportunityId, existing);
  }
  return byOpportunity;
}

export interface OpportunityDetail {
  readonly opportunity: ForwardOpportunityRow;
  readonly definitions: readonly MilestoneDefinition[];
  readonly confirmedKeys: readonly string[];
  readonly qualification: QualificationResult;
  /** The rep's stored band and the milestone-derived suggestion — I20 compares the two. */
  readonly probability: ProbabilityBand;
  readonly suggestedProbability: ProbabilityBand;
  readonly closeDateChain: CloseDateChainResult;
  readonly silenceDays: number | null;
  readonly lastContactAt: Date | null;
  readonly timeline: readonly OpportunityEventLike[];
}

export async function getOpportunityDetail(
  db: Database,
  tenantId: string,
  id: string,
  now: Date = new Date(),
): Promise<OpportunityDetail | undefined> {
  const opportunity = await getForwardOpportunity(db, tenantId, id);
  if (!opportunity) return undefined;

  const definitionRows = await listMilestoneDefinitions(db, tenantId);
  const definitions = toDomainDefinitions(definitionRows);
  const confirmedKeys = (await confirmedMilestoneKeys(db, tenantId, [id])).get(id) ?? [];
  const events = await listOpportunityEvents(db, tenantId, id);
  const contactAt = lastContactAt(events);

  return {
    opportunity,
    definitions,
    confirmedKeys,
    qualification: computeQualification(definitions, confirmedKeys),
    probability: opportunity.probability,
    suggestedProbability: suggestProbabilityBand(definitions, confirmedKeys),
    closeDateChain: closeDateChanges(events),
    silenceDays: silenceDays(contactAt, now),
    lastContactAt: contactAt,
    timeline: movementTimeline(events),
  };
}

// -------------------------------------------------------------------------------------------
// Display labels — the names the computation deliberately does not carry
// -------------------------------------------------------------------------------------------

export interface OpportunityLabel {
  readonly opportunityId: string;
  readonly prospectId: string;
  readonly prospectName: string;
  /** `individual` | `organization` | `foundation` | … — the constituent type, for the card's subtitle. */
  readonly prospectType: string;
  readonly initiativeId: string;
  readonly initiativeName: string;
  /** The stored key, not a colour. I17b's InitiativeDot maps it to a token. */
  readonly initiativeColourKey: string | null;
}

/**
 * Every opportunity's prospect and initiative, by name.
 *
 * The metrics snapshot carries ids and no names, on purpose — the computation is pure over facts
 * and a rename must never be able to change a number. So the screen resolves names separately, and
 * this is that resolution: one query for the whole tenant rather than one per card, because The
 * Board renders ten of them and a per-card lookup is ten round trips inside one render.
 */
export async function loadOpportunityLabels(
  db: Database,
  tenantId: string,
): Promise<Map<string, OpportunityLabel>> {
  const rows = await db
    .select({
      opportunityId: forwardOpportunities.id,
      prospectId: forwardOpportunities.prospectId,
      prospectName: constituents.displayName,
      prospectType: constituents.type,
      initiativeId: forwardOpportunities.initiativeId,
      initiativeName: fundingInitiatives.name,
      initiativeColourKey: fundingInitiatives.colourKey,
    })
    .from(forwardOpportunities)
    .innerJoin(prospects, eq(prospects.id, forwardOpportunities.prospectId))
    .innerJoin(constituents, eq(constituents.id, prospects.constituentId))
    .innerJoin(fundingInitiatives, eq(fundingInitiatives.id, forwardOpportunities.initiativeId))
    .where(eq(forwardOpportunities.tenantId, tenantId));

  return new Map(rows.map((row) => [row.opportunityId, row]));
}

export interface OpportunityFacts extends OpportunityLabel {
  /** "over three years" — rendered as `$250,000 over three years`. */
  readonly amountNote: string | null;
  readonly relationshipManager: string | null;
}

/** The one record's labels, plus the facts panel's own fields. One query, like the bulk read. */
export async function loadOpportunityFacts(
  db: Database,
  tenantId: string,
  opportunityId: string,
): Promise<OpportunityFacts | undefined> {
  const [row] = await db
    .select({
      opportunityId: forwardOpportunities.id,
      prospectId: forwardOpportunities.prospectId,
      prospectName: constituents.displayName,
      prospectType: constituents.type,
      initiativeId: forwardOpportunities.initiativeId,
      initiativeName: fundingInitiatives.name,
      initiativeColourKey: fundingInitiatives.colourKey,
      amountNote: forwardOpportunities.amountNote,
      relationshipManager: users.name,
    })
    .from(forwardOpportunities)
    .innerJoin(prospects, eq(prospects.id, forwardOpportunities.prospectId))
    .innerJoin(constituents, eq(constituents.id, prospects.constituentId))
    .innerJoin(fundingInitiatives, eq(fundingInitiatives.id, forwardOpportunities.initiativeId))
    .leftJoin(users, eq(users.id, prospects.rmUserId))
    .where(
      and(eq(forwardOpportunities.tenantId, tenantId), eq(forwardOpportunities.id, opportunityId)),
    );
  return row;
}

export interface MilestoneState {
  readonly key: string;
  readonly label: string;
  readonly source: "they_said" | "we_said";
  readonly blocking: boolean;
  readonly sortOrder: number;
  readonly confirmed: boolean;
  readonly confirmedAt: Date | null;
  /** A staff user, or a named external person — "Ellen Hallworth, verbally". */
  readonly confirmedBy: string | null;
  readonly evidence: string | null;
  readonly documentUrl: string | null;
}

/**
 * Every milestone for one opportunity, confirmed or not.
 *
 * `confirmedMilestoneKeys` answers "is this qualified"; the screen has to show the four rows that
 * are NOT confirmed as prominently as the two that are, with whatever evidence each carries. An
 * absent row means not confirmed — that is the model — so the definitions drive the list and the
 * state is joined onto them.
 */
export async function loadMilestoneStates(
  db: Database,
  tenantId: string,
  opportunityId: string,
): Promise<readonly MilestoneState[]> {
  const rows = await db
    .select({
      key: milestoneDefinitions.key,
      label: milestoneDefinitions.label,
      source: milestoneDefinitions.source,
      blocking: milestoneDefinitions.blocking,
      sortOrder: milestoneDefinitions.sortOrder,
      confirmed: opportunityMilestones.confirmed,
      confirmedAt: opportunityMilestones.confirmedAt,
      confirmedByName: opportunityMilestones.confirmedByName,
      confirmedByUser: users.name,
      evidence: opportunityMilestones.evidence,
      documentUrl: opportunityMilestones.documentUrl,
    })
    .from(milestoneDefinitions)
    .leftJoin(
      opportunityMilestones,
      and(
        eq(opportunityMilestones.milestoneDefinitionId, milestoneDefinitions.id),
        eq(opportunityMilestones.opportunityId, opportunityId),
        eq(opportunityMilestones.tenantId, tenantId),
      ),
    )
    .leftJoin(users, eq(users.id, opportunityMilestones.confirmedByUserId))
    .where(eq(milestoneDefinitions.tenantId, tenantId))
    .orderBy(milestoneDefinitions.sortOrder);

  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    source: row.source,
    blocking: row.blocking,
    sortOrder: row.sortOrder,
    confirmed: row.confirmed ?? false,
    confirmedAt: row.confirmedAt,
    confirmedBy: row.confirmedByName ?? row.confirmedByUser ?? null,
    evidence: row.evidence,
    documentUrl: row.documentUrl,
  }));
}

// -------------------------------------------------------------------------------------------
// Scope-level totals — Contradiction 1's resolution, expressed in the model
// -------------------------------------------------------------------------------------------

export interface ScopeTotals {
  /** Every open opportunity in a pre-close stage, qualified or not. The stage board's left half. */
  readonly preCloseTotalCents: number;
  readonly preCloseCount: number;
  /** Pre-close AND qualified. This — not the pre-close total — is "qualified asks on the table". */
  readonly qualifiedTotalCents: number;
  readonly qualifiedCount: number;
  /** The difference, which the stage board must show rather than hide. */
  readonly unqualifiedRemainderCents: number;
  readonly unqualifiedCount: number;
  /** Closed work, right of the divider: outside the headline number. */
  readonly closedWorkTotalCents: number;
  readonly closedWorkCount: number;
}

/**
 * SCREENS.md invariant #1 says qualified asks on the table equals the sum of the stage board's
 * first four columns. Invariant #4 says an opportunity's "what this ask counts as" agrees with its
 * stage-board column. In the designed data both cannot hold — Hallworth sits in
 * `follow_up_and_close` while reading "Not a real ask yet".
 *
 * Qualification wins: it is milestone-derived and it is the product's central claim. So the
 * pre-close columns contain both qualified and unqualified work, and this function returns all
 * three numbers so I27's reconciliation footer can state the pre-close total AND the qualified
 * subset rather than appearing to contradict the header.
 */
export async function scopeTotals(
  db: Database,
  tenantId: string,
  extraWhere?: SQL,
  options: { readonly onlyOpen?: boolean } = {},
): Promise<ScopeTotals> {
  const onlyOpen = options.onlyOpen ?? true;
  const rows = await listForwardOpportunities(db, tenantId, extraWhere);
  const considered = onlyOpen ? rows.filter((r) => r.status === "open") : rows;

  const definitions = toDomainDefinitions(await listMilestoneDefinitions(db, tenantId));
  const confirmed = await confirmedMilestoneKeys(
    db,
    tenantId,
    considered.map((r) => r.id),
  );

  const totals = {
    preCloseTotalCents: 0,
    preCloseCount: 0,
    qualifiedTotalCents: 0,
    qualifiedCount: 0,
    unqualifiedRemainderCents: 0,
    unqualifiedCount: 0,
    closedWorkTotalCents: 0,
    closedWorkCount: 0,
  };

  for (const row of considered) {
    if (!isPreCloseStage(row.stage)) {
      totals.closedWorkTotalCents += row.amountCents;
      totals.closedWorkCount += 1;
      continue;
    }
    totals.preCloseTotalCents += row.amountCents;
    totals.preCloseCount += 1;

    const { qualified } = computeQualification(definitions, confirmed.get(row.id) ?? []);
    if (qualified) {
      totals.qualifiedTotalCents += row.amountCents;
      totals.qualifiedCount += 1;
    } else {
      totals.unqualifiedRemainderCents += row.amountCents;
      totals.unqualifiedCount += 1;
    }
  }

  return totals;
}

// -------------------------------------------------------------------------------------------
// Goals
// -------------------------------------------------------------------------------------------

export type GoalRow = typeof goals.$inferSelect;

/**
 * Resolve a goal for a (scope, ref, period).
 *
 * Returns `undefined` — ABSENT — rather than falling back to a parent goal. I19 renders "no goal
 * defined for this view" off the back of this; a silent fallback to the org goal would make a
 * filtered view look funded when it is not.
 */
export async function resolveGoal(
  db: Database,
  tenantId: string,
  scope: GoalScope,
  scopeRefId: string,
  fiscalPeriod: string,
): Promise<GoalRow | undefined> {
  const [row] = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.tenantId, tenantId),
        eq(goals.scope, scope),
        eq(goals.scopeRefId, scopeRefId),
        eq(goals.fiscalPeriod, fiscalPeriod),
      ),
    );
  return row;
}

export async function upsertGoal(
  db: Database,
  tenantId: string,
  scope: GoalScope,
  scopeRefId: string,
  fiscalPeriod: string,
  amountCents: number,
): Promise<GoalRow> {
  const [row] = await db
    .insert(goals)
    .values({ tenantId, scope, scopeRefId, fiscalPeriod, amountCents })
    .onConflictDoUpdate({
      target: [goals.tenantId, goals.scope, goals.scopeRefId, goals.fiscalPeriod],
      set: { amountCents },
    })
    .returning();
  if (!row) throw new Error("upsertGoal: upsert returned no row");
  return row;
}

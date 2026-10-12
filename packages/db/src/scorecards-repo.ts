// 95 Forward — Scorecards: the service layer (Initiative 31).
//
// Three things live here and nowhere else:
//
//   1. VISIBILITY. One function — `visibleReporterIds` — answers "whose meetings may this person
//      see", and every read path takes its answer. Re-deriving that rule per endpoint is how a
//      product ends up with one screen that leaks and five that do not.
//   2. THE SCORECARD LIFECYCLE. Status transitions are validated against the shared state machine
//      and applied as compare-and-swap updates, so a retried job cannot walk the state backwards.
//   3. THE DEFINITION SNAPSHOT. `buildDefinitionSnapshot` is the only place a live definition is
//      turned into the immutable JSON a Scorecard is scored against.
//
// Tenant isolation is RLS, as everywhere else. Manager visibility sits ON TOP of it as a query
// predicate — it is not a second isolation mechanism and must never be mistaken for one.

import { and, asc, desc, eq, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import {
  aggregateScorecard,
  assertScorecardTransition,
  validateScorecardDefinition,
  verifyEvidenceQuote,
  type CriterionResultInput,
  type CriterionType,
  type MeetingSourceType,
  type ScorecardDefinitionSnapshot,
  type ScorecardStatus,
} from "@95forward/shared";
import type { Database } from "./client";
import { constituents } from "./schema/constituents";
import { forwardOpportunities } from "./schema/forward";
import { fundingInitiatives } from "./schema/funding";
import { prospects } from "./schema/prospects";
import {
  criterionResults,
  meetingTypes,
  meetings,
  scorecardCriteria,
  scorecardCriterionOptions,
  scorecardDefinitions,
  scorecardSections,
  scorecards,
} from "./schema/scorecards";
import { users } from "./schema/users";
import { appendOpportunityEvent, type Actor } from "./forward-repo";

export type MeetingRow = typeof meetings.$inferSelect;
export type ScorecardRow = typeof scorecards.$inferSelect;
export type MeetingTypeRow = typeof meetingTypes.$inferSelect;
export type ScorecardDefinitionRow = typeof scorecardDefinitions.$inferSelect;
export type CriterionResultRow = typeof criterionResults.$inferSelect;

/** Thrown when a definition fails the §1 structural rules. Carries every issue, not just the first. */
export class DefinitionInvalidError extends Error {
  readonly issues: readonly { readonly path: string; readonly message: string }[];
  constructor(issues: readonly { readonly path: string; readonly message: string }[]) {
    super(`scorecard definition is invalid: ${issues.map((i) => i.message).join(" ")}`);
    this.name = "DefinitionInvalidError";
    this.issues = issues;
  }
}

/** Thrown when a definition or type that Scorecards point at is deleted. Deactivate instead. */
export class InUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InUseError";
  }
}

// =================================================================================================
// Visibility — the one shared function
// =================================================================================================

export interface ScorecardViewer {
  readonly userId: string;
  readonly tenantId: string;
}

/**
 * Whose meetings this viewer may see: themselves, plus their direct reports.
 *
 * ONE LEVEL. A manager sees their reports, not their reports' reports — so this is a single query
 * on `manager_id`, not a recursive walk, and making it multi-level later means changing one
 * function rather than auditing every read.
 *
 * Every read path in this module calls this. A caller that filters on `reported_by` by hand has
 * forked the rule, and the fork is the bug.
 */
export async function visibleReporterIds(
  db: Database,
  viewer: ScorecardViewer,
): Promise<string[]> {
  const reports = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, viewer.tenantId), eq(users.managerId, viewer.userId)));
  return [viewer.userId, ...reports.map((row) => row.id)];
}

/** The predicate every meeting/scorecard read applies after RLS. */
function visibleTo(reporterIds: readonly string[]): SQL {
  const clause = inArray(meetings.reportedBy, [...reporterIds]);
  if (clause === undefined) throw new Error("visibleTo: empty reporter id set");
  return clause;
}

/** Does this viewer manage anyone? "Manager" is a thing you have, not a thing you are. */
export async function hasDirectReports(db: Database, viewer: ScorecardViewer): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, viewer.tenantId), eq(users.managerId, viewer.userId)))
    .limit(1);
  return rows.length > 0;
}

// =================================================================================================
// Meeting Types
// =================================================================================================

export async function listMeetingTypes(
  db: Database,
  tenantId: string,
): Promise<MeetingTypeRow[]> {
  return db
    .select()
    .from(meetingTypes)
    .where(eq(meetingTypes.tenantId, tenantId))
    .orderBy(asc(meetingTypes.name));
}

export async function getFallbackMeetingType(
  db: Database,
  tenantId: string,
): Promise<MeetingTypeRow | undefined> {
  const [row] = await db
    .select()
    .from(meetingTypes)
    .where(and(eq(meetingTypes.tenantId, tenantId), eq(meetingTypes.isFallback, true)))
    .limit(1);
  return row;
}

export interface MeetingTypeInput {
  readonly name: string;
  readonly description: string;
  readonly isFallback?: boolean;
}

export async function createMeetingType(
  db: Database,
  tenantId: string,
  input: MeetingTypeInput,
): Promise<MeetingTypeRow> {
  if (input.name.trim().length === 0) {
    throw new DefinitionInvalidError([{ path: "name", message: "A meeting type needs a name." }]);
  }
  if (input.description.trim().length === 0) {
    throw new DefinitionInvalidError([
      {
        path: "description",
        message: "A meeting type needs a description — it is what the classifier reads.",
      },
    ]);
  }
  return db.transaction(async (tx) => {
    if (input.isFallback === true) await clearFallback(tx, tenantId);
    const [row] = await tx
      .insert(meetingTypes)
      .values({
        tenantId,
        name: input.name.trim(),
        description: input.description.trim(),
        isFallback: input.isFallback ?? false,
      })
      .returning();
    if (!row) throw new Error("createMeetingType: insert returned no row");
    return row;
  });
}

export async function updateMeetingType(
  db: Database,
  tenantId: string,
  id: string,
  input: Partial<MeetingTypeInput>,
): Promise<MeetingTypeRow | undefined> {
  return db.transaction(async (tx) => {
    // Clearing first keeps the partial unique index satisfied at every instant — Postgres checks it
    // per statement, so "set the new one then clear the old" would fail where this cannot.
    if (input.isFallback === true) await clearFallback(tx, tenantId, id);
    const [row] = await tx
      .update(meetingTypes)
      .set({
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.description === undefined ? {} : { description: input.description.trim() }),
        ...(input.isFallback === undefined ? {} : { isFallback: input.isFallback }),
      })
      .where(and(eq(meetingTypes.tenantId, tenantId), eq(meetingTypes.id, id)))
      .returning();
    return row;
  });
}

async function clearFallback(db: Database, tenantId: string, exceptId?: string): Promise<void> {
  await db
    .update(meetingTypes)
    .set({ isFallback: false })
    .where(
      and(
        eq(meetingTypes.tenantId, tenantId),
        eq(meetingTypes.isFallback, true),
        ...(exceptId === undefined ? [] : [sql`${meetingTypes.id} <> ${exceptId}`]),
      ),
    );
}

/**
 * Delete a Meeting Type — refused once any Scorecard references it.
 *
 * A Scorecard's snapshot is interpreted against the type it was scored as. Deleting the type would
 * leave a manager reading a result that no longer says what kind of meeting it judged.
 * Deactivating the definition is the supported alternative.
 */
export async function deleteMeetingType(
  db: Database,
  tenantId: string,
  id: string,
): Promise<void> {
  const [used] = await db
    .select({ id: scorecards.id })
    .from(scorecards)
    .where(and(eq(scorecards.tenantId, tenantId), eq(scorecards.meetingTypeId, id)))
    .limit(1);
  if (used) {
    throw new InUseError(
      "This meeting type has Scorecards against it. Deactivate its definition instead of deleting the type.",
    );
  }
  await db
    .delete(meetingTypes)
    .where(and(eq(meetingTypes.tenantId, tenantId), eq(meetingTypes.id, id)));
}

// =================================================================================================
// Scorecard Definitions
// =================================================================================================

export interface CriterionOptionInput {
  readonly id?: string;
  readonly label: string;
  readonly description: string;
}

export interface CriterionInput {
  readonly id?: string;
  readonly type: CriterionType;
  readonly prompt: string;
  readonly guidance?: string | null;
  readonly options?: readonly CriterionOptionInput[];
}

export interface SectionInput {
  readonly id?: string;
  readonly title: string;
  readonly description?: string | null;
  readonly criteria: readonly CriterionInput[];
}

export interface DefinitionInput {
  readonly id?: string;
  readonly name: string;
  readonly meetingTypeId: string;
  readonly isActive?: boolean;
  readonly sections: readonly SectionInput[];
}

export async function listScorecardDefinitions(
  db: Database,
  tenantId: string,
): Promise<ScorecardDefinitionRow[]> {
  return db
    .select()
    .from(scorecardDefinitions)
    .where(eq(scorecardDefinitions.tenantId, tenantId))
    .orderBy(asc(scorecardDefinitions.name));
}

export async function getActiveDefinitionForType(
  db: Database,
  tenantId: string,
  meetingTypeId: string,
): Promise<ScorecardDefinitionRow | undefined> {
  const [row] = await db
    .select()
    .from(scorecardDefinitions)
    .where(
      and(
        eq(scorecardDefinitions.tenantId, tenantId),
        eq(scorecardDefinitions.meetingTypeId, meetingTypeId),
        eq(scorecardDefinitions.isActive, true),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Write a whole definition — sections, criteria, options — in one transaction.
 *
 * STABLE IDS SURVIVE EDITS. Every section, criterion and option keeps the id it was given; an
 * `id` supplied on the way in is honoured and an omitted one is minted. Rewriting a criterion's
 * prompt must not orphan the results already recorded against it, which is the whole reason the
 * tree is written by id rather than torn down and rebuilt.
 */
export async function saveScorecardDefinition(
  db: Database,
  tenantId: string,
  input: DefinitionInput,
): Promise<ScorecardDefinitionRow> {
  const issues = validateScorecardDefinition(input);
  if (issues.length > 0) throw new DefinitionInvalidError(issues);

  return db.transaction(async (tx) => {
    const isActive = input.isActive ?? true;
    let definitionId = input.id;

    if (definitionId === undefined) {
      const [row] = await tx
        .insert(scorecardDefinitions)
        .values({
          tenantId,
          name: input.name.trim(),
          meetingTypeId: input.meetingTypeId,
          isActive,
        })
        .returning();
      if (!row) throw new Error("saveScorecardDefinition: insert returned no row");
      definitionId = row.id;
    } else {
      await tx
        .update(scorecardDefinitions)
        .set({ name: input.name.trim(), meetingTypeId: input.meetingTypeId, isActive })
        .where(
          and(
            eq(scorecardDefinitions.tenantId, tenantId),
            eq(scorecardDefinitions.id, definitionId),
          ),
        );
    }

    const keptSections: string[] = [];
    for (const [si, section] of input.sections.entries()) {
      const sectionId = await upsertSection(tx, tenantId, definitionId, section, si);
      keptSections.push(sectionId);
      const keptCriteria: string[] = [];
      for (const [ci, criterion] of section.criteria.entries()) {
        const criterionId = await upsertCriterion(tx, tenantId, sectionId, criterion, ci);
        keptCriteria.push(criterionId);
        const keptOptions: string[] = [];
        for (const [oi, option] of (criterion.options ?? []).entries()) {
          keptOptions.push(await upsertOption(tx, tenantId, criterionId, option, oi));
        }
        await tx
          .delete(scorecardCriterionOptions)
          .where(
            and(
              eq(scorecardCriterionOptions.tenantId, tenantId),
              eq(scorecardCriterionOptions.criterionId, criterionId),
              keptOptions.length === 0
                ? sql`true`
                : notInArray(scorecardCriterionOptions.id, keptOptions),
            ),
          );
      }
      await tx
        .delete(scorecardCriteria)
        .where(
          and(
            eq(scorecardCriteria.tenantId, tenantId),
            eq(scorecardCriteria.sectionId, sectionId),
            keptCriteria.length === 0
              ? sql`true`
              : notInArray(scorecardCriteria.id, keptCriteria),
          ),
        );
    }
    await tx
      .delete(scorecardSections)
      .where(
        and(
          eq(scorecardSections.tenantId, tenantId),
          eq(scorecardSections.definitionId, definitionId),
          keptSections.length === 0
            ? sql`true`
            : notInArray(scorecardSections.id, keptSections),
        ),
      );

    const [row] = await tx
      .select()
      .from(scorecardDefinitions)
      .where(
        and(eq(scorecardDefinitions.tenantId, tenantId), eq(scorecardDefinitions.id, definitionId)),
      )
      .limit(1);
    if (!row) throw new Error("saveScorecardDefinition: definition vanished mid-transaction");
    return row;
  });
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function upsertSection(
  tx: Tx,
  tenantId: string,
  definitionId: string,
  section: SectionInput,
  sortOrder: number,
): Promise<string> {
  const values = {
    tenantId,
    definitionId,
    title: section.title.trim(),
    description: section.description ?? null,
    sortOrder,
  };
  if (section.id === undefined) {
    const [row] = await tx.insert(scorecardSections).values(values).returning({
      id: scorecardSections.id,
    });
    if (!row) throw new Error("upsertSection: insert returned no row");
    return row.id;
  }
  await tx
    .insert(scorecardSections)
    .values({ id: section.id, ...values })
    .onConflictDoUpdate({ target: scorecardSections.id, set: values });
  return section.id;
}

async function upsertCriterion(
  tx: Tx,
  tenantId: string,
  sectionId: string,
  criterion: CriterionInput,
  sortOrder: number,
): Promise<string> {
  const values = {
    tenantId,
    sectionId,
    type: criterion.type,
    prompt: criterion.prompt.trim(),
    guidance: criterion.guidance ?? null,
    sortOrder,
  };
  if (criterion.id === undefined) {
    const [row] = await tx.insert(scorecardCriteria).values(values).returning({
      id: scorecardCriteria.id,
    });
    if (!row) throw new Error("upsertCriterion: insert returned no row");
    return row.id;
  }
  await tx
    .insert(scorecardCriteria)
    .values({ id: criterion.id, ...values })
    .onConflictDoUpdate({ target: scorecardCriteria.id, set: values });
  return criterion.id;
}

async function upsertOption(
  tx: Tx,
  tenantId: string,
  criterionId: string,
  option: CriterionOptionInput,
  sortOrder: number,
): Promise<string> {
  const values = {
    tenantId,
    criterionId,
    label: option.label.trim(),
    description: option.description.trim(),
    sortOrder,
  };
  if (option.id === undefined) {
    const [row] = await tx.insert(scorecardCriterionOptions).values(values).returning({
      id: scorecardCriterionOptions.id,
    });
    if (!row) throw new Error("upsertOption: insert returned no row");
    return row.id;
  }
  await tx
    .insert(scorecardCriterionOptions)
    .values({ id: option.id, ...values })
    .onConflictDoUpdate({ target: scorecardCriterionOptions.id, set: values });
  return option.id;
}

export async function setDefinitionActive(
  db: Database,
  tenantId: string,
  id: string,
  isActive: boolean,
): Promise<void> {
  await db
    .update(scorecardDefinitions)
    .set({ isActive })
    .where(and(eq(scorecardDefinitions.tenantId, tenantId), eq(scorecardDefinitions.id, id)));
}

/** Refused once any Scorecard was snapshotted from it. Deactivation is the alternative. */
export async function deleteScorecardDefinition(
  db: Database,
  tenantId: string,
  id: string,
): Promise<void> {
  const [used] = await db
    .select({ id: scorecards.id })
    .from(scorecards)
    .where(and(eq(scorecards.tenantId, tenantId), eq(scorecards.definitionId, id)))
    .limit(1);
  if (used) {
    throw new InUseError(
      "This definition has Scorecards against it. Deactivate it instead of deleting it.",
    );
  }
  await db
    .delete(scorecardDefinitions)
    .where(and(eq(scorecardDefinitions.tenantId, tenantId), eq(scorecardDefinitions.id, id)));
}

/**
 * The live definition, frozen.
 *
 * Called once per scoring run. From that moment the Scorecard reads its own copy and nothing a
 * human does to the definition can change what an existing result means.
 */
export async function buildDefinitionSnapshot(
  db: Database,
  tenantId: string,
  definitionId: string,
): Promise<ScorecardDefinitionSnapshot | null> {
  const [definition] = await db
    .select({
      id: scorecardDefinitions.id,
      name: scorecardDefinitions.name,
      meetingTypeId: scorecardDefinitions.meetingTypeId,
      meetingTypeName: meetingTypes.name,
    })
    .from(scorecardDefinitions)
    .innerJoin(meetingTypes, eq(meetingTypes.id, scorecardDefinitions.meetingTypeId))
    .where(
      and(eq(scorecardDefinitions.tenantId, tenantId), eq(scorecardDefinitions.id, definitionId)),
    )
    .limit(1);
  if (!definition) return null;

  const sectionRows = await db
    .select()
    .from(scorecardSections)
    .where(
      and(
        eq(scorecardSections.tenantId, tenantId),
        eq(scorecardSections.definitionId, definitionId),
      ),
    )
    .orderBy(asc(scorecardSections.sortOrder));

  const sectionIds = sectionRows.map((row) => row.id);
  const criterionRows =
    sectionIds.length === 0
      ? []
      : await db
          .select()
          .from(scorecardCriteria)
          .where(
            and(
              eq(scorecardCriteria.tenantId, tenantId),
              inArray(scorecardCriteria.sectionId, sectionIds),
            ),
          )
          .orderBy(asc(scorecardCriteria.sortOrder));

  const criterionIds = criterionRows.map((row) => row.id);
  const optionRows =
    criterionIds.length === 0
      ? []
      : await db
          .select()
          .from(scorecardCriterionOptions)
          .where(
            and(
              eq(scorecardCriterionOptions.tenantId, tenantId),
              inArray(scorecardCriterionOptions.criterionId, criterionIds),
            ),
          )
          .orderBy(asc(scorecardCriterionOptions.sortOrder));

  return {
    id: definition.id,
    name: definition.name,
    meetingTypeId: definition.meetingTypeId,
    meetingTypeName: definition.meetingTypeName,
    sections: sectionRows.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      sortOrder: section.sortOrder,
      criteria: criterionRows
        .filter((criterion) => criterion.sectionId === section.id)
        .map((criterion) => ({
          id: criterion.id,
          type: criterion.type,
          prompt: criterion.prompt,
          guidance: criterion.guidance,
          sortOrder: criterion.sortOrder,
          options: optionRows
            .filter((option) => option.criterionId === criterion.id)
            .map((option) => ({
              id: option.id,
              label: option.label,
              description: option.description,
              sortOrder: option.sortOrder,
            })),
        })),
    })),
  };
}

// =================================================================================================
// Reporting a meeting
// =================================================================================================

export interface ReportMeetingInput {
  readonly opportunityId?: string | null;
  readonly prospectId?: string | null;
  readonly occurredAt: Date;
  readonly sourceType: MeetingSourceType;
  readonly content: string;
}

export class LinkTargetNotVisibleError extends Error {
  constructor() {
    // Deliberately the same message whether the target is missing or merely not theirs — see the
    // 404-not-403 note on getScorecardForViewer.
    super("That opportunity or prospect could not be found.");
    this.name = "LinkTargetNotVisibleError";
  }
}

/**
 * Create the Meeting and its `queued` Scorecard in ONE transaction, then let the caller enqueue.
 *
 * A Meeting without a Scorecard would be a meeting nobody will ever score, surfaced nowhere and
 * noticed by no one — so the two rows are born together or not at all. The job is enqueued by the
 * caller AFTER the transaction commits; enqueueing inside it would let the worker pick the job up
 * before the rows it needs exist.
 *
 * `reportedBy` is the CALLER, always. A manager cannot report on a rep's behalf in this
 * initiative, which is why there is no `reportedBy` field on the input.
 */
export async function reportMeeting(
  db: Database,
  viewer: ScorecardViewer,
  input: ReportMeetingInput,
): Promise<{ meetingId: string; scorecardId: string }> {
  const hasOpportunity = Boolean(input.opportunityId);
  const hasProspect = Boolean(input.prospectId);
  if (hasOpportunity === hasProspect) {
    throw new Error("reportMeeting: link the meeting to exactly one opportunity or prospect");
  }
  if (input.content.trim().length === 0) {
    throw new Error("reportMeeting: a meeting needs its notes or transcript");
  }

  // The link target must exist in this tenant. The read runs under the caller's RLS session, so a
  // target in another tenant is simply not there.
  if (input.opportunityId) {
    const [row] = await db
      .select({ id: forwardOpportunities.id })
      .from(forwardOpportunities)
      .where(eq(forwardOpportunities.id, input.opportunityId))
      .limit(1);
    if (!row) throw new LinkTargetNotVisibleError();
  } else if (input.prospectId) {
    const [row] = await db
      .select({ id: prospects.id })
      .from(prospects)
      .where(eq(prospects.id, input.prospectId))
      .limit(1);
    if (!row) throw new LinkTargetNotVisibleError();
  }

  return db.transaction(async (tx) => {
    const [meeting] = await tx
      .insert(meetings)
      .values({
        tenantId: viewer.tenantId,
        occurredAt: input.occurredAt,
        reportedBy: viewer.userId,
        sourceType: input.sourceType,
        content: input.content,
        opportunityId: input.opportunityId ?? null,
        prospectId: input.prospectId ?? null,
      })
      .returning({ id: meetings.id });
    if (!meeting) throw new Error("reportMeeting: meeting insert returned no row");

    const [scorecard] = await tx
      .insert(scorecards)
      .values({
        tenantId: viewer.tenantId,
        meetingId: meeting.id,
        // Empty until the classifier picks a definition. The column is NOT NULL because a
        // Scorecard without a snapshot is uninterpretable, and `{}` says "not yet" honestly.
        definitionSnapshot: {},
        status: "queued",
      })
      .returning({ id: scorecards.id });
    if (!scorecard) throw new Error("reportMeeting: scorecard insert returned no row");

    return { meetingId: meeting.id, scorecardId: scorecard.id };
  });
}

// =================================================================================================
// Reads — every one of them visibility-filtered
// =================================================================================================

export interface ScorecardListRow {
  readonly scorecardId: string;
  readonly meetingId: string;
  readonly occurredAt: Date;
  readonly reportedByUserId: string;
  readonly reportedByName: string;
  readonly subjectName: string;
  readonly initiativeName: string | null;
  /** The opportunity's ask, so two meetings with the same prospect are distinguishable (I32). */
  readonly amountCents: number | null;
  readonly opportunityId: string | null;
  readonly prospectId: string | null;
  readonly meetingTypeId: string | null;
  readonly meetingTypeName: string | null;
  readonly sourceType: MeetingSourceType;
  readonly status: ScorecardStatus;
  readonly usedFallback: boolean;
  readonly overallScore: number | null;
}

export interface ListScorecardsOptions {
  readonly sortBy?: "occurredAt" | "overallScore";
  readonly direction?: "asc" | "desc";
  readonly reportedBy?: string;
  readonly meetingTypeId?: string;
  readonly limit?: number;
}

/**
 * The list I32 renders.
 *
 * Joined to the prospect through whichever link the meeting carries — a meeting hung off an
 * Opportunity derives its prospect through it, which is why that link is not stored twice.
 */
export async function listScorecards(
  db: Database,
  viewer: ScorecardViewer,
  options: ListScorecardsOptions = {},
): Promise<ScorecardListRow[]> {
  const reporterIds = await visibleReporterIds(db, viewer);
  const filters: SQL[] = [
    eq(scorecards.tenantId, viewer.tenantId),
    visibleTo(reporterIds),
    // CURRENT ONLY. A list that showed superseded versions would show the same meeting several
    // times with different scores, which is the opposite of what a list is for.
    eq(scorecards.isCurrent, true),
  ];
  if (options.reportedBy !== undefined) {
    // Narrowing within what they may already see — never widening it.
    filters.push(eq(meetings.reportedBy, options.reportedBy));
  }
  if (options.meetingTypeId !== undefined) {
    filters.push(eq(scorecards.meetingTypeId, options.meetingTypeId));
  }

  const direction = options.direction ?? "desc";
  const order =
    options.sortBy === "overallScore"
      ? direction === "asc"
        ? asc(scorecards.overallScore)
        : desc(scorecards.overallScore)
      : direction === "asc"
        ? asc(meetings.occurredAt)
        : desc(meetings.occurredAt);

  const rows = await db
    .select({
      scorecardId: scorecards.id,
      meetingId: meetings.id,
      occurredAt: meetings.occurredAt,
      reportedByUserId: meetings.reportedBy,
      reportedByName: users.name,
      subjectName: constituents.displayName,
      initiativeName: fundingInitiatives.name,
      amountCents: forwardOpportunities.amountCents,
      opportunityId: meetings.opportunityId,
      prospectId: meetings.prospectId,
      meetingTypeId: scorecards.meetingTypeId,
      meetingTypeName: meetingTypes.name,
      sourceType: meetings.sourceType,
      status: scorecards.status,
      usedFallback: scorecards.usedFallback,
      overallScore: scorecards.overallScore,
    })
    .from(scorecards)
    .innerJoin(meetings, eq(meetings.id, scorecards.meetingId))
    .innerJoin(users, eq(users.id, meetings.reportedBy))
    .leftJoin(forwardOpportunities, eq(forwardOpportunities.id, meetings.opportunityId))
    .leftJoin(
      fundingInitiatives,
      eq(fundingInitiatives.id, forwardOpportunities.initiativeId),
    )
    .leftJoin(
      prospects,
      sql`${prospects.id} = coalesce(${meetings.prospectId}, ${forwardOpportunities.prospectId})`,
    )
    .leftJoin(constituents, eq(constituents.id, prospects.constituentId))
    .leftJoin(meetingTypes, eq(meetingTypes.id, scorecards.meetingTypeId))
    .where(and(...filters))
    .orderBy(order)
    .limit(options.limit ?? 200);

  return rows.map((row) => ({
    ...row,
    subjectName: row.subjectName ?? "Unknown",
    overallScore: toNumber(row.overallScore),
  }));
}

export type ScorecardResultView = Omit<CriterionResultRow, "scoreValue"> & {
  readonly scoreValue: number | null;
};

/** One superseded version of a Scorecard, with the results it produced. */
export interface ScorecardVersion {
  readonly scorecard: ScorecardRow & { readonly overallScoreValue: number | null };
  readonly snapshot: ScorecardDefinitionSnapshot | null;
  readonly results: readonly ScorecardResultView[];
}

export interface ScorecardDetail {
  readonly scorecard: ScorecardRow & { readonly overallScoreValue: number | null };
  readonly meeting: MeetingRow;
  readonly snapshot: ScorecardDefinitionSnapshot | null;
  readonly results: readonly ScorecardResultView[];
  readonly reportedByName: string;
  readonly subjectName: string;
  /**
   * Prior versions of this meeting's Scorecard, newest first — EMPTY unless asked for.
   *
   * Off by default because the common read is "show me this Scorecard", and loading every
   * superseded version's criterion results to render one card is work nobody asked for.
   */
  readonly versions: readonly ScorecardVersion[];
}

export interface GetScorecardOptions {
  /** Load the superseded versions of this meeting's Scorecard into `versions`. */
  readonly includeVersions?: boolean;
}

/**
 * One Scorecard, with its meeting, snapshot and results.
 *
 * Returns null — NOT a permission error — when the viewer may not see it. The caller renders a 404.
 * A 403 would confirm that a Scorecard with that id exists and belongs to someone, which is
 * precisely the fact a rep must not be able to probe for about a peer.
 */
export async function getScorecardForViewer(
  db: Database,
  viewer: ScorecardViewer,
  scorecardId: string,
  options: GetScorecardOptions = {},
): Promise<ScorecardDetail | null> {
  const reporterIds = await visibleReporterIds(db, viewer);
  const [row] = await db
    .select({
      scorecard: scorecards,
      meeting: meetings,
      reportedByName: users.name,
      subjectName: constituents.displayName,
    })
    .from(scorecards)
    .innerJoin(meetings, eq(meetings.id, scorecards.meetingId))
    .innerJoin(users, eq(users.id, meetings.reportedBy))
    .leftJoin(forwardOpportunities, eq(forwardOpportunities.id, meetings.opportunityId))
    .leftJoin(
      prospects,
      sql`${prospects.id} = coalesce(${meetings.prospectId}, ${forwardOpportunities.prospectId})`,
    )
    .leftJoin(constituents, eq(constituents.id, prospects.constituentId))
    .where(
      and(
        eq(scorecards.tenantId, viewer.tenantId),
        eq(scorecards.id, scorecardId),
        visibleTo(reporterIds),
      ),
    )
    .limit(1);
  if (!row) return null;

  const results = await db
    .select()
    .from(criterionResults)
    .where(
      and(
        eq(criterionResults.tenantId, viewer.tenantId),
        eq(criterionResults.scorecardId, scorecardId),
      ),
    );

  return {
    scorecard: { ...row.scorecard, overallScoreValue: toNumber(row.scorecard.overallScore) },
    meeting: row.meeting,
    snapshot: readSnapshot(row.scorecard.definitionSnapshot),
    results: results.map((result) => ({ ...result, scoreValue: toNumber(result.scoreValue) })),
    reportedByName: row.reportedByName,
    subjectName: row.subjectName ?? "Unknown",
    versions: options.includeVersions === true
      ? await loadPriorVersions(db, viewer.tenantId, row.meeting.id, scorecardId)
      : [],
  };
}

/**
 * Every OTHER Scorecard for this meeting, newest first, each with its own results.
 *
 * The results come from one query keyed on the version ids rather than one query per version —
 * a meeting re-scored a dozen times would otherwise be a dozen round trips to render one history.
 */
async function loadPriorVersions(
  db: Database,
  tenantId: string,
  meetingId: string,
  exceptId: string,
): Promise<ScorecardVersion[]> {
  const rows = await db
    .select()
    .from(scorecards)
    .where(
      and(
        eq(scorecards.tenantId, tenantId),
        eq(scorecards.meetingId, meetingId),
        sql`${scorecards.id} <> ${exceptId}`,
      ),
    )
    .orderBy(desc(scorecards.createdAt));
  if (rows.length === 0) return [];

  const results = await db
    .select()
    .from(criterionResults)
    .where(
      and(
        eq(criterionResults.tenantId, tenantId),
        inArray(
          criterionResults.scorecardId,
          rows.map((row) => row.id),
        ),
      ),
    );

  return rows.map((row) => ({
    scorecard: { ...row, overallScoreValue: toNumber(row.overallScore) },
    snapshot: readSnapshot(row.definitionSnapshot),
    results: results
      .filter((result) => result.scorecardId === row.id)
      .map((result) => ({ ...result, scoreValue: toNumber(result.scoreValue) })),
  }));
}

/** The current Scorecard for a meeting, which is what every meeting-keyed read wants. */
export async function getCurrentScorecardForMeeting(
  db: Database,
  viewer: ScorecardViewer,
  meetingId: string,
  options: GetScorecardOptions = {},
): Promise<ScorecardDetail | null> {
  const [row] = await db
    .select({ id: scorecards.id })
    .from(scorecards)
    .where(
      and(
        eq(scorecards.tenantId, viewer.tenantId),
        eq(scorecards.meetingId, meetingId),
        eq(scorecards.isCurrent, true),
      ),
    )
    .limit(1);
  if (!row) return null;
  // Through the same function, so the visibility rule is applied exactly once.
  return getScorecardForViewer(db, viewer, row.id, options);
}

/** Status only — what I32 polls while the pipeline runs. Same visibility rule, same 404 shape. */
export async function getScorecardStatus(
  db: Database,
  viewer: ScorecardViewer,
  scorecardId: string,
): Promise<{ status: ScorecardStatus; failureReason: string | null } | null> {
  const reporterIds = await visibleReporterIds(db, viewer);
  const [row] = await db
    .select({ status: scorecards.status, failureReason: scorecards.failureReason })
    .from(scorecards)
    .innerJoin(meetings, eq(meetings.id, scorecards.meetingId))
    .where(
      and(
        eq(scorecards.tenantId, viewer.tenantId),
        eq(scorecards.id, scorecardId),
        visibleTo(reporterIds),
      ),
    )
    .limit(1);
  return row ?? null;
}

function readSnapshot(value: unknown): ScorecardDefinitionSnapshot | null {
  if (value === null || typeof value !== "object") return null;
  const candidate = value as Partial<ScorecardDefinitionSnapshot>;
  if (!Array.isArray(candidate.sections)) return null;
  return candidate as ScorecardDefinitionSnapshot;
}

/** pg `numeric` arrives as a string. One conversion, at the boundary. */
function toNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// =================================================================================================
// The pipeline's own reads and writes (worker-side; no viewer, the job carries the tenant)
// =================================================================================================

export interface ScoringJobView {
  readonly scorecard: ScorecardRow;
  readonly meeting: MeetingRow;
}

export async function loadScorecardForJob(
  db: Database,
  tenantId: string,
  scorecardId: string,
): Promise<ScoringJobView | null> {
  const [row] = await db
    .select({ scorecard: scorecards, meeting: meetings })
    .from(scorecards)
    .innerJoin(meetings, eq(meetings.id, scorecards.meetingId))
    .where(and(eq(scorecards.tenantId, tenantId), eq(scorecards.id, scorecardId)))
    .limit(1);
  return row ?? null;
}

/**
 * Move a Scorecard's status, refusing an illegal move.
 *
 * Compare-and-swap on the expected `from` state. Two workers racing the same job cannot both claim
 * it, and a retry that arrives after the job already finished finds the row no longer in the state
 * it expected and does nothing — which is what makes the handler idempotent rather than merely
 * repeatable.
 */
export async function transitionScorecard(
  db: Database,
  tenantId: string,
  scorecardId: string,
  from: ScorecardStatus,
  to: ScorecardStatus,
  extra: Partial<typeof scorecards.$inferInsert> = {},
): Promise<boolean> {
  assertScorecardTransition(from, to);
  const rows = await db
    .update(scorecards)
    .set({ status: to, ...extra })
    .where(
      and(
        eq(scorecards.tenantId, tenantId),
        eq(scorecards.id, scorecardId),
        eq(scorecards.status, from),
      ),
    )
    .returning({ id: scorecards.id });
  return rows.length > 0;
}

export async function failScorecard(
  db: Database,
  tenantId: string,
  scorecardId: string,
  reason: string,
): Promise<void> {
  await db
    .update(scorecards)
    .set({ status: "failed", failureReason: reason })
    .where(and(eq(scorecards.tenantId, tenantId), eq(scorecards.id, scorecardId)));
}

/** What the classifier decided, persisted before scoring starts so a crash does not redo it. */
export interface ClassificationRecord {
  readonly meetingTypeId: string;
  readonly definitionId: string;
  readonly snapshot: ScorecardDefinitionSnapshot;
  readonly rationale: string;
  readonly usedFallback: boolean;
  readonly model: string;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly promptVersion: string;
}

export async function recordClassification(
  db: Database,
  tenantId: string,
  scorecardId: string,
  record: ClassificationRecord,
): Promise<void> {
  await db
    .update(scorecards)
    .set({
      meetingTypeId: record.meetingTypeId,
      definitionId: record.definitionId,
      definitionSnapshot: record.snapshot,
      classificationRationale: record.rationale,
      usedFallback: record.usedFallback,
      classifyModel: record.model,
      classifyLatencyMs: record.latencyMs,
      classifyInputTokens: record.inputTokens,
      classifyOutputTokens: record.outputTokens,
      promptVersion: record.promptVersion,
    })
    .where(and(eq(scorecards.tenantId, tenantId), eq(scorecards.id, scorecardId)));
}

export interface ScoringRecord {
  readonly results: readonly CriterionResultInput[];
  readonly content: string;
  readonly snapshot: ScorecardDefinitionSnapshot;
  readonly model: string;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly scoredAt: Date;
}

/**
 * Write the results, the evidence verdicts and the aggregate — all inside ONE transaction.
 *
 * Results are REPLACED, not appended: delete-then-insert keyed on the scorecard. A retried job
 * therefore cannot double a Scorecard's results, and "one current Scorecard per meeting" stays
 * true by construction rather than by hoping the job only ever runs once.
 *
 * Evidence verification happens here rather than in the model layer because it is a property of
 * the stored pair (quote, content) and must hold for a seeded Scorecard too.
 */
export async function recordScoring(
  db: Database,
  tenantId: string,
  scorecardId: string,
  record: ScoringRecord,
): Promise<{ overallScore: number | null; sectionScores: Record<string, number | null> }> {
  const aggregate = aggregateScorecard(record.snapshot, record.results);

  await db.transaction(async (tx) => {
    await tx
      .delete(criterionResults)
      .where(
        and(
          eq(criterionResults.tenantId, tenantId),
          eq(criterionResults.scorecardId, scorecardId),
        ),
      );
    if (record.results.length > 0) {
      await tx.insert(criterionResults).values(
        record.results.map((result) => ({
          tenantId,
          scorecardId,
          criterionId: result.criterionId,
          sectionId: result.sectionId,
          criterionType: result.criterionType,
          determinable: result.determinable,
          booleanValue: result.booleanValue,
          scoreValue: result.scoreValue === null ? null : result.scoreValue.toFixed(4),
          optionId: result.optionId,
          rationale: result.rationale,
          evidenceQuote: result.evidenceQuote,
          evidenceVerified: verifyEvidenceQuote(record.content, result.evidenceQuote),
        })),
      );
    }
    await tx
      .update(scorecards)
      .set({
        status: "ready",
        failureReason: null,
        overallScore:
          aggregate.overallScore === null ? null : aggregate.overallScore.toFixed(4),
        sectionScores: aggregate.sectionScores,
        scoreModel: record.model,
        scoreLatencyMs: record.latencyMs,
        scoreInputTokens: record.inputTokens,
        scoreOutputTokens: record.outputTokens,
        scoredAt: record.scoredAt,
      })
      .where(and(eq(scorecards.tenantId, tenantId), eq(scorecards.id, scorecardId)));
  });

  return { overallScore: aggregate.overallScore, sectionScores: { ...aggregate.sectionScores } };
}

// =================================================================================================
// Override and re-score
// =================================================================================================

/**
 * A human picks a different Meeting Type.
 *
 * Classification is NOT re-run — a person has overruled it, and asking the model again would be
 * asking it to disagree with the human who just corrected it. The Scorecard is re-snapshotted
 * against the new type's active definition and re-scored in place.
 *
 * Returns the ids the caller needs to enqueue the scoring leg.
 */
/**
 * Supersede the current Scorecard for a meeting and return the row that replaced it.
 *
 * ONE TRANSACTION, AND THE ORDER MATTERS. The old row is flipped to `is_current = false` FIRST and
 * the new one inserted second, because Postgres checks the partial unique index per statement —
 * inserting first would collide with the row still marked current.
 *
 * The flip is a COMPARE-AND-SWAP on `is_current`. Two concurrent re-scores both try it; the second
 * blocks on the row lock, re-evaluates its predicate after the first commits, matches nothing, and
 * aborts rather than creating a second current version. The partial unique index is the backstop
 * if that reasoning is ever wrong.
 */
async function supersedeCurrent(
  tx: Tx,
  tenantId: string,
  currentId: string,
  reason: "override" | "rescore",
  now: Date,
  values: Omit<typeof scorecards.$inferInsert, "tenantId" | "meetingId">,
  meetingId: string,
): Promise<ScorecardRow | null> {
  const flipped = await tx
    .update(scorecards)
    .set({ isCurrent: false, supersededAt: now, supersedeReason: reason })
    .where(
      and(
        eq(scorecards.tenantId, tenantId),
        eq(scorecards.id, currentId),
        eq(scorecards.isCurrent, true),
      ),
    )
    .returning({ id: scorecards.id });
  // Somebody else superseded it between our read and this write. Theirs stands.
  if (flipped.length === 0) return null;

  const [inserted] = await tx
    .insert(scorecards)
    .values({ tenantId, meetingId, isCurrent: true, ...values })
    .returning();
  if (!inserted) throw new Error("supersedeCurrent: insert returned no row");

  await tx
    .update(scorecards)
    .set({ supersededBy: inserted.id })
    .where(and(eq(scorecards.tenantId, tenantId), eq(scorecards.id, currentId)));

  return inserted;
}

/**
 * A human picks a different Meeting Type.
 *
 * Classification is NOT re-run — a person has overruled it, and asking the model again would be
 * asking it to disagree with the human who just corrected it. A NEW Scorecard is created against
 * the new type's active definition and the old one is kept, superseded, with its own results
 * intact: "the classifier said Discovery Visit and Ruth said Ask Visit" is a fact worth keeping.
 *
 * The classifier's original rationale and its audit row travel forward, because they are still
 * true of this meeting — what changed is who decided, which `meeting_type_overridden_by` records.
 */
export async function overrideMeetingType(
  db: Database,
  viewer: ScorecardViewer,
  scorecardId: string,
  meetingTypeId: string,
  now: Date,
): Promise<
  | { ok: true; scorecardId: string; previousTypeName: string | null; newTypeName: string }
  | { ok: false }
> {
  const detail = await getScorecardForViewer(db, viewer, scorecardId);
  if (detail === null) return { ok: false };
  // Only the current version can be overridden. Re-scoring history would make it history no more.
  if (!detail.scorecard.isCurrent) return { ok: false };

  const definition = await getActiveDefinitionForType(db, viewer.tenantId, meetingTypeId);
  if (definition === undefined) {
    throw new InUseError("That meeting type has no active Scorecard Definition to score against.");
  }
  const snapshot = await buildDefinitionSnapshot(db, viewer.tenantId, definition.id);
  if (snapshot === null) throw new Error("overrideMeetingType: definition vanished");

  // One enforcement point for the lifecycle, here as in the job. A human override skips
  // classification, which is why `queued -> scoring` is a legal edge — see the state machine.
  assertScorecardTransition(detail.scorecard.status, "scoring");

  const previous = detail.scorecard.meetingTypeId;
  const [previousType] = previous
    ? await db
        .select({ name: meetingTypes.name })
        .from(meetingTypes)
        .where(and(eq(meetingTypes.tenantId, viewer.tenantId), eq(meetingTypes.id, previous)))
        .limit(1)
    : [];

  const created = await db.transaction((tx) =>
    supersedeCurrent(
      tx,
      viewer.tenantId,
      scorecardId,
      "override",
      now,
      {
        meetingTypeId,
        definitionId: definition.id,
        definitionSnapshot: snapshot,
        meetingTypeOverriddenBy: viewer.userId,
        // Fallback is a statement about what the CLASSIFIER did. Once a human has chosen, it is
        // no longer true of the type on the card.
        usedFallback: false,
        status: "scoring",
        failureReason: null,
        // Classification was not re-run, so its record travels with the new version.
        classificationRationale: detail.scorecard.classificationRationale,
        classifyModel: detail.scorecard.classifyModel,
        classifyLatencyMs: detail.scorecard.classifyLatencyMs,
        classifyInputTokens: detail.scorecard.classifyInputTokens,
        classifyOutputTokens: detail.scorecard.classifyOutputTokens,
        promptVersion: detail.scorecard.promptVersion,
      },
      detail.meeting.id,
    ),
  );
  if (created === null) return { ok: false };

  return {
    ok: true,
    scorecardId: created.id,
    previousTypeName: previousType?.name ?? null,
    newTypeName: snapshot.meetingTypeName,
  };
}

/**
 * Re-run the whole pipeline on the same meeting — useful when a definition has changed.
 *
 * A NEW Scorecard, back at `queued` with an empty snapshot: classification runs again too, because
 * a changed definition can also mean the type now resolves differently. The previous version and
 * its results are untouched, which is what lets someone later ask whether the rep improved or the
 * rubric moved.
 */
export async function requestRescore(
  db: Database,
  viewer: ScorecardViewer,
  scorecardId: string,
  now: Date,
): Promise<{ ok: true; scorecardId: string } | { ok: false }> {
  const detail = await getScorecardForViewer(db, viewer, scorecardId);
  if (detail === null) return { ok: false };
  if (!detail.scorecard.isCurrent) return { ok: false };
  assertScorecardTransition(detail.scorecard.status, "queued");

  const created = await db.transaction((tx) =>
    supersedeCurrent(
      tx,
      viewer.tenantId,
      scorecardId,
      "rescore",
      now,
      { definitionSnapshot: {}, status: "queued" },
      detail.meeting.id,
    ),
  );
  if (created === null) return { ok: false };
  return { ok: true, scorecardId: created.id };
}

/**
 * Log an override or a re-score to the opportunity event log.
 *
 * ONLY when the meeting hangs off an Opportunity — `opportunity_events.opportunity_id` is NOT NULL
 * and that column is load-bearing for the war room (silence, slippage, the movement timeline all
 * read it). Widening it to accept a prospect subject would change an I18 invariant for the sake of
 * a log line, so a prospect-only meeting's history lives on the Scorecard instead
 * (`meeting_type_overridden_by` and the timestamps). See the report.
 *
 * Written as `note`, not `field_change`: `field_change` feeds the slippage arithmetic, and a
 * re-score is not a move on the deal. The existing draft-completion log lands here for exactly the
 * same reason.
 */
export async function logScorecardEvent(
  db: Database,
  tenantId: string,
  input: {
    readonly meetingId: string;
    readonly note: string;
    readonly oldValue: string | null;
    readonly newValue: string | null;
    readonly actor: Actor;
    readonly occurredAt: Date;
  },
): Promise<boolean> {
  const [meeting] = await db
    .select({ opportunityId: meetings.opportunityId })
    .from(meetings)
    .where(and(eq(meetings.tenantId, tenantId), eq(meetings.id, input.meetingId)))
    .limit(1);
  if (!meeting?.opportunityId) return false;

  await appendOpportunityEvent(db, tenantId, {
    opportunityId: meeting.opportunityId,
    eventType: "note",
    field: "scorecard",
    oldValue: input.oldValue,
    newValue: input.newValue,
    prospectSourced: false,
    actor: input.actor,
    note: input.note,
    occurredAt: input.occurredAt,
  });
  return true;
}

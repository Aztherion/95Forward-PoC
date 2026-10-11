import "server-only";
import {
  deleteMeetingType as deleteMeetingTypeRow,
  deleteScorecardDefinition as deleteDefinitionRow,
  buildDefinitionSnapshot,
  createMeetingType as createMeetingTypeRow,
  getScorecardForViewer,
  getScorecardStatus,
  hasDirectReports,
  listMeetingTypes as listMeetingTypeRows,
  listScorecardDefinitions as listDefinitionRows,
  listScorecards as listScorecardRows,
  logScorecardEvent,
  overrideMeetingType as overrideMeetingTypeRow,
  reportMeeting as reportMeetingRow,
  requestRescore as requestRescoreRow,
  saveScorecardDefinition as saveDefinitionRow,
  setDefinitionActive as setDefinitionActiveRow,
  updateMeetingType as updateMeetingTypeRow,
  visibleReporterIds,
  withTenant,
  type DefinitionInput,
  type ListScorecardsOptions,
  type MeetingTypeInput,
  type MeetingTypeRow,
  type ReportMeetingInput,
  type ScorecardDefinitionRow,
  type ScorecardDetail,
  type ScorecardListRow,
  type ScorecardViewer,
} from "@95forward/db";
import type { ScorecardDefinitionSnapshot, ScorecardStatus } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { enqueueScoreMeeting } from "@/server/jobs";
import { demoClock } from "@/server/data/forward-context";

// 95 Forward — Scorecards, the web-side service layer (Initiative 31).
//
// Thin on purpose. The rules live in @95forward/db (visibility, lifecycle, snapshotting) and
// @95forward/shared (validation, schema generation, aggregation); this file does three things and
// nothing else: open the tenant-scoped transaction, pass the CALLER through as the viewer, and
// enqueue the job after the transaction commits.
//
// The viewer is always constructed here from the authenticated user. No function below takes a
// user id as an argument, so there is no shape in which a client could nominate whose meetings it
// would like to read.

export type {
  ScorecardDetail,
  ScorecardListRow,
  MeetingTypeRow,
  ScorecardDefinitionRow,
} from "@95forward/db";

export interface AuthedUser {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
}

function viewerOf(user: AuthedUser): ScorecardViewer {
  return { userId: user.id, tenantId: user.tenantId };
}

// ---- Reads ---------------------------------------------------------------------------------

export function listScorecards(
  user: AuthedUser,
  options: ListScorecardsOptions = {},
): Promise<ScorecardListRow[]> {
  return withTenant(getAppDb(), user.tenantId, (tx) =>
    listScorecardRows(tx, viewerOf(user), options),
  );
}

/** Null means "not yours to see" — the caller renders a 404, never a 403. */
export function getScorecard(user: AuthedUser, scorecardId: string): Promise<ScorecardDetail | null> {
  return withTenant(getAppDb(), user.tenantId, (tx) =>
    getScorecardForViewer(tx, viewerOf(user), scorecardId),
  );
}

export function getScorecardPollState(
  user: AuthedUser,
  scorecardId: string,
): Promise<{ status: ScorecardStatus; failureReason: string | null } | null> {
  return withTenant(getAppDb(), user.tenantId, (tx) =>
    getScorecardStatus(tx, viewerOf(user), scorecardId),
  );
}

export function isManager(user: AuthedUser): Promise<boolean> {
  return withTenant(getAppDb(), user.tenantId, (tx) => hasDirectReports(tx, viewerOf(user)));
}

/** The reps a filter dropdown may offer — exactly the set this viewer can already see. */
export function listVisibleReporters(user: AuthedUser): Promise<string[]> {
  return withTenant(getAppDb(), user.tenantId, (tx) => visibleReporterIds(tx, viewerOf(user)));
}

export function listMeetingTypes(user: AuthedUser): Promise<MeetingTypeRow[]> {
  return withTenant(getAppDb(), user.tenantId, (tx) => listMeetingTypeRows(tx, user.tenantId));
}

export function listScorecardDefinitions(user: AuthedUser): Promise<ScorecardDefinitionRow[]> {
  return withTenant(getAppDb(), user.tenantId, (tx) => listDefinitionRows(tx, user.tenantId));
}

export function getDefinitionSnapshot(
  user: AuthedUser,
  definitionId: string,
): Promise<ScorecardDefinitionSnapshot | null> {
  return withTenant(getAppDb(), user.tenantId, (tx) =>
    buildDefinitionSnapshot(tx, user.tenantId, definitionId),
  );
}

// ---- Writes --------------------------------------------------------------------------------

/**
 * Report a meeting, then enqueue the scoring job.
 *
 * The enqueue happens AFTER the transaction commits — deliberately. Enqueueing inside it would
 * let the worker, which runs on its own connection, pick the job up and fail to find the rows it
 * was told about.
 */
export async function reportMeeting(
  user: AuthedUser,
  input: ReportMeetingInput,
): Promise<{ meetingId: string; scorecardId: string }> {
  const created = await withTenant(getAppDb(), user.tenantId, (tx) =>
    reportMeetingRow(tx, viewerOf(user), input),
  );
  await enqueueScoreMeeting(user.tenantId, user.id, created.scorecardId);
  return created;
}

/**
 * A human overrules the classifier and the Scorecard is re-scored against the new type.
 *
 * The event is logged with the DEMO CLOCK, not the wall clock — every other write in this codebase
 * stamps rows with the injected clock, and a scorecard event dated today would sit a year after
 * everything around it in the timeline.
 */
export async function overrideMeetingType(
  user: AuthedUser,
  scorecardId: string,
  meetingTypeId: string,
): Promise<boolean> {
  const before = await getScorecard(user, scorecardId);
  if (before === null) return false;

  const outcome = await withTenant(getAppDb(), user.tenantId, (tx) =>
    overrideMeetingTypeRow(tx, viewerOf(user), scorecardId, meetingTypeId),
  );
  if (!outcome.ok) return false;

  await withTenant(getAppDb(), user.tenantId, (tx) =>
    logScorecardEvent(tx, user.tenantId, {
      meetingId: before.meeting.id,
      note: `Scorecard meeting type changed from ${outcome.previousTypeName ?? "unclassified"} to ${outcome.newTypeName} by ${user.name}; re-scored.`,
      oldValue: `${outcome.previousTypeName ?? "unclassified"} · ${formatScore(before.scorecard.overallScoreValue)}`,
      newValue: `${outcome.newTypeName} · pending`,
      actor: { userId: user.id, name: user.name },
      occurredAt: demoClock().now(),
    }),
  );

  await enqueueScoreMeeting(user.tenantId, user.id, scorecardId);
  return true;
}

export async function rescoreScorecard(user: AuthedUser, scorecardId: string): Promise<boolean> {
  const before = await getScorecard(user, scorecardId);
  if (before === null) return false;

  const ok = await withTenant(getAppDb(), user.tenantId, (tx) =>
    requestRescoreRow(tx, viewerOf(user), scorecardId),
  );
  if (!ok) return false;

  await withTenant(getAppDb(), user.tenantId, (tx) =>
    logScorecardEvent(tx, user.tenantId, {
      meetingId: before.meeting.id,
      note: `Scorecard re-scored by ${user.name}.`,
      oldValue: formatScore(before.scorecard.overallScoreValue),
      newValue: "pending",
      actor: { userId: user.id, name: user.name },
      occurredAt: demoClock().now(),
    }),
  );

  await enqueueScoreMeeting(user.tenantId, user.id, scorecardId);
  return true;
}

function formatScore(value: number | null): string {
  return value === null ? "—" : `${String(Math.round(value * 100))}%`;
}

// ---- Definition and type CRUD ----------------------------------------------------------------
//
// ANYONE CAN EDIT THESE. There is no permission model for definitions yet and that is a known gap,
// recorded here rather than half-solved: a half-permission model reads as a real one.

export function createMeetingType(
  user: AuthedUser,
  input: MeetingTypeInput,
): Promise<MeetingTypeRow> {
  return withTenant(getAppDb(), user.tenantId, (tx) =>
    createMeetingTypeRow(tx, user.tenantId, input),
  );
}

export function updateMeetingType(
  user: AuthedUser,
  id: string,
  input: Partial<MeetingTypeInput>,
): Promise<MeetingTypeRow | undefined> {
  return withTenant(getAppDb(), user.tenantId, (tx) =>
    updateMeetingTypeRow(tx, user.tenantId, id, input),
  );
}

export function deleteMeetingType(user: AuthedUser, id: string): Promise<void> {
  return withTenant(getAppDb(), user.tenantId, (tx) =>
    deleteMeetingTypeRow(tx, user.tenantId, id),
  );
}

export function saveScorecardDefinition(
  user: AuthedUser,
  input: DefinitionInput,
): Promise<ScorecardDefinitionRow> {
  return withTenant(getAppDb(), user.tenantId, (tx) =>
    saveDefinitionRow(tx, user.tenantId, input),
  );
}

export function setDefinitionActive(
  user: AuthedUser,
  id: string,
  isActive: boolean,
): Promise<void> {
  return withTenant(getAppDb(), user.tenantId, (tx) =>
    setDefinitionActiveRow(tx, user.tenantId, id, isActive),
  );
}

export function deleteScorecardDefinition(user: AuthedUser, id: string): Promise<void> {
  return withTenant(getAppDb(), user.tenantId, (tx) => deleteDefinitionRow(tx, user.tenantId, id));
}

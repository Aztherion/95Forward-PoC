import {
  buildDefinitionSnapshot,
  failScorecard,
  getActiveDefinitionForType,
  getFallbackMeetingType,
  listMeetingTypes,
  loadScorecardForJob,
  recordClassification,
  recordScoring,
  transitionScorecard,
  withTenant,
  type Database,
} from "@95forward/db";
import type { ScorecardDefinitionSnapshot, ScorecardStatus } from "@95forward/shared";
import { ScoringValidationError, type MeetingDecider } from "../scorecards";

// 95 Forward — the Scorecard scoring pipeline (Initiative 31).
//
//   classify -> snapshot the definition -> score -> verify the evidence -> aggregate -> ready
//
// IDEMPOTENT UNDER RETRY, which Graphile's at-least-once delivery makes a requirement rather than
// a nicety. Three mechanisms, each doing a different job:
//
//   * every status move is a COMPARE-AND-SWAP on the expected prior state, so two workers racing
//     the same job cannot both proceed and a late retry finds the row already moved on;
//   * CLASSIFICATION IS PERSISTED BEFORE SCORING STARTS, so a crash between the two calls resumes
//     at the scoring leg instead of paying for the classifier again (and possibly getting a
//     different type than the one already shown to a human);
//   * results are REPLACED inside one transaction rather than appended, so a re-run cannot double
//     a Scorecard's criterion results.
//
// TENANCY. `tenantId` and the reporting user arrive in the payload, set server-side by the caller
// from getCurrentUser() and never from client input. Every query runs inside withTenant, so RLS
// applies in the worker exactly as it does in the web app.
//
// UNTRUSTED CONTENT. The meeting content is handed to the decider and nowhere else; it never
// reaches a system prompt and it never influences control flow here. See scorecards/prompts.ts.

export interface ScoreMeetingJobPayload {
  tenantId: string;
  userId: string;
  scorecardId: string;
}

export interface ScoreMeetingJobContext {
  db: Database;
  decider: MeetingDecider;
}

/** Statuses the job may pick up from. `ready` is not one: a finished Scorecard is left alone. */
const CLAIMABLE: readonly ScorecardStatus[] = ["queued", "classifying", "scoring", "failed"];

export async function runScoreMeetingJob(
  payload: ScoreMeetingJobPayload,
  ctx: ScoreMeetingJobContext,
): Promise<void> {
  const { db, decider } = ctx;
  const { tenantId, scorecardId } = payload;

  const loaded = await withTenant(db, tenantId, (tx) =>
    loadScorecardForJob(tx, tenantId, scorecardId),
  );
  if (loaded === null) return;

  // A Scorecard that is already `ready` is the normal shape of a duplicate delivery. Re-scoring is
  // an explicit action (it creates a NEW Scorecard), never something a retry does.
  if (!CLAIMABLE.includes(loaded.scorecard.status)) return;

  // A SUPERSEDED Scorecard is history and history is immutable. A job enqueued for a version that
  // has since been overridden or re-scored must do nothing — otherwise a slow worker could finish
  // against the old version and write results into a record a human has already moved past.
  if (!loaded.scorecard.isCurrent) return;

  const { meeting } = loaded;
  let snapshot = snapshotOf(loaded.scorecard.definitionSnapshot);

  // ---- Leg 1: classify, unless a previous attempt already did ---------------------------------
  //
  // A snapshot present with a meeting type set IS the record that classification happened. Asking
  // again would risk a different answer for a Scorecard a human may already have looked at.
  if (snapshot === null || loaded.scorecard.meetingTypeId === null) {
    const moved = await withTenant(db, tenantId, (tx) =>
      transitionScorecard(
        tx,
        tenantId,
        scorecardId,
        loaded.scorecard.status,
        "classifying",
      ),
    );
    if (!moved) return; // someone else claimed it

    const types = await withTenant(db, tenantId, (tx) =>
      listMeetingTypes(tx, tenantId),
    );
    if (types.length === 0) {
      await fail(db, tenantId, scorecardId, "This organisation has no meeting types configured.");
      return;
    }

    let classification;
    try {
      classification = await decider.classifyMeetingType({
        content: meeting.content,
        sourceType: meeting.sourceType,
        meetingTypes: types.map((type) => ({
          id: type.id,
          name: type.name,
          description: type.description,
        })),
      });
    } catch (error) {
      await fail(db, tenantId, scorecardId, `Classification failed: ${messageOf(error)}`);
      return;
    }

    // `none` is a real answer, not an error. There is no unclassified state — every meeting gets
    // a Scorecard — so the tenant's fallback type takes over and the card says it did.
    const usedFallback = classification.meetingTypeId === "none";
    const resolved = usedFallback
      ? await withTenant(db, tenantId, (tx) =>
          getFallbackMeetingType(tx, tenantId),
        )
      : types.find((type) => type.id === classification.meetingTypeId);

    if (resolved === undefined) {
      await fail(
        db,
        tenantId,
        scorecardId,
        usedFallback
          ? "The classifier found no fit and this organisation has no fallback meeting type."
          : "The classifier chose a meeting type that no longer exists.",
      );
      return;
    }

    const definition = await withTenant(db, tenantId, (tx) =>
      getActiveDefinitionForType(tx, tenantId, resolved.id),
    );
    if (definition === undefined) {
      // Deliberately NOT falling through to another type's definition. Scoring an ask visit
      // against a discovery scorecard would produce numbers that look fine and mean nothing.
      await fail(
        db,
        tenantId,
        scorecardId,
        `"${resolved.name}" has no active Scorecard Definition, so there is nothing to score this meeting against.`,
      );
      return;
    }

    const built = await withTenant(db, tenantId, (tx) =>
      buildDefinitionSnapshot(tx, tenantId, definition.id),
    );
    if (built === null) {
      await fail(db, tenantId, scorecardId, "The Scorecard Definition could not be read.");
      return;
    }
    snapshot = built;

    await withTenant(db, tenantId, (tx) =>
      recordClassification(tx, tenantId, scorecardId, {
        meetingTypeId: resolved.id,
        definitionId: definition.id,
        snapshot: built,
        rationale: classification.rationale,
        usedFallback,
        model: classification.audit.model,
        latencyMs: classification.audit.latencyMs,
        inputTokens: classification.audit.inputTokens,
        outputTokens: classification.audit.outputTokens,
        promptVersion: classification.audit.promptVersion,
      }),
    );

    const toScoring = await withTenant(db, tenantId, (tx) =>
      transitionScorecard(tx, tenantId, scorecardId, "classifying", "scoring"),
    );
    if (!toScoring) return;
  } else {
    // Resuming, or re-scoring after an override. Either way the snapshot already exists and the
    // only leg left is scoring.
    const current = loaded.scorecard.status;
    if (current !== "scoring") {
      const moved = await withTenant(db, tenantId, (tx) =>
        transitionScorecard(tx, tenantId, scorecardId, current, "scoring"),
      );
      if (!moved) return;
    }
  }

  // ---- Leg 2: score, verify, aggregate --------------------------------------------------------
  let scored;
  try {
    scored = await decider.scoreMeeting({
      content: meeting.content,
      sourceType: meeting.sourceType,
      snapshot,
    });
  } catch (error) {
    await fail(
      db,
      tenantId,
      scorecardId,
      error instanceof ScoringValidationError
        ? `The model's answer did not fit the scorecard: ${error.message}`
        : `Scoring failed: ${messageOf(error)}`,
    );
    return;
  }

  // recordScoring does the evidence verification and the aggregation, and writes the whole lot —
  // results, verdicts, section scores, overall score, status — in one transaction.
  await withTenant(db, tenantId, (tx) =>
    recordScoring(tx, tenantId, scorecardId, {
      results: scored.results,
      content: meeting.content,
      snapshot,
      model: scored.audit.model,
      latencyMs: scored.audit.latencyMs,
      inputTokens: scored.audit.inputTokens,
      outputTokens: scored.audit.outputTokens,
      scoredAt: new Date(),
    }),
  );
}

function snapshotOf(value: unknown): ScorecardDefinitionSnapshot | null {
  if (value === null || typeof value !== "object") return null;
  const candidate = value as Partial<ScorecardDefinitionSnapshot>;
  if (!Array.isArray(candidate.sections) || candidate.sections.length === 0) return null;
  return candidate as ScorecardDefinitionSnapshot;
}

async function fail(
  db: Database,
  tenantId: string,
  scorecardId: string,
  reason: string,
): Promise<void> {
  await withTenant(db, tenantId, (tx) =>
    failScorecard(tx, tenantId, scorecardId, reason),
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

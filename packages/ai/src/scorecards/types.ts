import type { CriterionResultInput, ScorecardDefinitionSnapshot } from "@95forward/shared";
import type { MeetingSourceType } from "@95forward/shared";

// 95 Forward — the MeetingDecider seam (Initiative 31).
//
// ONE INTERFACE, TWO CALLS. Everything the Scorecard pipeline needs from a model goes through
// here, and NOTHING OUTSIDE THIS INTERFACE KNOWS WHICH MODEL IS BEHIND IT. That is not tidiness:
// the live implementation is an explicit interim stand-in for a dedicated decision-model wrapper,
// and the wrapper lands as a new implementation of this interface with no change above it.
//
// The audit fields travel with the result rather than being looked up afterwards, because the
// question they exist to answer — "which model produced this score" — is only answerable at the
// moment the call returns.

export interface DecisionAudit {
  /** Opaque to every caller. Stored for audit; never branched on. */
  readonly model: string;
  readonly promptVersion: string;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface MeetingTypeOption {
  readonly id: string;
  readonly name: string;
  /** Written for the model. This is the classifier's entire basis besides the content. */
  readonly description: string;
}

export interface ClassifyMeetingInput {
  readonly content: string;
  readonly sourceType: MeetingSourceType;
  readonly meetingTypes: readonly MeetingTypeOption[];
}

export interface ClassifyMeetingResult {
  /** A tenant meeting-type id, or `none` when nothing fits — never an invented id. */
  readonly meetingTypeId: string | "none";
  readonly rationale: string;
  readonly audit: DecisionAudit;
}

export interface ScoreMeetingInput {
  readonly content: string;
  readonly sourceType: MeetingSourceType;
  readonly snapshot: ScorecardDefinitionSnapshot;
}

export interface ScoreMeetingResult {
  readonly results: readonly CriterionResultInput[];
  readonly audit: DecisionAudit;
}

/**
 * The decision seam.
 *
 * `scoreMeeting` is responsible for returning results that are already valid against the
 * snapshot — the model path validates and retries once internally, so a caller never sees a
 * half-parsed answer. A failure that survives the retry is thrown, and the job turns it into a
 * `failed` Scorecard with the validation error as its reason.
 */
export interface MeetingDecider {
  readonly kind: "mock" | "live";
  classifyMeetingType(input: ClassifyMeetingInput): Promise<ClassifyMeetingResult>;
  scoreMeeting(input: ScoreMeetingInput): Promise<ScoreMeetingResult>;
}

/** Thrown when the model's answer will not validate against the snapshot, even after one retry. */
export class ScoringValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoringValidationError";
  }
}

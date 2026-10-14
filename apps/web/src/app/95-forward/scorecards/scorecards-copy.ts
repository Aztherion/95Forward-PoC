import type { QueueHealth } from "@95forward/shared";
import { type CriterionType, type ScoreBand, type ScorecardStatus } from "@95forward/shared";

// 95 Forward — Scorecards screen copy and encodings (I32).
//
// Pure, so the wording and the colour routing are testable without a browser. The screen renders
// from here; nothing below is typed into a component.

/**
 * Score band → the health colour alias it borrows.
 *
 * THE PALETTE IS SHARED, THE VOCABULARY IS NOT. `Heartbeat` set this precedent: its cadence enum
 * (`on-track / due-soon / overdue`) renders on `--health-*` tokens without claiming to be deal
 * health. A Scorecard is the same kind of thing — a judgement about one meeting, not about the
 * deal — so it keeps `strong / mixed / weak` and borrows only the colour. Rendering a `StatusLabel`
 * here would put "Stuck" beside a 20% meeting on a deal closing next week.
 */
export const BAND_HEALTH: Record<ScoreBand, QueueHealth> = {
  strong: "moving",
  mixed: "slowing",
  weak: "stuck",
};

/** What the band means, for the dot's accessible name. Never shown as a chip beside the number. */
export const BAND_TEXT: Record<ScoreBand, string> = {
  strong: "Strong",
  mixed: "Mixed",
  weak: "Weak",
};

/** The tooltip on a Scorecard that could not be scored at all. */
export const NO_SCORE_TITLE = "Not enough in the source to score.";

export const SOURCE_TEXT: Record<"notes" | "transcript", string> = {
  notes: "Notes",
  transcript: "Transcript",
};

/**
 * In-flight wording. `ready` has none — a finished Scorecard shows its score, not a status.
 *
 * `failed` is deliberately bare: the failure REASON carries the information, and a second status
 * word above it would just be noise.
 */
export const STATUS_TEXT: Partial<Record<ScorecardStatus, string>> = {
  queued: "Queued…",
  classifying: "Classifying…",
  scoring: "Scoring…",
  failed: "Failed",
};

export function isProcessing(status: ScorecardStatus): boolean {
  return status === "queued" || status === "classifying" || status === "scoring";
}

/**
 * The two-step progression shown while the pipeline runs.
 *
 * The live wait is 15–20 seconds. A single spinner for that long reads as a hang; two named steps
 * with the first ticking over read as work. The step names are the pipeline's actual legs, so a
 * demo watching this is watching the truth rather than a progress bar on a timer.
 */
export interface ProcessingStep {
  readonly label: string;
  readonly done: boolean;
  readonly active: boolean;
}

export function processingSteps(
  status: ScorecardStatus,
  definitionName: string | null,
): ProcessingStep[] {
  const classified = status === "scoring";
  return [
    {
      label: "Deciding the meeting type",
      done: classified,
      active: status === "queued" || status === "classifying",
    },
    {
      label: definitionName ? `Scoring against ${definitionName}` : "Scoring",
      done: false,
      active: classified,
    },
  ];
}

/**
 * The detail title.
 *
 * "your meeting" when the viewer reported it, the rep's name when they did not. A manager reading
 * "your meeting with Marisol Vega" about Dana's visit would be reading a lie, and the possessive
 * is the cheapest place to get that right.
 */
export function detailTitle(subjectName: string, repName: string, viewerIsReporter: boolean): string {
  return viewerIsReporter
    ? `Scorecard for your meeting with ${subjectName}`
    : `Scorecard for ${repName}'s meeting with ${subjectName}`;
}

/** The marker beside a meeting type the classifier could not choose. */
export const FALLBACK_NOTE = "— fallback, no type matched";

/** Shown under an evidence quote the verifier could not find in the source. */
export const UNVERIFIED_QUOTE_NOTE = "Not found word-for-word in the source.";

/** Stands in for the verdict when the source did not say either way. */
export const NOT_DETERMINABLE_TEXT = "Not determinable";

export const CRITERION_TYPE_TEXT: Record<CriterionType, string> = {
  boolean: "Yes/No",
  score: "Score",
  classification: "Classification",
};

/** Why editing a definition does not move an existing Scorecard. */
export const DEFINITION_SNAPSHOT_NOTE =
  "Changes apply to meetings scored from now on. Existing Scorecards keep the definition they were scored with.";

/** What the classifier does with a Meeting Type description, said where it is written. */
export const MEETING_TYPE_DESCRIPTION_HELP =
  "The system reads this to decide which meetings are this type — describe what happens in the meeting.";

/** Why a transcript scores more completely than notes, said where the choice is made. */
export const SOURCE_HELP = "Transcripts score more completely — notes often don't show what was asked.";

export const SUPERSEDE_REASON_TEXT: Record<"override" | "rescore", string> = {
  override: "Meeting type changed",
  rescore: "Re-scored",
};

/** `"2026-09-12"` for a date input, from a Date. Local-free: the demo clock is UTC throughout. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * One line describing a link target in the picker.
 *
 * The initiative and the amount are what separate two opportunities against the same prospect —
 * without them the picker offers the reader two identical rows and no way to choose.
 */
export function linkTargetLabel(
  prospectName: string,
  initiativeName: string | null,
  amount: string | null,
): string {
  if (initiativeName === null) return prospectName;
  return `${prospectName} · ${initiativeName}${amount === null ? "" : ` · ${amount}`}`;
}

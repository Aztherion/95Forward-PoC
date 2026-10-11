// 95 Forward — Scorecards: the pure domain (Initiative 31).
//
// Everything here is a function of its arguments. No database, no model, no clock. That matters
// more than usual for this feature: the aggregation rule, the JSON schema handed to the model and
// the validator that reads its answer back are all things a manager will eventually argue with,
// and an argument you cannot reproduce in a unit test is an argument you lose.
//
// THE SNAPSHOT IS THE CONTRACT. A Scorecard stores the whole Scorecard Definition as JSON at
// scoring time, and every function below reads the snapshot rather than the live definition.
// Editing a criterion's wording must not re-interpret a score that was given against the old
// wording, and the stable ids are what let coaching aggregate a criterion across reps and over
// time even after someone rewrites it.

// =================================================================================================
// Vocabulary (fixed — see the initiative brief; do not introduce synonyms)
// =================================================================================================

/** What kind of judgement a Criterion asks for. */
export const CRITERION_TYPES = ["boolean", "score", "classification"] as const;
export type CriterionType = (typeof CRITERION_TYPES)[number];

/**
 * How the Meeting was reported.
 *
 * `recording` is deliberately NOT here: the brief leaves the door open for it and asks that it not
 * be added until something can actually produce one.
 */
export const MEETING_SOURCE_TYPES = ["notes", "transcript"] as const;
export type MeetingSourceType = (typeof MEETING_SOURCE_TYPES)[number];

/**
 * The Scorecard lifecycle.
 *
 * Forward-only, one step at a time, with `failed` reachable from any working state and `ready`
 * able to re-enter `scoring` — that last edge is the override/re-score path, which replaces results
 * in place rather than creating a second Scorecard.
 */
export const SCORECARD_STATUSES = ["queued", "classifying", "scoring", "ready", "failed"] as const;
export type ScorecardStatus = (typeof SCORECARD_STATUSES)[number];

const ALLOWED_SCORECARD_TRANSITIONS: Record<ScorecardStatus, readonly ScorecardStatus[]> = {
  // `-> queued` is legal from EVERYWHERE: starting over is always allowed. That is what a
  // re-score is, and it is also the only way out of a Scorecard stuck mid-flight because a worker
  // died between legs.
  //
  // `queued -> scoring` skips classification, and only a HUMAN OVERRIDE takes it: once a person
  // has named the meeting type there is nothing left to classify, and asking the model anyway
  // would be asking it to disagree with the person who just told it the answer.
  queued: ["queued", "classifying", "scoring", "failed"],
  classifying: ["queued", "scoring", "failed"],
  // scoring -> scoring is legal and deliberate: a retried job re-enters its own state rather than
  // being rejected, which is what makes the handler idempotent under Graphile's at-least-once
  // delivery. See runScoreMeetingJob.
  scoring: ["queued", "scoring", "ready", "failed"],
  // From ready: a type override re-scores against the new definition (-> scoring); a full
  // re-score starts the whole pipeline again (-> queued).
  ready: ["queued", "scoring", "failed"],
  // A failed Scorecard is re-runnable — that is the whole point of surfacing the reason.
  failed: ["queued", "classifying", "scoring"],
};

/**
 * THE INVARIANT THE MACHINE EXISTS FOR: `ready` is reachable only from `scoring`.
 *
 * Everything else above is about where a run may START. This is the one edge that must never be
 * added to, because a Scorecard that reached `ready` without passing through `scoring` is a
 * Scorecard with a status that claims results it does not have.
 */
export const READY_IS_REACHABLE_ONLY_FROM: readonly ScorecardStatus[] = ["scoring"];

export function canTransitionScorecard(from: ScorecardStatus, to: ScorecardStatus): boolean {
  return ALLOWED_SCORECARD_TRANSITIONS[from].includes(to);
}

export function assertScorecardTransition(from: ScorecardStatus, to: ScorecardStatus): void {
  if (!canTransitionScorecard(from, to)) {
    throw new Error(`scorecard: illegal transition ${from} -> ${to}`);
  }
}

// =================================================================================================
// The Scorecard Definition snapshot
// =================================================================================================

export interface ClassificationOptionSnapshot {
  readonly id: string;
  readonly label: string;
  /** Required. The model chooses on the description, not the label — see buildScoringJsonSchema. */
  readonly description: string;
  readonly sortOrder: number;
}

export interface CriterionSnapshot {
  readonly id: string;
  readonly type: CriterionType;
  /** The text the model decides on. */
  readonly prompt: string;
  /** Extra context for the model — e.g. what counts as evidence. */
  readonly guidance: string | null;
  readonly sortOrder: number;
  readonly options: readonly ClassificationOptionSnapshot[];
}

export interface SectionSnapshot {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly criteria: readonly CriterionSnapshot[];
}

export interface ScorecardDefinitionSnapshot {
  readonly id: string;
  readonly name: string;
  readonly meetingTypeId: string;
  readonly meetingTypeName: string;
  readonly sections: readonly SectionSnapshot[];
}

/** Every criterion in the snapshot, in section-then-criterion order, with its section. */
export function snapshotCriteria(
  snapshot: ScorecardDefinitionSnapshot,
): readonly { readonly section: SectionSnapshot; readonly criterion: CriterionSnapshot }[] {
  const out: { section: SectionSnapshot; criterion: CriterionSnapshot }[] = [];
  for (const section of orderedSections(snapshot)) {
    for (const criterion of orderedCriteria(section)) {
      out.push({ section, criterion });
    }
  }
  return out;
}

function orderedSections(snapshot: ScorecardDefinitionSnapshot): readonly SectionSnapshot[] {
  return snapshot.sections.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

function orderedCriteria(section: SectionSnapshot): readonly CriterionSnapshot[] {
  return section.criteria.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

function orderedOptions(
  criterion: CriterionSnapshot,
): readonly ClassificationOptionSnapshot[] {
  return criterion.options.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

// =================================================================================================
// Validation
// =================================================================================================

export interface DefinitionValidationIssue {
  readonly path: string;
  readonly message: string;
}

/**
 * The rules a Scorecard Definition must satisfy before it can be saved or scored against.
 *
 * Enforced in the service layer rather than the database because they are structural (a section
 * with no criteria is a shape, not a column) and because the error a human needs is "Dialogue has
 * no criteria", not a constraint name.
 */
export function validateScorecardDefinition(input: {
  readonly name?: string;
  readonly sections: readonly {
    readonly title?: string;
    readonly criteria: readonly {
      readonly type: CriterionType;
      readonly prompt?: string | null;
      readonly options?: readonly { readonly label?: string; readonly description?: string | null }[];
    }[];
  }[];
}): readonly DefinitionValidationIssue[] {
  const issues: DefinitionValidationIssue[] = [];

  if (input.name !== undefined && input.name.trim().length === 0) {
    issues.push({ path: "name", message: "A definition needs a name." });
  }
  if (input.sections.length === 0) {
    issues.push({ path: "sections", message: "A definition needs at least one section." });
  }

  input.sections.forEach((section, si) => {
    const sectionPath = `sections[${String(si)}]`;
    if (section.title !== undefined && section.title.trim().length === 0) {
      issues.push({ path: `${sectionPath}.title`, message: "A section needs a title." });
    }
    if (section.criteria.length === 0) {
      issues.push({
        path: `${sectionPath}.criteria`,
        message: "A section needs at least one criterion.",
      });
    }
    section.criteria.forEach((criterion, ci) => {
      const criterionPath = `${sectionPath}.criteria[${String(ci)}]`;
      if (!criterion.prompt || criterion.prompt.trim().length === 0) {
        issues.push({
          path: `${criterionPath}.prompt`,
          message: "A criterion needs a prompt — it is the text the model decides on.",
        });
      }
      if (criterion.type !== "classification") return;
      const options = criterion.options ?? [];
      if (options.length < 2) {
        issues.push({
          path: `${criterionPath}.options`,
          message: "A classification criterion needs at least two options.",
        });
      }
      options.forEach((option, oi) => {
        if (!option.description || option.description.trim().length === 0) {
          issues.push({
            path: `${criterionPath}.options[${String(oi)}].description`,
            message:
              "Every classification option needs a description — the model chooses on the description, not the label.",
          });
        }
      });
    });
  });

  return issues;
}

// =================================================================================================
// The scoring JSON schema, generated from the snapshot
// =================================================================================================

/**
 * The structured-output schema for one Scorecard Definition.
 *
 * PROPERTY ORDER IS DELIBERATE AND IS NOT STYLE. Within each criterion the order is
 * `rationale` → `determinable` → the value → `evidence_quote`, so the model writes its reasoning
 * before it commits to a number. A schema that asks for the number first gets a number and then a
 * justification for it, which is a different and worse thing. JSON Schema preserves key order on
 * the wire, so this survives serialisation.
 *
 * Every criterion is keyed by its STABLE id, so the model's answer can be re-attached to the
 * criterion even after someone rewrites the prompt text.
 */
export function buildScoringJsonSchema(
  snapshot: ScorecardDefinitionSnapshot,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const { criterion } of snapshotCriteria(snapshot)) {
    properties[criterion.id] = criterionSchema(criterion);
    required.push(criterion.id);
  }

  return {
    type: "object",
    description:
      "One entry per criterion, keyed by criterion id. Judge only from the meeting content.",
    properties,
    required,
    additionalProperties: false,
  };
}

function criterionSchema(criterion: CriterionSnapshot): Record<string, unknown> {
  const value = valueSchema(criterion);
  return {
    type: "object",
    // Order matters: reason, then decide whether it can be decided, then the value, then evidence.
    properties: {
      rationale: {
        type: "string",
        description:
          "One or two sentences saying why. Always present — when not determinable, say why not.",
      },
      determinable: {
        type: "boolean",
        description:
          "False when the content does not say either way. Absence of evidence is not evidence of absence.",
      },
      value: value,
      evidence_quote: {
        type: ["string", "null"],
        description:
          "A short verbatim quote from the meeting content that supports the rationale, or null. One sentence or less. Copy it exactly.",
      },
    },
    required: ["rationale", "determinable", "value", "evidence_quote"],
    additionalProperties: false,
  };
}

function valueSchema(criterion: CriterionSnapshot): Record<string, unknown> {
  switch (criterion.type) {
    case "boolean":
      return {
        type: ["boolean", "null"],
        description: "True or false, or null when not determinable.",
      };
    case "score":
      return {
        type: ["number", "null"],
        minimum: 0,
        maximum: 1,
        description:
          "A continuous score from 0 to 1, or null when not determinable. Do not round to buckets.",
      };
    case "classification":
      return {
        type: ["string", "null"],
        enum: [...orderedOptions(criterion).map((option) => option.id), null],
        description: "The id of the option that fits, or null when not determinable.",
      };
  }
}

// =================================================================================================
// Reading the model's answer back
// =================================================================================================

export interface CriterionResultInput {
  readonly criterionId: string;
  readonly sectionId: string;
  readonly criterionType: CriterionType;
  readonly determinable: boolean;
  readonly booleanValue: boolean | null;
  readonly scoreValue: number | null;
  readonly optionId: string | null;
  readonly rationale: string;
  readonly evidenceQuote: string | null;
}

export type ParsedScoring =
  | { readonly ok: true; readonly results: readonly CriterionResultInput[] }
  | { readonly ok: false; readonly error: string };

/**
 * Validate a scoring response against the snapshot it was generated for.
 *
 * Server-side, and deliberately strict: a value outside [0,1], an option id that is not one of
 * this criterion's options, a missing rationale or a value present on a not-determinable criterion
 * are all rejected. The caller retries once and then fails the Scorecard with the message below as
 * `failure_reason` — a visible failure is worth far more than a silently coerced score.
 */
export function parseScoringResponse(
  snapshot: ScorecardDefinitionSnapshot,
  raw: unknown,
): ParsedScoring {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "scoring response was not a JSON object" };
  }
  const body = raw as Record<string, unknown>;
  const results: CriterionResultInput[] = [];

  for (const { section, criterion } of snapshotCriteria(snapshot)) {
    const entry = body[criterion.id];
    if (entry === undefined || entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `criterion ${criterion.id} is missing from the scoring response` };
    }
    const row = entry as Record<string, unknown>;

    const rationale = row.rationale;
    if (typeof rationale !== "string" || rationale.trim().length === 0) {
      return { ok: false, error: `criterion ${criterion.id} has no rationale` };
    }
    const determinable = row.determinable;
    if (typeof determinable !== "boolean") {
      return { ok: false, error: `criterion ${criterion.id} has a non-boolean determinable` };
    }
    const quoteRaw = row.evidence_quote;
    if (quoteRaw !== null && quoteRaw !== undefined && typeof quoteRaw !== "string") {
      return { ok: false, error: `criterion ${criterion.id} has a non-string evidence_quote` };
    }
    const evidenceQuote =
      typeof quoteRaw === "string" && quoteRaw.trim().length > 0 ? quoteRaw.trim() : null;

    const value = row.value ?? null;
    const base = {
      criterionId: criterion.id,
      sectionId: section.id,
      criterionType: criterion.type,
      rationale: rationale.trim(),
      evidenceQuote,
    };

    if (!determinable) {
      if (value !== null) {
        return {
          ok: false,
          error: `criterion ${criterion.id} is not determinable but carries a value`,
        };
      }
      results.push({
        ...base,
        determinable: false,
        booleanValue: null,
        scoreValue: null,
        optionId: null,
      });
      continue;
    }

    switch (criterion.type) {
      case "boolean": {
        if (typeof value !== "boolean") {
          return { ok: false, error: `criterion ${criterion.id} expected a boolean value` };
        }
        results.push({
          ...base,
          determinable: true,
          booleanValue: value,
          scoreValue: null,
          optionId: null,
        });
        break;
      }
      case "score": {
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
          return {
            ok: false,
            error: `criterion ${criterion.id} expected a number in [0, 1], got ${String(value)}`,
          };
        }
        results.push({
          ...base,
          determinable: true,
          booleanValue: null,
          scoreValue: value,
          optionId: null,
        });
        break;
      }
      case "classification": {
        const ids = new Set(criterion.options.map((option) => option.id));
        if (typeof value !== "string" || !ids.has(value)) {
          return {
            ok: false,
            error: `criterion ${criterion.id} expected one of its option ids, got ${String(value)}`,
          };
        }
        results.push({
          ...base,
          determinable: true,
          booleanValue: null,
          scoreValue: null,
          optionId: value,
        });
        break;
      }
    }
  }

  return { ok: true, results };
}

// =================================================================================================
// Evidence verification
// =================================================================================================

/**
 * Normalise for a substring check: collapse whitespace, unify the quote characters a transcript
 * tool and a model disagree about, lowercase.
 *
 * Deliberately NOTHING fuzzier. The question this answers is "did the model copy this out of the
 * content", and a fuzzy match would answer a different, softer question — which is exactly the one
 * a manager reading a quote does not want answered softly.
 */
export function normaliseForEvidence(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Is the quote an actual substring of the meeting content? */
export function verifyEvidenceQuote(content: string, quote: string | null): boolean {
  if (quote === null || quote.trim().length === 0) return false;
  return normaliseForEvidence(content).includes(normaliseForEvidence(quote));
}

// =================================================================================================
// Aggregation
// =================================================================================================

export interface ScorecardAggregate {
  readonly overallScore: number | null;
  /** Keyed by section id. A section with nothing countable is present with a null value. */
  readonly sectionScores: Readonly<Record<string, number | null>>;
}

/**
 * The one aggregation rule, used everywhere.
 *
 *   • booleans count as 1 / 0
 *   • scores count as themselves
 *   • CLASSIFICATIONS NEVER COUNT — an outcome is a fact, not a quality. "Not interested" is not a
 *     bad visit; it may be the most useful thing a discovery visit can establish.
 *   • not-determinable results are excluded from the denominator, so sparse notes are not punished
 *   • the overall score weights each CRITERION equally, not each section — a three-criterion section
 *     and a two-criterion section do not get equal say
 *
 * Computed once at scoring time and stored. The snapshot is immutable, so the stored value cannot
 * drift away from what it was computed from.
 */
export function aggregateScorecard(
  snapshot: ScorecardDefinitionSnapshot,
  results: readonly Pick<
    CriterionResultInput,
    "criterionId" | "criterionType" | "determinable" | "booleanValue" | "scoreValue"
  >[],
): ScorecardAggregate {
  const byCriterion = new Map(results.map((result) => [result.criterionId, result]));
  const sectionScores: Record<string, number | null> = {};
  const all: number[] = [];

  for (const section of orderedSections(snapshot)) {
    const counted: number[] = [];
    for (const criterion of orderedCriteria(section)) {
      const result = byCriterion.get(criterion.id);
      const value = countableValue(criterion.type, result);
      if (value === null) continue;
      counted.push(value);
      all.push(value);
    }
    sectionScores[section.id] = counted.length === 0 ? null : mean(counted);
  }

  return { overallScore: all.length === 0 ? null : mean(all), sectionScores };
}

function countableValue(
  type: CriterionType,
  result:
    | Pick<CriterionResultInput, "determinable" | "booleanValue" | "scoreValue">
    | undefined,
): number | null {
  if (result === undefined || !result.determinable) return null;
  if (type === "classification") return null;
  if (type === "boolean") return result.booleanValue === true ? 1 : 0;
  return result.scoreValue ?? null;
}

function mean(values: readonly number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

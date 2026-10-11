import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { criterionTypeEnum, meetingSourceTypeEnum, scorecardStatusEnum } from "./enums";
import { forwardOpportunities } from "./forward";
import { prospects } from "./prospects";
import { users } from "./users";

// =================================================================================================
// 95 Forward — Scorecards (Initiative 31).
//
// The war room tells a fundraiser WHAT to do next. It says nothing about HOW WELL they did it. A
// rep can take every action the queue recommends and still run discovery visits that never ask why
// the prospect is involved. These tables are where the room itself gets looked at.
//
// WHY THIS IS NOT `visits` / `asks` (schema/execution.ts). Those are the Green Sheet's structured
// debrief: a rep fills in an outcome, a next step and a memo, and the Green Sheet counts them as
// work done. A Meeting here is the RAW ARTEFACT — pasted notes or a third-party transcript — and a
// Scorecard is a judgement about it. One is what the rep says happened; the other is what the
// record shows. Merging them would destroy exactly the comparison this feature exists to make.
// They are deliberately NOT linked in this initiative; the meetings list (later) reconciles them.
//
// WHY A MEETING CHANGES NOTHING. Reporting a meeting writes no opportunity field — not the stage,
// not the close date, not the silence counter. It is a record of what happened, not an update to
// the deal, and a scoring pipeline that could move a forecast would be a scoring pipeline nobody
// dares run.
// =================================================================================================

/** A named kind of meeting. The `description` is what the classifier reads. */
export const meetingTypes = pgTable(
  "meeting_types",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    /**
     * Written FOR A MODEL, not for a human skim. This is the entire input to the classifier
     * besides the meeting content, so it has to describe what such a meeting contains rather than
     * what it is called.
     */
    description: text("description").notNull(),
    /**
     * The type used when the classifier finds no fit. There is no "unclassified" state — every
     * meeting gets a Scorecard — so exactly one type per tenant must carry this.
     */
    isFallback: boolean("is_fallback").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("meeting_types_tenant_id_idx").on(table.tenantId),
    unique("meeting_types_tenant_name_unique").on(table.tenantId, table.name),
    // One fallback per tenant, enforced by a PARTIAL UNIQUE INDEX rather than application logic:
    // two fallbacks is a silent, data-shaped failure (the classifier's `none` resolves
    // non-deterministically) and the database is the only place that can refuse it under
    // concurrency.
    uniqueIndex("meeting_types_one_fallback_per_tenant")
      .on(table.tenantId)
      .where(sql`${table.isFallback}`),
  ],
);

/** The template: a name, a Meeting Type, ordered Sections, each with ordered Criteria. */
export const scorecardDefinitions = pgTable(
  "scorecard_definitions",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    meetingTypeId: uuid("meeting_type_id")
      .notNull()
      .references(() => meetingTypes.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("scorecard_definitions_tenant_id_idx").on(table.tenantId),
    index("scorecard_definitions_meeting_type_id_idx").on(table.meetingTypeId),
    // At most one ACTIVE definition per meeting type per tenant. Deactivated definitions stay —
    // they are what existing Scorecards' snapshots point back to for navigation.
    uniqueIndex("scorecard_definitions_one_active_per_type")
      .on(table.tenantId, table.meetingTypeId)
      .where(sql`${table.isActive}`),
  ],
);

/**
 * A Section of a definition.
 *
 * The id is STABLE across edits to the title. Coaching will aggregate a section's scores across
 * reps and over time; re-titling "Next step" must not orphan the history under it.
 */
export const scorecardSections = pgTable(
  "scorecard_sections",
  {
    ...primaryId,
    ...tenantScoped,
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => scorecardDefinitions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("scorecard_sections_tenant_id_idx").on(table.tenantId),
    index("scorecard_sections_definition_id_idx").on(table.definitionId),
  ],
);

/** One thing to judge. `prompt` is the text the model decides on. */
export const scorecardCriteria = pgTable(
  "scorecard_criteria",
  {
    ...primaryId,
    ...tenantScoped,
    sectionId: uuid("section_id")
      .notNull()
      .references(() => scorecardSections.id, { onDelete: "cascade" }),
    type: criterionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    /** Extra context for the model — e.g. what counts as evidence here. */
    guidance: text("guidance"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("scorecard_criteria_tenant_id_idx").on(table.tenantId),
    index("scorecard_criteria_section_id_idx").on(table.sectionId),
  ],
);

/**
 * One option of a classification criterion.
 *
 * `description` is NOT NULL on purpose: the model chooses on the description, not the label.
 * "Roadmap" means nothing to a model; "the prospect did not commit but agreed a concrete path to
 * a decision" does.
 */
export const scorecardCriterionOptions = pgTable(
  "scorecard_criterion_options",
  {
    ...primaryId,
    ...tenantScoped,
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => scorecardCriteria.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("scorecard_criterion_options_tenant_id_idx").on(table.tenantId),
    index("scorecard_criterion_options_criterion_id_idx").on(table.criterionId),
  ],
);

/**
 * Something that happened: a date, a reporting user, and the source content as pasted.
 *
 * Linked to EXACTLY ONE of an Opportunity or a Prospect, enforced by a CHECK rather than
 * application logic. When it hangs off an Opportunity the prospect is derived through it, so
 * storing both would create a second place for the two to disagree.
 */
export const meetings = pgTable(
  "meetings",
  {
    ...primaryId,
    ...tenantScoped,
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    /** The rep whose meeting this is. Only they can create it; their manager can read it. */
    reportedBy: uuid("reported_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: meetingSourceTypeEnum("source_type").notNull(),
    /** Raw text exactly as pasted. UNTRUSTED DATA — never instructions. See the AI prompts. */
    content: text("content").notNull(),
    opportunityId: uuid("opportunity_id").references(() => forwardOpportunities.id, {
      onDelete: "cascade",
    }),
    prospectId: uuid("prospect_id").references(() => prospects.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("meetings_tenant_id_idx").on(table.tenantId),
    index("meetings_reported_by_idx").on(table.reportedBy),
    index("meetings_opportunity_id_idx").on(table.opportunityId),
    index("meetings_prospect_id_idx").on(table.prospectId),
    index("meetings_occurred_at_idx").on(table.occurredAt),
    check(
      "meetings_exactly_one_link",
      sql`(${table.opportunityId} is not null) <> (${table.prospectId} is not null)`,
    ),
  ],
);

/**
 * The result of scoring one Meeting against one Scorecard Definition.
 *
 * ONE CURRENT SCORECARD PER MEETING (unique on meeting_id). An override or a re-score replaces the
 * results in place rather than appending a second Scorecard — so "the Scorecard for this meeting"
 * is always one thing a manager and a rep can both point at. The cost of that choice is that no
 * history of previous scorings is kept; see the report.
 */
export const scorecards = pgTable(
  "scorecards",
  {
    ...primaryId,
    ...tenantScoped,
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    /**
     * The whole definition — sections, criteria, options, ids, text — as it stood at scoring time.
     * Results are ALWAYS interpreted against this, never against the live definition. Editing a
     * definition must not silently re-interpret a score given against the old wording.
     */
    definitionSnapshot: jsonb("definition_snapshot").notNull(),
    /** Navigation only. The snapshot is the authority on what was scored. */
    definitionId: uuid("definition_id").references(() => scorecardDefinitions.id, {
      onDelete: "set null",
    }),
    meetingTypeId: uuid("meeting_type_id").references(() => meetingTypes.id, {
      onDelete: "set null",
    }),
    classificationRationale: text("classification_rationale"),
    /** True when the classifier found no fit and the tenant's fallback type was used. */
    usedFallback: boolean("used_fallback").notNull().default(false),
    /** Null unless a human overrode the type. Non-null is the whole audit trail for the override. */
    meetingTypeOverriddenBy: uuid("meeting_type_overridden_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: scorecardStatusEnum("status").notNull().default("queued"),
    failureReason: text("failure_reason"),
    /** Null when nothing countable was determinable. See aggregateScorecard. */
    overallScore: numeric("overall_score", { precision: 5, scale: 4 }),
    /** Keyed by SECTION ID (stable), values nullable. */
    sectionScores: jsonb("section_scores"),
    // ---- Audit: which model produced which score. Required once the decision-model wrapper
    //      replaces the interim model — "the score changed" must be answerable with "the model
    //      changed", not with a shrug.
    classifyModel: text("classify_model"),
    scoreModel: text("score_model"),
    promptVersion: text("prompt_version"),
    classifyLatencyMs: integer("classify_latency_ms"),
    scoreLatencyMs: integer("score_latency_ms"),
    classifyInputTokens: integer("classify_input_tokens"),
    classifyOutputTokens: integer("classify_output_tokens"),
    scoreInputTokens: integer("score_input_tokens"),
    scoreOutputTokens: integer("score_output_tokens"),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("scorecards_tenant_id_idx").on(table.tenantId),
    unique("scorecards_meeting_unique").on(table.meetingId),
    index("scorecards_definition_id_idx").on(table.definitionId),
    index("scorecards_meeting_type_id_idx").on(table.meetingTypeId),
    index("scorecards_status_idx").on(table.status),
  ],
);

/**
 * One criterion's outcome on one Scorecard.
 *
 * A SEPARATE TABLE, not JSON on the Scorecard: coaching queries ACROSS this — "how does Dana do on
 * 'asked why they are involved' over six months, against the team" — and that question is a join,
 * not a document scan.
 *
 * `criterion_type` is denormalised from the snapshot so the CHECK below can be type-aware. Without
 * it the database could only say "exactly one value column is set", which would happily accept a
 * score written into a boolean criterion.
 */
export const criterionResults = pgTable(
  "criterion_results",
  {
    ...primaryId,
    ...tenantScoped,
    scorecardId: uuid("scorecard_id")
      .notNull()
      .references(() => scorecards.id, { onDelete: "cascade" }),
    /** The stable id from the SNAPSHOT. Not an FK: the live criterion may since have been deleted. */
    criterionId: uuid("criterion_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    criterionType: criterionTypeEnum("criterion_type").notNull(),
    /**
     * False when the content does not say either way.
     *
     * This is the honest answer for sparse notes, and it is excluded from the denominator rather
     * than counted as a zero — a rep who writes short notes is not a worse fundraiser.
     */
    determinable: boolean("determinable").notNull(),
    booleanValue: boolean("boolean_value"),
    scoreValue: numeric("score_value", { precision: 5, scale: 4 }),
    optionId: uuid("option_id"),
    /** One or two sentences, ALWAYS present — including when not determinable, where it says why not. */
    rationale: text("rationale").notNull(),
    /** Verbatim from the content, or null. Stored even when unverified — see below. */
    evidenceQuote: text("evidence_quote"),
    /**
     * Did the quote actually appear in the content?
     *
     * An unverified quote is STORED AND FLAGGED, never dropped and never a failure. A model that
     * paraphrases when it meant to quote is information a manager should see, and silently
     * deleting the quote would hide both the paraphrase and the fact that it happened.
     */
    evidenceVerified: boolean("evidence_verified").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("criterion_results_tenant_id_idx").on(table.tenantId),
    index("criterion_results_scorecard_id_idx").on(table.scorecardId),
    // The index coaching will actually use: one criterion across every scorecard.
    index("criterion_results_criterion_id_idx").on(table.criterionId),
    unique("criterion_results_scorecard_criterion_unique").on(table.scorecardId, table.criterionId),
    check(
      "criterion_results_value_matches_type",
      sql`(
        (${table.determinable} = false
          and ${table.booleanValue} is null
          and ${table.scoreValue} is null
          and ${table.optionId} is null)
        or (${table.determinable} = true and ${table.criterionType} = 'boolean'
          and ${table.booleanValue} is not null
          and ${table.scoreValue} is null
          and ${table.optionId} is null)
        or (${table.determinable} = true and ${table.criterionType} = 'score'
          and ${table.scoreValue} is not null and ${table.scoreValue} between 0 and 1
          and ${table.booleanValue} is null
          and ${table.optionId} is null)
        or (${table.determinable} = true and ${table.criterionType} = 'classification'
          and ${table.optionId} is not null
          and ${table.booleanValue} is null
          and ${table.scoreValue} is null)
      )`,
    ),
  ],
);

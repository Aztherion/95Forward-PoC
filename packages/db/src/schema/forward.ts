import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import {
  dateConfidenceEnum,
  forwardOpportunityStatusEnum,
  forwardStageEnum,
  goalScopeEnum,
  milestoneSourceEnum,
  opportunityEventTypeEnum,
  probabilityBandEnum,
  visitRatingEnum,
} from "./enums";
import { fundingInitiatives } from "./funding";
import { prospects } from "./prospects";
import { users } from "./users";

// =================================================================================================
// 95 Forward — the opportunity-centric model (Initiative 18).
//
// WHY A NEW TABLE, when `opportunities` and `asks` already exist:
//
//   • `opportunities` (schema/pipeline.ts) is the HOST CRM's entity. It hangs off `constituents`,
//     has no initiative, and carries the host's deliberately opaque `likelihood_pct`. Wrong grain.
//
//   • `asks` (schema/execution.ts) is at the right grain — prospect + initiative + amount — but it
//     is an ask *event*: it hangs off a visit, carries an outcome (commitment/decline/roadmap), and
//     the Green Sheet counts it as "asks this month". A forward opportunity exists from
//     `get_the_visit`, two stages BEFORE any ask is made. Overloading `asks` would mean writing ask
//     rows for deals where nobody has asked for anything, corrupting those metrics.
//
// An Ask is an event inside an Opportunity. Both survive; neither is a duplicate of the other.
// =================================================================================================

/** The unit of forecasting and action: prospect + initiative + amount + close date + stage. */
export const forwardOpportunities = pgTable(
  "forward_opportunities",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => fundingInitiatives.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    // e.g. "over three years" — rendered as `$250,000 over three years`.
    amountNote: text("amount_note"),
    closeDate: date("close_date"),
    // The ± day band this maps to is a SETTING (Rules of Robb, I22), consumed by the simulation
    // (I21). Only the enum lives here; never hardcode day counts against it.
    dateConfidence: dateConfidenceEnum("date_confidence").notNull().default("semi_firm"),
    stage: forwardStageEnum("stage").notNull().default("get_the_visit"),
    // The rep's own judgement. Deliberately NOT derived from milestones — see
    // suggestProbabilityBand() in @95forward/shared. The gap between the two is what the
    // consistency checker (I20) and the coaching rules (I22) fire on.
    probability: probabilityBandEnum("probability").notNull().default("medium"),
    visitRating: visitRatingEnum("visit_rating"),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    status: forwardOpportunityStatusEnum("status").notNull().default("open"),
    ...timestamps,
  },
  (table) => [
    index("forward_opportunities_tenant_id_idx").on(table.tenantId),
    index("forward_opportunities_prospect_id_idx").on(table.prospectId),
    index("forward_opportunities_initiative_id_idx").on(table.initiativeId),
    index("forward_opportunities_owner_user_id_idx").on(table.ownerUserId),
    index("forward_opportunities_stage_idx").on(table.stage),
    index("forward_opportunities_status_idx").on(table.status),
    // Deliberately NO unique on (prospect, initiative): one prospect may hold several
    // opportunities against the same initiative.
  ],
);

/**
 * Milestone definitions are DATA, not columns.
 *
 * Robb's set will change, and I22 references these keys in rules; boolean columns would make both
 * painful. `source` and `blocking` are INDEPENDENT — `permission_to_share` is they-said but
 * non-blocking.
 */
export const milestoneDefinitions = pgTable(
  "milestone_definitions",
  {
    ...primaryId,
    ...tenantScoped,
    key: text("key").notNull(),
    label: text("label").notNull(),
    source: milestoneSourceEnum("source").notNull(),
    blocking: boolean("blocking").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    // The verb on the button that records it — "Record their date", "Ask at close". Data, because
    // the milestone set is data; a screen that hardcoded six verbs would drift the moment an org
    // changed one. Null falls back to a generic verb (I27).
    actionLabel: text("action_label"),
    ...timestamps,
  },
  (table) => [
    index("milestone_definitions_tenant_id_idx").on(table.tenantId),
    unique("milestone_definitions_tenant_key_unique").on(table.tenantId, table.key),
  ],
);

/**
 * A drafted artifact, and the record of what the human did with it (Initiative 28).
 *
 * Robb's one hard technical condition: every generated draft and every human edit is logged. Not as
 * an audit chore — as the evidence that a person worked WITH the AI rather than rubber-stamping it,
 * which he named as both a requirement and a selling point.
 *
 * Both bodies are stored: `generatedText` as the model produced it and `finalText` as the human
 * used it. Keeping only a diff, or only the final, would lose exactly the comparison the log exists
 * to make.
 */
export const opportunityDrafts = pgTable(
  "opportunity_drafts",
  {
    ...primaryId,
    ...tenantScoped,
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => forwardOpportunities.id, { onDelete: "cascade" }),
    /** The NextActionKind this was drafted for. */
    kind: text("kind").notNull(),
    /** Who the artifact is addressed to — the prospect, a connector, or internal. */
    audience: text("audience").notNull(),
    subject: text("subject"),
    /** As the model produced it. Never overwritten, including on regenerate. */
    generatedText: text("generated_text").notNull(),
    /** As the human used it. Equal to generatedText until they edit. */
    finalText: text("final_text").notNull(),
    edited: boolean("edited").notNull().default(false),
    /** How much was changed, 0-100. A flag alone cannot tell a nudge from a rewrite. */
    editedPercent: integer("edited_percent").notNull().default(0),
    regeneratedCount: integer("regenerated_count").notNull().default(0),
    /** Set when the rep marks the action done — which is what drives the completion semantics. */
    completedAt: timestamp("completed_at", { withTimezone: true }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    /** mock | live — so a demo can tell a fixture draft from a generated one. */
    provider: text("provider").notNull().default("mock"),
    ...timestamps,
  },
  (table) => [
    index("opportunity_drafts_tenant_id_idx").on(table.tenantId),
    index("opportunity_drafts_opportunity_id_idx").on(table.opportunityId),
    unique("opportunity_drafts_unique_kind").on(table.tenantId, table.opportunityId, table.kind),
  ],
);

/** Per-opportunity milestone state. Absence of a row means "not confirmed". */
export const opportunityMilestones = pgTable(
  "opportunity_milestones",
  {
    ...primaryId,
    ...tenantScoped,
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => forwardOpportunities.id, { onDelete: "cascade" }),
    milestoneDefinitionId: uuid("milestone_definition_id")
      .notNull()
      .references(() => milestoneDefinitions.id, { onDelete: "cascade" }),
    confirmed: boolean("confirmed").notNull().default(false),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    // Confirmed by a staff user, or by a named external person ("Ellen Hallworth, verbally").
    confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedByName: text("confirmed_by_name"),
    evidence: text("evidence"),
    documentUrl: text("document_url"),
    ...timestamps,
  },
  (table) => [
    index("opportunity_milestones_tenant_id_idx").on(table.tenantId),
    index("opportunity_milestones_opportunity_id_idx").on(table.opportunityId),
    index("opportunity_milestones_definition_id_idx").on(table.milestoneDefinitionId),
    unique("opportunity_milestones_unique").on(
      table.tenantId,
      table.opportunityId,
      table.milestoneDefinitionId,
    ),
  ],
);

/**
 * The event log — the substrate.
 *
 * Slippage flags, silence duration, the movement timeline and both Forecast Room movement panels
 * are reads over this table. Every write path that changes a tracked field must append here.
 */
export const opportunityEvents = pgTable(
  "opportunity_events",
  {
    ...primaryId,
    ...tenantScoped,
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => forwardOpportunities.id, { onDelete: "cascade" }),
    eventType: opportunityEventTypeEnum("event_type").notNull(),
    field: text("field"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    // Denormalised so the timeline survives a user being removed, and so an external actor
    // ("Ellen Hallworth, on a call with Priya Nair") is expressible.
    actorName: text("actor_name"),
    // The field that makes "Dana Reese · no prospect input" and "All three moves made by us"
    // possible: was the prospect the source of this change?
    prospectSourced: boolean("prospect_sourced").notNull().default(false),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("opportunity_events_tenant_id_idx").on(table.tenantId),
    index("opportunity_events_opportunity_id_idx").on(table.opportunityId),
    index("opportunity_events_occurred_at_idx").on(table.occurredAt),
    index("opportunity_events_event_type_idx").on(table.eventType),
  ],
);

/**
 * One goal per (scope, fiscal period).
 *
 * The Board and the Forecast Room must read the SAME goal for the same scope — this table is the
 * resolution of the design's $1,500,000 / $2,700,000 mismatch.
 *
 * `scopeRefId` is polymorphic by design (tenant id for org, user id for rep, initiative id for
 * initiative) so it carries no FK constraint. It is NOT NULL so the unique constraint actually
 * bites — a nullable column would let Postgres treat multiple org rows as distinct.
 */
export const goals = pgTable(
  "goals",
  {
    ...primaryId,
    ...tenantScoped,
    scope: goalScopeEnum("scope").notNull(),
    scopeRefId: uuid("scope_ref_id").notNull(),
    fiscalPeriod: text("fiscal_period").notNull(),
    amountCents: integer("amount_cents").notNull(),
    ...timestamps,
  },
  (table) => [
    index("goals_tenant_id_idx").on(table.tenantId),
    index("goals_scope_idx").on(table.scope),
    unique("goals_scope_period_unique").on(
      table.tenantId,
      table.scope,
      table.scopeRefId,
      table.fiscalPeriod,
    ),
  ],
);

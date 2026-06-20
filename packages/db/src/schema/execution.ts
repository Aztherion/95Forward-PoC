import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { askOutcomeEnum, followUpStatusEnum, fundingFrameEnum, visitOutcomeEnum } from "./enums";
import { prospects } from "./prospects";
import { fundingInitiatives } from "./funding";
import { users } from "./users";

export const visits = pgTable(
  "visits",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    locationType: text("location_type"),
    goal: text("goal"),
    team: text("team"),
    priorityDiscussedInitiativeId: uuid("priority_discussed_initiative_id").references(
      () => fundingInitiatives.id,
      { onDelete: "set null" },
    ),
    discoveryQuestions: text("discovery_questions"),
    engagementToolNote: text("engagement_tool_note"),
    callMemo: text("call_memo"),
    outcome: visitOutcomeEnum("outcome"),
    nextStep: text("next_step"),
    followUpDueAt: timestamp("follow_up_due_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("visits_tenant_id_idx").on(table.tenantId),
    index("visits_prospect_id_idx").on(table.prospectId),
    index("visits_priority_discussed_initiative_id_idx").on(table.priorityDiscussedInitiativeId),
  ],
);

export const asks = pgTable(
  "asks",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    visitId: uuid("visit_id").references(() => visits.id, { onDelete: "set null" }),
    amountMinCents: integer("amount_min_cents"),
    amountMaxCents: integer("amount_max_cents"),
    fundingInitiativeId: uuid("funding_initiative_id")
      .notNull()
      .references(() => fundingInitiatives.id, { onDelete: "cascade" }),
    frame: fundingFrameEnum("frame").notNull(),
    askType: text("ask_type"),
    numbersOnTable: boolean("numbers_on_table").notNull().default(false),
    outcome: askOutcomeEnum("outcome"),
    commitmentAmountCents: integer("commitment_amount_cents"),
    commitmentSchedule: text("commitment_schedule"),
    roadmapNextSteps: text("roadmap_next_steps"),
    followUpDueAt: timestamp("follow_up_due_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("asks_tenant_id_idx").on(table.tenantId),
    index("asks_prospect_id_idx").on(table.prospectId),
    index("asks_visit_id_idx").on(table.visitId),
    index("asks_funding_initiative_id_idx").on(table.fundingInitiativeId),
  ],
);

export const referrals = pgTable(
  "referrals",
  {
    ...primaryId,
    ...tenantScoped,
    sourceVisitId: uuid("source_visit_id").references(() => visits.id, { onDelete: "set null" }),
    sourceProspectId: uuid("source_prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    referredName: text("referred_name").notNull(),
    mayUseName: boolean("may_use_name").notNull().default(false),
    willSendNote: boolean("will_send_note").notNull().default(false),
    relationshipNote: text("relationship_note"),
    promotedProspectId: uuid("promoted_prospect_id").references(() => prospects.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("referrals_tenant_id_idx").on(table.tenantId),
    index("referrals_source_visit_id_idx").on(table.sourceVisitId),
    index("referrals_source_prospect_id_idx").on(table.sourceProspectId),
    index("referrals_promoted_prospect_id_idx").on(table.promotedProspectId),
  ],
);

export const followUpTasks = pgTable(
  "follow_up_tasks",
  {
    ...primaryId,
    ...tenantScoped,
    visitId: uuid("visit_id").references(() => visits.id, { onDelete: "set null" }),
    askId: uuid("ask_id").references(() => asks.id, { onDelete: "set null" }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    templateUsed: text("template_used"),
    status: followUpStatusEnum("status").notNull().default("open"),
    ...timestamps,
  },
  (table) => [
    index("follow_up_tasks_tenant_id_idx").on(table.tenantId),
    index("follow_up_tasks_visit_id_idx").on(table.visitId),
    index("follow_up_tasks_ask_id_idx").on(table.askId),
    index("follow_up_tasks_owner_user_id_idx").on(table.ownerUserId),
  ],
);

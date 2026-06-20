import { boolean, index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { prospectStatusEnum, qpiDimensionEnum } from "./enums";
import { constituents } from "./constituents";
import { users } from "./users";

export const prospects = pgTable(
  "prospects",
  {
    ...primaryId,
    ...tenantScoped,
    constituentId: uuid("constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    rank: integer("rank"),
    rmUserId: uuid("rm_user_id").references(() => users.id, { onDelete: "set null" }),
    status: prospectStatusEnum("status").notNull().default("research"),
    top33: boolean("top_33").notNull().default(false),
    momentum: boolean("momentum").notNull().default(false),
    connector: boolean("connector").notNull().default(false),
    leadership: boolean("leadership").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("prospects_tenant_id_idx").on(table.tenantId),
    index("prospects_rm_user_id_idx").on(table.rmUserId),
    unique("prospects_constituent_unique").on(table.tenantId, table.constituentId),
  ],
);

export const qpiAssessments = pgTable(
  "qpi_assessments",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    dimension: qpiDimensionEnum("dimension").notNull(),
    rating: integer("rating"),
    isUnknown: boolean("is_unknown").notNull().default(false),
    rationale: text("rationale"),
    source: text("source"),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("qpi_assessments_tenant_id_idx").on(table.tenantId),
    index("qpi_assessments_prospect_id_idx").on(table.prospectId),
    unique("qpi_assessments_prospect_dimension_unique").on(
      table.tenantId,
      table.prospectId,
      table.dimension,
    ),
  ],
);

export const naturalPartners = pgTable(
  "natural_partners",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    constituentId: uuid("constituent_id").references(() => constituents.id, {
      onDelete: "set null",
    }),
    externalName: text("external_name"),
    role: text("role"),
    warmPathNote: text("warm_path_note"),
    ...timestamps,
  },
  (table) => [
    index("natural_partners_tenant_id_idx").on(table.tenantId),
    index("natural_partners_prospect_id_idx").on(table.prospectId),
  ],
);

export const knowledgeBase = pgTable(
  "knowledge_base",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    capacitySource: text("capacity_source"),
    relationshipToCause: text("relationship_to_cause"),
    connectorsNote: text("connectors_note"),
    giftHistorySummary: text("gift_history_summary"),
    otherPhilanthropy: text("other_philanthropy"),
    timingNote: text("timing_note"),
    ...timestamps,
  },
  (table) => [
    index("knowledge_base_tenant_id_idx").on(table.tenantId),
    unique("knowledge_base_prospect_unique").on(table.tenantId, table.prospectId),
  ],
);

export const researchGaps = pgTable(
  "research_gaps",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    status: text("status"),
    ...timestamps,
  },
  (table) => [
    index("research_gaps_tenant_id_idx").on(table.tenantId),
    index("research_gaps_prospect_id_idx").on(table.prospectId),
  ],
);

export const relationshipMapEntries = pgTable(
  "relationship_map_entries",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    decisionPower: text("decision_power"),
    warmPathNote: text("warm_path_note"),
    source: text("source"),
    ...timestamps,
  },
  (table) => [
    index("relationship_map_entries_tenant_id_idx").on(table.tenantId),
    index("relationship_map_entries_prospect_id_idx").on(table.prospectId),
  ],
);

export const prospectStrategy = pgTable(
  "prospect_strategy",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    relationshipGoals: text("relationship_goals"),
    hooks: text("hooks"),
    objections: text("objections"),
    predispositionPlan: text("predisposition_plan"),
    presentationDesign: text("presentation_design"),
    actionPlan: text("action_plan"),
    ...timestamps,
  },
  (table) => [
    index("prospect_strategy_tenant_id_idx").on(table.tenantId),
    unique("prospect_strategy_prospect_unique").on(table.tenantId, table.prospectId),
  ],
);

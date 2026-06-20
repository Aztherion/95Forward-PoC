import { boolean, index, integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { powerQuestionCategoryEnum } from "./enums";

export const tenantSettings = pgTable(
  "tenant_settings",
  {
    ...primaryId,
    ...tenantScoped,
    weightCapacity: integer("weight_capacity").notNull(),
    weightRelationship: integer("weight_relationship").notNull(),
    weightTiming: integer("weight_timing").notNull(),
    weightGiftHistory: integer("weight_gift_history").notNull(),
    weightPhilanthropy: integer("weight_philanthropy").notNull(),
    researchPublicSources: boolean("research_public_sources").notNull().default(true),
    proposeQpiUpdatesAutomatically: boolean("propose_qpi_updates_automatically")
      .notNull()
      .default(true),
    draft24hFollowups: boolean("draft_24h_followups").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("tenant_settings_tenant_id_idx").on(table.tenantId),
    unique("tenant_settings_tenant_unique").on(table.tenantId),
  ],
);

export const powerQuestions = pgTable(
  "power_questions",
  {
    ...primaryId,
    ...tenantScoped,
    category: powerQuestionCategoryEnum("category").notNull(),
    text: text("text").notNull(),
    ...timestamps,
  },
  (table) => [
    index("power_questions_tenant_id_idx").on(table.tenantId),
    index("power_questions_category_idx").on(table.category),
  ],
);

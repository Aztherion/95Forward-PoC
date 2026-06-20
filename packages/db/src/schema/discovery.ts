import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { candidateConfidenceEnum, candidateStatusEnum, discoveryStatusEnum } from "./enums";
import { constituents } from "./constituents";
import { fundingInitiatives } from "./funding";
import { prospects } from "./prospects";
import { users } from "./users";

export const discoveryTasks = pgTable(
  "discovery_tasks",
  {
    ...primaryId,
    ...tenantScoped,
    connectorConstituentId: uuid("connector_constituent_id").references(() => constituents.id, {
      onDelete: "set null",
    }),
    connectorExternalName: text("connector_external_name"),
    fundingInitiativeId: uuid("funding_initiative_id")
      .notNull()
      .references(() => fundingInitiatives.id, { onDelete: "cascade" }),
    status: discoveryStatusEnum("status").notNull().default("queued"),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("discovery_tasks_tenant_id_idx").on(table.tenantId),
    index("discovery_tasks_connector_constituent_id_idx").on(table.connectorConstituentId),
    index("discovery_tasks_funding_initiative_id_idx").on(table.fundingInitiativeId),
    index("discovery_tasks_requested_by_user_id_idx").on(table.requestedByUserId),
  ],
);

export const candidates = pgTable(
  "candidates",
  {
    ...primaryId,
    ...tenantScoped,
    discoveryTaskId: uuid("discovery_task_id")
      .notNull()
      .references(() => discoveryTasks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    evidenceConnection: text("evidence_connection"),
    evidenceAffinity: text("evidence_affinity"),
    confidence: candidateConfidenceEnum("confidence").notNull(),
    status: candidateStatusEnum("status").notNull().default("suggested"),
    promotedProspectId: uuid("promoted_prospect_id").references(() => prospects.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("candidates_tenant_id_idx").on(table.tenantId),
    index("candidates_discovery_task_id_idx").on(table.discoveryTaskId),
    index("candidates_promoted_prospect_id_idx").on(table.promotedProspectId),
  ],
);

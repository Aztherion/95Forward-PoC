import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { users } from "./users";

export const copilotProposals = pgTable(
  "copilot_proposals",
  {
    ...primaryId,
    ...tenantScoped,
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    proposalType: text("proposal_type").notNull(),
    status: text("status").notNull().default("pending"),
    title: text("title").notNull(),
    summary: text("summary"),
    payload: jsonb("payload").notNull(),
    provenance: jsonb("provenance")
      .notNull()
      .default(sql`'[]'::jsonb`),
    confidence: smallint("confidence"),
    taskType: text("task_type"),
    origin: text("origin").notNull().default("copilot"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    applied: boolean("applied").notNull().default(false),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("copilot_proposals_tenant_id_idx").on(table.tenantId),
    index("copilot_proposals_subject_idx").on(table.subjectId),
    index("copilot_proposals_status_idx").on(table.status),
    index("copilot_proposals_created_by_idx").on(table.createdByUserId),
    check(
      "copilot_proposals_confidence_chk",
      sql`${table.confidence} is null or (${table.confidence} between 0 and 100)`,
    ),
  ],
);

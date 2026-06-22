import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { discoveryStatusEnum } from "./enums";
import { prospects, researchGaps } from "./prospects";
import { users } from "./users";

// Initiative 11 control-plane record for a long-running research job. Distinct from Graphile
// Worker's own queue tables (which live in the graphile_worker schema on the owner pool): this is
// the tenant-scoped DOMAIN state machine the UI polls, written only through withTenant under RLS.
// Reuses discoveryStatusEnum (queued|researching|ready|reviewed). The worker advances it to
// `ready`; the existing proposal approve/dismiss flow drives `ready -> reviewed`.
export const researchJobs = pgTable(
  "research_jobs",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    researchGapId: uuid("research_gap_id").references(() => researchGaps.id, {
      onDelete: "set null",
    }),
    status: discoveryStatusEnum("status").notNull().default("queued"),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Persisted intermediate progress so a crashed/retried handler resumes instead of re-running
    // the ResearchProvider. Shape: { findings: ResearchFinding[] }.
    checkpoint: jsonb("checkpoint"),
    error: text("error"),
    originKey: text("origin_key"),
    ...timestamps,
  },
  (table) => [
    index("research_jobs_tenant_id_idx").on(table.tenantId),
    index("research_jobs_prospect_id_idx").on(table.prospectId),
    index("research_jobs_research_gap_id_idx").on(table.researchGapId),
    index("research_jobs_status_idx").on(table.status),
  ],
);

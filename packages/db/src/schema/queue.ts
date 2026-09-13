import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { forwardOpportunities } from "./forward";
import { users } from "./users";
import { queueDecisionKindEnum } from "./enums";

// =================================================================================================
// 95 Forward — humans overriding the guidance (Initiative 23).
//
// ONE MECHANISM FOR BOTH the ranked queue items and I20's findings. A finding is a ranked item that
// always sorts first, and it needs the same escape hatch: `rule_id` null means "this opportunity's
// queue item", and `rule_id` set means "this one finding about it".
//
// DISMISSAL EXPIRES WHEN THE DATA MOVES. `data_version` records what the opportunity looked like
// when somebody waved the guidance away, and the dismissal is honoured only while that still
// matches. Fixing the underlying problem re-arms the rule; so does the problem getting worse. A
// permanent dismissal would let a rep silently switch off coaching about a deal that is quietly
// falling apart, which is the failure this table exists to prevent.
// =================================================================================================

export const queueDecisions = pgTable(
  "queue_decisions",
  {
    ...primaryId,
    ...tenantScoped,
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => forwardOpportunities.id, { onDelete: "cascade" }),
    /** Null for the whole queue item; a catalogue rule id for one finding about it. */
    ruleId: text("rule_id"),
    kind: queueDecisionKindEnum("kind").notNull(),
    /**
     * The opportunity's data version at the moment of the decision.
     *
     * Deliberately a string rather than a timestamp: it is an opaque marker produced by the repo
     * from the latest event and the row's own updated_at, and comparing it for equality is the
     * whole contract. Nothing should be tempted to do date arithmetic on it.
     */
    dataVersion: text("data_version").notNull(),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedByName: text("decided_by_name"),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    index("queue_decisions_tenant_id_idx").on(table.tenantId),
    index("queue_decisions_opportunity_id_idx").on(table.opportunityId),
    // One live decision per (opportunity, rule, kind). Re-pinning is an update, not a second row —
    // otherwise "is this pinned?" becomes a question about row counts.
    unique("queue_decisions_unique").on(
      table.tenantId,
      table.opportunityId,
      table.ruleId,
      table.kind,
    ),
  ],
);

import { date, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { opportunityStageEnum } from "./enums";
import { constituents } from "./constituents";
import { users } from "./users";

export const opportunities = pgTable(
  "opportunities",
  {
    ...primaryId,
    ...tenantScoped,
    constituentId: uuid("constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    stage: opportunityStageEnum("stage").notNull(),
    askAmountCents: integer("ask_amount_cents"),
    expectedAmountCents: integer("expected_amount_cents"),
    expectedCloseDate: date("expected_close_date"),
    likelihoodPct: integer("likelihood_pct"),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("opportunities_tenant_id_idx").on(table.tenantId),
    index("opportunities_constituent_id_idx").on(table.constituentId),
    index("opportunities_owner_user_id_idx").on(table.ownerUserId),
  ],
);

export const proposals = pgTable(
  "proposals",
  {
    ...primaryId,
    ...tenantScoped,
    constituentId: uuid("constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    purpose: text("purpose"),
    amountCents: integer("amount_cents"),
    status: text("status"),
    deadline: date("deadline"),
    ...timestamps,
  },
  (table) => [
    index("proposals_tenant_id_idx").on(table.tenantId),
    index("proposals_constituent_id_idx").on(table.constituentId),
  ],
);

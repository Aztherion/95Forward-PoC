import { date, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { giftTypeEnum } from "./enums";
import { constituents } from "./constituents";

export const funds = pgTable(
  "funds",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    code: text("code"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    ...timestamps,
  },
  (table) => [index("funds_tenant_id_idx").on(table.tenantId)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    code: text("code"),
    goalAmountCents: integer("goal_amount_cents"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    ...timestamps,
  },
  (table) => [index("campaigns_tenant_id_idx").on(table.tenantId)],
);

export const appeals = pgTable(
  "appeals",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    code: text("code"),
    goalAmountCents: integer("goal_amount_cents"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    ...timestamps,
  },
  (table) => [index("appeals_tenant_id_idx").on(table.tenantId)],
);

export const gifts = pgTable(
  "gifts",
  {
    ...primaryId,
    ...tenantScoped,
    constituentId: uuid("constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    giftDate: date("gift_date").notNull(),
    fundId: uuid("fund_id").references(() => funds.id, { onDelete: "set null" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    appealId: uuid("appeal_id").references(() => appeals.id, { onDelete: "set null" }),
    giftType: giftTypeEnum("gift_type").notNull(),
    designation: text("designation"),
    receiptStatus: text("receipt_status"),
    ...timestamps,
  },
  (table) => [
    index("gifts_tenant_id_idx").on(table.tenantId),
    index("gifts_constituent_id_idx").on(table.constituentId),
    index("gifts_fund_id_idx").on(table.fundId),
    index("gifts_campaign_id_idx").on(table.campaignId),
    index("gifts_appeal_id_idx").on(table.appealId),
  ],
);

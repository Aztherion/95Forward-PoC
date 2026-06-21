import { date, index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { fundingFrameEnum } from "./enums";
import { prospects } from "./prospects";

export const fundingInitiatives = pgTable(
  "funding_initiatives",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    story: text("story"),
    goalAmountCents: integer("goal_amount_cents"),
    frame: fundingFrameEnum("frame").notNull(),
    timelineStart: date("timeline_start"),
    timelineEnd: date("timeline_end"),
    ...timestamps,
  },
  (table) => [
    index("funding_initiatives_tenant_id_idx").on(table.tenantId),
    index("funding_initiatives_frame_idx").on(table.frame),
  ],
);

// The soft cultivation link: a prospect can be cultivated toward zero, one, or several initiatives.
// A prospect's horizon emerges from these associations — frame is never a column on the prospect.
export const prospectFundingInitiatives = pgTable(
  "prospect_funding_initiatives",
  {
    ...primaryId,
    ...tenantScoped,
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    fundingInitiativeId: uuid("funding_initiative_id")
      .notNull()
      .references(() => fundingInitiatives.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("prospect_funding_initiatives_tenant_id_idx").on(table.tenantId),
    index("prospect_funding_initiatives_prospect_id_idx").on(table.prospectId),
    index("prospect_funding_initiatives_funding_initiative_id_idx").on(table.fundingInitiativeId),
    unique("prospect_funding_initiatives_unique").on(
      table.tenantId,
      table.prospectId,
      table.fundingInitiativeId,
    ),
  ],
);

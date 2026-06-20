import { date, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { fundingFrameEnum } from "./enums";

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

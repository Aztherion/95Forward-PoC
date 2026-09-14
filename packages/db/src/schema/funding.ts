import { boolean, date, index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
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
    // I18 additions ------------------------------------------------------------------------
    // Categorical token KEY for the initiative dot, never a hex value — the palette itself is
    // defined by I17b. Storing a key keeps the colour decision in the design system.
    colourKey: text("colour_key"),
    // The name a tab can carry — "Kamuli 2026" against "Everyone in Kamuli — Uganda 2026". I27
    // truncated the Forecast Room's tabs at 22ch because no mechanical derivation of the long name
    // produced the designed label for more than two of four initiatives. Nullable; the full name is
    // the fallback (I28).
    shortName: text("short_name"),
    // "Unrestricted" is an ordinary initiative with restricted = false, not a special case.
    restricted: boolean("restricted").notNull().default(true),
    // The period this initiative's goal is scoped to, e.g. "FY26".
    fiscalPeriod: text("fiscal_period"),
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

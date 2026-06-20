import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { marketingChannelEnum } from "./enums";
import { constituents } from "./constituents";

export const events = pgTable(
  "events",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    ...timestamps,
  },
  (table) => [index("events_tenant_id_idx").on(table.tenantId)],
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    ...primaryId,
    ...tenantScoped,
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    constituentId: uuid("constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    status: text("status"),
    attended: boolean("attended").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("event_registrations_tenant_id_idx").on(table.tenantId),
    index("event_registrations_event_id_idx").on(table.eventId),
    index("event_registrations_constituent_id_idx").on(table.constituentId),
  ],
);

export const volunteerOpportunities = pgTable(
  "volunteer_opportunities",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [index("volunteer_opportunities_tenant_id_idx").on(table.tenantId)],
);

export const volunteerHours = pgTable(
  "volunteer_hours",
  {
    ...primaryId,
    ...tenantScoped,
    constituentId: uuid("constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => volunteerOpportunities.id, { onDelete: "cascade" }),
    hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
    loggedDate: date("logged_date").notNull(),
    ...timestamps,
  },
  (table) => [
    index("volunteer_hours_tenant_id_idx").on(table.tenantId),
    index("volunteer_hours_constituent_id_idx").on(table.constituentId),
    index("volunteer_hours_opportunity_id_idx").on(table.opportunityId),
  ],
);

export const membershipTiers = pgTable(
  "membership_tiers",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    amountCents: integer("amount_cents"),
    ...timestamps,
  },
  (table) => [index("membership_tiers_tenant_id_idx").on(table.tenantId)],
);

export const memberships = pgTable(
  "memberships",
  {
    ...primaryId,
    ...tenantScoped,
    constituentId: uuid("constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    tierId: uuid("tier_id")
      .notNull()
      .references(() => membershipTiers.id, { onDelete: "cascade" }),
    status: text("status"),
    startDate: date("start_date"),
    renewalDate: date("renewal_date"),
    ...timestamps,
  },
  (table) => [
    index("memberships_tenant_id_idx").on(table.tenantId),
    index("memberships_constituent_id_idx").on(table.constituentId),
    index("memberships_tier_id_idx").on(table.tierId),
  ],
);

export const segments = pgTable(
  "segments",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [index("segments_tenant_id_idx").on(table.tenantId)],
);

export const marketingMessages = pgTable(
  "marketing_messages",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    channel: marketingChannelEnum("channel").notNull(),
    segmentId: uuid("segment_id").references(() => segments.id, { onDelete: "set null" }),
    status: text("status"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("marketing_messages_tenant_id_idx").on(table.tenantId),
    index("marketing_messages_segment_id_idx").on(table.segmentId),
  ],
);

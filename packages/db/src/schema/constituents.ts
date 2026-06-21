import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { embeddingColumns, primaryId, tenantScoped, timestamps } from "./columns";
import { constituentProspectStatusEnum, constituentTypeEnum } from "./enums";
import { users } from "./users";

export const constituents = pgTable(
  "constituents",
  {
    ...primaryId,
    ...tenantScoped,
    type: constituentTypeEnum("type").notNull(),
    displayName: text("display_name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    organizationName: text("organization_name"),
    email: text("email"),
    phone: text("phone"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country"),
    prospectStatus: constituentProspectStatusEnum("prospect_status").notNull().default("none"),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    boardMember: boolean("board_member").notNull().default(false),
    volunteer: boolean("volunteer").notNull().default(false),
    wavemakerMonthly: boolean("wavemaker_monthly").notNull().default(false),
    legacy: boolean("legacy").notNull().default(false),
    // host_likelihood: the host CRM's deliberately opaque "major-gift likelihood"
    // foil (0-100). No provenance, no breakdown — meaningless by design; 95 Forward's
    // transparent QPI answers it later.
    hostLikelihood: integer("host_likelihood"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...embeddingColumns,
    ...timestamps,
  },
  (table) => [
    index("constituents_tenant_id_idx").on(table.tenantId),
    index("constituents_assigned_user_id_idx").on(table.assignedUserId),
    index("constituents_type_idx").on(table.type),
    index("constituents_display_name_idx").on(table.displayName),
  ],
);

export const tags = pgTable(
  "tags",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    index("tags_tenant_id_idx").on(table.tenantId),
    unique("tags_tenant_name_unique").on(table.tenantId, table.name),
  ],
);

export const constituentTags = pgTable(
  "constituent_tags",
  {
    ...primaryId,
    ...tenantScoped,
    constituentId: uuid("constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("constituent_tags_tenant_id_idx").on(table.tenantId),
    index("constituent_tags_constituent_id_idx").on(table.constituentId),
    index("constituent_tags_tag_id_idx").on(table.tagId),
    unique("constituent_tags_unique").on(table.tenantId, table.constituentId, table.tagId),
  ],
);

export const relationships = pgTable(
  "relationships",
  {
    ...primaryId,
    ...tenantScoped,
    fromConstituentId: uuid("from_constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    toConstituentId: uuid("to_constituent_id").references(() => constituents.id, {
      onDelete: "cascade",
    }),
    externalName: text("external_name"),
    type: text("type").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    index("relationships_tenant_id_idx").on(table.tenantId),
    index("relationships_from_constituent_id_idx").on(table.fromConstituentId),
    index("relationships_to_constituent_id_idx").on(table.toConstituentId),
  ],
);

export const interactions = pgTable(
  "interactions",
  {
    ...primaryId,
    ...tenantScoped,
    constituentId: uuid("constituent_id")
      .notNull()
      .references(() => constituents.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    summary: text("summary"),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    ...embeddingColumns,
    ...timestamps,
  },
  (table) => [
    index("interactions_tenant_id_idx").on(table.tenantId),
    index("interactions_constituent_id_idx").on(table.constituentId),
    index("interactions_owner_user_id_idx").on(table.ownerUserId),
  ],
);

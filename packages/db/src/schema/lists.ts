import { index, jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { savedListRecordTypeEnum } from "./enums";
import { users } from "./users";

export const savedLists = pgTable(
  "saved_lists",
  {
    ...primaryId,
    ...tenantScoped,
    name: text("name").notNull(),
    recordType: savedListRecordTypeEnum("record_type").notNull(),
    definition: jsonb("definition").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("saved_lists_tenant_id_idx").on(table.tenantId),
    index("saved_lists_owner_user_id_idx").on(table.ownerUserId),
    unique("saved_lists_tenant_name_unique").on(table.tenantId, table.name),
  ],
);

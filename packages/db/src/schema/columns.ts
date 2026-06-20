import { timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const tenantScoped = {
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
};

export const primaryId = {
  id: uuid("id").primaryKey().defaultRandom(),
};

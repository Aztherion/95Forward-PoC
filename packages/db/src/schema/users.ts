import { sql } from "drizzle-orm";
import { index, pgTable, text, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { roleEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    ...primaryId,
    ...tenantScoped,
    auth0Subject: text("auth0_subject"),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: roleEnum("role").notNull(),
    ...timestamps,
  },
  (table) => [
    index("users_tenant_id_idx").on(table.tenantId),
    // Email is globally unique: in this product a user belongs to exactly one
    // tenant, which makes the Auth0 email->user resolution deterministic.
    // TODO(I2): for multi-tenant with shared emails, resolve tenant first (claim/subdomain).
    unique("users_email_unique").on(table.email),
    uniqueIndex("users_auth0_subject_unique")
      .on(table.auth0Subject)
      .where(sql`${table.auth0Subject} is not null`),
  ],
);

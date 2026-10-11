import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
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
    /**
     * Who this user reports to (Initiative 31). ONE LEVEL ONLY — a manager sees their direct
     * reports, never their reports' reports.
     *
     * Deliberately not a role: "manager" is not a thing you are, it is a thing you have. A role
     * column would let a user be marked a manager with nobody reporting to them, and would need
     * keeping in step with this column forever. "Has direct reports" cannot disagree with itself.
     *
     * Self-referencing, same tenant (RLS already confines both sides to one tenant).
     */
    managerId: uuid("manager_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("users_tenant_id_idx").on(table.tenantId),
    index("users_manager_id_idx").on(table.managerId),
    // Email is globally unique: in this product a user belongs to exactly one
    // tenant, which makes the Auth0 email->user resolution deterministic.
    // TODO(I2): for multi-tenant with shared emails, resolve tenant first (claim/subdomain).
    unique("users_email_unique").on(table.email),
    uniqueIndex("users_auth0_subject_unique")
      .on(table.auth0Subject)
      .where(sql`${table.auth0Subject} is not null`),
  ],
);

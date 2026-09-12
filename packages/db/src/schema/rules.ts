import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, tenantScoped, timestamps } from "./columns";
import { users } from "./users";

// =================================================================================================
// 95 Forward — the Rules of Robb layer (Initiative 22).
//
// CATALOGUE IS CODE, DOCTRINE IS DATA. The catalogue of what a rule *does* lives in
// `@95forward/shared/rules-catalogue` and ships with the release. These tables hold only what an
// org has decided differently: which rules are on, what their parameters are set to, how the
// sentence reads, which goals matter most, and what somebody wishes existed.
//
// STORE OVERRIDES, NOT SETTINGS. An org that has changed nothing has no rows here at all. That is
// the whole reason for the shape: raising a default in a later release reaches every org that never
// touched it, instead of being shadowed by a saved copy of the old value. A table of full settings
// rows would quietly freeze each tenant at the defaults current on the day they first opened the
// editor.
// =================================================================================================

/**
 * One row per rule an org has changed. Null columns mean "not overridden" — distinct from an
 * override that happens to equal the default, which is a deliberate choice and stays pinned.
 */
export const ruleOverrides = pgTable(
  "rule_overrides",
  {
    ...primaryId,
    ...tenantScoped,
    /** The catalogue entry id. Deliberately NOT an FK — the catalogue is code, not a table. */
    ruleId: text("rule_id").notNull(),
    enabled: boolean("enabled"),
    /** Parameter key -> value, validated against the catalogue's spec BEFORE it is written. */
    parameterValues: jsonb("parameter_values").$type<Record<string, unknown>>(),
    /** The org's own wording of the doctrine. The predicate does not change; the sentence does. */
    statement: text("statement"),
    ...timestamps,
  },
  (table) => [
    index("rule_overrides_tenant_id_idx").on(table.tenantId),
    unique("rule_overrides_tenant_rule_unique").on(table.tenantId, table.ruleId),
  ],
);

/**
 * Every change to the doctrine, with who, what and when.
 *
 * Append-only and never read by the engine. Its job is answering "why does our coverage multiple
 * say 4?" a quarter after somebody changed it — the question that makes an editable rules layer
 * safe to hand to an organisation in the first place.
 */
export const ruleChanges = pgTable(
  "rule_changes",
  {
    ...primaryId,
    ...tenantScoped,
    /** Catalogue entry id, or the goal/proposal id for those kinds. */
    ruleId: text("rule_id").notNull(),
    /** "enabled" | "statement" | "parameters" | "reset" | "goal-order" | "proposal". */
    field: text("field").notNull(),
    /** JSON so a parameter map, a boolean and a sentence all fit without four nullable columns. */
    before: jsonb("before"),
    after: jsonb("after"),
    /** Null when the actor has since been deleted — the change still happened. */
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Denormalised so the trail stays readable after the user row is gone. */
    actorName: text("actor_name"),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("rule_changes_tenant_id_idx").on(table.tenantId),
    index("rule_changes_rule_id_idx").on(table.ruleId),
    index("rule_changes_changed_at_idx").on(table.changedAt),
  ],
);

/**
 * The escape hatch for doctrine we have not implemented.
 *
 * An org will want rules we do not have. The honest answer is to capture the sentence verbatim,
 * show it back, and mark it NOT ACTIVE — never to compile free text into behaviour. A proposal here
 * changes nothing; a human reads it and either implements it as a built-in or declines it.
 */
export const proposedRules = pgTable(
  "proposed_rules",
  {
    ...primaryId,
    ...tenantScoped,
    /** Captured verbatim. Untrusted content: rendered as text, never interpreted. */
    statement: text("statement").notNull(),
    note: text("note"),
    /** "captured" | "implemented" | "declined". Never "active" — that state does not exist. */
    status: text("status").notNull().default("captured"),
    proposedByUserId: uuid("proposed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    proposedByName: text("proposed_by_name"),
    ...timestamps,
  },
  (table) => [
    index("proposed_rules_tenant_id_idx").on(table.tenantId),
    index("proposed_rules_status_idx").on(table.status),
  ],
);

/**
 * What the organisation is trying to do, in priority order.
 *
 * Distinct from `goals` (I18), which holds dollar targets per scope and fiscal period. This table
 * holds the *statements* — "Total Most Likely bookings by end of year" — and their ranking. I23
 * ranks work against the top-priority goal, which is why the order is data rather than a sort on
 * the amount.
 *
 * No unique constraint on (tenant, priority): reordering swaps values, and a non-deferrable unique
 * index would reject the intermediate state of a perfectly ordinary drag. Ties break on id.
 */
export const ruleGoals = pgTable(
  "rule_goals",
  {
    ...primaryId,
    ...tenantScoped,
    statement: text("statement").notNull(),
    /** Lower is more important. 1 is the goal everything else defers to. */
    priority: integer("priority").notNull(),
    ...timestamps,
  },
  (table) => [
    index("rule_goals_tenant_id_idx").on(table.tenantId),
    index("rule_goals_priority_idx").on(table.priority),
  ],
);

/**
 * ONE counter per tenant, bumped in the same transaction as any doctrine write.
 *
 * I19's metrics, I20's checks and I21's simulations all cache. Every one of those caches is keyed
 * on data, not on doctrine — so without this, editing a rule leaves stale numbers on screen and the
 * editor appears to do nothing. A single integer threaded into all three keys means one write
 * invalidates all of them, and means a new cache added later has exactly one thing to include.
 *
 * Deliberately not derived from max(updated_at): a statement edit and a parameter edit in the same
 * second would collide, and the numbers would not move.
 */
export const ruleVersions = pgTable(
  "rule_versions",
  {
    ...tenantScoped,
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("rule_versions_tenant_unique").on(table.tenantId)],
);

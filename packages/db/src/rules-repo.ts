// 95 Forward — reading and writing the doctrine (Initiative 22).
//
// Three invariants this module exists to hold, all of which are easy to get wrong once and then
// never notice:
//
//   1. VALIDATE BEFORE WRITE, AND REJECT. A coverage multiple of 0 makes every coverage figure on
//      two screens render Infinity or a negative gap, silently. Clamping to the nearest legal value
//      would hide that the org asked for something impossible, so an out-of-bounds value is refused
//      and the caller is told which parameter and why.
//
//   2. VERSION AND AUDIT IN THE SAME TRANSACTION AS THE WRITE. A write that lands without bumping
//      the version leaves stale numbers on screen and makes the editor look broken; a write that
//      lands without an audit row makes "why does our coverage multiple say 4?" unanswerable.
//      Neither is allowed to be a separate call a future edit could forget.
//
//   3. NO ROWS MEANS DEFAULTS. Never write a full settings row. See schema/rules.ts.

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  catalogueEntry,
  resolveCatalogue,
  settingsFromCatalogue,
  validateOverrideValues,
  type ForwardSettings,
  type ResolvedEntry,
  type RuleOverride,
  type ValidationError,
} from "@95forward/shared";
import type { Database } from "./client";
import {
  proposedRules,
  ruleChanges,
  ruleGoals,
  ruleOverrides,
  ruleVersions,
} from "./schema/rules";

export type RuleOverrideRow = typeof ruleOverrides.$inferSelect;
export type RuleChangeRow = typeof ruleChanges.$inferSelect;
export type ProposedRuleRow = typeof proposedRules.$inferSelect;
export type RuleGoalRow = typeof ruleGoals.$inferSelect;

export interface RuleActor {
  readonly userId?: string | null;
  readonly name?: string | null;
}

/** Thrown rather than returned: a rejected write must not be mistakable for a successful one. */
export class RuleValidationError extends Error {
  constructor(readonly errors: readonly ValidationError[]) {
    super(errors.map((e) => e.message).join(" "));
    this.name = "RuleValidationError";
  }
}

// -------------------------------------------------------------------------------------------
// Reads
// -------------------------------------------------------------------------------------------

export async function listRuleOverrides(
  db: Database,
  tenantId: string,
): Promise<RuleOverrideRow[]> {
  return db.select().from(ruleOverrides).where(eq(ruleOverrides.tenantId, tenantId));
}

function toOverride(row: RuleOverrideRow): RuleOverride {
  return {
    ruleId: row.ruleId,
    enabled: row.enabled,
    parameterValues: row.parameterValues,
    statement: row.statement,
  };
}

/** The org's effective doctrine: code defaults, with its own choices layered on top. */
export async function resolveTenantCatalogue(
  db: Database,
  tenantId: string,
): Promise<readonly ResolvedEntry[]> {
  const rows = await listRuleOverrides(db, tenantId);
  return resolveCatalogue(rows.map(toOverride));
}

/** The settings object I19/I20/I21 consume, assembled from the org's doctrine. */
export async function resolveTenantSettings(
  db: Database,
  tenantId: string,
): Promise<ForwardSettings> {
  return settingsFromCatalogue(await resolveTenantCatalogue(db, tenantId));
}

/**
 * The one number every doctrine-sensitive cache key must include.
 *
 * Returns "0" for a tenant that has never edited anything — no row is not an error, it is the
 * initial state, and it must be stable so caches are not invalidated on every read.
 */
export async function rulesVersion(db: Database, tenantId: string): Promise<string> {
  const [row] = await db
    .select({ version: ruleVersions.version })
    .from(ruleVersions)
    .where(eq(ruleVersions.tenantId, tenantId));
  return String(row?.version ?? 0);
}

export async function listRuleGoals(db: Database, tenantId: string): Promise<RuleGoalRow[]> {
  return db
    .select()
    .from(ruleGoals)
    .where(eq(ruleGoals.tenantId, tenantId))
    .orderBy(asc(ruleGoals.priority), asc(ruleGoals.id));
}

export async function listProposedRules(
  db: Database,
  tenantId: string,
): Promise<ProposedRuleRow[]> {
  return db
    .select()
    .from(proposedRules)
    .where(eq(proposedRules.tenantId, tenantId))
    .orderBy(desc(proposedRules.createdAt));
}

export async function listRuleChanges(
  db: Database,
  tenantId: string,
  options?: { readonly ruleId?: string; readonly limit?: number },
): Promise<RuleChangeRow[]> {
  const where = options?.ruleId
    ? and(eq(ruleChanges.tenantId, tenantId), eq(ruleChanges.ruleId, options.ruleId))
    : eq(ruleChanges.tenantId, tenantId);
  return db
    .select()
    .from(ruleChanges)
    .where(where)
    .orderBy(desc(ruleChanges.changedAt))
    .limit(options?.limit ?? 50);
}

// -------------------------------------------------------------------------------------------
// Writes
// -------------------------------------------------------------------------------------------

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Bump the tenant's rules version.
 *
 * `onConflictDoUpdate` rather than read-then-write: two people saving at the same moment must not
 * both read 4 and both write 5, which would leave one edit invisible behind a cache key that never
 * moved.
 */
async function bumpVersion(tx: Tx, tenantId: string): Promise<void> {
  await tx
    .insert(ruleVersions)
    .values({ tenantId, version: 1 })
    .onConflictDoUpdate({
      target: ruleVersions.tenantId,
      set: { version: sql`${ruleVersions.version} + 1`, updatedAt: new Date() },
    });
}

async function audit(
  tx: Tx,
  tenantId: string,
  actor: RuleActor | undefined,
  entry: { ruleId: string; field: string; before: unknown; after: unknown },
): Promise<void> {
  await tx.insert(ruleChanges).values({
    tenantId,
    ruleId: entry.ruleId,
    field: entry.field,
    before: entry.before ?? null,
    after: entry.after ?? null,
    actorUserId: actor?.userId ?? null,
    actorName: actor?.name ?? null,
  });
}

export interface RuleEdit {
  readonly enabled?: boolean | null;
  readonly parameterValues?: Record<string, unknown> | null;
  readonly statement?: string | null;
}

/**
 * Apply an edit to one rule.
 *
 * Only the keys present are touched: passing `{ enabled: false }` does not silently drop a statement
 * the org has already rewritten. Passing an explicit `null` clears that override and returns the
 * rule to the shipped default, which is how the editor's "reset" works for a single field.
 */
export async function updateRule(
  db: Database,
  tenantId: string,
  ruleId: string,
  edit: RuleEdit,
  actor?: RuleActor,
): Promise<RuleOverrideRow> {
  const entry = catalogueEntry(ruleId);
  if (!entry) {
    throw new RuleValidationError([
      { parameterKey: ruleId, message: `"${ruleId}" is not a rule in the catalogue.` },
    ]);
  }

  // Validate BEFORE opening the transaction: a rejected edit should not have touched anything, and
  // should not have consumed a version number either.
  if (edit.parameterValues) {
    const errors = validateOverrideValues(entry, edit.parameterValues);
    if (errors.length > 0) throw new RuleValidationError(errors);
  }
  if (typeof edit.statement === "string" && edit.statement.trim().length === 0) {
    throw new RuleValidationError([
      {
        parameterKey: "statement",
        message: "A rule's statement cannot be empty — reset it instead to restore the original.",
      },
    ]);
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(ruleOverrides)
      .where(and(eq(ruleOverrides.tenantId, tenantId), eq(ruleOverrides.ruleId, ruleId)));

    const next = {
      enabled: "enabled" in edit ? (edit.enabled ?? null) : (existing?.enabled ?? null),
      parameterValues:
        "parameterValues" in edit
          ? (edit.parameterValues ?? null)
          : (existing?.parameterValues ?? null),
      statement:
        "statement" in edit ? (edit.statement ?? null) : (existing?.statement ?? null),
    };

    const [row] = await tx
      .insert(ruleOverrides)
      .values({ tenantId, ruleId, ...next })
      .onConflictDoUpdate({
        target: [ruleOverrides.tenantId, ruleOverrides.ruleId],
        set: { ...next, updatedAt: new Date() },
      })
      .returning();

    if ("enabled" in edit && (existing?.enabled ?? null) !== next.enabled) {
      await audit(tx, tenantId, actor, {
        ruleId,
        field: "enabled",
        before: existing?.enabled ?? null,
        after: next.enabled,
      });
    }
    if ("statement" in edit && (existing?.statement ?? null) !== next.statement) {
      await audit(tx, tenantId, actor, {
        ruleId,
        field: "statement",
        before: existing?.statement ?? null,
        after: next.statement,
      });
    }
    if ("parameterValues" in edit) {
      await audit(tx, tenantId, actor, {
        ruleId,
        field: "parameters",
        before: existing?.parameterValues ?? null,
        after: next.parameterValues,
      });
    }

    await bumpVersion(tx, tenantId);
    return row!;
  });
}

/** Remove every override for one rule, returning it to the shipped default. */
export async function resetRule(
  db: Database,
  tenantId: string,
  ruleId: string,
  actor?: RuleActor,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(ruleOverrides)
      .where(and(eq(ruleOverrides.tenantId, tenantId), eq(ruleOverrides.ruleId, ruleId)));
    if (!existing) return;

    await tx
      .delete(ruleOverrides)
      .where(and(eq(ruleOverrides.tenantId, tenantId), eq(ruleOverrides.ruleId, ruleId)));

    await audit(tx, tenantId, actor, {
      ruleId,
      field: "reset",
      before: {
        enabled: existing.enabled,
        parameterValues: existing.parameterValues,
        statement: existing.statement,
      },
      after: null,
    });
    await bumpVersion(tx, tenantId);
  });
}

// -------------------------------------------------------------------------------------------
// Goals
// -------------------------------------------------------------------------------------------

export async function createRuleGoal(
  db: Database,
  tenantId: string,
  statement: string,
  actor?: RuleActor,
): Promise<RuleGoalRow> {
  const trimmed = statement.trim();
  if (!trimmed) {
    throw new RuleValidationError([
      { parameterKey: "statement", message: "A goal needs a statement." },
    ]);
  }
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ priority: ruleGoals.priority })
      .from(ruleGoals)
      .where(eq(ruleGoals.tenantId, tenantId));
    const priority = existing.reduce((max, g) => Math.max(max, g.priority), 0) + 1;

    const [row] = await tx
      .insert(ruleGoals)
      .values({ tenantId, statement: trimmed, priority })
      .returning();
    await audit(tx, tenantId, actor, {
      ruleId: row!.id,
      field: "goal-order",
      before: null,
      after: { statement: trimmed, priority },
    });
    await bumpVersion(tx, tenantId);
    return row!;
  });
}

/**
 * Rewrite the whole priority order from an explicit list of ids.
 *
 * Whole-list rather than move-up/move-down: reordering by relative moves leaves gaps and duplicate
 * priorities behind whenever a request is lost, and the resulting order is then decided by the id
 * tiebreak rather than by anybody's intent.
 */
export async function reorderRuleGoals(
  db: Database,
  tenantId: string,
  orderedIds: readonly string[],
  actor?: RuleActor,
): Promise<RuleGoalRow[]> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(ruleGoals)
      .where(eq(ruleGoals.tenantId, tenantId))
      .orderBy(asc(ruleGoals.priority), asc(ruleGoals.id));

    const known = new Set(rows.map((row) => row.id));
    const unknown = orderedIds.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new RuleValidationError([
        { parameterKey: "order", message: `Unknown goal id(s): ${unknown.join(", ")}.` },
      ]);
    }
    // Anything the caller omitted keeps its existing relative order, after the listed goals — a
    // stale form must not be able to silently delete a goal's ranking.
    const finalOrder = [...orderedIds, ...rows.map((r) => r.id).filter((id) => !orderedIds.includes(id))];

    const before = rows.map((row) => ({ id: row.id, priority: row.priority }));
    for (const [index, id] of finalOrder.entries()) {
      await tx
        .update(ruleGoals)
        .set({ priority: index + 1, updatedAt: new Date() })
        .where(and(eq(ruleGoals.tenantId, tenantId), eq(ruleGoals.id, id)));
    }

    await audit(tx, tenantId, actor, {
      ruleId: "rule-goals",
      field: "goal-order",
      before,
      after: finalOrder.map((id, index) => ({ id, priority: index + 1 })),
    });
    await bumpVersion(tx, tenantId);

    return tx
      .select()
      .from(ruleGoals)
      .where(eq(ruleGoals.tenantId, tenantId))
      .orderBy(asc(ruleGoals.priority), asc(ruleGoals.id));
  });
}

export async function deleteRuleGoal(
  db: Database,
  tenantId: string,
  goalId: string,
  actor?: RuleActor,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(ruleGoals)
      .where(and(eq(ruleGoals.tenantId, tenantId), eq(ruleGoals.id, goalId)));
    if (!existing) return;
    await tx
      .delete(ruleGoals)
      .where(and(eq(ruleGoals.tenantId, tenantId), eq(ruleGoals.id, goalId)));
    await audit(tx, tenantId, actor, {
      ruleId: goalId,
      field: "goal-order",
      before: { statement: existing.statement, priority: existing.priority },
      after: null,
    });
    await bumpVersion(tx, tenantId);
  });
}

// -------------------------------------------------------------------------------------------
// Proposed rules
// -------------------------------------------------------------------------------------------

/**
 * Capture doctrine we cannot execute.
 *
 * This is the ONLY place free text enters the rules layer, and it is inert by construction: nothing
 * reads `proposed_rules` except the screen that lists them. The row is a note to a human, not an
 * instruction to the system.
 */
export async function proposeRule(
  db: Database,
  tenantId: string,
  statement: string,
  options?: { readonly note?: string | null; readonly actor?: RuleActor },
): Promise<ProposedRuleRow> {
  const trimmed = statement.trim();
  if (!trimmed) {
    throw new RuleValidationError([
      { parameterKey: "statement", message: "A proposal needs a statement." },
    ]);
  }
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(proposedRules)
      .values({
        tenantId,
        statement: trimmed,
        note: options?.note ?? null,
        status: "captured",
        proposedByUserId: options?.actor?.userId ?? null,
        proposedByName: options?.actor?.name ?? null,
      })
      .returning();
    await audit(tx, tenantId, options?.actor, {
      ruleId: row!.id,
      field: "proposal",
      before: null,
      after: { statement: trimmed },
    });
    // Deliberately NO version bump: a proposal changes no computation, so invalidating every cache
    // would be a lie about what happened.
    return row!;
  });
}

export async function setProposedRuleStatus(
  db: Database,
  tenantId: string,
  proposalId: string,
  status: "captured" | "implemented" | "declined",
  actor?: RuleActor,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(proposedRules)
      .where(and(eq(proposedRules.tenantId, tenantId), eq(proposedRules.id, proposalId)));
    if (!existing) return;
    await tx
      .update(proposedRules)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(proposedRules.tenantId, tenantId), eq(proposedRules.id, proposalId)));
    await audit(tx, tenantId, actor, {
      ruleId: proposalId,
      field: "proposal",
      before: { status: existing.status },
      after: { status },
    });
  });
}

/** Bulk read used by the editor to show which rules a tenant has touched. */
export async function overriddenRuleIds(
  db: Database,
  tenantId: string,
  ruleIds: readonly string[],
): Promise<Set<string>> {
  if (ruleIds.length === 0) return new Set();
  const rows = await db
    .select({ ruleId: ruleOverrides.ruleId })
    .from(ruleOverrides)
    .where(and(eq(ruleOverrides.tenantId, tenantId), inArray(ruleOverrides.ruleId, [...ruleIds])));
  return new Set(rows.map((row) => row.ruleId));
}

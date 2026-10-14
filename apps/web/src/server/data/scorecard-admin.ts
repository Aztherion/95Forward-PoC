import "server-only";
import { and, count, eq, inArray } from "drizzle-orm";
import {
  buildDefinitionSnapshot,
  meetingTypes,
  scorecardDefinitions,
  scorecards,
  withTenant,
} from "@95forward/db";
import type { ScorecardDefinitionSnapshot } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import type { AuthedUser } from "@/server/data/scorecards";

// Reads the Definitions and Meeting Types screens need (I32).
//
// Both are counts and shapes for display. The editor itself writes through I31's
// `saveScorecardDefinition`, which owns the validation — nothing here re-implements a rule.

/**
 * Every definition's full tree, keyed by definition id.
 *
 * The editor needs sections, criteria and options with their STABLE IDS, because submitting those
 * ids back is what keeps a criterion's history attached to it when its wording is rewritten.
 * `buildDefinitionSnapshot` already assembles exactly that shape, so the editor and the scorer
 * read the definition through the same function rather than two that could drift.
 */
export async function getDefinitionTrees(
  user: AuthedUser,
): Promise<Record<string, ScorecardDefinitionSnapshot>> {
  return withTenant(getAppDb(), user.tenantId, async (tx) => {
    const rows = await tx
      .select({ id: scorecardDefinitions.id })
      .from(scorecardDefinitions)
      .where(eq(scorecardDefinitions.tenantId, user.tenantId));

    const out: Record<string, ScorecardDefinitionSnapshot> = {};
    for (const row of rows) {
      const tree = await buildDefinitionSnapshot(tx, user.tenantId, row.id);
      if (tree !== null) out[row.id] = tree;
    }
    return out;
  });
}

/**
 * How many Scorecards point at each Meeting Type.
 *
 * Shown so a reader can see which types the system actually uses, and so the refusal to delete a
 * type in use reads as a consequence of something visible rather than as an arbitrary block.
 */
export async function getMeetingTypeUsage(user: AuthedUser): Promise<Record<string, number>> {
  return withTenant(getAppDb(), user.tenantId, async (tx) => {
    const types = await tx
      .select({ id: meetingTypes.id })
      .from(meetingTypes)
      .where(eq(meetingTypes.tenantId, user.tenantId));
    const ids = types.map((type) => type.id);
    if (ids.length === 0) return {};

    const rows = await tx
      .select({ meetingTypeId: scorecards.meetingTypeId, total: count() })
      .from(scorecards)
      .where(
        and(eq(scorecards.tenantId, user.tenantId), inArray(scorecards.meetingTypeId, ids)),
      )
      .groupBy(scorecards.meetingTypeId);

    const out: Record<string, number> = {};
    for (const row of rows) {
      if (row.meetingTypeId !== null) out[row.meetingTypeId] = row.total;
    }
    return out;
  });
}

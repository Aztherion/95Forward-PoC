import "server-only";
import { and, asc, eq, isNull, max, notInArray } from "drizzle-orm";
import { constituents, prospects, withTenant } from "@95forward/db";
import { getAppDb } from "@/server/db";
import type { ProspectStatus } from "@/lib/prospect-cadence";
import type { ProspectRef } from "@/server/data/prospects";

export interface CreateProspectInput {
  constituentId: string;
  rmUserId?: string;
  status: ProspectStatus;
}

// Constituents that aren't already on the Master Prospect List — the only valid pool for the create
// flow, since a constituent maps to at most one prospect (the unique constraint enforces this).
export async function listConstituentsNotProspects(tenantId: string): Promise<ProspectRef[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const existing = await tx.select({ id: prospects.constituentId }).from(prospects);
    const taken = existing.map((row) => row.id);
    const rows = await tx
      .select({ id: constituents.id, name: constituents.displayName })
      .from(constituents)
      .where(
        taken.length > 0
          ? and(isNull(constituents.archivedAt), notInArray(constituents.id, taken))
          : isNull(constituents.archivedAt),
      )
      .orderBy(asc(constituents.displayName));
    return rows;
  });
}

// New prospects join the bottom of the list (rank = current max + 1); the QPI recomputes from its
// assessments, which start empty, so a fresh prospect simply reads as "not yet scored".
export async function createProspect(
  tenantId: string,
  input: CreateProspectInput,
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const ranks = await tx.select({ value: max(prospects.rank) }).from(prospects);
    const nextRank = (ranks[0]?.value ?? 0) + 1;
    const inserted = await tx
      .insert(prospects)
      .values({
        tenantId,
        constituentId: input.constituentId,
        rmUserId: input.rmUserId ?? null,
        status: input.status,
        rank: nextRank,
      })
      .returning({ id: prospects.id });
    return inserted[0]?.id ?? "";
  });
}

export async function constituentIsProspect(
  tenantId: string,
  constituentId: string,
): Promise<boolean> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({ id: prospects.id })
      .from(prospects)
      .where(eq(prospects.constituentId, constituentId))
      .limit(1);
    return rows.length > 0;
  });
}

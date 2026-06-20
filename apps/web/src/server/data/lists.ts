import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { savedLists, users, withTenant } from "@95forward/db";
import {
  savedListDefinitionSchema,
  type SavedListDefinition,
  type SavedListInput,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";

export interface SavedListRow {
  id: string;
  name: string;
  recordType: "constituent" | "gift" | "interaction";
  definition: SavedListDefinition;
}

export interface SavedListSummary {
  id: string;
  name: string;
  recordType: "constituent" | "gift" | "interaction";
  filterCount: number;
  ownerName: string | null;
  createdAt: Date;
}

function parseDefinition(value: unknown): SavedListDefinition {
  const result = savedListDefinitionSchema.safeParse(value);
  return result.success ? result.data : { filters: [] };
}

export async function listSavedLists(
  tenantId: string,
  recordType: SavedListInput["recordType"],
): Promise<SavedListRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx.query.savedLists.findMany({
      where: eq(savedLists.recordType, recordType),
      orderBy: [asc(savedLists.name)],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      recordType: row.recordType,
      definition: parseDefinition(row.definition),
    }));
  });
}

export async function listAllSavedLists(tenantId: string): Promise<SavedListSummary[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: savedLists.id,
        name: savedLists.name,
        recordType: savedLists.recordType,
        definition: savedLists.definition,
        createdAt: savedLists.createdAt,
        ownerName: users.name,
      })
      .from(savedLists)
      .leftJoin(users, eq(users.id, savedLists.ownerUserId))
      .orderBy(asc(savedLists.recordType), asc(savedLists.name));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      recordType: row.recordType,
      filterCount: parseDefinition(row.definition).filters.length,
      ownerName: row.ownerName,
      createdAt: row.createdAt,
    }));
  });
}

export async function getSavedList(tenantId: string, id: string): Promise<SavedListRow | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const row = await tx.query.savedLists.findFirst({
      where: eq(savedLists.id, id),
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      recordType: row.recordType,
      definition: parseDefinition(row.definition),
    };
  });
}

export async function createSavedList(
  tenantId: string,
  input: SavedListInput,
  ownerUserId: string,
): Promise<SavedListRow> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const inserted = await tx
      .insert(savedLists)
      .values({
        tenantId,
        name: input.name,
        recordType: input.recordType,
        definition: input.definition,
        ownerUserId,
      })
      .returning();
    const row = inserted[0];
    if (!row) throw new Error("createSavedList: insert returned no rows");
    return {
      id: row.id,
      name: row.name,
      recordType: row.recordType,
      definition: parseDefinition(row.definition),
    };
  });
}

export async function deleteSavedList(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(savedLists).where(and(eq(savedLists.id, id)));
  });
}

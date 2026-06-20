import "server-only";
import { asc, eq } from "drizzle-orm";
import { segments, withTenant } from "@95forward/db";
import {
  savedListDefinitionSchema,
  type SavedListDefinition,
  type SegmentInput,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { countList } from "@/server/data/run-list";

export interface SegmentRow {
  id: string;
  name: string;
  description: string | null;
  definition: SavedListDefinition;
}

function parseDefinition(value: unknown): SavedListDefinition {
  const result = savedListDefinitionSchema.safeParse(value);
  return result.success ? result.data : { filters: [] };
}

export async function listSegments(tenantId: string): Promise<SegmentRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx.query.segments.findMany({
      orderBy: [asc(segments.name)],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      definition: parseDefinition(row.definition),
    }));
  });
}

export async function getSegment(tenantId: string, id: string): Promise<SegmentRow | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const row = await tx.query.segments.findFirst({ where: eq(segments.id, id) });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      definition: parseDefinition(row.definition),
    };
  });
}

export async function createSegment(tenantId: string, input: SegmentInput): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(segments)
      .values({
        tenantId,
        name: input.name,
        description: input.description ?? null,
        definition: input.definition,
      })
      .returning({ id: segments.id });
    const row = rows[0];
    if (!row) throw new Error("createSegment: insert returned no rows");
    return row.id;
  });
}

export async function updateSegment(
  tenantId: string,
  id: string,
  input: SegmentInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(segments)
      .set({
        name: input.name,
        description: input.description ?? null,
        definition: input.definition,
      })
      .where(eq(segments.id, id));
  });
}

export async function deleteSegment(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(segments).where(eq(segments.id, id));
  });
}

export async function countSegmentMatches(
  tenantId: string,
  definition: SavedListDefinition,
): Promise<number> {
  return countList(tenantId, "constituent", definition);
}

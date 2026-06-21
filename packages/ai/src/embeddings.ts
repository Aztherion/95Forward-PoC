import { and, eq, isNull } from "drizzle-orm";
import { resolveEmbeddingMode, type Env } from "@95forward/shared";
import {
  constituents,
  interactions,
  knowledgeBase,
  withTenant,
  type Database,
} from "@95forward/db";
import type { EmbeddingProvider } from "./types";
import { LiveEmbeddingProvider, MockEmbeddingProvider } from "./provider/embedding";

type ConstituentRow = typeof constituents.$inferSelect;
type KnowledgeBaseRow = typeof knowledgeBase.$inferSelect;
type InteractionRow = typeof interactions.$inferSelect;

function joinFields(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ?? "").toString().trim())
    .filter((part) => part.length > 0)
    .join(" | ");
}

export function constituentEmbeddingText(row: ConstituentRow): string {
  const location = joinFields([row.city, row.region, row.country]);
  const flags: string[] = [];
  if (row.boardMember) flags.push("board member");
  if (row.volunteer) flags.push("volunteer");
  if (row.wavemakerMonthly) flags.push("wavemaker monthly donor");
  if (row.legacy) flags.push("legacy donor");
  return joinFields([
    row.displayName,
    row.organizationName,
    `type: ${row.type}`,
    `prospect status: ${row.prospectStatus}`,
    location ? `location: ${location}` : undefined,
    flags.length > 0 ? `flags: ${flags.join(", ")}` : undefined,
  ]);
}

export function knowledgeBaseEmbeddingText(row: KnowledgeBaseRow): string {
  return joinFields([
    row.capacitySource,
    row.relationshipToCause,
    row.connectorsNote,
    row.giftHistorySummary,
    row.otherPhilanthropy,
    row.timingNote,
  ]);
}

export function interactionEmbeddingText(row: InteractionRow): string {
  const occurredAt = row.occurredAt instanceof Date ? row.occurredAt.toISOString() : row.occurredAt;
  return joinFields([
    `interaction: ${row.type}`,
    occurredAt ? `on ${occurredAt}` : undefined,
    row.summary,
  ]);
}

export function createEmbeddingProvider(
  env: Pick<Env, "AI_MODE" | "EMBEDDING_MODE"> & {
    OPENAI_API_KEY?: string;
    EMBEDDINGS_MODEL?: string;
  },
): EmbeddingProvider {
  const mode = resolveEmbeddingMode(env);
  if (mode === "live") {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "createEmbeddingProvider: OPENAI_API_KEY is required when embeddings run live",
      );
    }
    return new LiveEmbeddingProvider({ apiKey, model: env.EMBEDDINGS_MODEL });
  }
  return new MockEmbeddingProvider();
}

export interface EmbedAndStoreResult {
  table: "constituents" | "knowledge_base" | "interactions";
  embedded: number;
  skipped: number;
}

async function embedTable<TRow extends { id: string; embeddedAt: Date | null }>(
  db: Database,
  provider: EmbeddingProvider,
  tenantId: string,
  table: typeof constituents | typeof knowledgeBase | typeof interactions,
  label: EmbedAndStoreResult["table"],
  buildText: (row: TRow) => string,
  force: boolean,
): Promise<EmbedAndStoreResult> {
  return withTenant(db, tenantId, async (tx) => {
    const tenantScope = eq(table.tenantId, tenantId);
    const where = force ? tenantScope : and(tenantScope, isNull(table.embeddedAt));
    const rows = (await tx.select().from(table).where(where)) as unknown as TRow[];

    if (rows.length === 0) {
      return { table: label, embedded: 0, skipped: 0 };
    }

    const texts = rows.map((row) => buildText(row));
    const vectors = await provider.embedBatch(texts);

    let embedded = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const vector = vectors[i];
      const text = texts[i];
      if (row === undefined || vector === undefined || text === undefined) continue;
      await tx
        .update(table)
        .set({ embedding: vector, embeddingText: text, embeddedAt: new Date() })
        .where(eq(table.id, row.id));
      embedded += 1;
    }
    return { table: label, embedded, skipped: 0 };
  });
}

export function embedConstituents(
  db: Database,
  provider: EmbeddingProvider,
  tenantId: string,
  force = false,
): Promise<EmbedAndStoreResult> {
  return embedTable<ConstituentRow>(
    db,
    provider,
    tenantId,
    constituents,
    "constituents",
    constituentEmbeddingText,
    force,
  );
}

export function embedKnowledgeBase(
  db: Database,
  provider: EmbeddingProvider,
  tenantId: string,
  force = false,
): Promise<EmbedAndStoreResult> {
  return embedTable<KnowledgeBaseRow>(
    db,
    provider,
    tenantId,
    knowledgeBase,
    "knowledge_base",
    knowledgeBaseEmbeddingText,
    force,
  );
}

export function embedInteractions(
  db: Database,
  provider: EmbeddingProvider,
  tenantId: string,
  force = false,
): Promise<EmbedAndStoreResult> {
  return embedTable<InteractionRow>(
    db,
    provider,
    tenantId,
    interactions,
    "interactions",
    interactionEmbeddingText,
    force,
  );
}

export async function embedAndStore(
  db: Database,
  provider: EmbeddingProvider,
  tenantId: string,
  force = false,
): Promise<EmbedAndStoreResult[]> {
  return [
    await embedConstituents(db, provider, tenantId, force),
    await embedKnowledgeBase(db, provider, tenantId, force),
    await embedInteractions(db, provider, tenantId, force),
  ];
}

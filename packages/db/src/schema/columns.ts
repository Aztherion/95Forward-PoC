import { text, timestamp, uuid, vector } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// Embedding columns for hybrid retrieval. `embedding` is OpenAI text-embedding-3-small (1536-dim),
// nullable until the backfill runs; `embedding_text` records exactly what was embedded. The HNSW
// index is created via raw SQL in the migration (drizzle-kit omits the vector_cosine_ops opclass).
export const embeddingColumns = {
  embedding: vector("embedding", { dimensions: 1536 }),
  embeddingText: text("embedding_text").notNull().default(""),
  embeddedAt: timestamp("embedded_at", { withTimezone: true }),
};

export const tenantScoped = {
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
};

export const primaryId = {
  id: uuid("id").primaryKey().defaultRandom(),
};

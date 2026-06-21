// owner pool, RLS-bypassing backfill (mirrors seed.ts)
import { createDb, tenants, type Database } from "@95forward/db";
import { createEmbeddingProvider, embedAndStore } from "../embeddings";
import type { EmbeddingProvider } from "../types";

async function backfill(db: Database, provider: EmbeddingProvider, force: boolean): Promise<void> {
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);
  for (const tenant of tenantRows) {
    const results = await embedAndStore(db, provider, tenant.id, force);
    const summary = results.map((r) => `${r.table}=${r.embedded}`).join(" ");
    console.log(`[ai] embedded tenant ${tenant.name} (${tenant.id}): ${summary}`);
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const provider = createEmbeddingProvider({
    AI_MODE: process.env.AI_MODE === "live" ? "live" : "mock",
    EMBEDDING_MODE:
      process.env.EMBEDDING_MODE === "live"
        ? "live"
        : process.env.EMBEDDING_MODE === "mock"
          ? "mock"
          : undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    EMBEDDINGS_MODEL: process.env.EMBEDDINGS_MODEL,
  });

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("backfill: DATABASE_URL is required (owner pool)");
  }
  const { db, pool } = createDb(url);
  try {
    await backfill(db, provider, force);
    console.log("[ai] backfill complete");
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error("[ai] backfill failed:", error);
    process.exit(1);
  });
}

export { backfill };

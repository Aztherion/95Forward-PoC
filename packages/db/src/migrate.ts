import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { prepareDatabaseUrl } from "./connection";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const migrationsFolder = path.resolve(__dirname, "../drizzle");
  const pool = new Pool({ connectionString: prepareDatabaseUrl(url) });
  const db = drizzle(pool);

  console.log(`[db] running migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  await pool.end();
  console.log("[db] migrations complete — pgvector extension ensured");
}

main().catch((error: unknown) => {
  console.error("[db] migration failed:", error);
  process.exit(1);
});

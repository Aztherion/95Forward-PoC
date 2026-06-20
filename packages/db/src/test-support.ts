import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import type { Database } from "./client";

export interface TestDb {
  db: Database;
  pool: Pool;
}

export async function connectTestDb(): Promise<TestDb | null> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[db tests] DATABASE_URL is not set — skipping integration suite. " +
        "Start Postgres (pnpm db:up && pnpm db:wait && pnpm db:migrate) and set DATABASE_URL to run it.",
    );
    return null;
  }

  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3_000 });
  try {
    await pool.query("select 1");
  } catch (error: unknown) {
    await pool.end().catch(() => undefined);
    console.warn(
      `[db tests] could not reach DATABASE_URL (${(error as Error).message}) — skipping integration suite.`,
    );
    return null;
  }

  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool };
}

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

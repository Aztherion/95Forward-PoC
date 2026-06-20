import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import type { Database } from "./client";

export interface TestDb {
  db: Database;
  pool: Pool;
}

async function connect(url: string | undefined, label: string): Promise<TestDb | null> {
  if (!url) {
    console.warn(
      `[db tests] ${label} is not set — skipping suite. ` +
        "Start Postgres (pnpm db:up && pnpm db:wait && pnpm db:migrate) and set the URL to run it.",
    );
    return null;
  }

  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3_000 });
  try {
    await pool.query("select 1");
  } catch (error: unknown) {
    await pool.end().catch(() => undefined);
    console.warn(
      `[db tests] could not reach ${label} (${(error as Error).message}) — skipping suite.`,
    );
    return null;
  }

  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool };
}

export function connectTestDb(): Promise<TestDb | null> {
  return connect(process.env.DATABASE_URL, "DATABASE_URL");
}

export function connectAppTestDb(): Promise<TestDb | null> {
  return connect(process.env.APP_DATABASE_URL, "APP_DATABASE_URL");
}

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

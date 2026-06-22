import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";
import { prepareDatabaseUrl } from "./connection";

export type Database = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Database;
  pool: Pool;
}

export function createDb(connectionString?: string, config: PoolConfig = {}): DbHandle {
  const raw = connectionString ?? process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("createDb: DATABASE_URL is not set and no connectionString was provided");
  }
  const url = prepareDatabaseUrl(raw);
  const pool = new Pool({ connectionString: url, ...config });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool };
}

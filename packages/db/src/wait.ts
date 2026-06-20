import { Pool } from "pg";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS ?? 60_000);
  const start = Date.now();

  for (;;) {
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3_000 });
    try {
      await pool.query("select 1");
      await pool.end();
      console.log("[db] postgres is ready");
      return;
    } catch (error: unknown) {
      await pool.end().catch(() => undefined);
      if (Date.now() - start > timeoutMs) {
        console.error("[db] timed out waiting for postgres:", (error as Error).message);
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
}

void main();

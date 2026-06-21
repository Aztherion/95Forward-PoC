import { createDb, type DbHandle } from "@95forward/db";

export type TestDb = DbHandle;

async function connect(url: string | undefined, label: string): Promise<TestDb | null> {
  if (!url) {
    console.warn(
      `[ai tests] ${label} is not set — skipping suite. ` +
        "Start Postgres (pnpm db:up && pnpm db:wait && pnpm db:migrate) and set the URL to run it.",
    );
    return null;
  }

  const handle = createDb(url, { connectionTimeoutMillis: 10_000, max: 2 });
  try {
    await handle.pool.query("select 1");
  } catch (error: unknown) {
    await handle.pool.end().catch(() => undefined);
    console.warn(
      `[ai tests] could not reach ${label} (${(error as Error).message}) — skipping suite.`,
    );
    return null;
  }
  return handle;
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

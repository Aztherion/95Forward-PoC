import "server-only";
import { createDb, type Database, type DbHandle } from "@95forward/db";

export { createDb };

let handle: DbHandle | undefined;
let appHandle: DbHandle | undefined;

// Owner pool (bypasses RLS). ONLY for getCurrentUser() auth resolution, which must
// look up a user by email before the tenant is known. Never use in feature code.
export function getDb(): Database {
  return (handle ??= createDb()).db;
}

// App pool (connects as app_user, subject to RLS). All feature queries go through
// this, always wrapped in withTenant(getAppDb(), tenantId, ...).
export function getAppDb(): Database {
  const url = process.env.APP_DATABASE_URL;
  if (!url) {
    throw new Error("APP_DATABASE_URL is required for tenant-scoped (RLS) data access");
  }
  return (appHandle ??= createDb(url)).db;
}

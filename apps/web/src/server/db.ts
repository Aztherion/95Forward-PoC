import "server-only";
import { createDb, type Database, type DbHandle } from "@95forward/db";

export { createDb };

let handle: DbHandle | undefined;

export function getDb(): Database {
  return (handle ??= createDb()).db;
}

import { and, eq, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable, PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { Database } from "./client";

export type TenantScopedTable = PgTable & {
  tenantId: PgColumn;
};

function combine(scope: SQL, extra?: SQL): SQL {
  if (extra === undefined) {
    return scope;
  }
  const combined = and(scope, extra);
  if (combined === undefined) {
    throw new Error("createTenantDb: failed to combine where clauses");
  }
  return combined;
}

export interface TenantDb {
  readonly tenantId: string;
  findMany<TTable extends TenantScopedTable>(
    table: TTable,
    extraWhere?: SQL,
  ): Promise<InferSelectModel<TTable>[]>;
  findFirst<TTable extends TenantScopedTable>(
    table: TTable,
    extraWhere?: SQL,
  ): Promise<InferSelectModel<TTable> | undefined>;
  insert<TTable extends TenantScopedTable>(
    table: TTable,
    values: Omit<InferInsertModel<TTable>, "tenantId">,
  ): Promise<InferSelectModel<TTable>>;
  update<TTable extends TenantScopedTable>(
    table: TTable,
    where: SQL | undefined,
    set: PgUpdateSetSource<TTable>,
  ): Promise<InferSelectModel<TTable>[]>;
  delete<TTable extends TenantScopedTable>(
    table: TTable,
    where?: SQL,
  ): Promise<InferSelectModel<TTable>[]>;
}

export function createTenantDb(db: Database, tenantId: string): TenantDb {
  function scope(table: TenantScopedTable): SQL {
    return eq(table.tenantId, tenantId);
  }

  return {
    tenantId,

    async findMany(table, extraWhere) {
      const rows = await db
        .select()
        .from(table)
        .where(combine(scope(table), extraWhere));
      return rows as InferSelectModel<typeof table>[];
    },

    async findFirst(table, extraWhere) {
      const rows = await db
        .select()
        .from(table)
        .where(combine(scope(table), extraWhere))
        .limit(1);
      return rows[0] as InferSelectModel<typeof table> | undefined;
    },

    async insert(table, values) {
      const payload = { ...values, tenantId } as InferInsertModel<typeof table>;
      const rows = await db.insert(table).values(payload).returning();
      const inserted = rows[0];
      if (inserted === undefined) {
        throw new Error("createTenantDb.insert: insert returned no rows");
      }
      return inserted as InferSelectModel<typeof table>;
    },

    async update(table, where, set) {
      const rows = await db
        .update(table)
        .set(set)
        .where(combine(scope(table), where))
        .returning();
      return rows as InferSelectModel<typeof table>[];
    },

    async delete(table, where) {
      const rows = await db
        .delete(table)
        .where(combine(scope(table), where))
        .returning();
      return rows as InferSelectModel<typeof table>[];
    },
  };
}

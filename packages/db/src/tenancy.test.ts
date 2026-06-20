import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { createTenantDb, type TenantDb } from "./tenancy";
import type { Database } from "./client";
import { connectTestDb, uniqueSuffix, type TestDb } from "./test-support";
import { tenants } from "./schema/tenants";
import { constituents } from "./schema/constituents";
import { funds } from "./schema/revenue";

let handle: TestDb | null = null;
let db: Database;

const suffix = uniqueSuffix();
const slugA = `iso-a-${suffix}`;
const slugB = `iso-b-${suffix}`;

let tenantAId: string;
let tenantBId: string;
let scopedA: TenantDb;

beforeAll(async () => {
  handle = await connectTestDb();
  if (!handle) {
    return;
  }
  db = handle.db;

  const [a] = await db
    .insert(tenants)
    .values({ name: "Isolation Tenant A", slug: slugA })
    .returning();
  const [b] = await db
    .insert(tenants)
    .values({ name: "Isolation Tenant B", slug: slugB })
    .returning();
  if (!a || !b) {
    throw new Error("failed to create test tenants");
  }
  tenantAId = a.id;
  tenantBId = b.id;
  scopedA = createTenantDb(db, tenantAId);

  await db.insert(constituents).values([
    { tenantId: tenantAId, type: "individual", displayName: "A-One" },
    { tenantId: tenantAId, type: "individual", displayName: "A-Two" },
    { tenantId: tenantBId, type: "individual", displayName: "B-One" },
  ]);
  await db.insert(funds).values([
    { tenantId: tenantAId, name: "A-Fund" },
    { tenantId: tenantBId, name: "B-Fund" },
  ]);
});

afterAll(async () => {
  if (!handle) {
    return;
  }
  await db.delete(tenants).where(inArray(tenants.id, [tenantAId, tenantBId]));
  await handle.pool.end();
});

describe("createTenantDb isolation", () => {
  it("findMany returns only the scoped tenant's rows", async () => {
    if (!handle) {
      return;
    }
    const rows = await scopedA.findMany(constituents);
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
    expect(rows.map((r) => r.displayName).sort()).toEqual(["A-One", "A-Two"]);

    const fundRows = await scopedA.findMany(funds);
    expect(fundRows.length).toBe(1);
    expect(fundRows[0]?.name).toBe("A-Fund");
  });

  it("findFirst with extraWhere stays tenant-scoped", async () => {
    if (!handle) {
      return;
    }
    const found = await scopedA.findFirst(constituents, eq(constituents.displayName, "A-One"));
    expect(found?.tenantId).toBe(tenantAId);

    const crossTenant = await scopedA.findFirst(
      constituents,
      eq(constituents.displayName, "B-One"),
    );
    expect(crossTenant).toBeUndefined();
  });

  it("update of tenant B's row in tenant A scope changes 0 rows", async () => {
    if (!handle) {
      return;
    }
    const bRowBefore = await db.query.constituents.findFirst({
      where: eq(constituents.displayName, "B-One"),
    });
    expect(bRowBefore).toBeDefined();

    const updated = await scopedA.update(constituents, eq(constituents.id, bRowBefore!.id), {
      displayName: "HACKED-BY-A",
    });
    expect(updated.length).toBe(0);

    const bRowAfter = await db.query.constituents.findFirst({
      where: eq(constituents.id, bRowBefore!.id),
    });
    expect(bRowAfter?.displayName).toBe("B-One");
  });

  it("delete of tenant B's row in tenant A scope removes 0 rows", async () => {
    if (!handle) {
      return;
    }
    const bRow = await db.query.constituents.findFirst({
      where: eq(constituents.displayName, "B-One"),
    });
    expect(bRow).toBeDefined();

    const deleted = await scopedA.delete(constituents, eq(constituents.id, bRow!.id));
    expect(deleted.length).toBe(0);

    const stillThere = await db.query.constituents.findFirst({
      where: eq(constituents.id, bRow!.id),
    });
    expect(stillThere?.displayName).toBe("B-One");
  });

  it("insert forces tenantId = A even when B is supplied", async () => {
    if (!handle) {
      return;
    }
    const inserted = await scopedA.insert(constituents, {
      tenantId: tenantBId,
      type: "individual",
      displayName: `forced-${suffix}`,
    } as never);
    expect(inserted.tenantId).toBe(tenantAId);

    const reread = await db.query.constituents.findFirst({
      where: eq(constituents.id, inserted.id),
    });
    expect(reread?.tenantId).toBe(tenantAId);
  });
});

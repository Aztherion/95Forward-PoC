import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { constituents, gifts, prospects, researchJobs, tenants } from "./schema";
import { withTenant } from "./tenancy";
import { connectAppTestDb, connectTestDb, uniqueSuffix, type TestDb } from "./test-support";

let owner: TestDb | null = null;
let app: TestDb | null = null;
let tenantAId = "";
let tenantBId = "";
const suffix = uniqueSuffix();

async function makeTenant(db: Database, label: string): Promise<string> {
  const rows = await db
    .insert(tenants)
    .values({ name: `RLS ${label} ${suffix}`, slug: `rls-${label}-${suffix}` })
    .returning();
  const row = rows[0];
  if (!row) throw new Error("makeTenant: insert returned no row");
  return row.id;
}

async function seedTenant(db: Database, tenantId: string, name: string): Promise<void> {
  const rows = await db
    .insert(constituents)
    .values({ tenantId, type: "individual", displayName: name })
    .returning();
  const constituent = rows[0];
  if (!constituent) throw new Error("seedTenant: constituent insert returned no row");
  await db.insert(gifts).values({
    tenantId,
    constituentId: constituent.id,
    amountCents: 10_000,
    giftDate: "2026-01-01",
    giftType: "one_time",
  });
  const prospectRows = await db
    .insert(prospects)
    .values({ tenantId, constituentId: constituent.id })
    .returning();
  const prospect = prospectRows[0];
  if (!prospect) throw new Error("seedTenant: prospect insert returned no row");
  await db
    .insert(researchJobs)
    .values({ tenantId, prospectId: prospect.id, status: "ready", originKey: `test:${tenantId}` });
}

beforeAll(async () => {
  owner = await connectTestDb();
  app = await connectAppTestDb();
  if (!owner || !app) return;
  tenantAId = await makeTenant(owner.db, "a");
  tenantBId = await makeTenant(owner.db, "b");
  await seedTenant(owner.db, tenantAId, "A-person");
  await seedTenant(owner.db, tenantBId, "B-person");
});

afterAll(async () => {
  if (owner) {
    if (tenantAId) await owner.db.delete(tenants).where(eq(tenants.id, tenantAId));
    if (tenantBId) await owner.db.delete(tenants).where(eq(tenants.id, tenantBId));
    await owner.pool.end();
  }
  if (app) await app.pool.end();
});

describe("RLS tenant isolation (app_user, enforced by Postgres)", () => {
  it("relational query (constituents with gifts) in tenant A returns ONLY A's rows", async () => {
    if (!app) return;
    const rows = await withTenant(app.db, tenantAId, (tx) =>
      tx.query.constituents.findMany({ with: { gifts: true } }),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((c) => c.tenantId === tenantAId)).toBe(true);
    expect(rows.every((c) => c.displayName === "A-person")).toBe(true);
    const allGifts = rows.flatMap((c) => c.gifts);
    expect(allGifts.length).toBeGreaterThan(0);
    expect(allGifts.every((g) => g.tenantId === tenantAId)).toBe(true);
  });

  it("a manual inner JOIN in tenant B's context never sees A's rows", async () => {
    if (!app) return;
    const rows = await withTenant(app.db, tenantBId, (tx) =>
      tx
        .select({ name: constituents.displayName })
        .from(constituents)
        .innerJoin(gifts, eq(gifts.constituentId, constituents.id)),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.name === "B-person")).toBe(true);
  });

  it("an unscoped query on app_user (no withTenant context) returns zero rows", async () => {
    if (!app) return;
    const rows = await app.db.query.constituents.findMany();
    expect(rows).toHaveLength(0);
  });

  it("updating tenant B's constituent from tenant A's context affects zero rows", async () => {
    if (!app || !owner) return;
    const bRows = await owner.db
      .select({ id: constituents.id })
      .from(constituents)
      .where(eq(constituents.tenantId, tenantBId));
    const bId = bRows[0]?.id;
    expect(bId).toBeDefined();
    const affected = await withTenant(app.db, tenantAId, (tx) =>
      tx
        .update(constituents)
        .set({ displayName: "HACKED" })
        .where(eq(constituents.id, bId as string))
        .returning(),
    );
    expect(affected).toHaveLength(0);
    const check = await owner.db
      .select({ name: constituents.displayName })
      .from(constituents)
      .where(eq(constituents.id, bId as string));
    expect(check[0]?.name).toBe("B-person");
  });

  it("research_jobs in tenant A's context never sees tenant B's jobs (Initiative 11)", async () => {
    if (!app) return;
    const aRows = await withTenant(app.db, tenantAId, (tx) => tx.query.researchJobs.findMany());
    expect(aRows.length).toBeGreaterThan(0);
    expect(aRows.every((j) => j.tenantId === tenantAId)).toBe(true);
    expect(aRows.every((j) => j.originKey === `test:${tenantAId}`)).toBe(true);
  });

  it("an unscoped research_jobs query on app_user returns zero rows (Initiative 11)", async () => {
    if (!app) return;
    const rows = await app.db.query.researchJobs.findMany();
    expect(rows).toHaveLength(0);
  });

  it("every table with a tenant_id column has RLS enabled (guard against drift)", async () => {
    if (!owner) return;
    const result = await owner.db.execute(sql`
      select c.relname as tbl
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
      where n.nspname = 'public' and c.relkind = 'r'
        and a.attname = 'tenant_id' and not a.attisdropped and not c.relrowsecurity
    `);
    expect(result.rows).toHaveLength(0);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { constituents, gifts, prospects, tenants } from "@95forward/db";
import type { CallerContext } from "./types";
import { MockEmbeddingProvider } from "./provider/embedding";
import { embedAndStore } from "./embeddings";
import { hybridRetrieve } from "./retrieval";
import { connectAppTestDb, connectTestDb, uniqueSuffix, type TestDb } from "./test-support";

let owner: TestDb | null = null;
let app: TestDb | null = null;
const suffix = uniqueSuffix();
const provider = new MockEmbeddingProvider();

interface Fixture {
  tenantId: string;
  constituentId: string;
  prospectId: string;
}

const fixtures: Record<"a" | "b", Fixture> = {
  a: { tenantId: "", constituentId: "", prospectId: "" },
  b: { tenantId: "", constituentId: "", prospectId: "" },
};

async function makeFixture(db: TestDb["db"], label: string): Promise<Fixture> {
  const tenantRows = await db
    .insert(tenants)
    .values({ name: `Retr ${label} ${suffix}`, slug: `retr-${label}-${suffix}` })
    .returning();
  const tenantId = tenantRows[0]!.id;
  const cRows = await db
    .insert(constituents)
    .values({
      tenantId,
      type: "individual",
      displayName: `Retr ${label} clean water donor`,
      city: "Denver",
    })
    .returning();
  const constituentId = cRows[0]!.id;
  await db.insert(gifts).values({
    tenantId,
    constituentId,
    amountCents: 250_000,
    giftDate: "2026-01-01",
    giftType: "one_time",
  });
  const pRows = await db
    .insert(prospects)
    .values({ tenantId, constituentId, status: "cultivation" })
    .returning();
  return { tenantId, constituentId, prospectId: pRows[0]!.id };
}

function caller(f: Fixture): CallerContext {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    tenantId: f.tenantId,
    role: "major_gifts_officer",
  };
}

beforeAll(async () => {
  owner = await connectTestDb();
  app = await connectAppTestDb();
  if (!owner || !app) return;
  fixtures.a = await makeFixture(owner.db, "a");
  fixtures.b = await makeFixture(owner.db, "b");
  await embedAndStore(owner.db, provider, fixtures.a.tenantId, true);
  await embedAndStore(owner.db, provider, fixtures.b.tenantId, true);
});

afterAll(async () => {
  if (owner) {
    for (const f of Object.values(fixtures)) {
      if (f.tenantId) await owner.db.delete(tenants).where(eq(tenants.id, f.tenantId));
    }
    await owner.pool.end();
  }
  if (app) await app.pool.end();
});

describe("hybridRetrieve — tenant-scoped vector + structured facts", () => {
  it("SECURITY 3: every citation rowId belongs to tenant A only", async () => {
    if (!owner || !app) return;
    const result = await hybridRetrieve(
      app.db,
      caller(fixtures.a),
      provider,
      "clean water donor in Denver",
      { subjectType: "constituent", subjectId: fixtures.a.constituentId, maxDistance: 1 },
    );
    expect(result.unknown).toBe(false);
    expect(result.facts.length).toBeGreaterThan(0);

    const aIds = new Set([fixtures.a.constituentId, fixtures.a.prospectId]);
    const bIds = new Set([fixtures.b.constituentId, fixtures.b.prospectId]);
    const rowIds = result.facts.flatMap((f) => f.citations.map((c) => c.rowId)).filter(Boolean);
    for (const rid of rowIds) {
      expect(bIds.has(rid as string)).toBe(false);
    }
    expect(rowIds.some((rid) => aIds.has(rid as string))).toBe(true);
  });

  it("includes a deterministic lifetime-giving fact with structured provenance", async () => {
    if (!owner) return;
    const result = await hybridRetrieve(owner.db, caller(fixtures.a), provider, "giving history", {
      subjectType: "constituent",
      subjectId: fixtures.a.constituentId,
      maxDistance: 1,
    });
    const giving = result.facts.find((f) => f.fact.includes("lifetime"));
    expect(giving).toBeDefined();
    expect(giving?.citations[0]?.sourceType).toBe("structured");
    expect(giving?.fact).toContain("$2,500");
  });

  it("SECURITY 8: a subject with no evidence returns first-class unknown", async () => {
    if (!owner) return;
    const result = await hybridRetrieve(
      owner.db,
      caller(fixtures.a),
      provider,
      "zzqxwv no match nonsense token",
      {
        subjectType: "constituent",
        subjectId: "11111111-1111-1111-1111-111111111111",
        maxDistance: 0.0001,
      },
    );
    expect(result.unknown).toBe(true);
    expect(result.facts).toHaveLength(0);
    expect(result.note).toContain("unknown");
  });
});

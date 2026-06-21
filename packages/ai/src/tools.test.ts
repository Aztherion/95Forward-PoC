import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  constituents,
  copilotProposals,
  gifts,
  prospects,
  tenants,
  users,
  withTenant,
} from "@95forward/db";
import type { AnyTool, Providers, ToolContext } from "./types";
import { MockEmbeddingProvider } from "./provider/embedding";
import { buildToolset } from "./tools/index";
import { connectAppTestDb, connectTestDb, uniqueSuffix, type TestDb } from "./test-support";

let owner: TestDb | null = null;
let app: TestDb | null = null;
const suffix = uniqueSuffix();

interface Fixture {
  tenantId: string;
  userId: string;
  constituentId: string;
  prospectId: string;
}

const fixtures: Record<"a" | "b", Fixture> = {
  a: { tenantId: "", userId: "", constituentId: "", prospectId: "" },
  b: { tenantId: "", userId: "", constituentId: "", prospectId: "" },
};

const embedding = new MockEmbeddingProvider();
const providers = {
  embedding,
  model: {
    kind: "mock",
    createMessage: async () => ({
      content: [],
      stopReason: "end_turn",
      usage: { inputTokens: 0, outputTokens: 0 },
    }),
  },
  research: { kind: "demo", research: async () => ({ findings: [] }) },
} as unknown as Providers;

function ctxFor(f: Fixture): ToolContext {
  if (!app) throw new Error("app db not connected");
  return {
    caller: { id: f.userId, tenantId: f.tenantId, role: "major_gifts_officer" },
    db: app.db,
    providers,
  };
}

function tool(name: string): AnyTool {
  const found = buildToolset().find((t) => t.name === name);
  if (!found) throw new Error(`tool ${name} not found`);
  return found;
}

async function makeFixture(db: TestDb["db"], label: string): Promise<Fixture> {
  const tenantRows = await db
    .insert(tenants)
    .values({ name: `Tool ${label} ${suffix}`, slug: `tool-${label}-${suffix}` })
    .returning();
  const tenantId = tenantRows[0]!.id;
  const userRows = await db
    .insert(users)
    .values({
      tenantId,
      email: `tool-${label}-${suffix}@example.org`,
      name: `Tool ${label}`,
      role: "major_gifts_officer",
    })
    .returning();
  const cRows = await db
    .insert(constituents)
    .values({ tenantId, type: "individual", displayName: `Tool ${label} donor` })
    .returning();
  const constituentId = cRows[0]!.id;
  await db.insert(gifts).values({
    tenantId,
    constituentId,
    amountCents: 500_000,
    giftDate: "2026-01-01",
    giftType: "one_time",
  });
  const pRows = await db
    .insert(prospects)
    .values({ tenantId, constituentId, status: "research" })
    .returning();
  return { tenantId, userId: userRows[0]!.id, constituentId, prospectId: pRows[0]!.id };
}

beforeAll(async () => {
  owner = await connectTestDb();
  app = await connectAppTestDb();
  if (!owner) return;
  fixtures.a = await makeFixture(owner.db, "a");
  fixtures.b = await makeFixture(owner.db, "b");
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

describe("buildToolset contract", () => {
  it("returns the seven foundational tools with strict zod schemas", () => {
    const names = buildToolset().map((t) => t.name);
    expect(names).toEqual([
      "read_prospect",
      "read_constituent",
      "read_knowledge_base",
      "retrieve",
      "draft_text",
      "propose_qpi",
      "propose_knowledge_base_update",
    ]);
    for (const t of buildToolset()) {
      expect(t.description.length).toBeGreaterThan(40);
      expect(() => t.inputSchema.parse({ bogus: 1 })).toThrow();
    }
  });
});

describe("tools — tenant isolation (app pool, RLS)", () => {
  it("SECURITY 2: read_constituent in tenant A with tenant B's id returns not-found", async () => {
    if (!app || !fixtures.a.tenantId) return;
    const out = await tool("read_constituent").handler(
      { constituentId: fixtures.b.constituentId },
      ctxFor(fixtures.a),
    );
    expect(out).toContain("No constituent found");
    expect(out).not.toContain("Tool b donor");
  });

  it("SECURITY 2: read_prospect in tenant A with tenant B's id returns not-found", async () => {
    if (!app || !fixtures.a.tenantId) return;
    const out = await tool("read_prospect").handler(
      { prospectId: fixtures.b.prospectId },
      ctxFor(fixtures.a),
    );
    expect(out).toContain("No prospect found");
  });

  it("read_constituent in own tenant returns the profile + lifetime giving", async () => {
    if (!app || !fixtures.a.tenantId) return;
    const out = await tool("read_constituent").handler(
      { constituentId: fixtures.a.constituentId },
      ctxFor(fixtures.a),
    );
    expect(out).toContain("Tool a donor");
    expect(out).toContain("$5,000");
  });

  it("retrieve wraps content as untrusted data", async () => {
    if (!owner || !app || !fixtures.a.tenantId) return;
    await withTenant(owner.db, fixtures.a.tenantId, async (tx) => {
      await tx
        .update(constituents)
        .set({ embeddingText: "Tool a donor clean water", embeddedAt: new Date() })
        .where(eq(constituents.id, fixtures.a.constituentId));
    });
    const out = await tool("retrieve").handler(
      { query: "Tool a donor", subjectType: "constituent", subjectId: fixtures.a.constituentId },
      ctxFor(fixtures.a),
    );
    expect(out).toContain("<untrusted-data>");
  });

  it("propose_qpi stages a pending proposal without mutating live QPI", async () => {
    if (!app || !fixtures.a.tenantId) return;
    const out = await tool("propose_qpi").handler(
      {
        prospectId: fixtures.a.prospectId,
        dimension: "capacity",
        rating: 4,
        rationale: "owns business",
        source: "research",
      },
      ctxFor(fixtures.a),
    );
    expect(out).toContain("pending review");
    const staged = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx
        .select()
        .from(copilotProposals)
        .where(eq(copilotProposals.subjectId, fixtures.a.prospectId)),
    );
    expect(staged.some((p) => p.proposalType === "qpi_assessment" && p.status === "pending")).toBe(
      true,
    );
  });
});

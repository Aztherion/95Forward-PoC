import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { constituents, interactions, tenants, withTenant } from "@95forward/db";
import { MockEmbeddingProvider } from "./provider/embedding";
import {
  constituentEmbeddingText,
  embedConstituents,
  interactionEmbeddingText,
} from "./embeddings";
import { connectTestDb, uniqueSuffix, type TestDb } from "./test-support";

let owner: TestDb | null = null;
let tenantId = "";
let constituentId = "";
const suffix = uniqueSuffix();
const provider = new MockEmbeddingProvider();

beforeAll(async () => {
  owner = await connectTestDb();
  if (!owner) return;
  const tenantRows = await owner.db
    .insert(tenants)
    .values({ name: `Embed ${suffix}`, slug: `embed-${suffix}` })
    .returning();
  tenantId = tenantRows[0]!.id;
  const cRows = await owner.db
    .insert(constituents)
    .values({
      tenantId,
      type: "individual",
      displayName: "Embed Person",
      city: "Denver",
      region: "CO",
    })
    .returning();
  constituentId = cRows[0]!.id;
});

afterAll(async () => {
  if (owner) {
    if (tenantId) await owner.db.delete(tenants).where(eq(tenants.id, tenantId));
    await owner.pool.end();
  }
});

describe("embedding text builders", () => {
  it("constituentEmbeddingText is deterministic and includes meaningful fields", () => {
    const row = {
      displayName: "Jane Doe",
      organizationName: null,
      type: "individual",
      prospectStatus: "prospect",
      city: "Denver",
      region: "CO",
      country: "USA",
      boardMember: true,
      volunteer: false,
      wavemakerMonthly: false,
      legacy: false,
    } as Parameters<typeof constituentEmbeddingText>[0];
    const text = constituentEmbeddingText(row);
    expect(text).toBe(constituentEmbeddingText(row));
    expect(text).toContain("Jane Doe");
    expect(text).toContain("prospect status: prospect");
    expect(text).toContain("board member");
  });

  it("interactionEmbeddingText concatenates type, date and summary", () => {
    const row = {
      type: "call",
      occurredAt: new Date("2026-01-15T00:00:00Z"),
      summary: "Discussed water initiative",
    } as Parameters<typeof interactionEmbeddingText>[0];
    const text = interactionEmbeddingText(row);
    expect(text).toContain("interaction: call");
    expect(text).toContain("Discussed water initiative");
  });
});

describe("embedAndStore (owner pool backfill)", () => {
  it("writes embedding + embedding_text + embedded_at and is idempotent", async () => {
    if (!owner) return;
    const first = await embedConstituents(owner.db, provider, tenantId);
    expect(first.embedded).toBeGreaterThan(0);

    const stored = await withTenant(owner.db, tenantId, (tx) =>
      tx
        .select({
          embeddingText: constituents.embeddingText,
          embeddedAt: constituents.embeddedAt,
          embedding: constituents.embedding,
        })
        .from(constituents)
        .where(eq(constituents.id, constituentId)),
    );
    expect(stored[0]?.embeddingText.length).toBeGreaterThan(0);
    expect(stored[0]?.embeddedAt).not.toBeNull();
    expect(stored[0]?.embedding?.length).toBe(provider.dimensions);

    const second = await embedConstituents(owner.db, provider, tenantId);
    expect(second.embedded).toBe(0);

    const forced = await embedConstituents(owner.db, provider, tenantId, true);
    expect(forced.embedded).toBeGreaterThan(0);
  });

  it("interaction text builder runs against a stored interaction row", async () => {
    if (!owner) return;
    await owner.db.insert(interactions).values({
      tenantId,
      constituentId,
      type: "email",
      occurredAt: new Date("2026-02-01T00:00:00Z"),
      summary: "Sent follow-up",
    });
    const rows = await withTenant(owner.db, tenantId, (tx) =>
      tx.select().from(interactions).where(eq(interactions.constituentId, constituentId)),
    );
    expect(interactionEmbeddingText(rows[0]!)).toContain("Sent follow-up");
  });
});

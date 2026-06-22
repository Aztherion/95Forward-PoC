import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, like } from "drizzle-orm";
import {
  candidates,
  constituents,
  discoveryTasks,
  fundingInitiatives,
  tenants,
  users,
  withTenant,
} from "@95forward/db";
import { connectAppTestDb, connectTestDb, uniqueSuffix, type TestDb } from "../test-support";
import { ADVERSARIAL_INJECTION_SNIPPET } from "../provider/research";
import { SeededDiscoveryProvider } from "../provider/discovery";
import { SeededResearchProvider } from "../provider/research";
import { MockEmbeddingProvider } from "../provider/embedding";
import { MockModelProvider } from "../provider/model";
import type { Providers } from "../types";
import { runDiscoveryJob, markDiscoveryReviewedIfComplete } from "./discovery-prospects";

const providers: Providers = {
  model: MockModelProvider.scripted({}),
  embedding: new MockEmbeddingProvider(),
  research: new SeededResearchProvider(),
  discovery: new SeededDiscoveryProvider(),
};

let owner: TestDb | null = null;
let app: TestDb | null = null;
const suffix = uniqueSuffix();
let tenantId = "";
let userId = "";
let taskId = "";

async function setupFixture(): Promise<void> {
  if (!owner) return;
  const db = owner.db;
  const t = await db
    .insert(tenants)
    .values({ name: `Disc ${suffix}`, slug: `disc-${suffix}` })
    .returning();
  tenantId = t[0]!.id;
  const u = await db
    .insert(users)
    .values({ tenantId, email: `dana-${suffix}@example.org`, name: "Dana", role: "gift_officer" })
    .returning();
  userId = u[0]!.id;
  const connector = await db
    .insert(constituents)
    .values({ tenantId, type: "individual", displayName: "Sandra Kim" })
    .returning();
  const initiative = await db
    .insert(fundingInitiatives)
    .values({ tenantId, name: "Bolivia Scale-Up", frame: "tomorrow" })
    .returning();
  const task = await db
    .insert(discoveryTasks)
    .values({
      tenantId,
      connectorConstituentId: connector[0]!.id,
      fundingInitiativeId: initiative[0]!.id,
      requestedByUserId: userId,
      status: "queued",
    })
    .returning();
  taskId = task[0]!.id;
}

beforeAll(async () => {
  owner = await connectTestDb();
  app = await connectAppTestDb();
  if (!owner || !app) return;
  await setupFixture();
});

afterAll(async () => {
  if (owner) {
    if (tenantId) await owner.db.delete(tenants).where(eq(tenants.id, tenantId));
    await owner.pool.end();
  }
  if (app) await app.pool.end();
});

describe("runDiscoveryJob", () => {
  it("transitions the task to ready and emits fictional candidates with evidence", async () => {
    if (!app || !owner) return;
    await runDiscoveryJob({ tenantId, userId, discoveryTaskId: taskId }, { db: app.db, providers });

    const task = await owner.db
      .select({ status: discoveryTasks.status, checkpoint: discoveryTasks.checkpoint })
      .from(discoveryTasks)
      .where(eq(discoveryTasks.id, taskId));
    expect(task[0]?.status).toBe("ready");
    expect(task[0]?.checkpoint).not.toBeNull();

    const rows = await owner.db
      .select()
      .from(candidates)
      .where(like(candidates.originKey, `discovery:${taskId}:%`));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((c) => c.status === "suggested")).toBe(true);
    const names = rows.map((c) => c.name);
    expect(names).toContain("Lena Petrov");

    // Oracle assertion #5: the adversarial snippet rides through as candidate evidence DATA, never an
    // instruction. Checked in this same test so it reads the candidates this run created.
    const affinities = rows.map((c) => c.evidenceAffinity);
    expect(affinities).toContain(ADVERSARIAL_INJECTION_SNIPPET);
  });

  it("is idempotent — re-running creates no duplicate candidates (Oracle assertion #1)", async () => {
    if (!app || !owner) return;
    const before = await owner.db
      .select()
      .from(candidates)
      .where(like(candidates.originKey, `discovery:${taskId}:%`));
    await runDiscoveryJob({ tenantId, userId, discoveryTaskId: taskId }, { db: app.db, providers });
    const after = await owner.db
      .select()
      .from(candidates)
      .where(like(candidates.originKey, `discovery:${taskId}:%`));
    expect(after.length).toBe(before.length);
  });

  it("drives ready -> reviewed once every candidate is promoted or dismissed", async () => {
    if (!app || !owner) return;
    await withTenant(app.db, tenantId, async (tx) => {
      await tx
        .update(candidates)
        .set({ status: "dismissed" })
        .where(and(eq(candidates.tenantId, tenantId), eq(candidates.discoveryTaskId, taskId)));
    });
    await markDiscoveryReviewedIfComplete(app.db, tenantId, taskId);
    const task = await owner.db
      .select({ status: discoveryTasks.status })
      .from(discoveryTasks)
      .where(eq(discoveryTasks.id, taskId));
    expect(task[0]?.status).toBe("reviewed");
  });
});

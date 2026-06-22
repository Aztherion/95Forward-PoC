import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, like } from "drizzle-orm";
import {
  constituents,
  copilotProposals,
  prospects,
  researchJobs,
  tenants,
  users,
  withTenant,
} from "@95forward/db";
import { connectAppTestDb, connectTestDb, uniqueSuffix, type TestDb } from "../test-support";
import { ADVERSARIAL_INJECTION_SNIPPET, SeededResearchProvider } from "../provider/research";
import { MockEmbeddingProvider } from "../provider/embedding";
import { MockModelProvider } from "../provider/model";
import type { Providers } from "../types";
import { runResearchProspectJob, markResearchJobReviewedIfComplete } from "./research-prospect";

const providers: Providers = {
  model: MockModelProvider.scripted({}),
  embedding: new MockEmbeddingProvider(),
  research: new SeededResearchProvider(),
};

let owner: TestDb | null = null;
let app: TestDb | null = null;
const suffix = uniqueSuffix();
let tenantId = "";
let userId = "";
let prospectId = "";
let jobId = "";

async function setupFixture(): Promise<void> {
  if (!owner) return;
  const db = owner.db;
  const t = await db
    .insert(tenants)
    .values({ name: `Jobs ${suffix}`, slug: `jobs-${suffix}` })
    .returning();
  tenantId = t[0]!.id;
  const u = await db
    .insert(users)
    .values({ tenantId, email: `dana-${suffix}@example.org`, name: "Dana", role: "gift_officer" })
    .returning();
  userId = u[0]!.id;
  const c = await db
    .insert(constituents)
    .values({ tenantId, type: "individual", displayName: "Morgan Ellsworth" })
    .returning();
  const p = await db.insert(prospects).values({ tenantId, constituentId: c[0]!.id }).returning();
  prospectId = p[0]!.id;
  const j = await db
    .insert(researchJobs)
    .values({ tenantId, prospectId, requestedByUserId: userId, status: "queued" })
    .returning();
  jobId = j[0]!.id;
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

describe("runResearchProspectJob", () => {
  it("transitions the job to ready and emits proposals from research findings", async () => {
    if (!app || !owner) return;
    await runResearchProspectJob(
      { tenantId, userId, researchJobId: jobId },
      { db: app.db, providers },
    );

    const job = await owner.db
      .select({ status: researchJobs.status, checkpoint: researchJobs.checkpoint })
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId));
    expect(job[0]?.status).toBe("ready");
    expect(job[0]?.checkpoint).not.toBeNull();

    const proposals = await owner.db
      .select()
      .from(copilotProposals)
      .where(like(copilotProposals.originKey, `research:${jobId}:%`));
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.every((p) => p.proposalType === "knowledge_base_update")).toBe(true);

    // Oracle assertion #5: the adversarial snippet rides through as ordinary proposal data for a
    // human to review — it is never acted on as an instruction. Checked here (not in a separate
    // test) so it reads the proposals this same run created, keeping the suite order-independent.
    const payloads = proposals.map((p) => p.payload as { value?: string });
    const hasAdversarialAsData = payloads.some((pl) => pl.value === ADVERSARIAL_INJECTION_SNIPPET);
    expect(hasAdversarialAsData).toBe(true);
  });

  it("is idempotent — re-running creates no duplicate proposals (Oracle assertion #3)", async () => {
    if (!app || !owner) return;
    const before = await owner.db
      .select()
      .from(copilotProposals)
      .where(like(copilotProposals.originKey, `research:${jobId}:%`));
    await runResearchProspectJob(
      { tenantId, userId, researchJobId: jobId },
      { db: app.db, providers },
    );
    const after = await owner.db
      .select()
      .from(copilotProposals)
      .where(like(copilotProposals.originKey, `research:${jobId}:%`));
    expect(after.length).toBe(before.length);
  });

  it("drives ready -> reviewed once all emitted proposals are decided", async () => {
    if (!app || !owner) return;
    const caller = { id: userId, tenantId, role: "gift_officer" as const };
    await withTenant(app.db, tenantId, async (tx) => {
      await tx
        .update(copilotProposals)
        .set({ status: "dismissed" })
        .where(
          and(
            eq(copilotProposals.tenantId, tenantId),
            like(copilotProposals.originKey, `research:${jobId}:%`),
          ),
        );
    });
    await markResearchJobReviewedIfComplete(app.db, caller, jobId);
    const job = await owner.db
      .select({ status: researchJobs.status })
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId));
    expect(job[0]?.status).toBe("reviewed");
  });
});

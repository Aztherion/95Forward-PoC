import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { constituents, prospects, qpiAssessments, tenants, users, withTenant } from "@95forward/db";
import type { CallerContext } from "./types";
import {
  approveProposal,
  createProposal,
  dismissProposal,
  getProposal,
  listProposals,
} from "./proposals";
import { connectAppTestDb, connectTestDb, uniqueSuffix, type TestDb } from "./test-support";

let owner: TestDb | null = null;
let app: TestDb | null = null;
const suffix = uniqueSuffix();

interface Fixture {
  tenantId: string;
  userId: string;
  prospectId: string;
}

const fixtures: Record<"a" | "b", Fixture> = {
  a: { tenantId: "", userId: "", prospectId: "" },
  b: { tenantId: "", userId: "", prospectId: "" },
};

async function makeFixture(db: TestDb["db"], label: string): Promise<Fixture> {
  const tenantRows = await db
    .insert(tenants)
    .values({ name: `Prop ${label} ${suffix}`, slug: `prop-${label}-${suffix}` })
    .returning();
  const tenantId = tenantRows[0]!.id;
  const userRows = await db
    .insert(users)
    .values({
      tenantId,
      email: `prop-${label}-${suffix}@example.org`,
      name: `Prop ${label}`,
      role: "major_gifts_officer",
    })
    .returning();
  const userId = userRows[0]!.id;
  const cRows = await db
    .insert(constituents)
    .values({ tenantId, type: "individual", displayName: `Prop ${label} person` })
    .returning();
  const pRows = await db
    .insert(prospects)
    .values({ tenantId, constituentId: cRows[0]!.id, status: "research" })
    .returning();
  return { tenantId, userId, prospectId: pRows[0]!.id };
}

function caller(f: Fixture): CallerContext {
  return { id: f.userId, tenantId: f.tenantId, role: "major_gifts_officer" };
}

beforeAll(async () => {
  owner = await connectTestDb();
  app = await connectAppTestDb();
  if (!owner || !app) return;
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

describe("proposals — tenant isolation & optimistic locking (app pool, RLS)", () => {
  it("SECURITY 1: a proposal created in tenant A is invisible to tenant B", async () => {
    if (!app) return;
    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "draft",
      title: "A-only draft",
      payload: { body: "hello" },
      provenance: [],
    });
    expect(id).toBeTruthy();

    const aList = await listProposals(app.db, caller(fixtures.a));
    expect(aList.some((p) => p.id === id)).toBe(true);

    const bList = await listProposals(app.db, caller(fixtures.b));
    expect(bList.some((p) => p.id === id)).toBe(false);

    const bGet = await getProposal(app.db, caller(fixtures.b), id);
    expect(bGet).toBeUndefined();
  });

  it("SECURITY 4: tenant A cannot approve tenant B's proposal", async () => {
    if (!app) return;
    const bId = await createProposal(app.db, caller(fixtures.b), {
      subjectType: "prospect",
      subjectId: fixtures.b.prospectId,
      proposalType: "draft",
      title: "B draft",
      payload: { body: "secret" },
      provenance: [],
    });
    const result = await approveProposal(app.db, caller(fixtures.a), bId);
    expect(result.ok).toBe(false);

    const bGet = await getProposal(app.db, caller(fixtures.b), bId);
    expect(bGet?.status).toBe("pending");
  });

  it("SECURITY 5: double-approve is prevented by the optimistic lock", async () => {
    if (!app) return;
    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "draft",
      title: "approve once",
      payload: { body: "x" },
      provenance: [],
    });
    const first = await approveProposal(app.db, caller(fixtures.a), id);
    expect(first.ok).toBe(true);
    const second = await approveProposal(app.db, caller(fixtures.a), id);
    expect(second.ok).toBe(false);
  });

  it("SECURITY 6: dismissing a qpi proposal applies no domain write", async () => {
    if (!app) return;
    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "qpi_assessment",
      title: "QPI capacity",
      payload: { dimension: "capacity", rating: 90, rationale: "rich", source: "manual" },
      provenance: [],
    });
    const dismissed = await dismissProposal(app.db, caller(fixtures.a), id);
    expect(dismissed.ok).toBe(true);

    const assessments = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx
        .select()
        .from(qpiAssessments)
        .where(
          and(
            eq(qpiAssessments.prospectId, fixtures.a.prospectId),
            eq(qpiAssessments.dimension, "capacity"),
          ),
        ),
    );
    expect(assessments).toHaveLength(0);
  });

  it("SECURITY 7: approving a qpi proposal writes back exactly and sets applied=true", async () => {
    if (!app) return;
    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "qpi_assessment",
      title: "QPI relationship",
      payload: {
        dimension: "relationship",
        rating: 75,
        rationale: "strong board tie",
        source: "interview",
      },
      provenance: [],
    });
    const result = await approveProposal(app.db, caller(fixtures.a), id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.applied).toBe(true);
    expect(result.proposal.appliedAt).not.toBeNull();

    const assessments = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx
        .select()
        .from(qpiAssessments)
        .where(
          and(
            eq(qpiAssessments.prospectId, fixtures.a.prospectId),
            eq(qpiAssessments.dimension, "relationship"),
          ),
        ),
    );
    expect(assessments).toHaveLength(1);
    expect(assessments[0]?.rating).toBe(75);
    expect(assessments[0]?.rationale).toBe("strong board tie");
    expect(assessments[0]?.source).toBe("interview");
  });

  it("edits flip status to 'edited' and persist the edited payload", async () => {
    if (!app) return;
    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "qpi_assessment",
      title: "QPI timing",
      payload: { dimension: "timing", rating: 40, rationale: "soon", source: "note" },
      provenance: [],
    });
    const result = await approveProposal(app.db, caller(fixtures.a), id, {
      payload: { dimension: "timing", rating: 60, rationale: "sooner", source: "note" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.status).toBe("edited");

    const assessments = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx
        .select()
        .from(qpiAssessments)
        .where(
          and(
            eq(qpiAssessments.prospectId, fixtures.a.prospectId),
            eq(qpiAssessments.dimension, "timing"),
          ),
        ),
    );
    expect(assessments[0]?.rating).toBe(60);
  });
});

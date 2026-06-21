import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  constituents,
  fundingInitiatives,
  prospects,
  prospectStrategy,
  qpiAssessments,
  relationshipMapEntries,
  tenants,
  users,
  visits,
  withTenant,
} from "@95forward/db";
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

describe("proposals — tenant isolation & optimistic locking (app pool, RLS)", () => {
  it("SECURITY 1: a proposal created in tenant A is invisible to tenant B", async () => {
    if (!app || !fixtures.a.tenantId) return;
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
    if (!app || !fixtures.a.tenantId) return;
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
    if (!app || !fixtures.a.tenantId) return;
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
    if (!app || !fixtures.a.tenantId) return;
    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "qpi_assessment",
      title: "QPI capacity",
      payload: { dimension: "capacity", rating: 5, rationale: "rich", source: "manual" },
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
    if (!app || !fixtures.a.tenantId) return;
    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "qpi_assessment",
      title: "QPI relationship",
      payload: {
        dimension: "relationship",
        rating: 4,
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
    expect(assessments[0]?.rating).toBe(4);
    expect(assessments[0]?.rationale).toBe("strong board tie");
    expect(assessments[0]?.source).toBe("interview");
    expect(assessments[0]?.isUnknown).toBe(false);
  });

  it("approving a qpi proposal over an unknown gap clears is_unknown so the score recomputes", async () => {
    if (!app || !fixtures.a.tenantId) return;
    await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx.insert(qpiAssessments).values({
        tenantId: fixtures.a.tenantId,
        prospectId: fixtures.a.prospectId,
        dimension: "gift_history",
        rating: null,
        isUnknown: true,
        updatedByUserId: fixtures.a.userId,
      }),
    );

    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "qpi_assessment",
      title: "QPI gift history",
      payload: {
        dimension: "gift_history",
        rating: 4,
        rationale: "two prior gifts",
        source: "crm",
      },
      provenance: [],
    });
    const result = await approveProposal(app.db, caller(fixtures.a), id);
    expect(result.ok).toBe(true);

    const assessments = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx
        .select()
        .from(qpiAssessments)
        .where(
          and(
            eq(qpiAssessments.prospectId, fixtures.a.prospectId),
            eq(qpiAssessments.dimension, "gift_history"),
          ),
        ),
    );
    expect(assessments).toHaveLength(1);
    expect(assessments[0]?.isUnknown).toBe(false);
    expect(assessments[0]?.rating).toBe(4);
  });

  it("edits flip status to 'edited' and persist the edited payload", async () => {
    if (!app || !fixtures.a.tenantId) return;
    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "qpi_assessment",
      title: "QPI timing",
      payload: { dimension: "timing", rating: 2, rationale: "soon", source: "note" },
      provenance: [],
    });
    const result = await approveProposal(app.db, caller(fixtures.a), id, {
      payload: { dimension: "timing", rating: 3, rationale: "sooner", source: "note" },
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
    expect(assessments[0]?.rating).toBe(3);
  });
});

describe("I8 proposal write-backs (app pool, RLS)", () => {
  it("approving a prospect_strategy proposal writes the field; dismiss writes nothing", async () => {
    if (!app || !fixtures.a.tenantId) return;

    const approveId = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "prospect_strategy",
      title: "Strategy: relationshipGoals",
      payload: { field: "relationshipGoals", value: "Deepen the trustee relationship." },
      provenance: [],
    });
    const approved = await approveProposal(app.db, caller(fixtures.a), approveId);
    expect(approved.ok).toBe(true);

    const dismissId = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "prospect_strategy",
      title: "Strategy: hooks",
      payload: { field: "hooks", value: "Climate + Women lenses." },
      provenance: [],
    });
    await dismissProposal(app.db, caller(fixtures.a), dismissId);

    const rows = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx
        .select()
        .from(prospectStrategy)
        .where(eq(prospectStrategy.prospectId, fixtures.a.prospectId)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.relationshipGoals).toBe("Deepen the trustee relationship.");
    expect(rows[0]?.hooks).toBeNull();
  });

  it("approving a visit_plan proposal creates a planned visit (no outcome)", async () => {
    if (!app || !fixtures.a.tenantId) return;

    const id = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "visit_plan",
      title: "Visit plan draft",
      payload: { goal: "Explore a lead gift.", discoveryQuestions: "Who else decides?" },
      provenance: [],
    });
    const approved = await approveProposal(app.db, caller(fixtures.a), id);
    expect(approved.ok).toBe(true);

    const rows = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx.select().from(visits).where(eq(visits.prospectId, fixtures.a.prospectId)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.goal).toBe("Explore a lead gift.");
    expect(rows[0]?.occurredAt).toBeNull();
    expect(rows[0]?.outcome).toBeNull();
  });

  it("approving a relationship_map_entry proposal inserts a KDM; dismiss inserts nothing", async () => {
    if (!app || !fixtures.a.tenantId) return;

    const approveId = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "relationship_map_entry",
      title: "Decision-maker: David Hallworth",
      payload: {
        name: "David Hallworth",
        role: "Trustee",
        decisionPower: "High",
        warmPathNote: "Knows our CDO.",
        source: "Board minutes",
      },
      provenance: [],
    });
    await approveProposal(app.db, caller(fixtures.a), approveId);

    const dismissId = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "prospect",
      subjectId: fixtures.a.prospectId,
      proposalType: "relationship_map_entry",
      title: "Decision-maker: Jane Doe",
      payload: { name: "Jane Doe", role: "Officer" },
      provenance: [],
    });
    await dismissProposal(app.db, caller(fixtures.a), dismissId);

    const rows = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx
        .select()
        .from(relationshipMapEntries)
        .where(eq(relationshipMapEntries.prospectId, fixtures.a.prospectId)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("David Hallworth");
  });

  it("approving a funding_initiative_rationale proposal writes the story; dismiss writes nothing", async () => {
    if (!app || !owner || !fixtures.a.tenantId) return;

    const initiativeRows = await owner.db
      .insert(fundingInitiatives)
      .values({ tenantId: fixtures.a.tenantId, name: "Bolivia Scale-Up", frame: "tomorrow" })
      .returning();
    const initiativeId = initiativeRows[0]!.id;

    const approveId = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "funding_initiative",
      subjectId: initiativeId,
      proposalType: "funding_initiative_rationale",
      title: "Funding rationale draft",
      payload: { story: "Bring a region to self-sustaining coverage — Everyone, Forever." },
      provenance: [],
    });
    const approved = await approveProposal(app.db, caller(fixtures.a), approveId);
    expect(approved.ok).toBe(true);

    const afterApprove = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx.select().from(fundingInitiatives).where(eq(fundingInitiatives.id, initiativeId)),
    );
    expect(afterApprove[0]?.story).toBe(
      "Bring a region to self-sustaining coverage — Everyone, Forever.",
    );

    const dismissId = await createProposal(app.db, caller(fixtures.a), {
      subjectType: "funding_initiative",
      subjectId: initiativeId,
      proposalType: "funding_initiative_rationale",
      title: "Funding rationale draft",
      payload: { story: "A different, dismissed story." },
      provenance: [],
    });
    await dismissProposal(app.db, caller(fixtures.a), dismissId);

    const afterDismiss = await withTenant(app.db, fixtures.a.tenantId, (tx) =>
      tx.select().from(fundingInitiatives).where(eq(fundingInitiatives.id, initiativeId)),
    );
    expect(afterDismiss[0]?.story).toBe(
      "Bring a region to self-sustaining coverage — Everyone, Forever.",
    );
  });
});

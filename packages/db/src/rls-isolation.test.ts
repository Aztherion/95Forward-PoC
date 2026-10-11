import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import {
  candidates,
  constituents,
  criterionResults,
  discoveryTasks,
  fundingInitiatives,
  gifts,
  meetingTypes,
  meetings,
  prospects,
  researchJobs,
  scorecardCriteria,
  scorecardCriterionOptions,
  scorecardDefinitions,
  scorecardSections,
  scorecards,
  tenants,
  users,
} from "./schema";
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

  const initiativeRows = await db
    .insert(fundingInitiatives)
    .values({ tenantId, name: `Init ${name}`, frame: "today" })
    .returning();
  const initiative = initiativeRows[0];
  if (!initiative) throw new Error("seedTenant: funding initiative insert returned no row");
  const taskRows = await db
    .insert(discoveryTasks)
    .values({
      tenantId,
      connectorConstituentId: constituent.id,
      fundingInitiativeId: initiative.id,
      status: "ready",
      originKey: `disc:${tenantId}`,
    })
    .returning();
  const task = taskRows[0];
  if (!task) throw new Error("seedTenant: discovery task insert returned no row");
  await db.insert(candidates).values({
    tenantId,
    discoveryTaskId: task.id,
    name: `Candidate ${name}`,
    confidence: "medium",
    status: "suggested",
    originKey: `disc:${tenantId}:0`,
  });

  // -- I31: the whole Scorecard chain, so RLS is asserted on every one of the eight new tables --
  //
  // `meetings.content` is a donor conversation verbatim and `criterion_results` is an appraisal of
  // the person who had it. A leak here is not a row count.
  const userRows = await db
    .insert(users)
    .values({
      tenantId,
      email: `rls-${tenantId}@example.test`,
      name: `Rep ${name}`,
      role: "gift_officer",
    })
    .returning();
  const user = userRows[0];
  if (!user) throw new Error("seedTenant: user insert returned no row");

  const typeRows = await db
    .insert(meetingTypes)
    .values({
      tenantId,
      name: `Type ${name}`,
      description: `A meeting type belonging to ${name}.`,
      isFallback: true,
    })
    .returning();
  const type = typeRows[0];
  if (!type) throw new Error("seedTenant: meeting type insert returned no row");

  const definitionRows = await db
    .insert(scorecardDefinitions)
    .values({ tenantId, name: `Definition ${name}`, meetingTypeId: type.id, isActive: true })
    .returning();
  const definition = definitionRows[0];
  if (!definition) throw new Error("seedTenant: definition insert returned no row");

  const sectionRows = await db
    .insert(scorecardSections)
    .values({ tenantId, definitionId: definition.id, title: `Section ${name}`, sortOrder: 0 })
    .returning();
  const section = sectionRows[0];
  if (!section) throw new Error("seedTenant: section insert returned no row");

  const criterionRows = await db
    .insert(scorecardCriteria)
    .values({
      tenantId,
      sectionId: section.id,
      type: "classification",
      prompt: `Criterion ${name}`,
      sortOrder: 0,
    })
    .returning();
  const criterion = criterionRows[0];
  if (!criterion) throw new Error("seedTenant: criterion insert returned no row");

  const optionRows = await db
    .insert(scorecardCriterionOptions)
    .values({
      tenantId,
      criterionId: criterion.id,
      label: `Option ${name}`,
      description: `What option ${name} means.`,
      sortOrder: 0,
    })
    .returning();
  const option = optionRows[0];
  if (!option) throw new Error("seedTenant: option insert returned no row");

  const meetingRows = await db
    .insert(meetings)
    .values({
      tenantId,
      occurredAt: new Date("2026-09-01T10:00:00.000Z"),
      reportedBy: user.id,
      sourceType: "transcript",
      content: `Confidential transcript belonging to ${name}.`,
      prospectId: prospect.id,
    })
    .returning();
  const meeting = meetingRows[0];
  if (!meeting) throw new Error("seedTenant: meeting insert returned no row");

  const scorecardRows = await db
    .insert(scorecards)
    .values({
      tenantId,
      meetingId: meeting.id,
      definitionSnapshot: { id: definition.id, sections: [] },
      definitionId: definition.id,
      meetingTypeId: type.id,
      status: "ready",
    })
    .returning();
  const scorecard = scorecardRows[0];
  if (!scorecard) throw new Error("seedTenant: scorecard insert returned no row");

  await db.insert(criterionResults).values({
    tenantId,
    scorecardId: scorecard.id,
    criterionId: criterion.id,
    sectionId: section.id,
    criterionType: "classification",
    determinable: true,
    optionId: option.id,
    rationale: `An appraisal of ${name}.`,
  });
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

  it("discovery_tasks + candidates in tenant A's context never see tenant B's rows (Initiative 12)", async () => {
    if (!app) return;
    const tasks = await withTenant(app.db, tenantAId, (tx) => tx.query.discoveryTasks.findMany());
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.tenantId === tenantAId)).toBe(true);
    expect(tasks.every((t) => t.originKey === `disc:${tenantAId}`)).toBe(true);

    const cands = await withTenant(app.db, tenantAId, (tx) => tx.query.candidates.findMany());
    expect(cands.length).toBeGreaterThan(0);
    expect(cands.every((c) => c.tenantId === tenantAId)).toBe(true);
    expect(cands.every((c) => c.name === "Candidate A-person")).toBe(true);
  });

  it("an unscoped candidates query on app_user returns zero rows (Initiative 12)", async () => {
    if (!app) return;
    const rows = await app.db.query.candidates.findMany();
    expect(rows).toHaveLength(0);
  });

  it("every Scorecard table in tenant A's context never sees tenant B's rows (Initiative 31)", async () => {
    if (!app) return;
    const rows = await withTenant(app.db, tenantAId, async (tx) => ({
      meetingTypes: await tx.query.meetingTypes.findMany(),
      definitions: await tx.query.scorecardDefinitions.findMany(),
      sections: await tx.query.scorecardSections.findMany(),
      criteria: await tx.query.scorecardCriteria.findMany(),
      options: await tx.query.scorecardCriterionOptions.findMany(),
      meetings: await tx.query.meetings.findMany(),
      scorecards: await tx.query.scorecards.findMany(),
      results: await tx.query.criterionResults.findMany(),
    }));

    for (const [table, list] of Object.entries(rows)) {
      expect(list.length, `${table} should have tenant A's row`).toBeGreaterThan(0);
      expect(
        list.every((row: { tenantId: string }) => row.tenantId === tenantAId),
        `${table} leaked a row from another tenant`,
      ).toBe(true);
    }
    // The payload that matters: the transcript itself.
    expect(rows.meetings.every((m) => m.content.includes("A-person"))).toBe(true);
    expect(rows.results.every((r) => r.rationale.includes("A-person"))).toBe(true);
  });

  it("an unscoped Scorecard query on app_user returns zero rows (Initiative 31)", async () => {
    if (!app) return;
    expect(await app.db.query.meetings.findMany()).toHaveLength(0);
    expect(await app.db.query.scorecards.findMany()).toHaveLength(0);
    expect(await app.db.query.criterionResults.findMany()).toHaveLength(0);
    expect(await app.db.query.meetingTypes.findMany()).toHaveLength(0);
    expect(await app.db.query.scorecardDefinitions.findMany()).toHaveLength(0);
    expect(await app.db.query.scorecardSections.findMany()).toHaveLength(0);
    expect(await app.db.query.scorecardCriteria.findMany()).toHaveLength(0);
    expect(await app.db.query.scorecardCriterionOptions.findMany()).toHaveLength(0);
  });

  it("reading tenant B's meeting content from tenant A's context returns nothing (Initiative 31)", async () => {
    if (!app || !owner) return;
    const bRows = await owner.db
      .select({ id: meetings.id })
      .from(meetings)
      .where(eq(meetings.tenantId, tenantBId));
    const bId = bRows[0]?.id;
    expect(bId).toBeDefined();
    const seen = await withTenant(app.db, tenantAId, (tx) =>
      tx.select().from(meetings).where(eq(meetings.id, bId as string)),
    );
    expect(seen).toHaveLength(0);
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

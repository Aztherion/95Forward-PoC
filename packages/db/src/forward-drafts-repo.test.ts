import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { fixedClock } from "@95forward/shared";
import { seed } from "./seed";
import { DEMO_TODAY } from "./demo-clock";
import { connectAppTestDb, connectTestDb, type TestDb } from "./test-support";
import { withTenant } from "./tenancy";
import type { Database } from "./client";
import { forwardOpportunities, opportunityDrafts, opportunityEvents } from "./schema/forward";
import { naturalPartners } from "./schema/prospects";
import { users } from "./schema/users";
import { visits } from "./schema/execution";
import {
  clearDrafts,
  completeDraft,
  getDraft,
  listDrafts,
  saveDraftEdit,
  saveGeneratedDraft,
} from "./forward-drafts-repo";

let handle: TestDb | null = null;
let app: TestDb | null = null;
let db: Database;
let tenantId: string;

const clock = fixedClock(DEMO_TODAY);
let ACTOR: { userId: string; name: string };

beforeAll(async () => {
  handle = await connectTestDb();
  app = await connectAppTestDb();
  if (!handle) return;
  db = handle.db;
  ({ tenantId } = await seed(db));
  // A real seeded user: actor_user_id is a uuid FK, and the log is only evidence if it names a
  // person who exists.
  const [dana] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.tenantId, tenantId))
    .limit(1);
  if (!dana) throw new Error("no seeded user");
  ACTOR = { userId: dana.id, name: dana.name ?? "Dana Reese" };
}, 120_000);

afterAll(async () => {
  if (handle) await handle.pool.end();
  if (app) await app.pool.end();
});

const maybe = (name: string, fn: () => Promise<void>, timeout?: number) =>
  it(
    name,
    async () => {
      if (!handle) return;
      await fn();
    },
    timeout,
  );

/** Every opportunity a test wrote to, restored after each one. */
const touched = new Set<string>();

afterEach(async () => {
  if (!handle) return;
  for (const id of touched) {
    await clearDrafts(db, tenantId, id);
    // The anchor, not `now()`: every write here stamps DEMO_TODAY, which is in the PAST relative
    // to wall clock, so a "recent" filter would match nothing. See AGENTS.md.
    await db
      .delete(opportunityEvents)
      .where(
        and(eq(opportunityEvents.opportunityId, id), eq(opportunityEvents.occurredAt, DEMO_TODAY)),
      );
  }
  touched.clear();
});

async function anyOpportunity(): Promise<string> {
  const [row] = await db
    .select({ id: forwardOpportunities.id })
    .from(forwardOpportunities)
    .where(
      and(eq(forwardOpportunities.tenantId, tenantId), eq(forwardOpportunities.status, "open")),
    )
    .limit(1);
  if (!row) throw new Error("no open opportunity in the seed");
  touched.add(row.id);
  return row.id;
}

async function generate(
  opportunityId: string,
  kind: string,
  text = "Dear Ellen,\n\nA first version.\n\nBest,\nDana",
) {
  return saveGeneratedDraft(db, tenantId, {
    opportunityId,
    kind,
    audience: "prospect",
    subject: "A subject line",
    generatedText: text,
    provider: "mock",
    actor: ACTOR,
    clock,
  });
}

describe("the draft log (Robb's condition: every draft recorded, edited or not)", () => {
  maybe("records the generated text, the actor, and an unedited final equal to it", async () => {
    const id = await anyOpportunity();
    const row = await generate(id, "follow-up-to-close");

    expect(row.generatedText).toBe(row.finalText);
    expect(row.edited).toBe(false);
    expect(row.editedPercent).toBe(0);
    expect(row.regeneratedCount).toBe(0);
    expect(row.actorName).toBe(ACTOR.name);
    expect(row.actorUserId).toBe(ACTOR.userId);
    expect(row.provider).toBe("mock");
    expect(row.completedAt).toBeNull();
    // Stamped with the injected clock, never `new Date()`.
    expect(row.updatedAt?.toISOString()).toBe(DEMO_TODAY.toISOString());
  });

  maybe(
    "an edit sets the flag and the measure, and never overwrites the generated text",
    async () => {
      const id = await anyOpportunity();
      const original = await generate(id, "follow-up-to-close");

      const edited = await saveDraftEdit(db, tenantId, {
        opportunityId: id,
        kind: "follow-up-to-close",
        finalText: "Dear Ellen,\n\nSomething I wrote myself entirely.\n\nBest,\nDana",
        editedPercent: 42,
        actor: ACTOR,
        clock,
      });

      // The comparison IS the record. Overwriting the generated text would destroy the only evidence
      // of how much of the letter was the model's.
      expect(edited.generatedText).toBe(original.generatedText);
      expect(edited.finalText).not.toBe(edited.generatedText);
      expect(edited.edited).toBe(true);
      expect(edited.editedPercent).toBe(42);
    },
  );

  maybe("regenerating replaces the draft and counts it, rather than appending a row", async () => {
    const id = await anyOpportunity();
    await generate(id, "follow-up-to-close", "First attempt.");
    const second = await generate(id, "follow-up-to-close", "Second attempt.");

    expect(second.regeneratedCount).toBe(1);
    expect(second.generatedText).toBe("Second attempt.");
    // And the edit flag resets — nobody has touched THIS one.
    expect(second.edited).toBe(false);

    const all = await listDrafts(db, tenantId, id);
    expect(all.filter((d) => d.kind === "follow-up-to-close")).toHaveLength(1);
  });

  maybe("a regenerate after an edit discards the edit, and says so in the count", async () => {
    const id = await anyOpportunity();
    await generate(id, "follow-up-to-close", "First attempt.");
    await saveDraftEdit(db, tenantId, {
      opportunityId: id,
      kind: "follow-up-to-close",
      finalText: "My own words.",
      editedPercent: 90,
      actor: ACTOR,
      clock,
    });
    const regenerated = await generate(id, "follow-up-to-close", "Third attempt.");

    expect(regenerated.edited).toBe(false);
    expect(regenerated.editedPercent).toBe(0);
    expect(regenerated.finalText).toBe("Third attempt.");
    expect(regenerated.regeneratedCount).toBe(1);
  });

  maybe("drafts of different kinds on one record are separate rows", async () => {
    const id = await anyOpportunity();
    await generate(id, "follow-up-to-close");
    await generate(id, "make-specific-ask");

    const all = await listDrafts(db, tenantId, id);
    expect(new Set(all.map((d) => d.kind))).toEqual(
      new Set(["follow-up-to-close", "make-specific-ask"]),
    );
  });
});

describe("completion semantics — done means something different per kind", () => {
  maybe("a sent follow-up logs contact, so the silence the rule measured resets", async () => {
    const id = await anyOpportunity();
    await generate(id, "follow-up-to-close");

    const { effect } = await completeDraft(db, tenantId, {
      opportunityId: id,
      kind: "follow-up-to-close",
      actor: ACTOR,
      clock,
    });
    expect(effect).toMatch(/silence counter/i);

    const events = await db
      .select()
      .from(opportunityEvents)
      .where(
        and(eq(opportunityEvents.opportunityId, id), eq(opportunityEvents.occurredAt, DEMO_TODAY)),
      );
    expect(events.filter((e) => e.eventType === "contact_logged")).toHaveLength(1);
    // And the draft itself is closed out.
    const draft = await getDraft(db, tenantId, id, "follow-up-to-close");
    expect(draft?.completedAt?.toISOString()).toBe(DEMO_TODAY.toISOString());
  });

  maybe("an approval REQUEST does not confirm ask_approved_by_leader", async () => {
    // The whole product is built on we-said versus they-said. A drafter that quietly confirmed the
    // milestone would let a rep approve their own ask — the same distinction, applied internally.
    const id = await anyOpportunity();
    await generate(id, "get-ask-approved");

    const before = await db.execute<{ n: number }>(sql`
      select count(*)::int as n from opportunity_milestones om
        join milestone_definitions md on md.id = om.milestone_definition_id
       where om.opportunity_id = ${id} and md.key = 'ask_approved_by_leader' and om.confirmed`);

    const { effect } = await completeDraft(db, tenantId, {
      opportunityId: id,
      kind: "get-ask-approved",
      actor: ACTOR,
      clock,
    });
    expect(effect).toMatch(/Your leader confirms/i);

    const after = await db.execute<{ n: number }>(sql`
      select count(*)::int as n from opportunity_milestones om
        join milestone_definitions md on md.id = om.milestone_definition_id
       where om.opportunity_id = ${id} and md.key = 'ask_approved_by_leader' and om.confirmed`);
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);

    // Nor does it log contact: nobody has spoken to the donor.
    const events = await db
      .select()
      .from(opportunityEvents)
      .where(
        and(eq(opportunityEvents.opportunityId, id), eq(opportunityEvents.occurredAt, DEMO_TODAY)),
      );
    expect(events.filter((e) => e.eventType === "contact_logged")).toHaveLength(0);
  });

  maybe("a connector draft is contact with the PARTNER, not with the prospect", async () => {
    const [partner] = await db
      .select({ id: naturalPartners.id, prospectId: naturalPartners.prospectId })
      .from(naturalPartners)
      .where(eq(naturalPartners.tenantId, tenantId))
      .limit(1);
    if (!partner) return;
    const [opp] = await db
      .select({ id: forwardOpportunities.id })
      .from(forwardOpportunities)
      .where(
        and(
          eq(forwardOpportunities.tenantId, tenantId),
          eq(forwardOpportunities.prospectId, partner.prospectId),
        ),
      )
      .limit(1);
    if (!opp) return;
    touched.add(opp.id);

    const before = await db
      .select({ used: naturalPartners.introUsedAt, asked: naturalPartners.askedToOpenDoorAt })
      .from(naturalPartners)
      .where(eq(naturalPartners.id, partner.id));

    await generate(opp.id, "use-introduction");
    await completeDraft(db, tenantId, {
      opportunityId: opp.id,
      kind: "use-introduction",
      actor: ACTOR,
      clock,
    });

    const after = await db
      .select({ used: naturalPartners.introUsedAt, asked: naturalPartners.askedToOpenDoorAt })
      .from(naturalPartners)
      .where(eq(naturalPartners.id, partner.id));
    expect(after[0]?.used).not.toBeNull();
    expect(after[0]?.asked).not.toBeNull();

    const events = await db
      .select()
      .from(opportunityEvents)
      .where(
        and(
          eq(opportunityEvents.opportunityId, opp.id),
          eq(opportunityEvents.occurredAt, DEMO_TODAY),
        ),
      );
    // Not `contact_logged`: logging it as prospect contact would reset a silence counter that has
    // not moved, because the donor still has not heard from anybody.
    expect(events.filter((e) => e.eventType === "contact_logged")).toHaveLength(0);
    expect(events.some((e) => e.field === "connector-contact")).toBe(true);

    await db
      .update(naturalPartners)
      .set({ introUsedAt: before[0]?.used ?? null, askedToOpenDoorAt: before[0]?.asked ?? null })
      .where(eq(naturalPartners.id, partner.id));
  });

  maybe("asking a partner to open a door does NOT mark an introduction used", async () => {
    // `ask-partner` fires precisely when nobody has offered. Marking the introduction used would
    // record something that did not happen, and would spend an offer before it was ever made.
    const [partner] = await db
      .select({ id: naturalPartners.id, prospectId: naturalPartners.prospectId })
      .from(naturalPartners)
      .where(and(eq(naturalPartners.tenantId, tenantId), sql`intro_used_at is null`))
      .limit(1);
    if (!partner) return;
    const [opp] = await db
      .select({ id: forwardOpportunities.id })
      .from(forwardOpportunities)
      .where(
        and(
          eq(forwardOpportunities.tenantId, tenantId),
          eq(forwardOpportunities.prospectId, partner.prospectId),
        ),
      )
      .limit(1);
    if (!opp) return;
    touched.add(opp.id);

    await generate(opp.id, "ask-partner");
    const { effect } = await completeDraft(db, tenantId, {
      opportunityId: opp.id,
      kind: "ask-partner",
      actor: ACTOR,
      clock,
    });
    expect(effect).toMatch(/open the door/i);

    const after = await db
      .select({ used: naturalPartners.introUsedAt, asked: naturalPartners.askedToOpenDoorAt })
      .from(naturalPartners)
      .where(eq(naturalPartners.id, partner.id));
    expect(after[0]?.used).toBeNull();
    expect(after[0]?.asked).not.toBeNull();

    await db
      .update(naturalPartners)
      .set({ askedToOpenDoorAt: null })
      .where(eq(naturalPartners.id, partner.id));
  });

  maybe("a prepped visit gains BOTH a goal and discovery questions", async () => {
    // "Prepared" is both, not either: a goal with no questions is a heading, and the rule that
    // asked for the brief would keep firing — correctly.
    const [visit] = await db
      .select({
        id: visits.id,
        prospectId: visits.prospectId,
        goal: visits.goal,
        q: visits.discoveryQuestions,
      })
      .from(visits)
      .where(and(eq(visits.tenantId, tenantId), sql`scheduled_at >= ${DEMO_TODAY}`))
      .limit(1);
    if (!visit) return;
    const [opp] = await db
      .select({ id: forwardOpportunities.id })
      .from(forwardOpportunities)
      .where(
        and(
          eq(forwardOpportunities.tenantId, tenantId),
          eq(forwardOpportunities.prospectId, visit.prospectId),
        ),
      )
      .limit(1);
    if (!opp) return;
    touched.add(opp.id);

    await generate(
      opp.id,
      "prep-the-visit",
      "WHAT WE WANT FROM THE MEETING\nA decision on timing.\n\nDISCOVERY QUESTIONS\n- When does the board sit?\n\n",
    );
    const { effect } = await completeDraft(db, tenantId, {
      opportunityId: opp.id,
      kind: "prep-the-visit",
      actor: ACTOR,
      clock,
    });
    expect(effect).toMatch(/prepped|Brief saved/i);

    const after = await db
      .select({ goal: visits.goal, q: visits.discoveryQuestions })
      .from(visits)
      .where(eq(visits.id, visit.id));
    if (effect.match(/prepped/i)) {
      expect(after[0]?.goal?.trim()).toBeTruthy();
      expect(after[0]?.q?.trim()).toBeTruthy();
    }

    await db
      .update(visits)
      .set({ goal: visit.goal, discoveryQuestions: visit.q })
      .where(eq(visits.id, visit.id));
  });

  maybe("completing a draft that does not exist fails loudly", async () => {
    const id = await anyOpportunity();
    await expect(
      completeDraft(db, tenantId, { opportunityId: id, kind: "steward-the-gift", clock }),
    ).rejects.toThrow(/no draft/i);
  });
});

describe("RLS on opportunity_drafts (enforced by Postgres, through app_user)", () => {
  const rlsIt = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      if (!handle || !app) return;
      await fn();
    });

  rlsIt("a scoped read through app_user returns the tenant's own drafts", async () => {
    const id = await anyOpportunity();
    await generate(id, "follow-up-to-close");

    const rows = await withTenant(app!.db, tenantId, (tx) =>
      tx.select().from(opportunityDrafts).where(eq(opportunityDrafts.opportunityId, id)),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.tenantId === tenantId)).toBe(true);
  });

  rlsIt("an UNSCOPED read through app_user returns zero rows", async () => {
    const id = await anyOpportunity();
    await generate(id, "follow-up-to-close");

    // No withTenant context: the policy has nothing to match, so the table is empty to this role.
    const rows = await app!.db.select().from(opportunityDrafts);
    expect(rows).toHaveLength(0);
  });

  rlsIt("a read scoped to a DIFFERENT tenant never sees these drafts", async () => {
    const id = await anyOpportunity();
    await generate(id, "follow-up-to-close");

    const other = "00000000-0000-0000-0000-0000000000ff";
    const rows = await withTenant(app!.db, other, (tx) => tx.select().from(opportunityDrafts));
    expect(rows).toHaveLength(0);
  });

  rlsIt("an update from another tenant's context affects zero rows", async () => {
    const id = await anyOpportunity();
    await generate(id, "follow-up-to-close");

    const other = "00000000-0000-0000-0000-0000000000ff";
    const affected = await withTenant(app!.db, other, (tx) =>
      tx
        .update(opportunityDrafts)
        .set({ finalText: "HACKED" })
        .where(eq(opportunityDrafts.opportunityId, id))
        .returning(),
    );
    expect(affected).toHaveLength(0);

    const check = await getDraft(db, tenantId, id, "follow-up-to-close");
    expect(check?.finalText).not.toBe("HACKED");
  });

  rlsIt("the table really has RLS on, with the tenant_isolation policy", async () => {
    // drizzle-kit generate does not emit RLS — the policy is appended to the migration by hand, so
    // this asserts the hand-written half actually landed.
    const result = await db.execute<{ enabled: boolean; policies: number }>(sql`
      select c.relrowsecurity as enabled,
             (select count(*)::int from pg_policies p
               where p.tablename = 'opportunity_drafts' and p.policyname = 'tenant_isolation')
               as policies
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'opportunity_drafts'`);
    expect(result.rows[0]?.enabled).toBe(true);
    expect(result.rows[0]?.policies).toBe(1);
  });
});

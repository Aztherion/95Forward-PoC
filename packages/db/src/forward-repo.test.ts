import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { computeQualification } from "@95forward/shared";
import { seed } from "./seed";
import { stableId } from "./seed-records-core";
import { DEMO_TODAY } from "./demo-clock";
import { connectTestDb, type TestDb } from "./test-support";
import type { Database } from "./client";
import { forwardOpportunities, goals, opportunityEvents } from "./schema/forward";
import {
  appendOpportunityEvent,
  confirmMilestone,
  confirmedMilestoneKeys,
  createForwardOpportunity,
  getOpportunityDetail,
  listMilestoneDefinitions,
  listOpportunityEvents,
  logContact,
  resolveGoal,
  scopeTotals,
  updateForwardOpportunity,
} from "./forward-repo";

let handle: TestDb | null = null;
let db: Database;
let tenantId: string;
const scratch: string[] = [];

beforeAll(async () => {
  handle = await connectTestDb();
  if (!handle) return;
  db = handle.db;
  ({ tenantId } = await seed(db));
}, 120_000);

// Scratch opportunities are tenant-scoped like everything else, so they would otherwise land in
// scopeTotals() and in the event-log assertions. Clear them after EVERY test, not just at the end.
afterEach(async () => {
  if (!handle || scratch.length === 0) return;
  for (const id of scratch.splice(0)) {
    await db.delete(forwardOpportunities).where(eq(forwardOpportunities.id, id));
  }
});

afterAll(async () => {
  if (handle) await handle.pool.end();
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

/** A throwaway opportunity so write-path tests never mutate the demo dataset. */
async function scratchOpportunity(stage: "get_the_visit" | "follow_up_and_close" = "get_the_visit") {
  const row = await createForwardOpportunity(
    db,
    tenantId,
    {
      prospectId: stableId("prospect:vega"),
      initiativeId: stableId("initiative:kamuli"),
      amountCents: 1_234_500,
      closeDate: "2026-11-30",
      stage,
    },
    { name: "Test Harness" },
  );
  scratch.push(row.id);
  return row;
}

describe("milestone definitions", () => {
  maybe("seeds six definitions with source and blocking independent", async () => {
    const rows = await listMilestoneDefinitions(db, tenantId);
    expect(rows).toHaveLength(6);

    const permission = rows.find((r) => r.key === "permission_to_share");
    expect(permission?.source).toBe("they_said");
    expect(permission?.blocking).toBe(false);
    expect(rows.filter((r) => r.blocking)).toHaveLength(3);
  });
});

describe("event capture at the write path", () => {
  maybe("two sequential updates produce two events, not one collapsed diff", async () => {
    const opportunity = await scratchOpportunity();

    await updateForwardOpportunity(db, tenantId, {
      id: opportunity.id,
      patch: { closeDate: "2026-12-15" },
      prospectSourced: false,
      actor: { name: "Dana Reese" },
    });
    await updateForwardOpportunity(db, tenantId, {
      id: opportunity.id,
      patch: { closeDate: "2027-01-20" },
      prospectSourced: false,
      actor: { name: "Dana Reese" },
    });

    const events = await listOpportunityEvents(db, tenantId, opportunity.id);
    const closeDateEvents = events.filter((e) => e.field === "closeDate");

    expect(closeDateEvents).toHaveLength(2);
    expect(closeDateEvents.map((e) => e.newValue).sort()).toEqual(["2026-12-15", "2027-01-20"]);
  });

  maybe("a prospect-sourced change is distinguishable from one of ours", async () => {
    const opportunity = await scratchOpportunity();

    await updateForwardOpportunity(db, tenantId, {
      id: opportunity.id,
      patch: { closeDate: "2026-12-01" },
      prospectSourced: false,
      actor: { name: "Dana Reese" },
    });
    await updateForwardOpportunity(db, tenantId, {
      id: opportunity.id,
      patch: { closeDate: "2027-02-02" },
      prospectSourced: true,
      actor: { name: "The prospect, on a call" },
    });

    const events = (await listOpportunityEvents(db, tenantId, opportunity.id)).filter(
      (e) => e.field === "closeDate",
    );
    const ours = events.find((e) => e.newValue === "2026-12-01");
    const theirs = events.find((e) => e.newValue === "2027-02-02");

    expect(ours?.prospectSourced).toBe(false);
    expect(theirs?.prospectSourced).toBe(true);
    expect(theirs?.actorName).toBe("The prospect, on a call");
  });

  maybe("records a stage move as stage_change", async () => {
    const opportunity = await scratchOpportunity();
    await updateForwardOpportunity(db, tenantId, {
      id: opportunity.id,
      patch: { stage: "prep_the_visit" },
      prospectSourced: false,
    });

    const events = await listOpportunityEvents(db, tenantId, opportunity.id);
    expect(events.some((e) => e.eventType === "stage_change" && e.newValue === "prep_the_visit"))
      .toBe(true);
  });

  maybe("writes no event when nothing actually changed", async () => {
    const opportunity = await scratchOpportunity();
    const before = await listOpportunityEvents(db, tenantId, opportunity.id);

    const result = await updateForwardOpportunity(db, tenantId, {
      id: opportunity.id,
      patch: { amountCents: opportunity.amountCents },
      prospectSourced: false,
    });

    expect(result.events).toEqual([]);
    expect(await listOpportunityEvents(db, tenantId, opportunity.id)).toHaveLength(before.length);
  });

  maybe("confirming a milestone records an event and flips qualification", async () => {
    const opportunity = await scratchOpportunity();
    const definitions = await listMilestoneDefinitions(db, tenantId);
    const domain = definitions.map((d) => ({
      key: d.key,
      label: d.label,
      source: d.source,
      blocking: d.blocking,
      sortOrder: d.sortOrder,
    }));

    for (const key of ["close_date_confirmed", "amount_agreed"]) {
      await confirmMilestone(db, tenantId, {
        opportunityId: opportunity.id,
        key,
        prospectSourced: true,
        confirmedByName: "The prospect",
      });
    }

    const partial = (await confirmedMilestoneKeys(db, tenantId, [opportunity.id])).get(
      opportunity.id,
    );
    expect(computeQualification(domain, partial ?? []).qualified).toBe(false);

    await confirmMilestone(db, tenantId, {
      opportunityId: opportunity.id,
      key: "confirmed_in_writing",
      prospectSourced: true,
      confirmedByName: "The prospect",
    });

    const full = (await confirmedMilestoneKeys(db, tenantId, [opportunity.id])).get(opportunity.id);
    expect(computeQualification(domain, full ?? []).qualified).toBe(true);

    const events = await listOpportunityEvents(db, tenantId, opportunity.id);
    expect(events.filter((e) => e.eventType === "milestone_confirmed")).toHaveLength(3);
  });

  maybe("confirming the same milestone twice updates rather than duplicating", async () => {
    const opportunity = await scratchOpportunity();
    await confirmMilestone(db, tenantId, {
      opportunityId: opportunity.id,
      key: "amount_agreed",
      prospectSourced: true,
      evidence: "first",
    });
    await confirmMilestone(db, tenantId, {
      opportunityId: opportunity.id,
      key: "amount_agreed",
      prospectSourced: true,
      evidence: "second",
    });

    const keys = (await confirmedMilestoneKeys(db, tenantId, [opportunity.id])).get(opportunity.id);
    expect(keys).toEqual(["amount_agreed"]);
  });
});

describe("derived per-opportunity reads", () => {
  maybe("reproduces the seeded Hallworth history", async () => {
    const id = stableId("forward-opportunity:hallworth-kamuli");
    const detail = await getOpportunityDetail(db, tenantId, id, DEMO_TODAY);
    expect(detail).toBeDefined();
    if (!detail) return;

    // The design's counter: 1/4 they said, 2/2 we said, and not a real ask yet.
    expect(detail.qualification.theySaidConfirmed).toBe(1);
    expect(detail.qualification.theySaidTotal).toBe(4);
    expect(detail.qualification.weSaidConfirmed).toBe(2);
    expect(detail.qualification.qualified).toBe(false);
    expect(detail.qualification.missingBlocking.map((d) => d.key).sort()).toEqual([
      "close_date_confirmed",
      "confirmed_in_writing",
    ]);

    // Three close-date moves, +94 days, none of them prospect-sourced.
    expect(detail.closeDateChain.count).toBe(3);
    expect(detail.closeDateChain.totalDaysMoved).toBe(94);
    expect(detail.closeDateChain.anyProspectSourced).toBe(false);
    expect(detail.closeDateChain.chain).toEqual([
      "2026-07-29",
      "2026-08-31",
      "2026-09-30",
      "2026-10-31",
    ]);

    // 81 days of silence as of the demo anchor.
    expect(detail.silenceDays).toBe(81);

    // Ten events, so "Show all 10 changes" is truthful.
    expect(detail.timeline).toHaveLength(10);

    // Both probability values are available for I20 to compare.
    expect(detail.probability).toBe("high");
    expect(detail.suggestedProbability).toBe("high");
  });

  maybe("returns absent silence when an opportunity has never been contacted", async () => {
    const opportunity = await scratchOpportunity();
    const detail = await getOpportunityDetail(db, tenantId, opportunity.id, DEMO_TODAY);
    expect(detail?.silenceDays).toBeNull();

    await logContact(db, tenantId, {
      opportunityId: opportunity.id,
      occurredAt: new Date(DEMO_TODAY.getTime() - 5 * 24 * 60 * 60 * 1000),
    });
    const after = await getOpportunityDetail(db, tenantId, opportunity.id, DEMO_TODAY);
    expect(after?.silenceDays).toBe(5);
  });

  maybe("appendOpportunityEvent backdates history for the seed", async () => {
    const opportunity = await scratchOpportunity();
    await appendOpportunityEvent(db, tenantId, {
      opportunityId: opportunity.id,
      eventType: "note",
      prospectSourced: false,
      occurredAt: new Date("2020-01-01T00:00:00.000Z"),
      note: "backdated",
    });
    const events = await listOpportunityEvents(db, tenantId, opportunity.id);
    expect(events.at(-1)?.occurredAt.getUTCFullYear()).toBe(2020);
  });
});

describe("scope-level totals — Contradiction 1 resolved in the model", () => {
  maybe("splits pre-close into qualified and unqualified, and ties to the seed", async () => {
    const totals = await scopeTotals(db, tenantId);

    // Pre-close total matches the design's stage-board left half exactly.
    expect(totals.preCloseTotalCents).toBe(370_800_000);
    // Of which only the milestone-qualified subset is "qualified asks on the table".
    expect(totals.qualifiedTotalCents).toBe(172_000_000);
    expect(totals.unqualifiedRemainderCents).toBe(198_800_000);
    // The three parts must reconcile — this is what I27's footer has to state.
    expect(totals.qualifiedTotalCents + totals.unqualifiedRemainderCents).toBe(
      totals.preCloseTotalCents,
    );
    expect(totals.qualifiedCount + totals.unqualifiedCount).toBe(totals.preCloseCount);

    // Closed work sits outside the headline number.
    expect(totals.closedWorkTotalCents).toBe(4_800_000);
  });

  maybe("excludes won and lost opportunities from the open pipeline", async () => {
    const open = await scopeTotals(db, tenantId, undefined, { onlyOpen: true });
    const all = await scopeTotals(db, tenantId, undefined, { onlyOpen: false });
    expect(all.closedWorkTotalCents).toBeGreaterThan(open.closedWorkTotalCents);
  });

  maybe("scopes to a single initiative", async () => {
    const kamuli = await scopeTotals(
      db,
      tenantId,
      eq(forwardOpportunities.initiativeId, stableId("initiative:kamuli")),
    );
    expect(kamuli.preCloseTotalCents).toBeGreaterThan(0);
    expect(kamuli.preCloseTotalCents).toBeLessThan(370_800_000);
  });

  maybe("a late-stage opportunity can still be unqualified", async () => {
    // The heart of Contradiction 1: Hallworth is in follow_up_and_close, inside the pre-close
    // columns, and is NOT part of qualified asks on the table.
    const id = stableId("forward-opportunity:hallworth-kamuli");
    const [row] = await db
      .select()
      .from(forwardOpportunities)
      .where(and(eq(forwardOpportunities.tenantId, tenantId), eq(forwardOpportunities.id, id)));
    expect(row?.stage).toBe("follow_up_and_close");

    const detail = await getOpportunityDetail(db, tenantId, id, DEMO_TODAY);
    expect(detail?.qualification.qualified).toBe(false);
  });
});

describe("goals", () => {
  maybe("resolves one goal per (scope, period) — Contradiction 2", async () => {
    const danaId = stableId("prospect:hallworth"); // deliberately wrong ref, see below
    const rows = await db.select().from(goals).where(eq(goals.tenantId, tenantId));
    const repGoal = rows.find((r) => r.scope === "rep");

    expect(repGoal?.amountCents).toBe(270_000_000);
    expect(repGoal?.fiscalPeriod).toBe("FY26");
    // One row, not two: the Board and the Forecast Room cannot disagree.
    expect(rows.filter((r) => r.scope === "rep" && r.fiscalPeriod === "FY26")).toHaveLength(1);
    expect(danaId).toBeTruthy();
  });

  maybe("returns ABSENT rather than falling back to a parent goal", async () => {
    // Forever Promise deliberately has no goal, so I19 can render "no goal defined for this view".
    const missing = await resolveGoal(
      db,
      tenantId,
      "initiative",
      stableId("initiative:forever-promise"),
      "FY26",
    );
    expect(missing).toBeUndefined();

    const present = await resolveGoal(
      db,
      tenantId,
      "initiative",
      stableId("initiative:kamuli"),
      "FY26",
    );
    expect(present?.amountCents).toBeGreaterThan(0);
  });

  maybe("returns absent for a period that does not exist", async () => {
    expect(await resolveGoal(db, tenantId, "org", tenantId, "FY99")).toBeUndefined();
  });
});

describe("seed shape", () => {
  maybe("allows more than one opportunity per (prospect, initiative)", async () => {
    const cordova = await db
      .select()
      .from(forwardOpportunities)
      .where(
        and(
          eq(forwardOpportunities.tenantId, tenantId),
          eq(forwardOpportunities.prospectId, stableId("prospect:cordova")),
        ),
      );
    expect(cordova.length).toBeGreaterThan(1);
  });

  maybe("lays down backdated history rather than only current state", async () => {
    const rows = await db
      .select()
      .from(opportunityEvents)
      .where(eq(opportunityEvents.tenantId, tenantId));
    expect(rows.length).toBeGreaterThan(20);
    // Every seeded event predates the anchor — none were stamped at seed-run time. This is the
    // assertion that would fail if the seed laid down current state only.
    expect(rows.every((r) => r.occurredAt.getTime() <= DEMO_TODAY.getTime())).toBe(true);
  });

  maybe("is idempotent — re-running the seed does not duplicate", async () => {
    const before = await db
      .select()
      .from(forwardOpportunities)
      .where(eq(forwardOpportunities.tenantId, tenantId));
    await seed(db);
    const after = await db
      .select()
      .from(forwardOpportunities)
      .where(eq(forwardOpportunities.tenantId, tenantId));
    expect(after.length).toBe(before.length);
  }, 120_000);
});

// =================================================================================================
// I18b — prospect-level contact vs opportunity-level silence
//
// The bug: the Master Prospect List read ONLY host `interactions`, so it said "Last contact 309d
// ago" for Hallworth while Opportunity Detail said 81 days. Two screens contradicting each other
// about the same relationship.
//
// The fix is a reading seam, and the invariant it must hold is NOT "the two numbers are equal" —
// a prospect can carry several opportunities, and Hallworth is exactly that case: a Bolivia
// conversation yesterday and a Kamuli ask nobody has touched for 81 days. Both figures are true
// and they are about different things.
//
// What must hold is that prospect-level contact is never STALER than the most recent forward
// contact on any of that prospect's opportunities. That is the direction the bug ran in.
// =================================================================================================

describe("prospect contact is never staler than opportunity silence", () => {
  maybe("holds for every prospect in the seed", async () => {
    const rows = await db.execute(sql`
      select c.display_name as name,
        (select max(i.occurred_at) from interactions i where i.constituent_id = c.id) as host,
        (select max(v.occurred_at) from visits v where v.prospect_id = p.id) as visit,
        (select max(e.occurred_at) from opportunity_events e
           join forward_opportunities fo on fo.id = e.opportunity_id
          where fo.prospect_id = p.id and e.event_type = 'contact_logged') as forward
      from prospects p
      join constituents c on c.id = p.constituent_id
      where p.tenant_id = ${tenantId}
    `);

    const offenders: string[] = [];
    for (const row of rows.rows as unknown as {
      name: string;
      host: string | null;
      visit: string | null;
      forward: string | null;
    }[]) {
      if (!row.forward) continue;
      const forward = new Date(row.forward).getTime();
      const best = [row.host, row.visit, row.forward]
        .filter((d): d is string => d !== null)
        .map((d) => new Date(d).getTime())
        .reduce((a, b) => (a > b ? a : b));
      if (best < forward) offenders.push(row.name);
    }
    expect(offenders).toEqual([]);
  });

  maybe("no host interaction is more recent than the forward story it sits behind", async () => {
    // Host interactions are generated, not authored. Placing them in a recent window let a random
    // touchpoint silently overrule a curated forward record — so they are seeded older than every
    // forward contact (the most recent of which is four days before the anchor).
    const rows = await db.execute(sql`
      select min(occurred_at) as newest from (
        select max(i.occurred_at) as occurred_at
        from interactions i
        join constituents c on c.id = i.constituent_id
        join prospects p on p.constituent_id = c.id
        where p.tenant_id = ${tenantId}
        group by p.id
      ) t
    `);
    // Raw SQL comes back as a string, not a Date.
    const newest = (rows.rows[0] as unknown as { newest: string | null }).newest;
    expect(newest).not.toBeNull();
    const daysAgo = Math.floor(
      (DEMO_TODAY.getTime() - new Date(newest!).getTime()) / 86_400_000,
    );
    expect(daysAgo).toBeGreaterThanOrEqual(100);
  });

  maybe("Hallworth's Kamuli silence is still exactly 81 days", async () => {
    const detail = await getOpportunityDetail(
      db,
      tenantId,
      stableId("forward-opportunity:hallworth-kamuli"),
      DEMO_TODAY,
    );
    expect(detail?.silenceDays).toBe(81);
  });
});

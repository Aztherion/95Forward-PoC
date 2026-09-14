import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";

// I28 — drafted actions.
//
// The moment the queue stops being a list and becomes a coach. Two things are asserted that a
// screenshot cannot show: that every draft and every edit is logged — Robb's one hard technical
// condition — and that "done" does the right thing per kind, because that is what closes the loop
// the rule opened.

interface PgClient {
  connect(): Promise<void>;
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}
type PgClientCtor = new (config: { connectionString: string }) => PgClient;

const requireFromDb = createRequire(require.resolve("@95forward/db"));
const { Client } = requireFromDb("pg") as { Client: PgClientCtor };
const DB_URL = process.env.DATABASE_URL ?? "postgres://forward:forward@localhost:5432/forward";

async function withDb<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const ANCHOR = "2026-09-12T12:00:00Z";

async function openDetail(page: Page, id: string): Promise<void> {
  await page.goto(`/95-forward/opportunities/${id}`);
  await expect(page.locator('[data-testid="opportunity-detail"]')).toBeVisible();
}

async function generate(page: Page): Promise<void> {
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.locator('[data-testid="draft-generate"]').click(),
  ]);
  await expect(page.locator('[data-testid="draft-body"]')).toBeVisible();
}

// Every record this spec drives, so the restore can put all of them back without knowing which test
// failed. Ids rather than lookups: each is pinned to a seeded record whose next action is the kind
// under test, and a name lookup would not tell you that.
const IRIS = "eee951d9-814f-59b7-985f-cd4978be2233"; // use-introduction
const CLARA = "246531f4-702e-586e-bfbd-7f3531801658"; // ask-partner
const VISIT = "84ea4289-197c-51a6-b5d0-d44dcb2a69f5"; // prep-the-visit
const APPROVAL = "de230b11-bea4-5c01-bdb8-b0ab5361cc52"; // get-ask-approved
const FOLLOW_UP = "6fb270ee-e0bf-5766-809e-418b72ad1a7f"; // follow-up-to-close — Hallworth
const TOUCHED = [IRIS, CLARA, VISIT, APPROVAL, FOLLOW_UP];

test.describe.serial("Drafted actions", () => {
  const hallworth = FOLLOW_UP;
  let seededVisits: Record<string, unknown>[] = [];

  // Restore BEFORE as well as after. A cleanup that only runs at the end cannot run at all when the
  // test it is cleaning up behind has failed — and these tests are self-poisoning if it doesn't:
  // marking an introduction used stops the rule that produced the introduction action, so the retry
  // opens a different drafter than the one the test names. Idempotent, DB-only, all records every
  // time, so no single failure can skip the rest (AGENTS.md).
  async function restore(): Promise<void> {
    await withDb(async (client) => {
      for (const id of TOUCHED) {
        await client.query(`delete from opportunity_drafts where opportunity_id = $1`, [id]);
        // At the demo ANCHOR, not wall clock: every write here uses the injected fixed clock, so
        // these events land at 2026-09-12 — in the past relative to `now()`.
        await client.query(
          `delete from opportunity_events
            where opportunity_id = $1 and occurred_at = timestamptz '${ANCHOR}'`,
          [id],
        );
        await client.query(
          `update natural_partners set intro_used_at = null, asked_to_open_door_at = null
            where prospect_id = (select prospect_id from forward_opportunities where id = $1)`,
          [id],
        );
      }
      // Visits are restored to their SEEDED values, not blanked: they key on prospect_id, so
      // wiping them would take out rows this spec never touched and quietly damage the seed for
      // every other spec sharing the database.
      for (const v of seededVisits) {
        await client.query(`update visits set goal = $2, discovery_questions = $3 where id = $1`, [
          v.id,
          v.goal,
          v.discovery_questions ?? null,
        ]);
      }
    });
  }

  // Snapshot before anything runs, so the restore has something true to put back.
  test.beforeAll(async () => {
    seededVisits = await withDb(async (client) => {
      const { rows } = await client.query(
        `select v.id, v.goal, v.discovery_questions from visits v
          where v.prospect_id in (
            select prospect_id from forward_opportunities where id = any($1::uuid[]))`,
        [TOUCHED],
      );
      return rows;
    });
  });

  test.beforeEach(restore);
  test.afterEach(restore);

  test("drafts on demand, grounded in the record, and says it will not send", async ({ page }) => {
    await openDetail(page, hallworth);
    await generate(page);

    const body = await page.locator('[data-testid="draft-body"]').inputValue();
    // Grounded: the amount is the record's, to the character, and the contact is the person who
    // actually spoke to us rather than an invented one.
    expect(body).toContain("$250,000 over three years");
    expect(body).toContain("Ellen Hallworth");
    expect(body).toContain("Dana Reese");
    expect(body.match(/\$[\d,]+/g) ?? []).toEqual(expect.arrayContaining(["$250,000"]));
    for (const figure of body.match(/\$[\d,]+/g) ?? []) expect(figure).toBe("$250,000");

    // The PoC sends nothing, and says so rather than rendering a Send button that lies.
    await expect(page.locator('[data-testid="draft-no-send"]')).toContainText(
      "does not send email",
    );
    await expect(page.getByRole("button", { name: /^Send$/ })).toHaveCount(0);
  });

  test("logs the generated text, the final text, and whether a human changed it", async ({
    page,
  }) => {
    // Robb's condition. Not an audit chore — the evidence that a person worked WITH the AI.
    await openDetail(page, hallworth);
    await generate(page);

    const fresh = await withDb(async (client) => {
      const { rows } = await client.query(
        `select generated_text, final_text, edited, edited_percent, regenerated_count, actor_name,
                provider
           from opportunity_drafts where opportunity_id = $1`,
        [hallworth],
      );
      return rows[0]!;
    });
    expect(fresh.generated_text).toBe(fresh.final_text);
    expect(fresh.edited).toBe(false);
    expect(fresh.edited_percent).toBe(0);
    expect(fresh.regenerated_count).toBe(0);
    expect(String(fresh.actor_name)).toContain("Dana");
    // No model call in any test run.
    expect(fresh.provider).toBe("mock");

    const body = page.locator('[data-testid="draft-body"]');
    await body.fill(`${await body.inputValue()}\n\nP.S. I will call Thursday either way.`);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="draft-save"]').click(),
    ]);
    await expect(page.locator('[data-testid="draft-provenance"]')).toContainText("EDITED BY YOU");

    const edited = await withDb(async (client) => {
      const { rows } = await client.query(
        `select generated_text, final_text, edited, edited_percent from opportunity_drafts
          where opportunity_id = $1`,
        [hallworth],
      );
      return rows[0]!;
    });
    // The generated text survives the edit — the comparison is the point.
    expect(edited.generated_text).toBe(fresh.generated_text);
    expect(edited.final_text).not.toBe(edited.generated_text);
    expect(edited.edited).toBe(true);
    expect(Number(edited.edited_percent)).toBeGreaterThan(0);
  });

  test("the timeline tells edited from unedited", async ({ page }) => {
    await openDetail(page, hallworth);
    await generate(page);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="draft-done"]').click(),
    ]);
    await expect(page.locator('[data-testid="timeline"]')).toContainText("unedited");

    // And again, edited this time.
    await withDb(async (client) => {
      await client.query(`delete from opportunity_drafts where opportunity_id = $1`, [hallworth]);
    });
    await openDetail(page, hallworth);
    await generate(page);
    const body = page.locator('[data-testid="draft-body"]');
    await body.fill("A wholly different letter, written by the officer from scratch.");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="draft-save"]').click(),
    ]);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="draft-done"]').click(),
    ]);
    await expect(page.locator('[data-testid="timeline"]')).toContainText(/edited by .*Dana/);
    await expect(page.locator('[data-testid="timeline"]')).toContainText("% changed");
  });

  test("regenerating produces a new draft and counts it", async ({ page }) => {
    await openDetail(page, hallworth);
    await generate(page);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="draft-regenerate"]').click(),
    ]);
    await expect(page.locator('[data-testid="draft-provenance"]')).toContainText("DRAFTED 2×");

    const count = await withDb(async (client) => {
      const { rows } = await client.query(
        `select regenerated_count from opportunity_drafts where opportunity_id = $1`,
        [hallworth],
      );
      return Number(rows[0]?.regenerated_count);
    });
    expect(count).toBe(1);
  });

  test("marking a follow-up done resets the silence the rule measured", async ({ page }) => {
    // The loop closing: the rule fired on silence, the draft answers it, and done makes the record
    // agree. Without this the rep would be coached about something they have already acted on.
    await openDetail(page, hallworth);
    await expect(page.locator('[data-testid="silence"]')).toContainText("81 days");

    await generate(page);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="draft-done"]').click(),
    ]);
    await expect(page.locator('[data-testid="draft-effect"]')).toContainText("silence counter");
    await expect(page.locator('[data-testid="silence"]')).toContainText("0 days");

    const logged = await withDb(async (client) => {
      const { rows } = await client.query(
        `select count(*)::int as n from opportunity_events
          where opportunity_id = $1 and event_type = 'contact_logged'
            and occurred_at = timestamptz '${ANCHOR}'`,
        [hallworth],
      );
      return Number(rows[0]?.n);
    });
    expect(logged).toBe(1);
  });

  test("an approval request records the request and does NOT confirm the milestone", async ({
    page,
  }) => {
    // Requesting approval is not receiving it. Confirming `ask_approved_by_leader` here would let a
    // rep approve their own ask — the we-said/they-said distinction, applied internally.
    const sterling = APPROVAL;
    await openDetail(page, sterling);
    await expect(page.locator('[data-testid="draft-panel"]')).toContainText("approval request");

    const before = await withDb(async (client) => {
      const { rows } = await client.query(
        `select count(*)::int as n from opportunity_milestones om
           join milestone_definitions md on md.id = om.milestone_definition_id
          where om.opportunity_id = $1 and md.key = 'ask_approved_by_leader' and om.confirmed`,
        [sterling],
      );
      return Number(rows[0]?.n);
    });

    await generate(page);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="draft-done"]').click(),
    ]);
    await expect(page.locator('[data-testid="draft-effect"]')).toContainText(
      "Your leader confirms",
    );

    const after = await withDb(async (client) => {
      const { rows } = await client.query(
        `select count(*)::int as n from opportunity_milestones om
           join milestone_definitions md on md.id = om.milestone_definition_id
          where om.opportunity_id = $1 and md.key = 'ask_approved_by_leader' and om.confirmed`,
        [sterling],
      );
      return Number(rows[0]?.n);
    });
    expect(after).toBe(before);
  });

  // The two connector kinds are the highest-consequence drafters in the set: they are not prospect
  // emails, they ask a person to open a door. Getting the recipient wrong produces a letter
  // addressed to the wrong human in front of an audience. Both are asserted, by kind.
  const CONNECTORS = [
    {
      kind: "use-introduction",
      // Iris Abernathy — her daughter Maya offered the introduction and it has not been used.
      opportunity: "eee951d9-814f-59b7-985f-cd4978be2233",
      connector: "Maya Abernathy",
      prospect: "Iris Abernathy",
      effect: /Introduction marked used/i,
    },
    {
      kind: "ask-partner",
      // Clara Holloway — Greta Ortega has never been asked to open this door.
      opportunity: "246531f4-702e-586e-bfbd-7f3531801658",
      connector: "Greta Ortega",
      prospect: "Clara Holloway",
      effect: /asked to open the door/i,
    },
  ] as const;

  for (const c of CONNECTORS) {
    test(`${c.kind} writes to ${c.connector}, not to ${c.prospect}`, async ({ page }) => {
      await openDetail(page, c.opportunity);
      // By kind, not by prose: this record's next action must actually be the connector one, or the
      // test is asserting about a different drafter than it names.
      await expect(page.locator('[data-testid="draft-panel"]')).toHaveAttribute(
        "data-kind",
        c.kind,
      );
      await generate(page);

      const body = await page.locator('[data-testid="draft-body"]').inputValue();
      const salutation = body.split("\n").find((line) => /^(Hi|Dear)\b/.test(line.trim())) ?? "";
      expect(salutation).toContain(c.connector.split(" ")[0]!);
      // And emphatically NOT addressed to the prospect.
      expect(salutation).not.toContain(c.prospect.split(" ")[0]!);
      // The prospect is still the subject of the letter — it is about them, just not to them.
      expect(body).toContain(c.prospect);

      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST"),
        page.locator('[data-testid="draft-done"]').click(),
      ]);
      await expect(page.locator('[data-testid="draft-effect"]')).toContainText(c.effect);

      const partner = await withDb(async (client) => {
        const { rows } = await client.query(
          `select np.intro_used_at, np.asked_to_open_door_at from natural_partners np
             join forward_opportunities fo on fo.prospect_id = np.prospect_id
            where fo.id = $1 limit 1`,
          [c.opportunity],
        );
        return rows[0]!;
      });
      // Asking is recorded for both. Marking an introduction USED is only true of the kind that
      // had one offered — see the note in completeDraft.
      expect(partner.asked_to_open_door_at).not.toBeNull();
      if (c.kind === "use-introduction") {
        expect(partner.intro_used_at).not.toBeNull();
      } else {
        expect(partner.intro_used_at).toBeNull();
      }

      // A connector letter is NOT prospect contact. Logging it as such would reset a silence
      // counter that has not moved — the prospect has still not heard from anyone.
      const contacts = await withDb(async (client) => {
        const { rows } = await client.query(
          `select count(*)::int as n from opportunity_events
            where opportunity_id = $1 and event_type = 'contact_logged'
              and occurred_at = timestamptz '${ANCHOR}'`,
          [c.opportunity],
        );
        return Number(rows[0]?.n);
      });
      expect(contacts).toBe(0);
    });
  }

  test("a prepped visit stops the rule that asked for it", async ({ page }) => {
    // Completion has to close the loop the rule opened, or the board keeps coaching the rep about
    // something they have already done.
    await openDetail(page, VISIT);
    await expect(page.locator('[data-testid="draft-panel"]')).toHaveAttribute(
      "data-kind",
      "prep-the-visit",
    );
    await generate(page);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="draft-done"]').click(),
    ]);

    const visit = await withDb(async (client) => {
      const { rows } = await client.query(
        `select goal, discovery_questions from visits
          where prospect_id = (select prospect_id from forward_opportunities where id = $1)
            and goal is not null
          order by scheduled_at asc limit 1`,
        [VISIT],
      );
      return rows[0];
    });
    // "Prepared" is both, not either: a goal with no questions is a heading.
    expect(visit?.goal).toBeTruthy();
    expect(String(visit?.discovery_questions ?? "").trim().length).toBeGreaterThan(0);

    // The rule that fired no longer does.
    await page.goto("/95-forward/board");
    const card = page.locator(`[data-opportunity-id="${VISIT}"]`);
    if (await card.count()) {
      await expect(card).not.toContainText("visit-within-7d-unprepped");
    }
  });

  test("a failed draft keeps the panel open with a retry", async ({ page }) => {
    // Failure must not close the panel. A rep who pressed "draft it" and got an empty card back has
    // lost the thread, and it is indistinguishable from the hang this codebase has shipped once
    // already — so the error and the retry go where their eyes already are.
    await openDetail(page, hallworth);

    // A genuine server-side failure, not an aborted request: the action really runs, really fails
    // to find the record, and really returns its error state. Aborting the fetch would test
    // Playwright's routing, not the panel.
    await page
      .locator('[data-testid="draft-panel"] input[name="opportunityId"]')
      .first()
      .evaluate((el) => {
        (el as HTMLInputElement).value = "00000000-0000-0000-0000-000000000000";
      });

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="draft-generate"]').click(),
    ]);

    const error = page.locator('[data-testid="draft-error"]');
    await expect(error).toBeVisible();
    await expect(page.locator('[data-testid="draft-panel"]')).toBeVisible();

    // And the way out is one click, with the right record restored.
    const retry = page.locator('[data-testid="draft-retry"]');
    await expect(retry).toBeVisible();
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      retry.click(),
    ]);
    await expect(page.locator('[data-testid="draft-body"]')).toBeVisible();
    await expect(error).toHaveCount(0);
  });
});

test.describe("The Board opens the same panel", () => {
  test("the primary action drafts in place, and no longer promises I28", async ({ page }) => {
    await page.goto("/95-forward/board");
    const card = page.locator('[data-testid="queue-card"]').first();
    await card.locator('[data-testid="primary-action"]').click();

    const panel = card.locator('[data-testid="draft-panel"]');
    await expect(panel).toBeVisible();
    // I25's honest placeholder is gone, because the thing it promised exists.
    await expect(panel).not.toContainText("Drafting arrives in I28");
    await expect(panel.locator('[data-testid="draft-generate"]')).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      panel.locator('[data-testid="draft-generate"]').click(),
    ]);
    await expect(panel.locator('[data-testid="draft-body"]')).toBeVisible();

    const opportunityId = await card.getAttribute("data-opportunity-id");
    await withDb(async (client) => {
      await client.query(`delete from opportunity_drafts where opportunity_id = $1`, [
        opportunityId!,
      ]);
      await client.query(
        `delete from opportunity_events where opportunity_id = $1
          and occurred_at = timestamptz '${ANCHOR}'`,
        [opportunityId!],
      );
    });
  });
});

import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";

// I26 — Opportunity Detail.
//
// The Board argues this is not a CRM. This screen argues the methodology is real: a $250,000 ask a
// rep entered, approved and recorded is worth nothing until the prospect confirmed a date and put
// it in writing. These tests hold the parts of that argument a test can hold — and one of them,
// the confirmation chain, is the product's central claim end to end.

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

const HALLWORTH = "The Hallworth Family Foundation";

async function opportunityIdFor(name: string): Promise<string> {
  return withDb(async (client) => {
    const { rows } = await client.query(
      `select fo.id from forward_opportunities fo
         join prospects p on p.id = fo.prospect_id
         join constituents c on c.id = p.constituent_id
        where c.display_name = $1 limit 1`,
      [name],
    );
    const id = rows[0]?.id;
    if (typeof id !== "string") throw new Error(`no forward opportunity for ${name}`);
    return id;
  });
}

async function openDetail(page: Page, id: string): Promise<void> {
  await page.goto(`/95-forward/opportunities/${id}`);
  await expect(page.locator('[data-testid="opportunity-detail"]')).toBeVisible();
}

/**
 * Record one milestone.
 *
 * The form is opened, then WAITED FOR, before anything is typed: a confirmation revalidates the
 * page, and a click that lands mid-re-render is swallowed. Then the H3 pattern on the submit.
 */
async function recordMilestone(
  page: Page,
  key: string,
  who: string,
  evidence?: string,
): Promise<void> {
  const row = page.locator(`[data-key="${key}"]`);
  await row.locator('[data-testid="milestone-toggle"]').click();
  const form = row.locator('[data-testid="milestone-form"]');
  await expect(form).toBeVisible();
  await form.getByLabel("Who said it").fill(who);
  if (evidence) await form.getByLabel("Evidence").fill(evidence);
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    form.getByRole("button", { name: "Record it" }).click(),
  ]);
}

test.describe("Opportunity Detail — the verdict", () => {
  test("opens with a judgement, not with fields", async ({ page }) => {
    await openDetail(page, await opportunityIdFor(HALLWORTH));

    await expect(page.locator('[data-testid="verdict-headline"]')).toHaveText("Not a real ask yet");
    // The counter and qualification count DIFFERENT things: they-said milestones versus blocking
    // ones. `permission_to_share` is they-said and non-blocking.
    await expect(page.locator('[data-testid="counter"]')).toHaveText("1/4 they said · 2/2 we said");
    await expect(page.locator('[data-testid="verdict-row"]')).toContainText(
      "Missing: close date confirmed by the prospect and confirmed in writing",
    );
    await expect(page.locator('[data-testid="milestone-footer"]')).toHaveText(
      "2 unconfirmed milestones hold $250,000 out of the numbers your leader reads on Monday.",
    );
  });

  test("connects the record to the portfolio numbers", async ({ page }) => {
    await openDetail(page, await opportunityIdFor(HALLWORTH));
    const counts = page.locator('[data-testid="counts-as"]');
    await expect(counts).toContainText("Qualified asks on the table");
    await expect(counts.locator(".f95-countsas__row").first()).toContainText("not counted");
    await expect(counts).toContainText("In Worst");
    await expect(page.locator('[data-testid="verdict-row"]')).toContainText(
      "Until the prospect confirms a date, this amount is a claim, not an ask.",
    );
  });

  test("carries the they-said / we-said asymmetry structurally, not only in words", async ({
    page,
  }) => {
    await openDetail(page, await opportunityIdFor(HALLWORTH));
    // Solid rule above, dashed rule below. Read the page in greyscale and the argument survives.
    const styles = await page.evaluate(() => {
      const read = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const s = getComputedStyle(el);
        return { style: s.borderLeftStyle, width: s.borderLeftWidth };
      };
      return {
        they: read(".f95-msblock__section--they"),
        we: read(".f95-msblock__section--we"),
      };
    });
    expect(styles.they?.style).toBe("solid");
    expect(styles.we?.style).toBe("dashed");

    // And the badges: filled disc against hollow ring.
    const they = page.locator('[data-key="amount_agreed"] .f95-msbadge__glyph circle');
    const we = page.locator('[data-key="specific_ask_made"] .f95-msbadge__glyph circle');
    await expect(they).toHaveAttribute("fill", "currentColor");
    await expect(we).toHaveAttribute("fill", "none");
  });

  test("each milestone carries its own verb, from the definition", async ({ page }) => {
    // I26 rendered a generic "Record their answer" on all six, because the definitions carried no
    // action label. The specific verbs are part of what makes the checklist read as a scoreboard
    // rather than a form, and they are data, so an org that reworded one sees its own word.
    await openDetail(page, await opportunityIdFor(HALLWORTH));
    await expect(page.locator('[data-key="close_date_confirmed"]')).toContainText(
      "Record their date",
    );
    await expect(page.locator('[data-key="permission_to_share"]')).toContainText("Ask at close");
    await expect(page.locator('[data-key="confirmed_in_writing"]')).toContainText(
      "Attach the letter",
    );
  });

  test("says something specific about each unconfirmed milestone", async ({ page }) => {
    await openDetail(page, await opportunityIdFor(HALLWORTH));
    // "Not confirmed" is true of every unconfirmed milestone and therefore says nothing.
    await expect(page.locator('[data-key="close_date_confirmed"]')).toContainText(
      "All 3 close dates were set by us",
    );
    await expect(page.locator('[data-key="confirmed_in_writing"]')).toContainText(
      "81 days since the verbal yes",
    );
    await expect(page.locator('[data-key="permission_to_share"]')).toContainText(
      "Not blocking the gift",
    );
  });

  test("shows the slippage chain, the silence and the attributed timeline", async ({ page }) => {
    await openDetail(page, await opportunityIdFor(HALLWORTH));

    const slip = page.locator('[data-testid="slippage"]');
    await expect(slip).toContainText("Close date moved 3 times · +94 days");
    await expect(slip).toContainText("ALL THREE MOVES WERE MADE BY US");
    await expect(slip).toContainText("A date we invent is not a date.");

    const silence = page.locator('[data-testid="silence"]');
    await expect(silence).toContainText("81 days");
    // The cadence is the org's doctrine, per stage — not a literal.
    await expect(page.locator('[data-testid="cadence"]')).toContainText(
      "CADENCE FOR THIS STAGE · EVERY 14 DAYS",
    );

    // The payoff for prospectSourced: every row says whether the prospect was involved.
    const timeline = page.locator('[data-testid="timeline"]');
    await expect(timeline).toContainText("no prospect input");
    await expect(timeline).toContainText("from the prospect");
    await expect(timeline).toContainText("Close date moved");
  });

  test("keeps the queue position, and invents none when the record is not in the queue", async ({
    page,
  }) => {
    await openDetail(page, await opportunityIdFor(HALLWORTH));
    await expect(page.locator('[data-testid="queue-position"]')).toContainText(/#\d+ of \d+/);
  });

  test("falls back to a stage-derived action when no rule fires", async ({ page }) => {
    // A record firing nothing still has a next action: the stage IS a statement about what happens
    // next. An empty NEXT ACTION panel would undercut the verdict above it.
    const id = await withDb(async (client) => {
      const { rows } = await client.query(
        `select fo.id from forward_opportunities fo
          where fo.status = 'open' and fo.stage = 'get_the_visit'
            and not exists (
              select 1 from opportunity_milestones om
               where om.opportunity_id = fo.id and om.confirmed = true)
          limit 1`,
      );
      return rows[0]?.id as string | undefined;
    });
    test.skip(!id, "the seed has no untouched get-the-visit record");
    await openDetail(page, id!);
    const next = page.locator('[data-testid="verdict-row"]').locator("..").first();
    await expect(next).toContainText("Get the visit");
  });
});

test.describe.serial("Opportunity Detail — recording reality", () => {
  let hallworth = "";

  test.beforeAll(async () => {
    hallworth = await opportunityIdFor(HALLWORTH);
  });

  test.afterEach(async () => {
    // Through the database and unconditionally (H3): a browser-driven cleanup only works if the
    // page is healthy, which is what it is not after the test it cleans up behind has failed.
    await withDb(async (client) => {
      await client.query(
        `delete from opportunity_milestones om
          using milestone_definitions md
          where om.milestone_definition_id = md.id
            and om.opportunity_id = $1
            and md.key in ('close_date_confirmed', 'confirmed_in_writing', 'permission_to_share')`,
        [hallworth],
      );
      await client.query(
        `delete from opportunity_events
          where opportunity_id = $1
            and occurred_at > now() - interval '1 hour'`,
        [hallworth],
      );
      await client.query(
        `update forward_opportunities set close_date = '2026-10-31' where id = $1`,
        [hallworth],
      );
    });
  });

  test("confirming a blocking milestone flips qualification and moves the headline metric", async ({
    page,
  }) => {
    // THE central claim, end to end: one confirmation → qualification recomputes → the headline
    // metric moves → the board re-ranks. Everything else on this screen is an argument for it.
    await page.goto("/95-forward/board");
    const before = await page
      .locator('[data-testid="board-metrics"] .f95-metric__value')
      .first()
      .textContent();

    await openDetail(page, hallworth);
    await expect(page.locator('[data-testid="verdict-headline"]')).toHaveText("Not a real ask yet");

    await recordMilestone(
      page,
      "close_date_confirmed",
      "Ellen Hallworth, by phone",
      "She named 30 November on the call.",
    );

    // Qualification is DERIVED. Nothing wrote a status; the milestone set changed and the verdict
    // followed.
    await expect(page.locator('[data-testid="verdict-headline"]')).toHaveText("Not a real ask yet");
    await expect(page.locator('[data-testid="counter"]')).toHaveText("2/4 they said · 2/2 we said");

    // The event log records who, when, and that the prospect was the source.
    const event = await withDb(async (client) => {
      const { rows } = await client.query(
        `select actor_name, prospect_sourced, field, note from opportunity_events
          where opportunity_id = $1 and event_type = 'milestone_confirmed'
            and field = 'close_date_confirmed'
          order by occurred_at desc limit 1`,
        [hallworth],
      );
      return rows[0];
    });
    expect(event?.prospect_sourced).toBe(true);
    expect(String(event?.actor_name ?? "")).toContain("Dana");
    expect(String(event?.note ?? "")).toContain("30 November");

    // Now the second blocking milestone, which is the one that flips it.
    await recordMilestone(
      page,
      "confirmed_in_writing",
      "Ellen Hallworth",
      "Signed letter received.",
    );

    await expect(page.locator('[data-testid="verdict-headline"]')).toHaveText("This is a real ask");
    await expect(page.locator('[data-testid="milestone-footer"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="counts-as"]')).toContainText("$250,000");

    // And the headline metric on The Board has moved, because the same service computes both.
    await page.goto("/95-forward/board");
    const after = await page
      .locator('[data-testid="board-metrics"] .f95-metric__value')
      .first()
      .textContent();
    expect(after).not.toBe(before);
  });

  test("the two denominators differ — a non-blocking milestone moves one and not the other", async ({
    page,
  }) => {
    await openDetail(page, hallworth);
    await expect(page.locator('[data-testid="counter"]')).toHaveText("1/4 they said · 2/2 we said");

    await recordMilestone(page, "permission_to_share", "Ellen Hallworth");

    // They-said moves. Qualification does not: permission_to_share is they-said and NON-blocking.
    await expect(page.locator('[data-testid="counter"]')).toHaveText("2/4 they said · 2/2 we said");
    await expect(page.locator('[data-testid="verdict-headline"]')).toHaveText("Not a real ask yet");
  });

  test("moving the close date asks who chose it, and records the answer", async ({ page }) => {
    await openDetail(page, hallworth);

    // Unchecked: we picked the date. This is what "all three moves made by us" is a read over, and
    // if the UI never asked, that attribution could only ever be true of seeded data.
    await page.locator('[data-testid="slippage"] [data-testid="move-close-date"]').click();
    const form = page.locator('[data-testid="move-close-date-form"]');
    await expect(form.getByLabel("The prospect gave us this date")).not.toBeChecked();
    await form.getByLabel("New close date").fill("2026-11-30");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      form.getByRole("button", { name: "Move it" }).click(),
    ]);

    await expect(page.locator('[data-testid="slippage"]')).toContainText("moved 4 times");
    await expect(page.locator('[data-testid="timeline"]').first()).toContainText(
      "no prospect input",
    );

    const event = await withDb(async (client) => {
      const { rows } = await client.query(
        `select prospect_sourced, old_value, new_value from opportunity_events
          where opportunity_id = $1 and field = 'closeDate'
          order by occurred_at desc limit 1`,
        [hallworth],
      );
      return rows[0];
    });
    expect(event?.prospect_sourced).toBe(false);
    expect(String(event?.new_value)).toContain("2026-11-30");
  });

  test("a date the prospect gave us is recorded as theirs", async ({ page }) => {
    await openDetail(page, hallworth);
    await page.locator('[data-testid="slippage"] [data-testid="move-close-date"]').click();
    const form = page.locator('[data-testid="move-close-date-form"]');
    await form.getByLabel("New close date").fill("2026-12-15");
    await form.getByLabel("The prospect gave us this date").check();
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      form.getByRole("button", { name: "Move it" }).click(),
    ]);

    await expect(page.locator('[data-testid="timeline"]').first()).toContainText(
      "from the prospect",
    );
    await expect(page.locator('[data-testid="slippage"]')).not.toContainText("MADE BY US");
  });

  test("logging a contact resets the silence the rule reads", async ({ page }) => {
    await openDetail(page, hallworth);
    await expect(page.locator('[data-testid="silence"]')).toContainText("81 days");

    await page.locator('[data-testid="log-what-happened"]').click();
    const form = page.locator('[data-testid="log-form"]');
    await form.getByLabel("What happened").fill("Called Ellen — she is checking with the board.");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      form.getByRole("button", { name: "Log it" }).click(),
    ]);

    await expect(page.locator('[data-testid="silence"]')).toContainText("0 days");
    await expect(page.locator('[data-testid="timeline"]')).toContainText("she is checking");
  });
});

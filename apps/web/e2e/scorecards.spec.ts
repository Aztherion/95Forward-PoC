import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";

// I32 — the Scorecards screen. Composition over I31's services, so these specs check the two
// things composition can still get wrong: whether the screen shows what the service returned
// (visibility), and whether the add flow actually reaches a scored Scorecard.

interface PgClient {
  connect(): Promise<void>;
  query(text: string, values: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}
type PgClientCtor = new (config: { connectionString: string }) => PgClient;

const requireFromDb = createRequire(require.resolve("@95forward/db"));
const { Client } = requireFromDb("pg") as { Client: PgClientCtor };
const DB_URL = process.env.DATABASE_URL ?? "postgres://forward:forward@localhost:5432/forward";

const RUTH_EMAIL = "ruth.castellanos@waterforpeople.org";
const SCORECARDS = "/95-forward/scorecards";

/** Marks the rows this spec creates, so teardown can find them without guessing. */
const MARKER = "i32-spec-marker";

async function withDb<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Remove anything this spec added, THROUGH THE DATABASE and unconditionally (H3).
 *
 * A browser-driven cleanup only works if the page is healthy, which is exactly what it is not
 * after the test it is cleaning up behind has failed. Scorecards and criterion results cascade
 * from the meeting, so deleting the meeting is the whole job.
 */
async function removeSpecMeetings(): Promise<void> {
  await withDb(async (client) => {
    await client.query("delete from meetings where content like $1", [`%${MARKER}%`]);
  });
}

test.describe("Scorecards — the list", () => {
  test("a rep sees their own Scorecards and not a peer's", async ({ page }) => {
    await page.goto(SCORECARDS);
    await expect(page.locator('[data-testid="scorecards-list"]')).toBeVisible();

    const rows = page.locator('[data-testid="scorecard-row"]');
    await expect(rows.first()).toBeVisible();

    // Dana's own seeded meetings are here…
    await expect(page.locator('[data-subject="Marisol Vega"]')).toBeVisible();
    await expect(page.locator('[data-subject="Clara Holloway"]')).toBeVisible();
    // …and Priya's are not. This is I31's visibility predicate doing its job, rendered.
    await expect(page.locator('[data-subject="Eli Ridgeway"]')).toHaveCount(0);
    await expect(page.locator('[data-subject="The Osgood Foundation"]')).toHaveCount(0);

    // A rep does not need their own name on every row, so there is no rep column and no filter.
    await expect(page.locator('[data-testid="filter-rep"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="row-rep"]')).toHaveCount(0);
  });

  test("the score band and the no-score case read differently", async ({ page }) => {
    await page.goto(SCORECARDS);
    await expect(page.locator('[data-testid="scorecards-list"]')).toBeVisible();

    const strong = page.locator('[data-subject="Marisol Vega"] [data-testid="row-score"]');
    await expect(strong).toHaveText("97%");
    await expect(strong).toHaveClass(/f95-sc-score--strong/);

    const weak = page.locator('[data-subject="Clara Holloway"] [data-testid="row-score"]');
    await expect(weak).toHaveText("25%");
    await expect(weak).toHaveClass(/f95-sc-score--weak/);

    // Nothing determinable is an em dash in muted ink, NOT a zero and not red — and it carries
    // the reason as a tooltip rather than leaving the reader to guess.
    const none = page.locator('[data-subject="Blue Mesa Industries"] [data-testid="row-score"]');
    await expect(none).toHaveText("—");
    await expect(none).toHaveClass(/f95-sc-score--none/);
    await expect(none).toHaveAttribute("title", "Not enough in the source to score.");
    // That one fell back, and the row says so.
    await expect(
      page.locator('[data-subject="Blue Mesa Industries"] [data-testid="row-fallback"]'),
    ).toBeVisible();
  });

  test("a manager sees both reps' Scorecards and can open the transcript behind one", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const res = await context.request.post("/api/test-login", { data: { email: RUTH_EMAIL } });
      expect(res.ok()).toBeTruthy();
      const page = await context.newPage();

      await page.goto(SCORECARDS);
      await expect(page.locator('[data-testid="scorecards-list"]')).toBeVisible();

      // Both reps' meetings, which is the whole point of the manager view.
      await expect(page.locator('[data-subject="Marisol Vega"]')).toBeVisible();
      await expect(page.locator('[data-subject="Eli Ridgeway"]')).toBeVisible();
      // And the rep column exists for her, because now it carries information.
      await expect(page.locator('[data-testid="filter-rep"]')).toBeVisible();
      await expect(page.locator('[data-testid="row-rep"]').first()).toBeVisible();

      // The raw source, which is what she opens to check a judgement.
      //
      // Wait for the NAVIGATION, not just for the element. This is a Next <Link>, so the click
      // starts a client-side route change whose RSC payload the server renders on demand; under
      // two workers on one dev server that round trip can exceed the 5s default on toBeVisible,
      // and the spec then fails on timing rather than on behaviour. waitForURL carries the test
      // timeout instead. (The H3 waitForResponse pattern is the same idea for server actions.)
      await page.locator('[data-subject="Eli Ridgeway"]').click();
      await page.waitForURL(/\/95-forward\/scorecards\/[0-9a-f-]{36}/);
      await expect(page.locator('[data-testid="scorecard-detail"]')).toBeVisible();
      await expect(page.locator(".f95-page__title")).toContainText(
        "Priya Nair's meeting with Eli Ridgeway",
      );
      await page.locator('[data-testid="source-toggle"]').click();
      await expect(page.locator('[data-testid="source-content"]')).toContainText("Otter.ai");
    } finally {
      await context.close();
    }
  });

  test("a Scorecard the viewer cannot see is not found, not forbidden", async ({ page }) => {
    const id = await withDb(async (client) => {
      const { rows } = await client.query(
        `select s.id from scorecards s
           join meetings m on m.id = s.meeting_id
           join users u on u.id = m.reported_by
          where u.email = $1 and s.is_current limit 1`,
        ["priya.nair@waterforpeople.org"],
      );
      return rows[0]?.id as string | undefined;
    });
    expect(id).toBeDefined();

    const response = await page.goto(`${SCORECARDS}/${id!}`);
    // I31 returns null for "not yours" and for "not there" alike; the screen renders the app's
    // own not-found rather than confirming a peer's Scorecard exists.
    expect(response?.status()).toBe(404);
  });
});

test.describe("Scorecards — adding one", () => {
  // Scoped to THIS describe, not the file. `fullyParallel` runs these tests concurrently, so a
  // file-wide afterEach deletes the marked meeting out from under the test still using it — which
  // is exactly what it did: green alone, red in the file.
  test.afterEach(async () => {
    await removeSpecMeetings();
  });

  test("pasting a transcript reaches a scored Scorecard", async ({ page }) => {
    await page.goto(SCORECARDS);
    await expect(page.locator('[data-testid="scorecards-list"]')).toBeVisible();

    await page.locator('[data-testid="add-scorecard"]').click();
    await expect(page.locator('[data-testid="add-scorecard-dialog"]')).toBeVisible();

    await page.locator('[data-testid="target-search"]').fill("Vega");
    await page.locator('[data-testid="target-option"]').first().click();
    await expect(page.locator('[data-testid="target-selected"]')).toBeVisible();

    await page.locator('[data-testid="meeting-content"]').fill(
      [
        `Otter.ai transcript (${MARKER})`,
        "Dana Reese: Why are you involved with water, Marisol?",
        "Marisol Vega: My grandmother ran a clinic and the water was the thing she talked about.",
        "Dana Reese: Which of our priorities holds your attention?",
        "Marisol Vega: The lasting part — I have funded things that stopped working.",
        "Dana Reese: Could you see yourself helping to fund that?",
        "Marisol Vega: Potentially, yes. Send me the monitoring data.",
        "Dana Reese: Thursday the fifteenth, then, with your daughter?",
        "Marisol Vega: Thursday works.",
      ].join("\n"),
    );

    // The action runs the whole report path and redirects to the new Scorecard, so the wait is
    // for the navigation rather than for the form to clear.
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="add-scorecard-submit"]').click(),
    ]);

    const detail = page.locator('[data-testid="scorecard-detail"]');
    await expect(detail).toBeVisible();
    // It arrives in flight, with the progression showing rather than a blank page.
    await expect(page.locator('[data-testid="scorecard-processing"]')).toBeVisible();

    // Drain the queue synchronously — the gated test seam (I11), the same one jobs.spec uses.
    const drained = await page.request.post("/api/test-drain-jobs");
    expect(drained.ok()).toBeTruthy();

    await page.reload();
    await expect(detail).toHaveAttribute("data-status", "ready");
    await expect(page.locator('[data-testid="overall-score"]')).toBeVisible();
    // Every criterion came back with a reason, which is the product's actual claim.
    const criteria = page.locator('[data-testid="criterion"]');
    expect(await criteria.count()).toBeGreaterThan(0);
    await expect(page.locator('[data-testid="verdict"]').first()).toBeVisible();
  });
});

test.describe("Scorecards — definitions", () => {
  test("saving an incomplete criterion surfaces the service's error on the field", async ({
    page,
  }) => {
    await page.goto(`${SCORECARDS}?view=definitions`);
    await expect(page.locator('[data-testid="definitions-view"]')).toBeVisible();

    await page
      .locator('[data-testid="definition-row"]', { hasText: "Discovery Visit" })
      .locator('[data-testid="edit-definition"]')
      .click();
    await expect(page.locator('[data-testid="definition-editor"]')).toBeVisible();

    // A criterion with no prompt is the rule I31's validator owns. The screen must surface that
    // refusal rather than inventing its own check — and must not save.
    await page.locator('[data-testid="add-criterion"]').first().click();
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="save-definition"]').click(),
    ]);

    await expect(page.locator('[data-testid="definition-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="definition-editor"]')).toBeVisible();
    await expect(page.locator(".f95-field__err").first()).toContainText(/prompt|criterion/i);
  });

  test("the editor says that saving does not move an existing Scorecard", async ({ page }) => {
    await page.goto(`${SCORECARDS}?view=definitions`);
    await page
      .locator('[data-testid="definition-row"]')
      .first()
      .locator('[data-testid="edit-definition"]')
      .click();
    await expect(page.locator('[data-testid="definition-editor"]')).toContainText(
      "Existing Scorecards keep the definition they were scored with",
    );
  });
});

test.describe("Scorecards — meeting types", () => {
  test("lists the types with their fallback marker and usage", async ({ page }) => {
    await page.goto(`${SCORECARDS}?view=meeting-types`);
    await expect(page.locator('[data-testid="meeting-types-view"]')).toBeVisible();
    const rows = page.locator('[data-testid="meeting-type-row"]');
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "Discovery Visit" })).toContainText("fallback");
    await expect(rows.first()).toContainText("Scorecard");
  });

  test("the description field says what the system does with it", async ({ page }) => {
    await page.goto(`${SCORECARDS}?view=meeting-types`);
    await page
      .locator('[data-testid="meeting-type-row"]')
      .first()
      .locator('[data-testid="edit-meeting-type"]')
      .click();
    await expect(page.locator('[data-testid="meeting-type-dialog"]')).toContainText(
      "The system reads this to decide which meetings are this type",
    );
  });
});

/** The nav entry exists and lands on the screen — the first demo moment starts here. */
test("Scorecards is reachable from the 95 Forward nav", async ({ page }: { page: Page }) => {
  await page.goto("/95-forward/board");
  await page.getByRole("link", { name: "Scorecards", exact: true }).click();
  await expect(page.locator('[data-testid="scorecards"]')).toBeVisible();
});

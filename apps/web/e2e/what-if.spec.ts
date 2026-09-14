import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";

// I31 — the what-if sandbox.
//
// The central claim is a negative one: a full editing session inside this mode leaves the
// database byte-identical. Everything else here supports that — the mode being unmistakable, the
// absence of leakage into other surfaces, a reload clearing the lot — because a sandbox that
// writes nothing is only useful if nobody can mistake it for one that does.

interface PgClient {
  connect(): Promise<void>;
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}
type PgClientCtor = new (config: { connectionString: string }) => PgClient;

const requireFromDb = createRequire(require.resolve("@95forward/db"));
const { Client } = requireFromDb("pg") as { Client: PgClientCtor };
const DB_URL = process.env.DATABASE_URL ?? "postgres://forward:forward@localhost:5432/forward";
const GRID = "/95-forward/opportunities";

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
 * Records other specs pin. The guarantee test stays off them.
 *
 * Not because a what-if could touch them — it writes nothing, which is the point — but because
 * this test's evidence is a before/after comparison, and `opportunity-detail.spec.ts` and
 * `invariants.spec.ts` legitimately write to their own records in parallel. Fingerprinting the
 * whole database would make their correct writes look like this sandbox's incorrect ones.
 */
const RESERVED = [
  "6fb270ee-e0bf-5766-809e-418b72ad1a7f", // Hallworth — opportunity-detail
  "de230b11-bea4-5c01-bdb8-b0ab5361cc52", // Sterling — drafts
  "eee951d9-814f-59b7-985f-cd4978be2233", // Iris — drafts
  "246531f4-702e-586e-bfbd-7f3531801658", // Clara — drafts
  "84ea4289-197c-51a6-b5d0-d44dcb2a69f5", // the prep-the-visit record — drafts
];

/**
 * Everything a write could possibly disturb, for a named set of records, as one comparable string.
 *
 * `updated_at` is in it deliberately: a no-op UPDATE that changed nothing but the timestamp would
 * still be a write, and this catches it. So is the event count and every event field, because the
 * failure this guards against is a hypothesis quietly becoming a record on the timeline.
 */
async function fingerprint(ids: readonly string[]): Promise<string> {
  return withDb(async (client) => {
    const { rows } = await client.query(
      `select
        (select coalesce(md5(string_agg(t::text, '|' order by t.id)), 'none') from (
            select id, amount_cents, amount_note, close_date, date_confidence, stage,
                   probability, visit_rating, initiative_id, owner_user_id, status, updated_at
              from forward_opportunities where id = any($1::uuid[])) t) as opportunities,
        (select count(*) from opportunity_events where opportunity_id = any($1::uuid[])) as events,
        (select coalesce(md5(string_agg(e::text, '|' order by e.id)), 'none') from (
            select id, opportunity_id, event_type, field, old_value, new_value, prospect_sourced,
                   occurred_at
              from opportunity_events where opportunity_id = any($1::uuid[])) e) as event_rows,
        (select coalesce(md5(string_agg(m::text, '|' order by m.id)), 'none') from (
            select id, opportunity_id, milestone_definition_id, confirmed, confirmed_at,
                   confirmed_by_user_id, confirmed_by_name, evidence, document_url
              from opportunity_milestones where opportunity_id = any($1::uuid[])) m) as milestones`,
      [ids],
    );
    const row = rows[0]!;
    return `${row.opportunities}::${row.events}::${row.event_rows}::${row.milestones}`;
  });
}

async function enterWhatIf(page: Page): Promise<void> {
  await page.goto(GRID);
  await expect(page.locator('[data-testid="opportunity-grid"]')).toBeVisible();
  await page.locator('[data-testid="whatif-enter"]').click();
  await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
  await expect(page.locator('[data-testid="whatif-panel"]')).toBeVisible();
  await settled(page);
}

/**
 * Wait for the panel to have computed something.
 *
 * The what-if figures come from a server round trip — snapshot load, metrics, a 10,000-trial
 * simulation — and under a full-suite run another worker's write moves the data version, so every
 * recompute is a cache miss on a loaded dev server. Playwright's 5-second default is not enough
 * for that, and a test that asserts on the panel without waiting fails on timing rather than on
 * behaviour. The same class H3 fixed for server actions, on the read side.
 */
async function settled(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="whatif-metric"]').first()).toBeVisible({
    timeout: 30000,
  });
}

async function firstRowId(page: Page): Promise<string> {
  const id = await page
    .locator('[data-testid="grid-row"]')
    .first()
    .getAttribute("data-opportunity-id");
  if (!id) throw new Error("no rows");
  return id;
}

async function editCell(page: Page, id: string, column: string, value: string): Promise<void> {
  const cell = page
    .locator(`[data-opportunity-id="${id}"]`)
    .first()
    .locator(`[data-testid="cell-${column}"]`);
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await cell.press("Enter");
  const input = cell.locator("input");
  await input.waitFor();
  await input.fill(value);
  await input.press("Enter");
}

async function pickOption(page: Page, id: string, column: string): Promise<void> {
  const cell = page
    .locator(`[data-opportunity-id="${id}"]`)
    .first()
    .locator(`[data-testid="cell-${column}"]`);
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await cell.press("Enter");
  const select = cell.locator("select");
  await select.waitFor();
  const current = await select.inputValue();
  const options = await select
    .locator("option")
    .evaluateAll((n) => n.map((o) => (o as HTMLOptionElement).value));
  const next = options.find((o) => o !== current && o !== "");
  if (next) await select.selectOption(next);
}

// ---------------------------------------------------------------------------------------------

test.describe("the guarantee: nothing is written", () => {
  test("a full editing session leaves the database byte-identical", async ({ page }) => {
    // The initiative's central promise, tested directly rather than inferred. Every kind of
    // hypothetical change, then a hash of every column any of them could have touched.
    await enterWhatIf(page);
    const all = await page
      .locator('[data-testid="grid-row"]')
      .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-opportunity-id") ?? ""));
    const ids = all.filter((id) => id && !RESERVED.includes(id)).slice(0, 4);
    expect(ids.length, "not enough unreserved records to drive the session").toBeGreaterThanOrEqual(
      3,
    );

    const before = await fingerprint(ids);

    // Field edits of several kinds.
    await editCell(page, ids[0]!, "amount", "777000");
    await pickOption(page, ids[0]!, "stage");
    await pickOption(page, ids[1]!, "probability");
    await editCell(page, ids[1]!, "closeDate", "2027-03-31");
    await pickOption(page, ids[2]!, "dateConfidence");

    // Milestone toggles — the highest-value what-if, and equally hypothetical.
    const dots = page
      .locator(`[data-opportunity-id="${ids[0]}"]`)
      .first()
      .locator("[data-testid^='milestone-toggle-']");
    await dots.first().click();
    await dots.nth(1).click();

    // And a preset on top, which touches every open record including these.
    await page.locator('[data-testid="whatif-preset-slip-a-quarter"]').click();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("pending");
    await page.waitForTimeout(2500);

    expect(await fingerprint(ids), "the sandbox wrote to the database").toBe(before);
  });

  test("the close-date question does not even appear — there is nothing to attribute", async ({
    page,
  }) => {
    // In normal mode a close-date edit must ask who chose it, because the answer is recorded.
    // A hypothesis records nothing, so asking would be theatre.
    await enterWhatIf(page);
    const id = await firstRowId(page);
    const cell = page
      .locator(`[data-opportunity-id="${id}"]`)
      .first()
      .locator('[data-testid="cell-closeDate"]');
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await cell.press("Enter");
    await cell.locator("input").fill("2027-02-01");
    await cell.locator("input").press("Enter");
    await expect(page.locator('[data-testid="grid-prospect-sourced"]')).toHaveCount(0);
    await expect(cell.locator(".f95-grid__value")).toContainText("Feb 1, 2027");
  });
});

test.describe("the mode is unmistakable", () => {
  test("a banner that cannot scroll away, a count, and a way out", async ({ page }) => {
    await enterWhatIf(page);
    const banner = page.locator('[data-testid="whatif-banner"]');
    await expect(banner).toContainText("What if");
    await expect(banner).toContainText("These numbers are not real");
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("No changes yet");
    await expect(page.locator('[data-testid="whatif-exit"]')).toBeVisible();

    // Sticky: still on screen after scrolling the page.
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(250);
    const box = await banner.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(page.viewportSize()!.height);
  });

  test("the whole surface carries the mode, not just the header", async ({ page }) => {
    // A screenshot taken mid-session must be self-evidently a what-if even with the banner
    // cropped off.
    await enterWhatIf(page);
    await expect(page.locator(".f95-whatif-on")).toHaveCount(1);
    const outline = await page
      .locator(".f95-whatif-on")
      .evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe("dashed");
    // And the chart itself is stamped, so a cropped plot still reads as hypothetical.
    await expect(page.locator(".f95-wipanel__stamp")).toContainText("NOT REAL");
  });

  test("every changed cell is marked, with the baseline beside it", async ({ page }) => {
    await enterWhatIf(page);
    const id = await firstRowId(page);
    const cell = page
      .locator(`[data-opportunity-id="${id}"]`)
      .first()
      .locator('[data-testid="cell-amount"]');
    const was = (await cell.locator(".f95-grid__value").innerText()).trim();

    await editCell(page, id, "amount", "777000");
    await expect(cell).toHaveClass(/is-whatif/);
    await expect(cell.locator('[data-testid="cell-baseline"]')).toHaveText(was);
    await expect(cell.locator(".f95-grid__value")).toContainText("$777,000");
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("1 change pending");
  });

  test("the metric panel always shows baseline beside hypothesis", async ({ page }) => {
    // Two numbers read as a comparison; one reads as a state, and a state is what this is not.
    await enterWhatIf(page);
    await page.locator('[data-testid="whatif-preset-lose-the-largest"]').click();
    await settled(page);
    const first = page.locator('[data-testid="whatif-metric"]').first();
    await expect(first.locator(".f95-wimetric__was")).toBeVisible();
    await expect(first.locator(".f95-wimetric__now")).toBeVisible();
    await expect
      .poll(async () =>
        (await page.locator('[data-testid="whatif-metric-delta"]').first().innerText()).trim(),
      )
      .not.toBe("no change");
  });
});

test.describe("the hypothesis moves the numbers", () => {
  test("a preset changes the chart and the metrics together", async ({ page }) => {
    await enterWhatIf(page);
    const before = await page.locator('[data-testid="whatif-metric-value"]').allInnerTexts();

    await page.locator('[data-testid="whatif-preset-slip-a-quarter"]').click();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("changes pending");
    await expect
      .poll(async () => page.locator('[data-testid="whatif-metric-value"]').allInnerTexts())
      .not.toEqual(before);

    // And the chart grew a baseline to compare against.
    await expect(page.locator('[data-testid="legend-baseline"]')).toBeVisible();
  });

  test("a milestone toggle changes qualification and the headline", async ({ page }) => {
    // Qualification IS the thesis, and "what if we qualified these three" is the question the
    // whole methodology asks.
    await enterWhatIf(page);
    const id = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-testid="grid-row"]')];
      const target = rows.find((r) => {
        const real = r.querySelector('[data-testid="cell-qualification"]')?.textContent ?? "";
        const parts = real.split("/").map(Number);
        const a = parts[0] ?? NaN;
        const b = parts[1] ?? NaN;
        return Number.isFinite(a) && Number.isFinite(b) && a < b;
      });
      return target?.getAttribute("data-opportunity-id") ?? null;
    });
    test.skip(!id, "every row is already qualified");

    const row = page.locator(`[data-opportunity-id="${id}"]`).first();
    const qual = row.locator('[data-testid="cell-qualification"]');
    const before = (await qual.innerText()).trim();
    const headlineBefore = await page
      .locator('[data-testid="whatif-metric-value"]')
      .first()
      .innerText();

    // Confirm every unconfirmed blocking dot.
    const dots = row.locator("[data-testid^='milestone-toggle-']");
    const count = await dots.count();
    for (let i = 0; i < count; i += 1) {
      if ((await dots.nth(i).getAttribute("aria-pressed")) === "false") await dots.nth(i).click();
    }

    await expect(qual).not.toHaveText(before);
    await expect
      .poll(async () => page.locator('[data-testid="whatif-metric-value"]').first().innerText())
      .not.toBe(headlineBefore);
  });
});

test.describe("nothing leaks anywhere else", () => {
  test("The Board and the Forecast Room are unmoved while changes are pending", async ({
    page,
    context,
  }) => {
    await enterWhatIf(page);
    await page.locator('[data-testid="whatif-preset-slip-a-quarter"]').click();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("changes pending");
    await page.waitForTimeout(2000);

    // A SECOND tab, so the sandbox's tab keeps its pending state while these are read.
    const other = await context.newPage();
    await other.goto("/95-forward/board");
    const board = await other.locator('[data-testid="board-metrics"]').first().innerText();
    await other.goto("/95-forward/forecast");
    const forecast = await other.locator('[data-testid="forecast-metrics"]').first().innerText();

    // Compare against a clean render of the same pages.
    const clean = await context.newPage();
    await clean.goto("/95-forward/board");
    expect(await clean.locator('[data-testid="board-metrics"]').first().innerText()).toBe(board);
    await clean.goto("/95-forward/forecast");
    expect(await clean.locator('[data-testid="forecast-metrics"]').first().innerText()).toBe(
      forecast,
    );

    // The sandbox still holds its changes — this was not a test of a cleared state.
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("changes pending");
    await other.close();
    await clean.close();
  });

  test("no override reaches the URL or browser storage", async ({ page }) => {
    await enterWhatIf(page);
    await editCell(page, await firstRowId(page), "amount", "777000");
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("1 change");

    const url = new URL(page.url());
    expect([...url.searchParams.keys()].sort()).not.toContain("patches");
    expect(url.search).not.toContain("777000");
    const stored = await page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookie: document.cookie,
    }));
    expect(JSON.stringify(stored)).not.toContain("777000");
  });

  test("a reload clears the lot", async ({ page }) => {
    // Correct behaviour, not a limitation: state that survives a reload is state that can be
    // mistaken for real.
    await enterWhatIf(page);
    await editCell(page, await firstRowId(page), "amount", "777000");
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("1 change");

    await page.reload();
    await expect(page.locator('[data-testid="opportunity-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="whatif-banner"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="cell-amount"]').first()).not.toContainText("$777,000");
  });
});

test.describe("entering and leaving", () => {
  test("discard restores the baseline exactly", async ({ page }) => {
    await enterWhatIf(page);
    const id = await firstRowId(page);
    const cell = page
      .locator(`[data-opportunity-id="${id}"]`)
      .first()
      .locator('[data-testid="cell-amount"]');
    const before = (await cell.locator(".f95-grid__value").innerText()).trim();

    await editCell(page, id, "amount", "777000");
    await expect(cell).toHaveClass(/is-whatif/);

    await page.locator('[data-testid="whatif-discard"]').click();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("No changes yet");
    await expect(cell).not.toHaveClass(/is-whatif/);
    await expect(cell.locator(".f95-grid__value")).toHaveText(before);
    // Still in the mode — discard clears the changes, not the sandbox.
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
  });

  test("leaving with changes warns first, and can be cancelled", async ({ page }) => {
    await enterWhatIf(page);
    await editCell(page, await firstRowId(page), "amount", "777000");

    page.once("dialog", (d) => {
      expect(d.message()).toMatch(/discarded/i);
      expect(d.message()).toMatch(/Nothing was ever saved/i);
      void d.dismiss();
    });
    await page.locator('[data-testid="whatif-exit"]').click();
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();

    page.once("dialog", (d) => void d.accept());
    await page.locator('[data-testid="whatif-exit"]').click();
    await expect(page.locator('[data-testid="whatif-banner"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="whatif-enter"]')).toBeVisible();
  });

  test("leaving with nothing pending does not nag", async ({ page }) => {
    await enterWhatIf(page);
    let asked = false;
    page.on("dialog", (d) => {
      asked = true;
      void d.accept();
    });
    await page.locator('[data-testid="whatif-exit"]').click();
    await expect(page.locator('[data-testid="whatif-banner"]')).toHaveCount(0);
    expect(asked).toBe(false);
  });

  test("normal mode still writes, so the sandbox has not disabled editing", async ({ page }) => {
    // The other half of the guarantee: leaving the mode and making the change normally must go
    // all the way through, with every per-edit guard.
    await page.goto(GRID);
    await expect(page.locator('[data-testid="opportunity-grid"]')).toBeVisible();
    const id = await firstRowId(page);
    const before = await withDb(async (client) => {
      const { rows } = await client.query(
        `select amount_cents from forward_opportunities where id = $1`,
        [id],
      );
      return Number(rows[0]!.amount_cents);
    });

    const cell = page
      .locator(`[data-opportunity-id="${id}"]`)
      .first()
      .locator('[data-testid="cell-amount"]');
    await cell.click();
    await cell.press("Enter");
    await cell.locator("input").fill("818000");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      cell.locator("input").press("Enter"),
    ]);
    await expect(cell.locator(".f95-grid__value")).toContainText("$818,000");

    const after = await withDb(async (client) => {
      const { rows } = await client.query(
        `select amount_cents from forward_opportunities where id = $1`,
        [id],
      );
      return Number(rows[0]!.amount_cents);
    });
    expect(after).toBe(81_800_000);

    await withDb(async (client) => {
      await client.query(`update forward_opportunities set amount_cents = $2 where id = $1`, [
        id,
        before,
      ]);
      await client.query(
        `delete from opportunity_events where opportunity_id = $1
          and occurred_at = timestamptz '2026-09-12T12:00:00Z'`,
        [id],
      );
    });
  });
});

test.describe("scope is a lens over the overrides, not a container for them", () => {
  test("changes survive a scope change and keep moving the wider view", async ({ page }) => {
    // The naive implementation keys overrides to the current filter and silently discards them
    // on a tab change. "What if we did this to Kamuli — now what does that do to the year?" is
    // the more valuable question, and it is the one this has to answer.
    await page.goto(`${GRID}?whatif=1`);
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
    await settled(page);

    const options = await page
      .locator('[data-testid="filter-initiative"] option')
      .evaluateAll((n) => n.map((o) => (o as HTMLOptionElement).value));
    const narrow = options.find((o) => o !== "all");
    test.skip(!narrow, "the seed has only one initiative");

    // Scope to one initiative, make a change there.
    await page.locator('[data-testid="filter-initiative"]').selectOption(narrow!);
    await page.waitForURL(/initiative=/);
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
    // `lose-the-largest` rather than `slip-a-quarter`: it applies to any scope with an open deal,
    // whereas most rows in a narrow initiative have no close date to slip.
    await page.locator('[data-testid="whatif-preset-lose-the-largest"]').click();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText(/1 change pending/);
    const narrowMetrics = await page.locator('[data-testid="whatif-metric-value"]').allInnerTexts();

    // Widen to Everything. The change must still be there and must still be moving numbers.
    await page.locator('[data-testid="filter-initiative"]').selectOption("all");
    await page.waitForURL((u) => !u.search.includes("initiative="));
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
    // The count is TOTAL, so widening the lens does not change it — and nothing is out of view
    // now, so the qualifier is gone.
    await expect(page.locator('[data-testid="whatif-count"]')).toHaveText("1 change pending");

    // The wider view is a different computation over the same hypothesis.
    await expect
      .poll(async () => page.locator('[data-testid="whatif-metric-value"]').allInnerTexts())
      .not.toEqual(narrowMetrics);
  });

  test("changes outside the current lens are counted and said out loud", async ({ page }) => {
    // A change you cannot see but which is moving the numbers you can is the worst state this
    // feature could produce.
    await page.goto(`${GRID}?whatif=1&preset=slip-a-quarter`);
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("changes pending");
    await expect(page.locator('[data-testid="whatif-count"]')).not.toContainText("outside");

    const options = await page
      .locator('[data-testid="filter-initiative"] option')
      .evaluateAll((n) => n.map((o) => (o as HTMLOptionElement).value));
    const narrow = options.find((o) => o !== "all");
    test.skip(!narrow, "the seed has only one initiative");

    await page.locator('[data-testid="filter-initiative"]').selectOption(narrow!);
    await page.waitForURL(/initiative=/);
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("outside this view");
  });
});

test.describe("the no-goal scope degrades rather than breaks", () => {
  test("a goal-less initiative shows the curve but no coverage or gap", async ({ page }) => {
    const goalless = await withDb(async (client) => {
      const { rows } = await client.query(`
        select fi.id from funding_initiatives fi
         where not exists (
           select 1 from goals g where g.scope = 'initiative' and g.scope_ref_id = fi.id)
           and exists (select 1 from forward_opportunities fo where fo.initiative_id = fi.id)
         limit 1`);
      return rows[0]?.id as string | undefined;
    });
    test.skip(!goalless, "every initiative has a goal");

    await page.goto(`${GRID}?whatif=1&initiative=${goalless}`);
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
    await settled(page);
    await expect(page.locator('[data-testid="whatif-no-goal"]')).toBeVisible();

    const labels = await page.locator(".f95-wimetric__label").allInnerTexts();
    expect(labels).toContain("Qualified asks on the table");
    // Never a fallback to a parent goal — I19 forbids it, and a silently wrong ratio is worse
    // than an absent one.
    expect(labels).not.toContain("Coverage");
    expect(labels).not.toContain("Coverage gap");
    await expect(page.locator('[data-testid="forecast-chart"]')).toBeVisible();
  });
});

test.describe("the Forecast Room's door", () => {
  test("lands in what-if mode carrying the selected tab as scope", async ({ page }) => {
    await page.goto("/95-forward/forecast");
    const initiativeTab = page.locator('.f95-tabnav a[href*="initiative="]').first();
    const label = (await initiativeTab.innerText()).trim();
    await initiativeTab.click();
    await page.waitForURL(/initiative=/);
    const initiative = new URL(page.url()).searchParams.get("initiative");

    await page.locator('[data-testid="forecast-whatif"]').click();
    await page.waitForURL(/\/95-forward\/opportunities/);
    expect(new URL(page.url()).searchParams.get("initiative")).toBe(initiative);
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-initiative"]')).toHaveValue(initiative!);
    expect(label.length).toBeGreaterThan(0);
  });

  test("the qualify link arrives with the preset already applied", async ({ page }) => {
    await page.goto("/95-forward/forecast");
    const qualify = page.locator('[data-testid="forecast-whatif-qualify"]');
    test.skip((await qualify.count()) === 0, "nothing is best-only in this scope");
    await qualify.click();
    await page.waitForURL(/preset=qualify-best-only/);
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("pending");
  });
});

test.describe("recompute", () => {
  test("reports timing with a dozen overrides pending", async ({ page }) => {
    await enterWhatIf(page);

    // Fourteen DISTINCT records, edited one at a time.
    //
    // Not a preset plus extras: the pending count counts distinct opportunities, and a preset that
    // has already touched a row makes a later edit to that row add nothing to it — which is
    // correct, and made the first version of this test assert an increment that never came.
    //
    // Each edit waits for its own cell to show the new value before the next one starts. Fired
    // blind these race the re-render they cause: the grid re-sorts, the optimistic map clears
    // when fresh props arrive, and under full-suite load an edit lands on a cell that has moved.
    // A timing test failing on timing tells you nothing.
    const ids = await page
      .locator('[data-testid="grid-row"]')
      .evaluateAll((rows) =>
        rows.slice(0, 14).map((r) => r.getAttribute("data-opportunity-id") ?? ""),
      );
    expect(ids.length, "not enough rows to pend a dozen changes").toBeGreaterThanOrEqual(12);

    for (const [index, id] of ids.entries()) {
      const cell = page
        .locator(`[data-opportunity-id="${id}"]`)
        .first()
        .locator('[data-testid="cell-amount"]');
      await cell.scrollIntoViewIfNeeded();
      await cell.click();
      await cell.press("Enter");
      const input = cell.locator("input");
      await input.waitFor();
      const value = String(100000 + index * 1000);
      await input.fill(value);
      await input.press("Enter");
      await expect(cell.locator(".f95-grid__value")).toContainText(
        `$${Number(value).toLocaleString("en-US")}`,
        { timeout: 20000 },
      );
    }

    const pendingText = (await page.locator('[data-testid="whatif-count"]').innerText()).trim();
    const pendingCount = Number(/(\d+)/.exec(pendingText)?.[1] ?? 0);
    expect(pendingCount, `only ${pendingText}`).toBeGreaterThanOrEqual(12);

    // Now time ONE more change on top of that dozen — the case the brief asks about.
    //
    // Waits on the RESULT rather than on the pending indicator. Under a full-suite run another
    // worker's write moves the data version, every recompute misses the cache, and the indicator
    // can still be up when a 20s ceiling expires — a timeout about suite load rather than about
    // this feature.
    await expect
      .poll(async () => page.locator('[data-testid="whatif-metric-value"]').count(), {
        timeout: 45000,
      })
      .toBeGreaterThan(0);
    const before = await page.locator('[data-testid="whatif-metric-value"]').allInnerTexts();
    const t0 = Date.now();
    await page.locator('[data-testid="whatif-preset-lose-the-largest"]').click();
    await expect
      .poll(async () => page.locator('[data-testid="whatif-metric-value"]').allInnerTexts())
      .not.toEqual(before);
    console.log(
      `[what-if recompute] ${pendingText} → one more change settled in ${Date.now() - t0}ms`,
    );

    // And a repeat of a hypothesis already seen is served from the cache.
    const t1 = Date.now();
    await page.locator('[data-testid="whatif-discard"]').click();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("No changes yet");
    await expect
      .poll(async () => page.locator('[data-testid="whatif-metric-delta"]').first().innerText())
      .toContain("no change");
    console.log(`[what-if recompute] back to baseline in ${Date.now() - t1}ms`);
  });

  test("typing does not recompute — only a committed cell does", async ({ page }) => {
    // A keystroke-rate recompute would run a 10,000-trial Monte Carlo per character.
    const posts: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("/95-forward/opportunities"))
        posts.push(r.url());
    });
    await enterWhatIf(page);
    await page.waitForTimeout(2500);
    posts.length = 0;

    const id = await firstRowId(page);
    const cell = page
      .locator(`[data-opportunity-id="${id}"]`)
      .first()
      .locator('[data-testid="cell-amount"]');
    await cell.click();
    await cell.press("Enter");
    const input = cell.locator("input");
    await input.waitFor();
    for (const ch of "987654") await input.press(ch);
    await page.waitForTimeout(600);
    expect(posts, "a keystroke recomputed the simulation").toHaveLength(0);

    await input.press("Enter");
    await expect.poll(async () => posts.length).toBeGreaterThan(0);
  });
});

test.describe("baseline-only figures are marked (I30)", () => {
  test("derived columns and group subtotals say they are not moving", async ({ page }) => {
    // I31 leaves rank, next action, impact, flags, scenario and the group subtotals at BASELINE
    // while a hypothesis is pending, because recomputing them client-side would be a second
    // implementation of I23's ranking and I19's qualified predicate. The consequence was that the
    // grid's footer and the chart answered different questions with nothing saying so.
    await page.goto(`${GRID}?group=stage&whatif=1`);
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
    await settled(page);

    // Nothing pending yet: the numbers ARE real, so no marker.
    await expect(page.locator('[data-testid="baseline-only-marker"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="subtotal-baseline-only"]')).toHaveCount(0);

    await page.locator('[data-testid="whatif-preset-lose-the-largest"]').click();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("pending");

    // Now marked, on the derived columns and on every group footer.
    await expect(page.locator('[data-testid="baseline-only-marker"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="subtotal-baseline-only"]').first()).toBeVisible();

    // And NOT on the editable columns, which do move with the hypothesis.
    const markedHeaders = await page
      .locator('th:has([data-testid="baseline-only-marker"])')
      .allInnerTexts();
    for (const header of markedHeaders) {
      expect(header, `${header} is editable and must not be marked baseline`).not.toMatch(
        /^(Amount|Stage|Close|Conf\.|Prob\.|Visit|Initiative|Rep)/,
      );
    }
    expect(markedHeaders.join(" ")).toMatch(
      /Real\?|Milestones|Next action|Flags|Silent|Impact|Scenario/,
    );

    // Discarding takes the marks away again.
    await page.locator('[data-testid="whatif-discard"]').click();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("No changes yet");
    await expect(page.locator('[data-testid="baseline-only-marker"]')).toHaveCount(0);
  });
});

test.describe("the thesis, in one click (I30)", () => {
  test("qualifying the best-only asks moves the CLAIM and not the FORECAST", async ({ page }) => {
    // The demo's sixth beat, and the subtlest thing the product says. Qualifying an ask changes
    // what you can claim is on the table; it does not change what is likely to happen, because
    // the simulation already includes unqualified deals — an unqualified ask can still close.
    //
    // Pinned because it is exactly the kind of behaviour a future change could break without
    // looking wrong: make the simulation qualification-aware and every number still renders,
    // every other test still passes, and the product quietly starts double-counting its own
    // methodology.
    await page.goto(`${GRID}?whatif=1&preset=qualify-best-only`);
    await expect(page.locator('[data-testid="whatif-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="whatif-count"]')).toContainText("pending");
    await settled(page);
    await expect(page.locator('[data-testid="whatif-computing"]')).toHaveCount(0, {
      timeout: 20000,
    });

    const rows = await page.locator('[data-testid="whatif-metric"]').all();
    const byLabel = new Map<string, string>();
    for (const row of rows) {
      byLabel.set(
        (await row.locator(".f95-wimetric__label").innerText()).trim(),
        (await row.innerText()).replace(/\n/g, " "),
      );
    }

    // The claim moves, upward.
    const qualified = byLabel.get("Qualified asks on the table") ?? "";
    expect(qualified, "qualifying the best-only asks did not move qualified asks").toMatch(/\+\$/);

    // Coverage moves with it — same numerator.
    const coverage = byLabel.get("Coverage") ?? "";
    const ratios = [...coverage.matchAll(/(\d+\.\d+)×/g)].map((m) => Number(m[1]));
    expect(ratios.length, `no coverage ratios in: ${coverage}`).toBeGreaterThanOrEqual(2);
    expect(ratios[1], "coverage did not improve when asks were qualified").toBeGreaterThan(
      ratios[0]!,
    );

    // And the forecast does NOT move. This is the half that carries the argument.
    const mostLikely = byLabel.get("Most likely at year end") ?? "";
    expect(
      mostLikely,
      "qualifying an ask moved the SIMULATION — the model has started double-counting qualification",
    ).toContain("no change");
  });
});

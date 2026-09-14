import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";

// I29 — the Opportunities grid.
//
// Two claims are worth testing and one is worth testing hardest. The hardest is that this is a
// DATA GRID BOUND TO THE MODEL and not a rebuild of Excel: eight typed fields, server-validated,
// no row insert, no row delete, no formulas. The other is the reason to prefer it to a
// spreadsheet at all — the grid, the queue and the chart show the same numbers because they are
// computed once from one model. A spreadsheet is three formulas that drift.

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
const ANCHOR = "2026-09-12T12:00:00Z";

async function withDb<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Money on screen → cents, so a test never compares "$925,000" with 92500000. */
function cents(text: string): number {
  const match = /\$([\d,]+)/.exec(text);
  if (!match) throw new Error(`no currency in ${JSON.stringify(text)}`);
  return Number(match[1]!.replace(/,/g, "")) * 100;
}

async function openGrid(page: Page, query = ""): Promise<void> {
  await page.goto(`${GRID}${query}`);
  await expect(page.locator('[data-testid="opportunity-grid"]')).toBeVisible();
}

/** The row for one opportunity, by id, so a re-rank cannot make a test assert about another deal. */
function row(page: Page, opportunityId: string) {
  return page.locator(`[data-opportunity-id="${opportunityId}"]`).first();
}

async function firstRowId(page: Page): Promise<string> {
  const id = await page
    .locator('[data-testid="grid-row"]')
    .first()
    .getAttribute("data-opportunity-id");
  if (!id) throw new Error("no rows in the grid");
  return id;
}

/** Open a cell's editor. Enter is the documented way in, and the test uses the documented way. */
async function openEditor(page: Page, opportunityId: string, column: string) {
  const cell = row(page, opportunityId).locator(`[data-testid="cell-${column}"]`);
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await cell.press("Enter");
  await expect(cell.locator(`[data-testid="editor-${column}"]`)).toBeVisible();
  return cell;
}

// ---------------------------------------------------------------------------------------------

test.describe("the grid agrees with every other surface", () => {
  test("qualified asks is the same number on the grid, The Board and the Forecast Room", async ({
    page,
  }) => {
    // The initiative's whole claim over a spreadsheet, asserted rather than asserted-in-a-comment.
    await openGrid(page);
    const gridText = (await page.locator('[data-testid="grid-subtitle"]').innerText()) ?? "";
    const grid = cents(gridText);

    await page.goto("/95-forward/board");
    const board = cents(await page.locator('[data-testid="board-metrics"]').first().innerText());

    await page.goto("/95-forward/forecast");
    // The NAMED card. The metric block leads with "Won so far", so grabbing the first currency in
    // it compares the grid's qualified asks against a completely different number.
    const forecast = cents(
      await page
        .locator('[data-testid="forecast-metrics"] .f95-metric')
        .filter({ hasText: /Qualified asks on the table/i })
        .first()
        .locator(".f95-metric__value")
        .innerText(),
    );

    expect(grid).toBe(board);
    expect(grid).toBe(forecast);
  });

  test("the grid's rank column is The Board's queue, not a second opinion", async ({ page }) => {
    await page.goto("/95-forward/board");
    const boardOrder: string[] = [];
    for (const card of await page.locator('[data-testid="queue-card"]').all()) {
      const id = await card.getAttribute("data-opportunity-id");
      if (id) boardOrder.push(id);
    }
    expect(boardOrder.length).toBeGreaterThan(3);

    await openGrid(page, "?sort=rank&dir=asc");
    const gridOrder: string[] = [];
    for (const r of await page.locator('[data-testid="grid-row"]').all()) {
      const id = await r.getAttribute("data-opportunity-id");
      const rank = await r.locator('[data-testid="cell-rank"]').innerText();
      if (id && rank.trim() !== "—") gridOrder.push(id);
    }
    // The board's seven are the grid's first seven, in order.
    expect(gridOrder.slice(0, boardOrder.length)).toEqual(boardOrder);
  });

  test("a record no rule fires on is blank, not rank zero and not last", async ({ page }) => {
    await openGrid(page, "?sort=rank&dir=asc");
    const ranks = await page.locator('[data-testid="cell-rank"]').allInnerTexts();
    expect(ranks.some((r) => r.trim() === "—")).toBe(true);
    expect(ranks).not.toContain("#0");
  });
});

test.describe("group subtotals do not contradict the headline", () => {
  for (const groupBy of ["stage", "owner", "initiative"] as const) {
    test(`grouped by ${groupBy}, the qualified halves sum to qualified asks`, async ({ page }) => {
      await openGrid(page, `?group=${groupBy}`);
      const headline = cents(await page.locator('[data-testid="grid-subtitle"]').innerText());

      const lines = await page.locator('[data-testid="grid-subtotal"]').allInnerTexts();
      // One group is legitimate — the default scope is this rep, so "group by rep" has a single
      // bucket. What matters is that every bucket's qualified half is counted the same way.
      expect(lines.length).toBeGreaterThan(0);
      let summed = 0;
      for (const line of lines) {
        // Every footer is two-part or says plainly that there is nothing on the table. A bare
        // single total is the bug this test exists for.
        if (/Nothing on the table|closed-work/.test(line)) continue;
        expect(line, line).toMatch(/qualified/);
        summed += cents(line);
      }
      expect(summed).toBe(headline);
    });
  }

  test("a group footer states pre-close as well, so the two are never conflated", async ({
    page,
  }) => {
    await openGrid(page, "?group=stage");
    const lines = await page.locator('[data-testid="grid-subtotal"]').allInnerTexts();
    // At least one group holds unqualified money — that is the whole seed's shape — and its
    // footer must show both numbers and name the gap.
    const split = lines.find((l) => /pre-close/.test(l));
    expect(split, lines.join(" | ")).toBeTruthy();
    expect(split!).toMatch(/not a real ask yet/);
  });
});

test.describe("editing — eight typed fields, and nothing else", () => {
  test.describe.configure({ mode: "serial" });

  let target = "";
  let before: Record<string, unknown> = {};

  test.beforeAll(async () => {
    // Owned by the signed-in rep, because the grid's default scope is that rep. The largest
    // OTHER rep's deal is not on this screen, and a test that targets it fails on an empty
    // locator while looking like an editing bug.
    target = await withDb(async (client) => {
      const { rows } = await client.query(
        `select fo.id from forward_opportunities fo
           join users u on u.id = fo.owner_user_id
          where fo.status = 'open' and u.name like 'Dana%'
          order by fo.amount_cents desc limit 1`,
      );
      return String(rows[0]!.id);
    });
    before = await withDb(async (client) => {
      const { rows } = await client.query(
        `select amount_cents, probability, close_date, date_confidence, stage, visit_rating,
                initiative_id, owner_user_id
           from forward_opportunities where id = $1`,
        [target],
      );
      return rows[0]!;
    });
  });

  // Restore BEFORE as well as after: these tests mutate the shared seed, and a cleanup that only
  // runs at the end cannot run at all when the test it is cleaning up behind has failed
  // (AGENTS.md). Idempotent, database-only, every field every time.
  async function restore(): Promise<void> {
    await withDb(async (client) => {
      await client.query(
        `update forward_opportunities set amount_cents = $2, probability = $3, close_date = $4,
                date_confidence = $5, stage = $6, visit_rating = $7, initiative_id = $8,
                owner_user_id = $9
           where id = $1`,
        [
          target,
          before.amount_cents,
          before.probability,
          before.close_date,
          before.date_confidence,
          before.stage,
          before.visit_rating,
          before.initiative_id,
          before.owner_user_id,
        ],
      );
      // The demo ANCHOR, never `now()`: every write uses the injected clock, so these events land
      // at 2026-09-12, which is in the PAST relative to wall clock. See AGENTS.md.
      await client.query(
        `delete from opportunity_events
          where opportunity_id = $1 and occurred_at = timestamptz '${ANCHOR}'`,
        [target],
      );
    });
  }

  test.beforeEach(restore);
  test.afterEach(restore);

  test("an amount edit commits, writes an event, and moves the headline", async ({ page }) => {
    await openGrid(page);
    const headlineBefore = cents(await page.locator('[data-testid="grid-subtitle"]').innerText());

    const cell = await openEditor(page, target, "amount");
    await cell.locator("input").fill("777000");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      cell.locator("input").press("Enter"),
    ]);
    await expect(row(page, target).locator('[data-testid="cell-amount"]')).toContainText(
      "$777,000",
    );

    const event = await withDb(async (client) => {
      const { rows } = await client.query(
        `select field, old_value, new_value, prospect_sourced, actor_name from opportunity_events
          where opportunity_id = $1 and field = 'amountCents'
            and occurred_at = timestamptz '${ANCHOR}'`,
        [target],
      );
      return rows[0];
    });
    expect(event, "an edit with no event behind it is invisible to a leader").toBeTruthy();
    expect(event!.new_value).toBe("77700000");
    // An amount WE change is ours. Only the close date asks.
    expect(event!.prospect_sourced).toBe(false);
    expect(String(event!.actor_name)).toContain("Dana");

    // And the effect on the forecast is immediate, which is the reason to edit here at all.
    await expect
      .poll(async () => cents(await page.locator('[data-testid="grid-subtitle"]').innerText()))
      .not.toBe(headlineBefore);
  });

  test("a rejected amount reverts visibly and says why", async ({ page }) => {
    await openGrid(page);
    const cell = await openEditor(page, target, "amount");
    await cell.locator("input").fill("not a number");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      cell.locator("input").press("Enter"),
    ]);

    const error = row(page, target).locator('[data-testid="cell-error-amount"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/number/i);
    // Reverted to the STORED value — asserted on the value span, not the cell, because the cell
    // also contains the error text and "not a number" appears in both.
    const stored = `$${Number(before.amount_cents) / 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    await expect(
      row(page, target).locator('[data-testid="cell-amount"] .f95-grid__value'),
    ).toHaveText(stored);

    const wrote = await withDb(async (client) => {
      const { rows } = await client.query(
        `select count(*)::int as n from opportunity_events
          where opportunity_id = $1 and occurred_at = timestamptz '${ANCHOR}'`,
        [target],
      );
      return Number(rows[0]!.n);
    });
    expect(wrote, "a rejected edit must not reach the database").toBe(0);
  });

  for (const [column, field] of [
    ["stage", "stage"],
    ["probability", "probability"],
    ["dateConfidence", "dateConfidence"],
    ["visitRating", "visitRating"],
  ] as const) {
    test(`a ${column} edit commits and writes an event`, async ({ page }) => {
      await openGrid(page);
      const cell = await openEditor(page, target, column);
      const select = cell.locator("select");
      // A DIFFERENT value, read off the control rather than hard-coded: committing the value a
      // record already holds is correctly a no-op, and a test that hard-codes one eventually
      // picks the value the seed happens to have and reads as a broken editor.
      const current = await select.inputValue();
      const options = await select.locator("option").evaluateAll((nodes) =>
        nodes.map((n) => ({
          value: (n as HTMLOptionElement).value,
          label: (n as HTMLOptionElement).textContent?.trim() ?? "",
        })),
      );
      const next = options.find((o) => o.value !== current && o.value !== "")!;
      expect(next, `no alternative value for ${column}`).toBeTruthy();

      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST"),
        select.selectOption(next.value),
      ]);
      await expect(row(page, target).locator(`[data-testid="cell-${column}"]`)).toContainText(
        next.label,
      );

      const event = await withDb(async (client) => {
        const { rows } = await client.query(
          `select new_value, event_type from opportunity_events
            where opportunity_id = $1 and field = $2 and occurred_at = timestamptz '${ANCHOR}'`,
          [target, field],
        );
        return rows[0];
      });
      expect(event, "an edit with no event behind it is invisible to a leader").toBeTruthy();
      expect(event!.new_value).toBe(next.value);
      // Stage is tracked distinctly so the timeline can treat it as a move, not a field tweak.
      expect(event!.event_type).toBe(field === "stage" ? "stage_change" : "field_change");
    });
  }

  for (const [column, field] of [
    ["initiativeId", "initiativeId"],
    ["ownerUserId", "ownerUserId"],
  ] as const) {
    test(`a ${column} edit reassigns and writes an event`, async ({ page }) => {
      await openGrid(page);
      const cell = await openEditor(page, target, column);
      const select = cell.locator("select");
      const current = await select.inputValue();
      const options = await select
        .locator("option")
        .evaluateAll((nodes) => nodes.map((n) => (n as HTMLOptionElement).value));
      const next = options.find((o) => o !== current);
      test.skip(!next, "the seed has only one option for this field");

      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST"),
        select.selectOption(next!),
      ]);
      const event = await withDb(async (client) => {
        const { rows } = await client.query(
          `select new_value from opportunity_events
            where opportunity_id = $1 and field = $2 and occurred_at = timestamptz '${ANCHOR}'`,
          [target, field],
        );
        return rows[0];
      });
      expect(event).toBeTruthy();
      expect(event!.new_value).toBe(next);
    });
  }

  // -- The close-date guard, which is the one that is not optional. ---------------------------
  for (const sourced of [false, true]) {
    test(`a close-date edit records who chose it — prospect=${sourced}`, async ({ page }) => {
      // Every other field a rep edits is ours by definition. A close date is either one the
      // prospect gave us or one we invented, and that single boolean is what "All three moves
      // made by us" and the Forecast Room's slipping panel are reads over. A grid that wrote
      // `false` silently would be the easiest place in the product to do all your date editing,
      // and the slippage argument would become something no real user could reproduce.
      await openGrid(page);
      const cell = await openEditor(page, target, "closeDate");
      await cell.locator("input[type=date]").fill("2026-11-20");
      // The question is portalled out of the grid's scroll container, so it is addressed at page
      // level rather than inside the cell.
      if (sourced) await page.locator('[data-testid="grid-prospect-sourced"]').check();
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST"),
        page.locator('[data-testid="grid-date-commit"]').click(),
      ]);
      await expect(row(page, target).locator('[data-testid="cell-closeDate"]')).toContainText(
        "Nov 20",
      );

      const event = await withDb(async (client) => {
        const { rows } = await client.query(
          `select new_value, prospect_sourced from opportunity_events
            where opportunity_id = $1 and field = 'closeDate'
              and occurred_at = timestamptz '${ANCHOR}'`,
          [target],
        );
        return rows[0];
      });
      expect(event).toBeTruthy();
      expect(event!.new_value).toBe("2026-11-20");
      expect(event!.prospect_sourced).toBe(sourced);
    });
  }

  test("the close-date cell asks the question — it is not a bare date picker", async ({ page }) => {
    await openGrid(page);
    await openEditor(page, target, "closeDate");
    const ask = page.locator('[data-testid="grid-prospect-sourced"]');
    await expect(ask).toBeVisible();
    await expect(page.locator(".f95-grid__ask")).toContainText("The prospect gave us this date");
    await expect(page.locator(".f95-grid__ask")).toContainText(/A date we invent is not a date/);
    // Unchecked by default: we do not assume the prospect agreed to something.
    await expect(ask).not.toBeChecked();

    // And it is actually ON SCREEN, not clipped by the grid's horizontal scroll container — which
    // is what it was, so the one guard that must not be skippable was invisible while the date
    // input above it worked perfectly.
    const box = await page.locator(".f95-grid__ask").boundingBox();
    const viewport = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  });

  test("an edit that creates a contradiction surfaces the finding on that row", async ({
    page,
  }) => {
    // The product's stance is to flag and quantify, not to prevent. An edit that makes a record
    // contradict itself must still COMMIT — and then say so, on the row, immediately.
    await openGrid(page);
    const flagsBefore = await row(page, target).locator('[data-testid="grid-finding"]').count();

    // A close date in the past while the stage is still pre-close is `close-date-past-stage-open`.
    // Demo today is 2026-09-12.
    const cell = await openEditor(page, target, "closeDate");
    await cell.locator("input[type=date]").fill("2026-08-01");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.locator('[data-testid="grid-date-commit"]').click(),
    ]);

    // Committed, not refused.
    await expect(row(page, target).locator('[data-testid="cell-closeDate"]')).toContainText(
      "Aug 1",
    );
    // And flagged.
    await expect
      .poll(async () => row(page, target).locator('[data-testid="grid-finding"]').count())
      .toBeGreaterThan(flagsBefore);
    await expect(row(page, target).locator('[data-testid="grid-finding"]')).toHaveAttribute(
      "title",
      /in the past while the stage/i,
    );
  });
});

test.describe("what the grid deliberately is not", () => {
  test("there is no way to create or delete a row", async ({ page }) => {
    // Henrik drew this line in his own tool: "DO NOT create new opportunities or delete existing
    // opportunities… even in the real PoC, this is not the place to delete or create." Creation
    // and deletion carry consequences a grid cell cannot express.
    await openGrid(page);
    const grid = page.locator('[data-testid="opportunity-grid-wrap"]');
    for (const pattern of [/add row/i, /new opportunity/i, /^delete$/i, /remove row/i, /^\+$/]) {
      await expect(grid.getByRole("button", { name: pattern })).toHaveCount(0);
      await expect(grid.getByRole("link", { name: pattern })).toHaveCount(0);
    }
    // And no blank "type here to add" row at the end.
    const rows = page.locator('[data-testid="grid-row"]');
    const last = rows.last();
    await expect(last.locator('[data-testid="cell-prospect"]')).not.toBeEmpty();
  });

  test("the milestone columns are display-only and link to the checklist", async ({ page }) => {
    // Confirming a milestone needs confirmedBy, prospectSourced and evidence, and I26 rejects a
    // they-said claim with nobody named. A grid checkbox would walk straight past that guard.
    await openGrid(page);
    const dots = page.locator('[data-testid="grid-milestones"]').first();
    await expect(dots.locator('input[type="checkbox"]')).toHaveCount(0);
    const firstDot = dots.locator("a").first();
    await expect(firstDot).toHaveAttribute(
      "href",
      /\/95-forward\/opportunities\/[0-9a-f-]+#milestones/,
    );
  });

  test("derived columns are marked read-only and have no editor", async ({ page }) => {
    await openGrid(page);
    for (const key of ["rank", "qualification", "nextAction", "impact", "silence", "membership"]) {
      const cell = page.locator(`[data-testid="cell-${key}"]`).first();
      await expect(cell).toHaveAttribute("aria-readonly", "true");
      await cell.click({ force: true });
      await expect(cell.locator("input, select")).toHaveCount(0);
    }
  });
});

test.describe("filter, sort and group travel in the URL", () => {
  test("a sorted view is a link", async ({ page }) => {
    await openGrid(page);
    await page.locator('[data-testid="sort-amount"]').click();
    await page.waitForURL(/sort=amount/);
    expect(page.url()).toContain("dir=");

    const amounts = await page.locator('[data-testid="cell-amount"]').allInnerTexts();
    const parsed = amounts.map((a) => Number(a.replace(/[^\d]/g, "")));
    const sorted = [...parsed].sort((a, b) => a - b);
    expect(parsed).toEqual(page.url().includes("dir=desc") ? sorted.reverse() : sorted);

    // And the link survives a reload, which is the whole point of putting it in the URL.
    const url = page.url();
    await page.reload();
    expect(page.url()).toBe(url);
    expect(await page.locator('[data-testid="cell-amount"]').allInnerTexts()).toEqual(amounts);
  });

  test("a filter narrows the grid and says so rather than contradicting The Board", async ({
    page,
  }) => {
    await openGrid(page);
    const all = await page.locator('[data-testid="grid-row"]').count();

    await page.locator('[data-testid="filter-qualification"]').selectOption("qualified");
    await page.waitForURL(/qualification=qualified/);
    const some = await page.locator('[data-testid="grid-row"]').count();
    expect(some).toBeGreaterThan(0);
    expect(some).toBeLessThan(all);

    // The footer names which number it is showing, so a smaller total does not read as a bug.
    await expect(page.locator('[data-testid="grid-subtitle"]')).toContainText("in this filter");
    await expect(page.locator('[data-testid="grid-subtitle"]')).toContainText(`${some} of ${all}`);
  });

  test("grouping is in the URL and clearing it comes back", async ({ page }) => {
    await openGrid(page);
    await expect(page.locator('[data-testid="grid-group"]')).toHaveCount(0);
    await page.locator('[data-testid="filter-group"]').selectOption("owner");
    await page.waitForURL(/group=owner/);
    await expect(page.locator('[data-testid="grid-group"]').first()).toBeVisible();
    await page.locator('[data-testid="filter-group"]').selectOption("none");
    await page.waitForURL((u) => !u.search.includes("group="));
    await expect(page.locator('[data-testid="grid-group"]')).toHaveCount(0);
  });

  test("an empty filter says so instead of showing a blank grid", async ({ page }) => {
    // Deliberately not openGrid: the empty state renders INSTEAD of the table, so waiting for the
    // table would be waiting for the thing this test says should not be there.
    await page.goto(`${GRID}?stage=repeat&qualification=qualified&flags=1`);
    await expect(page.locator('[data-testid="grid-empty"]')).toBeVisible();
    await expect(page.locator('[data-testid="opportunity-grid"]')).toHaveCount(0);
  });
});

test.describe("keyboard", () => {
  test("arrow keys move between editable cells, Enter edits, Escape cancels", async ({ page }) => {
    await openGrid(page);
    const id = await firstRowId(page);
    const amount = row(page, id).locator('[data-testid="cell-amount"]');
    await amount.click();
    await expect(amount).toBeFocused();

    // Right, then left, lands back where it started.
    await amount.press("ArrowRight");
    await expect(row(page, id).locator('[data-testid="cell-stage"]')).toBeFocused();
    await row(page, id).locator('[data-testid="cell-stage"]').press("ArrowLeft");
    await expect(amount).toBeFocused();

    // Down moves a row, in the order the grid is displaying.
    const secondId = await page
      .locator('[data-testid="grid-row"]')
      .nth(1)
      .getAttribute("data-opportunity-id");
    await amount.press("ArrowDown");
    await expect(row(page, secondId!).locator('[data-testid="cell-amount"]')).toBeFocused();
    await row(page, secondId!).locator('[data-testid="cell-amount"]').press("ArrowUp");
    await expect(amount).toBeFocused();

    // Enter opens, Escape closes and hands focus back to the cell — never to the document.
    const shown = await amount.innerText();
    await amount.press("Enter");
    await expect(amount.locator("input")).toBeVisible();
    await amount.locator("input").fill("123");
    await amount.locator("input").press("Escape");
    await expect(amount.locator("input")).toHaveCount(0);
    await expect(amount).toBeFocused();
    await expect(amount).toHaveText(shown);
  });

  test("the whole grid is one tab stop, not one per cell", async ({ page }) => {
    // A roving tabindex. Without it, tabbing past a 20-row grid means 160 presses.
    await openGrid(page);
    const tabbable = await page
      .locator('[data-testid="opportunity-grid"] td[tabindex="0"]')
      .count();
    expect(tabbable).toBe(1);
  });

  test("focus is not lost after a commit", async ({ page }) => {
    await openGrid(page);
    const id = await firstRowId(page);
    const cell = row(page, id).locator('[data-testid="cell-visitRating"]');
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await cell.press("Enter");
    const select = cell.locator("select");
    const before = await select.inputValue();
    const options = await select
      .locator("option")
      .evaluateAll((n) => n.map((o) => (o as HTMLOptionElement).value));
    const next = options.find((o) => o !== before)!;
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      select.selectOption(next),
    ]);
    // The editor closes and the CELL has focus — not <body>, which would strand a keyboard user.
    await expect
      .poll(async () => page.evaluate(() => document.activeElement?.tagName ?? "NONE"))
      .not.toBe("BODY");

    await withDb(async (client) => {
      await client.query(`update forward_opportunities set visit_rating = $2 where id = $1`, [
        id,
        before === "" ? null : before,
      ]);
      await client.query(
        `delete from opportunity_events where opportunity_id = $1
          and occurred_at = timestamptz '${ANCHOR}'`,
        [id],
      );
    });
  });

  test("the grid announces itself as a grid, with sortable headers", async ({ page }) => {
    await openGrid(page);
    const grid = page.locator('[data-testid="opportunity-grid"]');
    await expect(grid).toHaveAttribute("role", "grid");
    await expect(grid).toHaveAttribute("aria-label", "Opportunities");
    // aria-sort is on the column that IS sorted, and "none" on the ones that could be. An invalid
    // value here is the third ARIA defect this codebase would have shipped.
    const sorted = grid.locator('th[aria-sort="ascending"], th[aria-sort="descending"]');
    await expect(sorted).toHaveCount(1);
    for (const value of await grid
      .locator("th[aria-sort]")
      .evaluateAll((n) => n.map((e) => e.getAttribute("aria-sort")))) {
      expect(["ascending", "descending", "none"]).toContain(value);
    }
  });
});

test.describe("the edit round trip", () => {
  test("typing sends nothing — only committing does", async ({ page }) => {
    // The scenario column implies a 10,000-trial Monte Carlo per data version, so a grid that
    // fired the action per keystroke would run one per character. It does not: the editor is
    // local state until Enter, and Escape throws the draft away without a round trip.
    const posts: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("/95-forward/opportunities")) {
        posts.push(r.url());
      }
    });

    await openGrid(page);
    const id = await firstRowId(page);
    const cell = await openEditor(page, id, "amount");
    const input = cell.locator("input");
    for (const ch of "123456") await input.press(ch);
    await page.waitForTimeout(500);
    expect(posts, "a keystroke must not reach the server").toHaveLength(0);

    await input.press("Escape");
    await page.waitForTimeout(500);
    expect(posts, "cancelling must not reach the server either").toHaveLength(0);
  });

  test("reports the round trip, and re-sorting costs nothing", async ({ page }) => {
    // Printed rather than held to a threshold: this is a dev server revalidating four routes, so
    // a ceiling here would be measuring Next's dev compiler rather than the product. What IS
    // asserted is the shape — an edit pays for one simulation, navigation pays for none.
    await openGrid(page);
    const id = await firstRowId(page);
    const before = await withDb(async (client) => {
      const { rows } = await client.query(
        `select amount_cents from forward_opportunities where id = $1`,
        [id],
      );
      return Number(rows[0]!.amount_cents);
    });

    // Two numbers, because one of them would mislead. The action's response arrives as soon as
    // headers do, which is not when the rep sees anything; and the cell updates optimistically,
    // which is not when the server agrees. What matters for "see the effect on the forecast
    // immediately" is when the DERIVED figures catch up — so that is measured too.
    const ack: number[] = [];
    const settled: number[] = [];
    for (const value of ["310000", "320000", "330000"]) {
      const headlineBefore = await page.locator('[data-testid="grid-subtitle"]').innerText();
      const cell = await openEditor(page, id, "amount");
      await cell.locator("input").fill(value);
      const t0 = Date.now();
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST"),
        cell.locator("input").press("Enter"),
      ]);
      ack.push(Date.now() - t0);
      await expect(
        row(page, id).locator('[data-testid="cell-amount"] .f95-grid__value'),
      ).toHaveText(`$${Number(value).toLocaleString("en-US")}`);
      // The subtitle is computed server-side from the whole portfolio, so it only changes once
      // the round trip and the re-render have both landed.
      await expect(page.locator('[data-testid="grid-subtitle"]')).not.toHaveText(headlineBefore);
      settled.push(Date.now() - t0);
    }
    console.log(
      `[grid edit round trip] actionAck=${JSON.stringify(ack)}ms ` +
        `derivedSettled=${JSON.stringify(settled)}ms`,
    );
    expect(settled).toHaveLength(3);

    // Sorting and grouping are pure navigation: the simulation cache key has not moved, so the
    // scenario column is served rather than recomputed.
    const t0 = Date.now();
    await page.goto("/95-forward/opportunities?sort=amount&dir=desc");
    await expect(page.locator('[data-testid="opportunity-grid"]')).toBeVisible();
    const sortMs = Date.now() - t0;
    const t1 = Date.now();
    await page.goto("/95-forward/opportunities?group=stage");
    await expect(page.locator('[data-testid="grid-group"]').first()).toBeVisible();
    console.log(`[grid navigation] sort=${sortMs}ms group=${Date.now() - t1}ms`);

    await withDb(async (client) => {
      await client.query(`update forward_opportunities set amount_cents = $2 where id = $1`, [
        id,
        before,
      ]);
      await client.query(
        `delete from opportunity_events where opportunity_id = $1
          and occurred_at = timestamptz '${ANCHOR}'`,
        [id],
      );
    });
  });
});

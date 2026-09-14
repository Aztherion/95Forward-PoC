import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";

// I27 — The Forecast Room.
//
// The screen has to survive arithmetic, so these tests do the arithmetic. Every figure is checked
// against another figure on the same screen or on The Board, because that reconciliation IS the
// product claim: one service, one definition, reused.

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

const ROOM = "/95-forward/forecast";

function money(text: string): number {
  const match = /-?\$[\d,]+/.exec(text);
  if (!match) throw new Error(`no money in ${JSON.stringify(text)}`);
  return Number(match[0].replace(/[$,]/g, ""));
}

async function cardValue(page: Page, label: string): Promise<string> {
  const card = page
    .locator('[data-testid="forecast-metrics"] .f95-metric')
    .filter({ hasText: new RegExp(label, "i") })
    .first();
  return (await card.locator(".f95-metric__value").innerText()).trim();
}

/** The initiative ids, so a tab can be opened by URL rather than by clicking a truncated label. */
async function initiativeIds(): Promise<{ withGoal: string; withoutGoal: string }> {
  return withDb(async (client) => {
    const { rows } = await client.query(
      `select fi.id,
              (select count(*) from goals g
                where g.scope = 'initiative' and g.scope_ref_id = fi.id) as goals
         from funding_initiatives fi
        order by fi.colour_key`,
    );
    const withGoal = rows.find((r) => Number(r.goals) > 0)?.id as string;
    const withoutGoal = rows.find((r) => Number(r.goals) === 0)?.id as string;
    if (!withGoal || !withoutGoal) throw new Error("the seed needs one initiative of each kind");
    return { withGoal, withoutGoal };
  });
}

test.describe("The Forecast Room", () => {
  test("opens on the numbers, with the week from the clock", async ({ page }) => {
    await page.goto(ROOM);
    await expect(page.locator('[data-testid="forecast-room"]')).toBeVisible();
    await expect(page.locator(".f95-page__eyebrow")).toContainText(/WEEK \d+ OF \d+/i);
    await expect(page.locator('[data-testid="forecast-subtitle"]')).toContainText("most likely");
  });

  test("shows its working — no ratio without its denominator", async ({ page }) => {
    await page.goto(ROOM);
    const metrics = page.locator('[data-testid="forecast-metrics"]');

    // goal − won = basis, rendered, and actually equal.
    const basis = await metrics.locator(".f95-metric__basis").first().innerText();
    const [goal, won, computed] = basis
      .match(/\$[\d,]+/g)!
      .map((v) => Number(v.replace(/[$,]/g, "")));
    expect(goal! - won!).toBe(computed!);

    // multiple × basis = needed, likewise.
    const needed = await metrics.locator(".f95-metric__basis").nth(1).innerText();
    const multiple = Number(/^(\d+(?:\.\d+)?)×/.exec(needed)![1]);
    const [remaining, total] = needed
      .match(/\$[\d,]+/g)!
      .map((v) => Number(v.replace(/[$,]/g, "")));
    expect(Math.round(multiple * remaining!)).toBe(total!);
  });

  test("coverage gap equals qualified asks minus what is needed", async ({ page }) => {
    await page.goto(ROOM);
    const qualified = money(await cardValue(page, "Qualified asks on the table"));
    const gap = money(await cardValue(page, "Coverage gap"));
    const needed = await page
      .locator('[data-testid="forecast-metrics"] .f95-metric__basis')
      .nth(1)
      .innerText();
    const total = Number(
      needed
        .match(/\$[\d,]+/g)!
        .at(-1)!
        .replace(/[$,]/g, ""),
    );
    // Signed: negative means short.
    expect(gap).toBe(qualified - total);
  });

  test("the stage board reconciles to the headline metric, to the cent", async ({ page }) => {
    await page.goto(ROOM);
    const qualified = money(await cardValue(page, "Qualified asks on the table"));

    const line = await page.locator('[data-testid="stage-reconciliation"]').innerText();
    const [preClose, qualifiedInBoard] = line
      .match(/\$[\d,]+/g)!
      .map((v) => Number(v.replace(/[$,]/g, "")));

    // Amendment 1: the four pre-close columns are NOT the headline — their qualified subset is.
    expect(qualifiedInBoard).toBe(qualified);
    expect(preClose!).toBeGreaterThanOrEqual(qualifiedInBoard!);

    // And the columns really do sum to the pre-close figure.
    const columnTotals = await page.evaluate(() =>
      [...document.querySelectorAll(".f95-stagecol")].map((col) => ({
        preClose: !col.classList.contains("f95-stagecol--closed"),
        total: Number(
          (col.querySelector(".f95-stagecol__count")?.textContent ?? "")
            .split("·")[1]
            ?.replace(/[$,\s]/g, "") ?? "0",
        ),
      })),
    );
    const summed = columnTotals.filter((c) => c.preClose).reduce((s, c) => s + c.total, 0);
    // Both sides are rendered dollars, not cents.
    expect(summed).toBe(preClose);
    // Closed work is in neither number, and the footer says so.
    await expect(page.locator('[data-testid="closed-work"]')).toContainText(
      "NOT IN THE HEADLINE NUMBER",
    );
  });

  test("qualified and unqualified chips are distinguishable, and the qualified ones tie out", async ({
    page,
  }) => {
    await page.goto(ROOM);
    const qualified = money(await cardValue(page, "Qualified asks on the table"));

    const chips = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="stage-chip"]')].map((chip) => {
        const style = getComputedStyle(chip);
        return {
          qualified: chip.getAttribute("data-qualified") === "true",
          closed: Boolean(chip.closest(".f95-stagecol--closed")),
          borderStyle: style.borderTopStyle,
          background: style.backgroundColor,
          amount: Number(
            (chip.querySelector(".f95-chip__amount")?.textContent ?? "").replace(/[$,]/g, ""),
          ),
        };
      }),
    );

    const q = chips.filter((c) => c.qualified && !c.closed);
    const u = chips.filter((c) => !c.qualified);
    expect(q.length, "the seed has no qualified chip to look at").toBeGreaterThan(0);
    expect(u.length, "the seed has no unqualified chip to look at").toBeGreaterThan(0);

    // Filled and solid versus empty and dashed — the same channel the milestone badges use, so it
    // survives greyscale and does not fight the health triad for colour.
    expect(q[0]!.borderStyle).toBe("solid");
    expect(u[0]!.borderStyle).toBe("dashed");
    expect(q[0]!.background).not.toBe(u[0]!.background);

    expect(q.reduce((s, c) => s + c.amount, 0)).toBe(qualified);
  });

  test("every 'see the names' link leads to names", async ({ page }) => {
    // "If there's no names, there's no value in the graphic."
    await page.goto(ROOM);
    for (const testId of ["won-names", "qualified-names", "gap-names"]) {
      const disclosure = page.locator(`[data-testid="${testId}"]`);
      await expect(disclosure).toBeVisible();
      await disclosure.locator(`[data-testid="${testId}-toggle"]`).click();
      const list = page.locator(`[data-testid="${testId}-list"]`);
      await expect(list).toBeVisible();
      await expect(list.locator("a").first()).toHaveAttribute(
        "href",
        /\/95-forward\/opportunities\/[0-9a-f-]+/,
      );
    }
  });

  test("the ledger names every opportunity the simulation stands on", async ({ page }) => {
    await page.goto(ROOM);
    const ledger = page.locator('[data-testid="ledger"]');
    await expect(ledger.locator(".f95-ledger__row").first()).toBeVisible();
    const badges = await ledger.locator(".f95-scenario").allInnerTexts();
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(["IN ALL THREE", "MOST LIKELY +", "BEST ONLY", "OUTSIDE BEST"]).toContain(badge);
    }
  });

  test("the chart renders the trial count from the setting and draws the goal", async ({
    page,
  }) => {
    await page.goto(ROOM);
    const trials = await withDb(async (client) => {
      const { rows } = await client.query(
        `select parameter_values from rule_overrides where rule_id = 'simulation-trials' limit 1`,
      );
      const values = rows[0]?.parameter_values as { trials?: number } | undefined;
      return values?.trials ?? 10_000;
    });
    await expect(page.locator('[data-testid="bmw-subtitle"]')).toContainText(
      `${trials.toLocaleString("en-US")} simulated years`,
    );
    await expect(page.locator('[data-testid="bmw-subtitle"]')).toContainText(
      "Every dollar closes in full or not at all",
    );

    // The goal must be INSIDE the plotted domain. A goal above the best case falls outside an
    // auto-scaled domain and is silently clipped — the legend says "Goal" and the plot has none.
    await expect(
      page.locator('[data-testid="bmw"] text').filter({ hasText: /^GOAL / }),
    ).toBeVisible();
  });

  // I28 fold-in 1. The tabs used to carry the initiative's full fundraising name — "Everyone in
  // Kamuli — Uganda 2026" — which truncated to nothing useful and made a tab unclickable by label.
  // `short_name` carries a designed label instead, and falls back to the full name when absent so a
  // tenant that has not set one still gets a tab rather than a blank.
  test("initiative tabs carry short names, and fall back to the full name", async ({ page }) => {
    await page.goto(ROOM);
    const labels = await page.locator(".f95-tabnav__label").allInnerTexts();
    expect(labels.length).toBeGreaterThan(1);

    const seeded = await withDb(async (client) => {
      const { rows } = await client.query(
        `select name, short_name from funding_initiatives order by name`,
      );
      return rows as { name: string; short_name: string | null }[];
    });

    for (const row of seeded) {
      const expected = row.short_name ?? row.name;
      expect(labels).toContain(expected);
      // And the long name is NOT what a tab shows when a shorter one exists. ("Unrestricted" is
      // already short enough to be its own short name, so there is nothing to replace there.)
      if (row.short_name && row.short_name !== row.name) expect(labels).not.toContain(row.name);
    }

    // Short enough to read at a glance: the defect was a label nobody could tell apart.
    for (const label of labels) expect(label.length).toBeLessThanOrEqual(24);

    // The fallback is real code, not a hypothetical — prove it by removing one.
    const victim = seeded.find((r) => r.short_name);
    if (!victim) return;
    await withDb(async (client) => {
      await client.query(`update funding_initiatives set short_name = null where name = $1`, [
        victim.name,
      ]);
    });
    try {
      await page.goto(ROOM);
      const after = await page.locator(".f95-tabnav__label").allInnerTexts();
      expect(after).toContain(victim.name);
    } finally {
      await withDb(async (client) => {
        await client.query(`update funding_initiatives set short_name = $2 where name = $1`, [
          victim.name,
          victim.short_name,
        ]);
      });
    }
  });

  test("a tab re-scopes the entire view", async ({ page }) => {
    const { withGoal } = await initiativeIds();
    await page.goto(ROOM);
    const everything = {
      qualified: await cardValue(page, "Qualified asks on the table"),
      ledger: await page.locator('[data-testid="ledger"] .f95-ledger__name').allInnerTexts(),
      chips: await page.locator('[data-testid="stage-chip"]').count(),
      reconciliation: await page.locator('[data-testid="stage-reconciliation"]').innerText(),
    };

    await page.goto(`${ROOM}?initiative=${withGoal}`);
    await expect(page.locator('[data-testid="forecast-room"]')).toHaveAttribute(
      "data-scope",
      withGoal,
    );

    // Ledger, stage board and the reconciliation all move together. One of them alone moving would
    // mean two halves of the screen describing different portfolios.
    //
    // The headline metric is NOT asserted to change: on this seed both qualified opportunities sit
    // in the same initiative, so scoping to it legitimately leaves the figure alone. What is
    // asserted instead is stronger — that the tie-out still holds in the new scope.
    const scopedLedger = await page
      .locator('[data-testid="ledger"] .f95-ledger__name')
      .allInnerTexts();
    expect(scopedLedger).not.toEqual(everything.ledger);
    expect(scopedLedger.length).toBeLessThan(everything.ledger.length);
    expect(await page.locator('[data-testid="stage-chip"]').count()).toBeLessThan(everything.chips);
    const scopedReconciliation = await page
      .locator('[data-testid="stage-reconciliation"]')
      .innerText();
    expect(scopedReconciliation).not.toBe(everything.reconciliation);
    expect(money(scopedReconciliation.split("of which")[1]!)).toBe(
      money(await cardValue(page, "Qualified asks on the table")),
    );
    await expect(page.locator('[data-testid="untouched"]')).toBeVisible();
  });

  test("a scope with no goal says so, and never falls back to the parent goal", async ({
    page,
  }) => {
    const { withoutGoal } = await initiativeIds();
    await page.goto(ROOM);
    const parentGoal = await cardValue(page, "goal ·");
    expect(parentGoal).toMatch(/\$[\d,]+/);

    await page.goto(`${ROOM}?initiative=${withoutGoal}`);
    // Henrik's spreadsheet silently reverts to the total here. A silently wrong number is worse
    // than an absent one.
    expect(await cardValue(page, "goal ·")).toBe("—");
    expect(await cardValue(page, "Coverage gap")).toBe("—");
    expect(await cardValue(page, "New asks needed")).toBe("—");
    const metrics = page.locator('[data-testid="forecast-metrics"]');
    await expect(metrics).toContainText("no goal defined for this view");
    await expect(metrics).not.toContainText(parentGoal);
    await expect(page.locator('[data-testid="bmw-verdict"]')).toContainText(
      "nothing to land short of",
    );
  });

  test("the simulation is served from cache, not recomputed per render", async ({ page }) => {
    // I26 shipped a page running an uncached 10,000-trial simulation per render; it stalled the dev
    // server under two workers and took the suite from 3.9m to 8.4m. This screen IS the simulation.
    await page.goto(ROOM);
    await expect(page.locator('[data-testid="bmw"]')).toBeVisible();

    const warm = Date.now();
    await page.reload();
    await expect(page.locator('[data-testid="bmw"]')).toBeVisible();
    const elapsed = Date.now() - warm;

    // A cold 10,000-trial run over the seeded portfolio is hundreds of milliseconds; a cache hit is
    // none of it. Generous, because this is a dev server under parallel load — it is asserting that
    // the simulation is not being recomputed, not benchmarking it.
    expect(elapsed, `a cached reload took ${elapsed}ms`).toBeLessThan(4000);
  });

  test("the movement panels flag by name, and re-date opens the record that asks who moved it", async ({
    page,
  }) => {
    await page.goto(ROOM);
    const untouched = page.locator('[data-testid="untouched"]');
    await expect(untouched).toContainText(/opportunit(y|ies) ·/);
    await expect(untouched.locator("a").first()).toHaveAttribute(
      "href",
      /\/95-forward\/opportunities\/[0-9a-f-]+/,
    );

    const slipping = page.locator('[data-testid="slipping"]');
    await expect(slipping).toContainText("slipping");
    const reDate = slipping.locator('[data-testid="re-date"]').first();
    await expect(reDate).toBeVisible();
    await reDate.click();
    await page.waitForURL(/\/95-forward\/opportunities\/[0-9a-f-]+/);
    // I26's flow, which already asks whether the prospect gave us the date — so the flag that
    // produced the panel is captured by the action that resolves it.
    await expect(page.locator('[data-testid="move-close-date"]').first()).toBeVisible();
  });
});

test.describe("cross-screen", () => {
  test("qualified asks is the same number on The Board and the Forecast Room", async ({ page }) => {
    // One service, one definition, reused. Two screens disagreeing about the headline metric is
    // the single thing that would sink a demo.
    await page.goto("/95-forward/board");
    const board = await page
      .locator('[data-testid="board-metrics"] .f95-metric__value')
      .first()
      .innerText();

    await page.goto(ROOM);
    const room = await cardValue(page, "Qualified asks on the table");
    expect(room).toBe(board.trim());
  });
});

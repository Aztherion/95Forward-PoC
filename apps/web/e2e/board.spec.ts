import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";

// I25 — The Board.
//
// The screen's claim is that a user can act on item #1 within seconds of landing and understand
// why it is #1 without asking. These tests pin the parts of that claim a test can hold: the queue
// is the ranking engine's, in the engine's order; every number comes from a service; every card
// shows the rule that produced it; and a dismissal is reversible.

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

const BOARD = "/95-forward/board";

// I23's golden, at the head. The full table is asserted in packages/db/src/forward-ranking.test.ts;
// what matters here is that the SCREEN shows the engine's answer rather than one of its own.
const ITEM_ONE = {
  name: "The Sterling Community Trust",
  amount: "$500,000",
  status: "BLOCKED",
  rule: "prospect-ahead-of-us",
  move: "Get the ask approved",
};

test.describe("The Board", () => {
  test("opens on ranked work with names and amounts, in the engine's order", async ({ page }) => {
    await page.goto(BOARD);
    await expect(page.locator('[data-testid="board"]')).toBeVisible();

    const cards = page.locator('[data-testid="queue-card"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Rendered in rank order, 1..n, with no gaps — the engine ranks, the screen does not re-sort.
    const ranks = await cards.evaluateAll((nodes) =>
      nodes.map((n) => Number(n.getAttribute("data-rank"))),
    );
    expect(ranks).toEqual(Array.from({ length: count }, (_, i) => i + 1));

    const first = cards.first();
    await expect(first).toContainText(ITEM_ONE.name);
    await expect(first).toContainText(ITEM_ONE.amount);
    await expect(first).toContainText(ITEM_ONE.status);
    await expect(first).toContainText(ITEM_ONE.move);
  });

  test("the name and the amount are the largest things on a card, not the verbs", async ({
    page,
  }) => {
    // The hierarchy requirement, made mechanical. A board whose action buttons out-typeset the
    // prospect's name has become a task list, which is the thing this screen replaced.
    await page.goto(BOARD);
    const card = page.locator('[data-testid="queue-card"]').first();
    await expect(card).toBeVisible();

    const sizes = await card.evaluate((node) => {
      const px = (selector: string) => {
        const el = node.querySelector(selector);
        return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
      };
      return {
        name: px(".f95-queue__name"),
        amount: px(".f95-queue__amount"),
        move: px(".f95-queue__action-title"),
        button: px('[data-testid="primary-action"]'),
      };
    });

    expect(sizes.name).toBeGreaterThan(sizes.move);
    expect(sizes.name).toBeGreaterThan(sizes.button);
    expect(sizes.amount).toBeGreaterThan(sizes.move);
    expect(sizes.amount).toBeGreaterThan(sizes.button);
  });

  test("every card shows the rule that produced it, and the rule resolves", async ({ page }) => {
    await page.goto(BOARD);
    const cards = page.locator('[data-testid="queue-card"]');
    const count = await cards.count();

    for (let i = 0; i < count; i += 1) {
      const chip = cards.nth(i).locator(".f95-rulechip").first();
      await expect(chip, `card ${i + 1} has no rule chip`).toBeVisible();
      await expect(chip).toHaveAttribute("href", /^\/rules\/[a-z0-9-]+$/);
    }

    // Not merely a link shape — the rule it names exists and opens.
    const href = await cards.first().locator(".f95-rulechip").first().getAttribute("href");
    const response = await page.goto(href!);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator(".f95-page")).toBeVisible();
  });

  test("the metric block shows its basis and takes the coverage multiple from the rules", async ({
    page,
  }) => {
    await page.goto(BOARD);
    const metrics = page.locator('[data-testid="board-metrics"]');
    await expect(metrics).toBeVisible();

    // The multiple is the org's doctrine, not a literal in the markup.
    const chip = page.locator('[data-testid="coverage-chip"]');
    await expect(chip).toContainText("COVERAGE");
    await expect(chip).toContainText("IS THE RULE");
    const multiple = await withDb(async (client) => {
      const { rows } = await client.query(
        `select parameter_values from rule_overrides where rule_id = 'coverage-multiple' limit 1`,
      );
      const values = rows[0]?.parameter_values as { coverageMultiple?: number } | undefined;
      return values?.coverageMultiple ?? 3;
    });
    await expect(chip).toContainText(`${multiple}× IS THE RULE`);

    // Never a ratio without its denominator: coverage is measured against goal MINUS won, and the
    // goal is on screen, so the basis has to be too.
    await expect(metrics).toContainText("still to raise");
    await expect(metrics).toContainText(`of qualified asks missing to reach ${multiple}×`);
  });

  test("Fix first is collapsed, expands in place, and computes its own time claim", async ({
    page,
  }) => {
    await page.goto(BOARD);
    const block = page.locator('[data-testid="fix-first"]');
    await expect(block).toBeVisible();

    // Collapsed: a summary line and a review affordance, nothing else. This is what buys item #1
    // its place above the fold at 1280x800.
    await expect(page.locator('[data-testid="fix-first-items"]')).toHaveCount(0);
    const summary = page.locator('[data-testid="fix-first-summary"]');
    await expect(summary).toContainText(/contradicts? (itself|themselves)/);
    await expect(summary).toContainText(/clear (it|them) in/);

    await page.locator('[data-testid="fix-first-toggle"]').click();
    const items = page.locator('[data-testid="fix-first-item"]');
    await expect(items.first()).toBeVisible();

    // Each item carries the quantified consequence and an effort estimate — the actual effect on
    // the actual numbers, not a generic warning.
    await expect(items.first().locator(".f95-monocap")).toBeVisible();
    await expect(items.first().locator(".f95-rulechip")).toHaveAttribute(
      "href",
      /^\/rules\/[a-z0-9-]+$/,
    );
  });

  test("below the cut renders the branch the engine computed", async ({ page }) => {
    await page.goto(BOARD);
    const below = page.locator('[data-testid="below-cut"]');
    await expect(below).toBeVisible();
    await expect(below).toContainText("ranked below the cut");
    // One of the two branches, never both, and never a claim the engine did not make.
    const text = (await below.textContent()) ?? "";
    const inert = text.includes("none of them change this week's number");
    const material = /together they hold \$[\d,]+/.test(text);
    expect(inert !== material, `below-cut rendered neither or both branches: ${text}`).toBe(true);
  });

  test("the primary action names the artifact and does not pretend to be one", async ({ page }) => {
    await page.goto(BOARD);
    const card = page.locator('[data-testid="queue-card"]').first();
    await card.locator('[data-testid="primary-action"]').click();

    const panel = card.locator('[data-testid="draft-placeholder"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Not built yet");
    await expect(panel).toContainText("will draft");
    // A plausible-looking draft in a screenshot is read as working software.
    await expect(panel).toContainText("Drafting arrives in I28");
  });

  test("a card action under the job tray is still clickable", async ({ page }) => {
    // The tray is a fixed ~40x40 pill at bottom-right, and the cards' action column runs to the
    // right gutter, so at some scroll position one sits over the other. H2 made the tray
    // click-transparent except for its own controls; this asserts that still holds against a real
    // Board card rather than trusting it, because re-introducing the interception here would be
    // invisible until someone demoed it.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BOARD);
    const tray = page.locator('[data-testid="job-tray"]');
    await expect(tray).toBeVisible();
    const trayBox = (await tray.boundingBox())!;

    const cards = page.locator('[data-testid="queue-card"]');
    const count = await cards.count();
    let covered = -1;
    for (let i = 0; i < count; i += 1) {
      const button = cards.nth(i).locator('[data-testid="why-it-ranks"]');
      const box = await button.boundingBox();
      if (!box) continue;
      const overlaps =
        box.x < trayBox.x + trayBox.width &&
        box.x + box.width > trayBox.x &&
        box.y < trayBox.y + trayBox.height &&
        box.y + box.height > trayBox.y;
      if (overlaps) {
        covered = i;
        break;
      }
    }

    // If nothing overlaps at this viewport the hazard does not exist; take the last card anyway so
    // the click itself is still exercised.
    const target = cards.nth(covered >= 0 ? covered : count - 1);
    await target.locator('[data-testid="why-it-ranks"]').click({ timeout: 5000 });
    await expect(target.locator('[data-testid="why-panel"]')).toBeVisible();
  });

  test("Why it ranks here shows the rules and the arithmetic, on the card", async ({ page }) => {
    await page.goto(BOARD);
    const card = page.locator('[data-testid="queue-card"]').first();
    await card.locator('[data-testid="why-it-ranks"]').click();

    const panel = card.locator('[data-testid="why-panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("MOVING THIS CHANGES QUALIFIED ASKS BY");
    await expect(panel).toContainText("URGENCY ×");
    await expect(panel.locator(".f95-rulechip").first()).toBeVisible();
  });
});

test.describe.serial("The Board — pin and dismiss", () => {
  test.afterEach(async () => {
    // Through the database, and unconditionally. A cleanup that drives the browser can only work
    // if the page is healthy, which is exactly what it is not after the test it is cleaning up
    // behind has failed (H3).
    await withDb(async (client) => {
      await client.query("delete from queue_decisions");
    });
  });

  test("pinning moves an item to the top, and unpinning puts it back", async ({ page }) => {
    await page.goto(BOARD);
    const cards = page.locator('[data-testid="queue-card"]');
    const originalFirst = await cards.first().getAttribute("data-opportunity-id");
    const target = cards.nth(2);
    const targetId = await target.getAttribute("data-opportunity-id");
    expect(targetId).not.toBe(originalFirst);

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      target.locator('[data-testid="pin-button"]').click(),
    ]);
    await expect(cards.first()).toHaveAttribute("data-opportunity-id", targetId!);
    await expect(cards.first()).toContainText("Pinned");

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      cards.first().locator('[data-testid="pin-button"]').click(),
    ]);
    await expect(cards.first()).toHaveAttribute("data-opportunity-id", originalFirst!);
  });

  test("dismissing removes an item, says so, and the restore brings it back", async ({ page }) => {
    await page.goto(BOARD);
    const cards = page.locator('[data-testid="queue-card"]');
    const before = await cards.count();
    const dismissedId = await cards.first().getAttribute("data-opportunity-id");

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      cards.first().locator('[data-testid="dismiss-button"]').click(),
    ]);
    await expect(cards.first()).not.toHaveAttribute("data-opportunity-id", dismissedId!);

    // A dismissal the user cannot see or undo is a one-way trapdoor: a mis-click silently hides
    // coaching from the person it was written for.
    const toggle = page.locator('[data-testid="dismissed-toggle"]');
    await expect(toggle).toContainText("1 dismissed");
    await toggle.click();
    await expect(page.locator('[data-testid="dismissed-list"]')).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page
        .locator('[data-testid="dismissed-list"]')
        .getByRole("button", { name: "Restore" })
        .click(),
    ]);
    await expect(cards).toHaveCount(before);
    await expect(page.locator('[data-testid="dismissed-toggle"]')).toHaveCount(0);
  });
});

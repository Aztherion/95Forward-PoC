import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";

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

// Overrides are tenant-wide and the suite shares a database with the other worker. Clearing them
// between tests keeps each assertion about its own edit, and leaves the demo as it shipped.
async function clearOverrides(): Promise<void> {
  await withDb(async (client) => {
    await client.query("delete from rule_overrides");
    await client.query("delete from rule_changes");
    await client.query("delete from proposed_rules");
  });
}

const RULES = "/rules";
const COVERAGE = "/rules/coverage-multiple";

test.describe.serial("95 Forward — the Rules of Robb", () => {
  test.afterAll(clearOverrides);

  test("lists the doctrine, grouped, with the statement leading and the id in mono", async ({
    page,
  }) => {
    await page.goto(RULES);
    await expect(page.locator('[data-testid="rules-page"]')).toBeVisible();

    // Grouped by category rather than listed flat.
    await expect(page.locator('[data-testid="rules-group-forecast-hygiene"]')).toBeVisible();
    await expect(page.locator('[data-testid="rules-group-coverage-parameters"]')).toBeVisible();

    // The two Rules of Robb likelihood lines bind to I20's existing checks — no duplicates.
    const evidence = page.locator('[data-testid="rule-probability-below-evidence"]');
    await expect(evidence).toContainText("the likelihood of booking should be High");
    await expect(evidence.locator("code")).toHaveText("probability-below-evidence");

    await expect(
      page.locator('[data-testid="rule-probability-above-visit-rating"]'),
    ).toContainText("If the Visit rating is poor");
  });

  test("shows the goals in priority order, year before quarter", async ({ page }) => {
    await page.goto(RULES);
    const goals = page.locator('[data-testid="rules-goals-list"] li');
    await expect(goals.first()).toContainText("Total Most Likely bookings by end of year");
    await expect(goals.nth(1)).toContainText("Total Most Likely bookings for next quarter");
  });

  test("says what a rule is firing on, and the detail page lists the records", async ({ page }) => {
    await page.goto(RULES);
    const row = page.locator('[data-testid="rule-firing-probability-below-evidence"]');
    await expect(row).toContainText("Firing on");

    await page.locator('[data-testid="rule-probability-below-evidence"]').click();
    await expect(page).toHaveURL(/\/rules\/probability-below-evidence$/);
    await expect(page.locator('[data-testid="rule-firing"]')).toContainText("Firing on");
  });

  test("round-trips an edit: change it, see it, reset it", async ({ page }) => {
    await page.goto(COVERAGE);

    const multiple = page.locator('[data-testid="param-multiple"] input');
    await expect(multiple).toHaveValue("3");

    await multiple.fill("4");
    const saved = page.waitForResponse((r) => r.request().method() === "POST");
    await page.locator('[data-testid="rule-save"]').click();
    await saved;

    await page.reload();
    await expect(page.locator('[data-testid="param-multiple"] input')).toHaveValue("4");
    await expect(page.locator('[data-testid="rule-changed-banner"]')).toBeVisible();

    // The list agrees with the detail page — one resolution, read twice.
    await page.goto(RULES);
    await expect(page.locator('[data-testid="rule-changed-coverage-multiple"]')).toBeVisible();

    // And the audit trail says who did it.
    await expect(page.locator('[data-testid="rules-change-trail"]')).toContainText(
      "coverage-multiple",
    );

    await page.goto(COVERAGE);
    const reset = page.waitForResponse((r) => r.request().method() === "POST");
    await page.locator('[data-testid="rule-reset"]').click();
    await reset;
    await page.reload();
    await expect(page.locator('[data-testid="param-multiple"] input')).toHaveValue("3");
  });

  test("refuses an out-of-bounds value instead of quietly clamping it", async ({ page }) => {
    await page.goto(COVERAGE);

    // The form is noValidate, so this reaches the server — which is the only place that can
    // be trusted to refuse it.
    await page.locator('[data-testid="param-multiple"] input').fill("0");
    const responded = page.waitForResponse((r) => r.request().method() === "POST");
    await page.locator('[data-testid="rule-save"]').click();
    await responded;

    await expect(page.locator('[data-testid="param-multiple"]')).toContainText("must be at least 1");

    // Nothing was written — not the value, and not a clamped stand-in for it.
    const rows = await withDb((client) =>
      client.query("select parameter_values from rule_overrides where rule_id = 'coverage-multiple'"),
    );
    expect(rows.rows).toHaveLength(0);

    await page.reload();
    await expect(page.locator('[data-testid="param-multiple"] input')).toHaveValue("3");
  });

  test("captures a proposed rule and marks it not active", async ({ page }) => {
    await page.goto(RULES);

    const statement = "Never let a lapsed major donor go two years without a visit.";
    await page.locator('[data-testid="propose-rule-input"]').fill(statement);
    const saved = page.waitForResponse((r) => r.request().method() === "POST");
    await page.getByRole("button", { name: "Propose this rule" }).click();
    await saved;

    await page.reload();
    const list = page.locator('[data-testid="proposed-rules-list"]');
    await expect(list).toContainText(statement);
    await expect(list).toContainText("Not active");

    // Captured, not compiled: it did not become a rule with a predicate behind it.
    await expect(
      page.locator(".f95-rule__statement", { hasText: "lapsed major donor" }),
    ).toHaveCount(0);
  });
});

import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";

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

const SETTINGS = "/settings";
const RESEARCH_TOGGLE = "Let the copilot research public sources";

function weight(page: Page, dimension: string) {
  return page.locator(`[data-testid="qpi-weight-${dimension}"]`);
}

test.describe.serial("95 Forward — settings", () => {
  test("shows the QPI weights editor summing to 100", async ({ page }) => {
    await page.goto(SETTINGS);
    await expect(page.locator('[data-testid="settings-qpi-weights-section"]')).toBeVisible();
    await expect(page.getByText("QPI weights")).toBeVisible();
    await expect(page.locator('[data-testid="qpi-weights-sum"]')).toHaveText(
      "Points sum to 100 / 100",
    );
  });

  test("adjusts a weight and keeps the points readout and the stepper max in sync", async ({
    page,
  }) => {
    await page.goto(SETTINGS);

    const capacity = weight(page, "capacity");
    await expect(capacity.locator('[data-testid="qpi-weight-value"]')).toHaveText("7");
    await expect(capacity.locator('[data-testid="qpi-weight-max"]')).toHaveText("35 pts max");

    await page.getByRole("button", { name: "Raise Capacity weight" }).click();
    await expect(capacity.locator('[data-testid="qpi-weight-value"]')).toHaveText("8");
    await expect(capacity.locator('[data-testid="qpi-weight-max"]')).toHaveText("40 pts max");
    await expect(page.locator('[data-testid="qpi-weights-sum"]')).toHaveText(
      "Points sum to 105 / 100",
    );

    await page.getByRole("button", { name: "Lower Capacity weight" }).click();
    await expect(capacity.locator('[data-testid="qpi-weight-value"]')).toHaveText("7");
    await expect(page.locator('[data-testid="qpi-weights-sum"]')).toHaveText(
      "Points sum to 100 / 100",
    );
  });

  test("resets the weights to the Cap/Rel/Tim/GH/Phil defaults", async ({ page }) => {
    await page.goto(SETTINGS);

    await page.getByRole("button", { name: "Raise Timing weight" }).click();
    await page.getByRole("button", { name: "Raise Timing weight" }).click();
    await expect(weight(page, "timing").locator('[data-testid="qpi-weight-value"]')).toHaveText(
      "5",
    );

    await page.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(weight(page, "capacity").locator('[data-testid="qpi-weight-value"]')).toHaveText(
      "7",
    );
    await expect(
      weight(page, "relationship").locator('[data-testid="qpi-weight-value"]'),
    ).toHaveText("6");
    await expect(weight(page, "timing").locator('[data-testid="qpi-weight-value"]')).toHaveText(
      "3",
    );
    await expect(
      weight(page, "gift_history").locator('[data-testid="qpi-weight-value"]'),
    ).toHaveText("2");
    await expect(
      weight(page, "philanthropy").locator('[data-testid="qpi-weight-value"]'),
    ).toHaveText("2");
    await expect(page.locator('[data-testid="qpi-weights-sum"]')).toHaveText(
      "Points sum to 100 / 100",
    );
  });

  test("defaults the three copilot toggles ON and persists a change", async ({ page }) => {
    await withDb(async (client) => {
      await client.query(
        "update tenant_settings set research_public_sources = true, propose_qpi_updates_automatically = true, draft_24h_followups = true",
      );
    });

    await page.goto(SETTINGS);
    await expect(page.locator('[data-testid="settings-copilot-section"]')).toBeVisible();

    const toggles = page.locator('[data-testid^="copilot-toggle-"] input[type=checkbox]');
    await expect(toggles).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      await expect(toggles.nth(index)).toBeChecked();
    }

    // The "Preferences saved." span is driven by useActionState, which revalidatePath("/settings")
    // can remount away before this assertion observes it; wait on the POST completing instead, then
    // prove persistence via reload — the deterministic signal the other specs use.
    const research = page.getByLabel(RESEARCH_TOGGLE);
    await research.uncheck({ force: true });
    const saved1 = page.waitForResponse((r) => r.request().method() === "POST");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await saved1;

    await page.reload();
    await expect(page.getByLabel(RESEARCH_TOGGLE)).not.toBeChecked();

    await page.getByLabel(RESEARCH_TOGGLE).check({ force: true });
    const saved2 = page.waitForResponse((r) => r.request().method() === "POST");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await saved2;
    await page.reload();
    await expect(page.getByLabel(RESEARCH_TOGGLE)).toBeChecked();
  });

  test("shows the copilot reassurance footer", async ({ page }) => {
    await page.goto(SETTINGS);
    await expect(page.locator('[data-testid="settings-reassurance"]')).toContainText(
      "The copilot proposes, you dispose",
    );
  });
});

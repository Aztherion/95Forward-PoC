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

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

const HALLWORTH = "The Hallworth Family Foundation";
const BELLO = "Dr. Aisha Bello";
const NORTHWATER = "Northwater Capital";
const OSGOOD = "The Osgood Foundation";
const VEGA = "Marisol Vega";

type Cleanup = (page: Page) => Promise<void>;

let cleanups: Cleanup[] = [];

function registerCleanup(cleanup: Cleanup): void {
  cleanups.push(cleanup);
}

async function openProspectByName(page: Page, name: string): Promise<string> {
  await page.goto("/95-forward/prospects");
  await page.locator('[data-testid="prospect-row"]').filter({ hasText: name }).first().click();
  await page.waitForURL(/\/95-forward\/prospects\/[0-9a-f-]+/);
  await expect(page.locator(".f95-record-head__title")).toHaveText(name);
  await expect(qpiTotal(page)).toBeVisible();
  return new URL(page.url()).pathname;
}

function qpiTotal(page: Page) {
  return page.locator('[data-testid="prospect-qpi"] .f95-qpi__num');
}

async function openAdjustForm(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: "Adjust the score" }).first();
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(page.locator("select[name=dimension]")).toHaveCount(1);
}

async function overrideDimension(page: Page, dimension: string, rating: string): Promise<void> {
  await openAdjustForm(page);
  await page.selectOption("select[name=dimension]", dimension);
  await page.selectOption("select[name=rating]", rating);
  await page.getByRole("button", { name: "Save the rating" }).click();
  await expect(page.locator("select[name=dimension]")).toHaveCount(0, { timeout: 15000 });
}

async function markDimensionUnknown(page: Page, dimension: string): Promise<void> {
  await openAdjustForm(page);
  await page.selectOption("select[name=dimension]", dimension);
  await page.check("input[name=isUnknown]");
  await page.getByRole("button", { name: "Save the rating" }).click();
  await expect(page.locator("select[name=dimension]")).toHaveCount(0, { timeout: 15000 });
}

async function restoreDimensionRating(
  page: Page,
  path: string,
  dimension: string,
  rating: string,
  expectedTotal: string,
): Promise<void> {
  await page.goto(path);
  await expect(qpiTotal(page)).toBeVisible();
  if ((await qpiTotal(page).innerText()) !== expectedTotal) {
    await overrideDimension(page, dimension, rating);
  }
  await expect(qpiTotal(page)).toHaveText(expectedTotal);
}

async function restoreDimensionUnknown(
  page: Page,
  path: string,
  dimension: string,
  expectedTotal: string,
): Promise<void> {
  await page.goto(path);
  await expect(qpiTotal(page)).toBeVisible();
  if ((await qpiTotal(page).innerText()) !== expectedTotal) {
    await markDimensionUnknown(page, dimension);
  }
  await expect(qpiTotal(page)).toHaveText(expectedTotal);
}

async function reassignRm(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: "Reassign" }).click();
  await page.waitForSelector("select[name=rmUserId]");
  await page.selectOption("select[name=rmUserId]", { label });
  await page
    .locator("form")
    .filter({ has: page.locator("select[name=rmUserId]") })
    .getByRole("button", { name: "Save" })
    .click();
  await expect(page.locator("select[name=rmUserId]")).toHaveCount(0);
}

test.describe.serial("95 Forward — prospect overview", () => {
  test.beforeEach(() => {
    cleanups = [];
  });

  test.afterEach(async ({ page }) => {
    const pending = [...cleanups];
    cleanups = [];
    for (const cleanup of pending) {
      await cleanup(page);
    }
  });

  test("renders the QPI total and band for Hallworth", async ({ page }) => {
    await openProspectByName(page, HALLWORTH);
    await expect(qpiTotal(page)).toHaveText("92");
    await expect(page.locator('[data-testid="prospect-qpi"] .f95-qpi__tier')).toContainText("Go");
  });

  test("expands the breakdown to all five weighted dimensions", async ({ page }) => {
    await openProspectByName(page, HALLWORTH);
    await page.getByRole("button", { name: /See inside the score/ }).click();
    await expect(page.getByRole("button", { name: /Hide the math/ })).toBeVisible();

    const parts = page.locator(".f95-qpi__part");
    await expect(parts).toHaveCount(5);
    await expect(parts.locator(".f95-qpi__plabel")).toHaveText([
      "Capacity",
      "Relationship",
      "Timing",
      "Gift history",
      "Philanthropy",
    ]);
    for (let index = 0; index < 5; index += 1) {
      await expect(parts.nth(index).locator(".f95-qpi__pscore")).toContainText("/");
    }
  });

  test("shows an unknown dimension as a gap contributing zero, not a guess", async ({ page }) => {
    await openProspectByName(page, BELLO);
    await expect(qpiTotal(page)).toHaveText("40");
    await page.getByRole("button", { name: /See inside the score/ }).click();

    const capacity = page.locator(".f95-qpi__part").filter({ hasText: "Capacity" });
    await expect(capacity.locator(".f95-qpi__pscore--gap")).toHaveText("Unknown");
    await expect(capacity.locator(".f95-qpi__prating")).toHaveCount(0);
  });

  test("a human override of a dimension changes the displayed total", async ({ page }) => {
    const path = await openProspectByName(page, HALLWORTH);
    registerCleanup((p) => restoreDimensionRating(p, path, "relationship", "4", "92"));

    await expect(qpiTotal(page)).toHaveText("92");
    await overrideDimension(page, "relationship", "1");
    await expect(qpiTotal(page)).toHaveText("74");
  });

  test("approving an AI QPI suggestion recomputes the score and fills the gap", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const path = await openProspectByName(page, BELLO);
    registerCleanup((p) => restoreDimensionUnknown(p, path, "capacity", "40"));

    await expect(qpiTotal(page)).toHaveText("40");

    const copilot = page.locator('[data-testid="prospect-copilot"]');
    await copilot.getByRole("button", { name: "Ask the copilot" }).click();

    const suggestion = copilot.locator(".f95-prov").filter({ hasText: "Capacity" });
    await expect(suggestion).toBeVisible({ timeout: 15000 });
    await expect(suggestion.locator(".f95-prov__from")).toHaveText("Unknown");
    await expect(suggestion.locator(".f95-prov__to")).toHaveText("5");
    await expect(suggestion.locator(".f95-src")).toBeVisible();

    await suggestion.getByRole("button", { name: "Approve" }).click();
    await expect(qpiTotal(page)).toHaveText("75");
    await page.reload();
    await expect(qpiTotal(page)).toHaveText("75");
    await expect(copilot.locator(".f95-prov")).toHaveCount(0, { timeout: 15000 });
  });

  test("dismissing an AI QPI suggestion applies nothing", async ({ page }) => {
    test.setTimeout(60_000);
    await openProspectByName(page, NORTHWATER);
    await expect(qpiTotal(page)).toHaveText("48");

    const copilot = page.locator('[data-testid="prospect-copilot"]');
    await copilot.getByRole("button", { name: "Ask the copilot" }).click();

    const suggestion = copilot.locator(".f95-prov").filter({ hasText: "Capacity" });
    await expect(suggestion).toBeVisible({ timeout: 15000 });

    await suggestion.getByRole("button", { name: "Dismiss" }).click();
    await expect(qpiTotal(page)).toHaveText("48");
    await page.reload();
    await expect(qpiTotal(page)).toHaveText("48");
    await expect(copilot.locator(".f95-prov")).toHaveCount(0, { timeout: 15000 });
  });

  test("assigns a relationship manager and persists the change", async ({ page }) => {
    const path = await openProspectByName(page, OSGOOD);
    const team = page.locator('[data-testid="relationship-team"]');
    await expect(team).toContainText("Priya Nair");
    registerCleanup(async (p) => {
      await p.goto(path);
      const t = p.locator('[data-testid="relationship-team"]');
      await expect(t).toBeVisible();
      if (!(await t.innerText()).includes("Priya Nair")) {
        await reassignRm(p, "Priya Nair");
      }
      await expect(t).toContainText("Priya Nair");
    });

    await reassignRm(page, "Dana Reese");
    await page.reload();
    await expect(team).toContainText("Dana Reese");
  });

  test("adds a natural partner and shows it on the relationship team", async ({ page }) => {
    await openProspectByName(page, VEGA);
    const team = page.locator('[data-testid="relationship-team"]');

    const partnerName = `E2E Partner ${uniqueSuffix()}`;
    registerCleanup(async () => {
      await withDb(async (client) => {
        await client.query("delete from natural_partners where external_name = $1", [partnerName]);
      });
    });

    await team.getByRole("button", { name: "Add natural partner" }).click();
    await page.waitForSelector("input[name=externalName]");
    await page.fill("input[name=externalName]", partnerName);
    await page.getByRole("button", { name: "Add partner" }).click();

    await page.reload();
    await expect(
      page
        .locator('[data-testid="relationship-team"] .f95-itemrow')
        .filter({ hasText: partnerName }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("offers Knowledge Base, Strategy, and Visits tabs as realized screens", async ({ page }) => {
    await openProspectByName(page, HALLWORTH);

    await page.getByRole("tab", { name: "Knowledge Base" }).click();
    await page.waitForURL(/tab=knowledge/);
    await expect(page.getByRole("tabpanel")).toContainText("What we know");

    await page.getByRole("tab", { name: "Strategy" }).click();
    await page.waitForURL(/tab=strategy/);
    await expect(page.getByRole("tabpanel")).toContainText("Strategy");

    await page.getByRole("tab", { name: "Visits & Asks" }).click();
    await page.waitForURL(/tab=visits/);
    const visitsPanel = page.getByRole("tabpanel");
    await expect(visitsPanel).toContainText("Execution");
    await expect(visitsPanel.locator('[data-testid="visits-list"]')).toBeVisible();
    await expect(visitsPanel.locator('[data-testid="asks-list"]')).toBeVisible();
  });
});

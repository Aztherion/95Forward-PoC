import { test, expect, type Page } from "@playwright/test";

const HALLWORTH = "The Hallworth Family Foundation";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function gotoConstituents(page: Page): Promise<void> {
  await page.goto("/constituents");
  await expect(page.locator(".f95-page__title")).toHaveText("Constituents");
}

test.describe("constituents — host CRM register", () => {
  test("renders the host register, not 95-forward", async ({ page }) => {
    await gotoConstituents(page);
    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="host"]')).toBeVisible();
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);
  });

  test("browses, searches, filters, and saves a view", async ({ page }) => {
    await gotoConstituents(page);

    await expect(page.locator(".f95-table tbody tr").first()).toBeVisible();
    const initialRows = await page.locator(".f95-table tbody tr").count();
    expect(initialRows).toBeGreaterThan(0);

    const search = page.getByLabel("Search", { exact: true });
    await search.fill("Hallworth");
    await search.press("Enter");
    await page.waitForURL(/search=Hallworth/);
    const matchRows = page.locator(".f95-table tbody tr");
    await expect(matchRows).toHaveCount(1);
    await expect(matchRows.first()).toContainText(HALLWORTH);

    await gotoConstituents(page);
    await page.getByLabel("Type", { exact: true }).selectOption("foundation");
    await page.waitForURL(/type=foundation/);
    const foundationRows = page.locator(".f95-table tbody tr");
    const foundationCount = await foundationRows.count();
    expect(foundationCount).toBeGreaterThan(0);
    const typeCells = await page.locator(".f95-table tbody tr td:nth-child(2)").allInnerTexts();
    for (const cell of typeCells) {
      expect(cell.trim()).toBe("Foundation");
    }

    const viewName = `E2E view ${uniqueSuffix()}`;
    await page.getByRole("button", { name: "Save view" }).click();
    await page.getByLabel("View name").fill(viewName);
    await page.getByRole("button", { name: /^Save view$/ }).click();
    await page.waitForLoadState("networkidle");

    await page.goto("/constituents");
    await page.getByRole("button", { name: "Views" }).click();
    const savedViewButton = page.locator("button.f95-table__cell-link", { hasText: viewName });
    await expect(savedViewButton).toBeVisible();

    await savedViewButton.click();
    await page.waitForURL(/type=foundation/);
    await expect(page.getByLabel("Type", { exact: true })).toHaveValue("foundation");
    const restoredCount = await page.locator(".f95-table tbody tr").count();
    expect(restoredCount).toBe(foundationCount);
  });

  test("shows the opaque major-gift likelihood foil and seeded tabs on a record", async ({
    page,
  }) => {
    await page.goto("/constituents?search=Hallworth");
    await page.locator(".f95-table tbody tr td a").first().click();
    await page.waitForURL(/\/constituents\/[0-9a-f-]+/);
    await expect(page.locator(".f95-record-head__title")).toHaveText(HALLWORTH);

    const foil = page.locator(".f95-foil");
    await expect(foil).toBeVisible();
    await expect(foil.locator(".f95-foil__value")).toHaveText(/^\d+$/);
    await expect(foil).toContainText("Major-gift likelihood");
    const foilText = (await foil.innerText()).toLowerCase();
    expect(foilText).not.toContain("provenance");
    expect(foilText).not.toContain("breakdown");
    expect(foilText).not.toContain("because");

    await page.getByRole("tab", { name: "Giving history" }).click();
    await page.waitForURL(/tab=giving/);
    await expect(page.locator(".f95-table")).toBeVisible();
    await expect(page.getByText("$200,000").first()).toBeVisible();

    await page.getByRole("tab", { name: "Relationships" }).click();
    await page.waitForURL(/tab=relationships/);
    await expect(page.getByRole("tabpanel")).toContainText("Hallworth");

    await page.getByRole("tab", { name: "Actions" }).click();
    await page.waitForURL(/tab=actions/);
    await expect(page.getByRole("tabpanel")).toContainText("Actions");

    await page.getByRole("tab", { name: "Tags" }).click();
    await page.waitForURL(/tab=tags/);
    await expect(page.getByRole("tabpanel")).toContainText("Tags");
  });

  test("creates a new constituent and finds it via search", async ({ page }) => {
    const personName = `E2E Person ${uniqueSuffix()}`;
    await gotoConstituents(page);
    await page.getByRole("link", { name: "Add constituent" }).click();
    await page.waitForURL(/\/constituents\/new/);

    await page.getByLabel("Type", { exact: true }).selectOption("individual");
    await page.getByLabel("Display name", { exact: true }).fill(personName);
    await page.getByRole("button", { name: "Add constituent" }).click();

    await page.waitForURL(/\/constituents\/[0-9a-f-]+$/);
    await expect(page.locator(".f95-record-head__title")).toHaveText(personName);

    await page.goto(`/constituents?search=${encodeURIComponent(personName)}`);
    const rows = page.locator(".f95-table tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(personName);
  });

  test("edits a constituent and persists the change on the record", async ({ page }) => {
    const personName = `E2E Edit ${uniqueSuffix()}`;
    const newCity = `E2ECity${uniqueSuffix()}`;

    await page.goto("/constituents/new");
    await page.getByLabel("Type", { exact: true }).selectOption("individual");
    await page.getByLabel("Display name", { exact: true }).fill(personName);
    await page.getByRole("button", { name: "Add constituent" }).click();
    await page.waitForURL(/\/constituents\/[0-9a-f-]+$/);
    const recordUrl = page.url();

    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL(/\/edit$/);
    await page.getByLabel("City").fill(newCity);
    await page.getByRole("button", { name: "Save changes" }).click();

    await page.waitForURL(recordUrl);
    await expect(page.locator(".f95-record-head__meta")).toContainText(newCity);
  });
});

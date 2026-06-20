import { test, expect } from "@playwright/test";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

test.describe("lists — host CRM register", () => {
  test("renders the saved lists index in the host register", async ({ page }) => {
    await page.goto("/lists");
    await expect(page.locator(".f95-page__title")).toHaveText("Lists");
    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);
  });

  test("builds a constituent list, previews a count, saves it, and runs it", async ({ page }) => {
    const listName = `E2E list ${uniqueSuffix()}`;

    await page.goto("/lists");
    await page.getByRole("link", { name: "Build a list" }).first().click();
    await page.waitForURL(/\/lists\/new/);
    await expect(page.locator(".f95-page__title")).toHaveText("Build a list");

    await page.getByRole("button", { name: "Add filter" }).click();
    await page.getByLabel("Filter field").selectOption("type");
    await page.getByLabel("Filter value").selectOption("foundation");
    await page.waitForURL(/value%22%3A%22foundation/);

    const previewValue = page.locator(".f95-stat__value");
    await expect(previewValue).toHaveText(/\d+ records?/);
    const previewText = await previewValue.innerText();
    const previewCount = Number(previewText.match(/\d+/)?.[0] ?? "0");
    expect(previewCount).toBeGreaterThan(0);

    await page.getByLabel("List name").fill(listName);
    await page.getByRole("button", { name: "Save list" }).click();
    await page.waitForURL(/\/lists\/[0-9a-f-]+$/);
    await expect(page.locator(".f95-page__title")).toHaveText(listName);

    const savedRows = await page.locator(".f95-table tbody tr").count();
    expect(savedRows).toBe(previewCount);
    const typeCells = await page.locator(".f95-table tbody tr td:nth-child(2)").allInnerTexts();
    for (const cell of typeCells) {
      expect(cell.trim()).toBe("Foundation");
    }

    await page.goto("/lists");
    await expect(page.locator("main")).toContainText(listName);

    await page.getByRole("link", { name: listName }).click();
    await page.waitForURL(/\/lists\/[0-9a-f-]+$/);
    await expect(page.locator(".f95-table tbody tr")).toHaveCount(previewCount);
  });
});

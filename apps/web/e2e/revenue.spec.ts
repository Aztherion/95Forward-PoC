import { test, expect } from "@playwright/test";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

test.describe("revenue — host CRM register", () => {
  test("renders the gifts list, summary strip, and host register", async ({ page }) => {
    await page.goto("/revenue");
    await expect(page.locator(".f95-page__title")).toHaveText("Revenue");
    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);

    const statLabels = page.locator(".f95-statgrid .f95-stat__label");
    await expect(statLabels).toHaveText(["Total raised", "Gifts", "Average gift"]);

    await expect(page.locator(".f95-table tbody tr").first()).toBeVisible();
    const rows = await page.locator(".f95-table tbody tr").count();
    expect(rows).toBeGreaterThan(0);
  });

  test("records a gift that appears on the revenue list and the donor giving history", async ({
    page,
  }) => {
    const donorName = `E2E Donor ${uniqueSuffix()}`;
    const amountDollars = 1_000_000 + Math.floor(Math.random() * 99_999);
    const amountDisplay = `$${amountDollars.toLocaleString("en-US")}`;

    await page.goto("/constituents/new");
    await page.getByLabel("Type", { exact: true }).selectOption("individual");
    await page.getByLabel("Display name", { exact: true }).fill(donorName);
    await page.getByRole("button", { name: "Add constituent" }).click();
    await page.waitForURL(/\/constituents\/([0-9a-f-]+)$/);
    const donorId = page.url().split("/").pop() as string;

    await page.goto(`/revenue/new?constituent=${donorId}`);
    await expect(page.locator(".f95-page__title")).toHaveText("Record a gift");
    await expect(page.getByLabel("Donor")).toHaveValue(donorId);
    await page.getByLabel("Amount (USD)").fill(String(amountDollars));
    await page.getByLabel("Date", { exact: true }).fill("2026-05-01");
    await page.getByLabel("Gift type").selectOption("one_time");
    await page.getByRole("button", { name: "Record gift" }).click();
    await page.waitForURL(/\/revenue$/);

    await page.goto("/revenue?sort=amount&dir=desc");
    const giftRow = page.locator(".f95-table tbody tr", { hasText: donorName });
    await expect(giftRow).toHaveCount(1);
    await expect(giftRow).toContainText(amountDisplay);

    await page.goto(`/constituents/${donorId}?tab=giving`);
    await expect(page.getByRole("tab", { name: "Giving history" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator(".f95-table")).toContainText(amountDisplay);
  });
});

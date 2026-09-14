import { test, expect } from "@playwright/test";

const SEARCH = "/95-forward/search";
const HALLWORTH = "The Hallworth Family Foundation";

test.describe("95 Forward — natural-language search", () => {
  test("matches a seeded prospect by name and renders provenance", async ({ page }) => {
    await page.goto(SEARCH);
    await page.getByLabel("Search prospects").fill("Hallworth");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL(/q=Hallworth/);

    await expect(page.getByRole("heading", { name: "Who this is about" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What we found" })).toBeVisible();

    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches).toHaveCount(1);
    await expect(matches.first()).toContainText(HALLWORTH);
    await expect(matches.first()).toHaveAttribute("href", /\/95-forward\/prospects\/[0-9a-f-]+/);

    await expect(page.locator(".f95-src").first()).toBeVisible();
  });

  test("surfaces matching prospects via the mock keyword fallback", async ({ page }) => {
    await page.goto(`${SEARCH}?q=capacity`);
    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toBeVisible();
    expect(await matches.count()).toBeGreaterThanOrEqual(1);
    await expect(page.locator(".f95-src").first()).toBeVisible();
  });

  test("answers a clearly-unknown query with a first-class unknown, not a fabrication", async ({
    page,
  }) => {
    await page.goto(`${SEARCH}?q=${encodeURIComponent("zzqwx nonsense unanswerable 99x")}`);
    await expect(page.locator('[data-testid="search-match"]')).toHaveCount(0);
    await expect(page.getByText("No matched prospects")).toBeVisible();
    await expect(page.getByText("Unknown — worth researching").first()).toBeVisible();
  });
});

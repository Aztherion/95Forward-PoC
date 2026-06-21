import { test, expect } from "@playwright/test";

const SEARCH = "/95-forward/search";
const TODAY = "/95-forward/today";
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

test.describe("95 Forward — Today", () => {
  test("leads with the QPI-priority next-right-moves section", async ({ page }) => {
    await page.goto(TODAY);
    await expect(page.locator('[data-testid="today"]')).toBeVisible();
    await expect(page.locator(".f95-page__count")).toContainText("next right move");
    await expect(page.getByRole("heading", { name: "Your next right moves" })).toBeVisible();
  });

  test("scopes the portfolio between Me and Team", async ({ page }) => {
    await page.goto(TODAY);
    await expect(page.getByRole("tab", { name: "Me" })).toBeVisible();
    await page.getByRole("tab", { name: "Team" }).click();
    await page.waitForURL(/scope=team/);
    await expect(page.locator(".f95-page__count")).toContainText("team's prospects");
  });

  test("renders later-feed sections as hooks and empty-states without faking data", async ({
    page,
  }) => {
    await page.goto(TODAY);
    await expect(page.getByRole("heading", { name: "Follow-ups due" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's visits" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "From your copilot" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Coverage nudge" })).toBeVisible();
    await expect(page.getByText("No follow-ups due yet")).toBeVisible();
    await expect(page.getByText("No visits scheduled")).toBeVisible();
  });
});

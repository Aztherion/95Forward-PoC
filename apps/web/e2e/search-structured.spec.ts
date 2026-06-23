import { test, expect, type Page } from "@playwright/test";

const SEARCH = "/95-forward/search";
const HALLWORTH = "The Hallworth Family Foundation";

async function search(page: Page, query: string): Promise<void> {
  await page.goto(SEARCH);
  await page.getByLabel("Search prospects").fill(query);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL(/[?&]q=/);
}

test.describe("95 Forward — NL structured-query layer (Initiative 14)", () => {
  test("'QPI higher than 80' → pure-structured, returns the >80 prospects incl. Hallworth", async ({
    page,
  }) => {
    await search(page, "Prospects with QPI higher than 80");

    const interp = page.locator('[data-testid="interpreted-query"]');
    await expect(interp).toBeVisible();
    await expect(interp.locator('[data-testid="interpreted-filter"]')).toContainText("QPI > 80");

    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toBeVisible();
    await expect(matches).toContainText([HALLWORTH]);
    // Both Hallworth (92) and Cordova (83) are over 80; the demo seeds exactly these two.
    await expect(matches).toHaveCount(2);
  });

  test("'Foundations with high capacity' → structured (type + capacity), foundations only", async ({
    page,
  }) => {
    await search(page, "Foundations with high capacity");

    const filters = page.locator('[data-testid="interpreted-filter"]');
    await expect(filters).toContainText(["Type is foundation"]);
    await expect(filters).toContainText(["Capacity ≥ 4"]);

    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toBeVisible();
    // Every match is a Foundation (none individual/organization).
    const count = await matches.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i += 1) {
      await expect(matches.nth(i)).toContainText("Foundation");
    }
    await expect(matches).toContainText([HALLWORTH]);
  });

  test("'Not contacted in 60 days' → structured recency, a meaningful subset", async ({ page }) => {
    await search(page, "Not contacted in 60 days");

    await expect(page.locator('[data-testid="interpreted-filter"]')).toContainText(
      "Not contacted in 60 days",
    );
    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toBeVisible();
    const count = await matches.count();
    // A subset, not all 8 prospects (the seed gives 2 recently-contacted) and not zero.
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(8);
  });

  test("'Strong relationship to clean water' → hybrid (relationship filter + semantic)", async ({
    page,
  }) => {
    await search(page, "Strong relationship to clean water");

    const interp = page.locator('[data-testid="interpreted-query"]');
    await expect(interp.locator('[data-testid="interpreted-filter"]')).toContainText(
      "Relationship ≥ 4",
    );
    await expect(interp.locator('[data-testid="interpreted-semantic"]')).toContainText(
      "clean water",
    );

    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toBeVisible();
  });

  test("a pure-semantic query still works (name match), no structured filters", async ({
    page,
  }) => {
    await search(page, "Hallworth");
    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toContainText(HALLWORTH);
    // No structured filter chips for a free-text name query.
    await expect(page.locator('[data-testid="interpreted-filter"]')).toHaveCount(0);
  });

  test("an unparseable query falls back gracefully (no crash, first-class unknown)", async ({
    page,
  }) => {
    await search(page, "zzqwx nonsense unanswerable 99x");
    await expect(page.locator('[data-testid="search-match"]')).toHaveCount(0);
    await expect(page.getByText("No matched prospects")).toBeVisible();
  });
});

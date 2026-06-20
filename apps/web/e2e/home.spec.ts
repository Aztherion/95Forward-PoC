import { test, expect } from "@playwright/test";

test.describe("home dashboard — host CRM register", () => {
  test("renders live tiles and the opaque major-gift likelihood foil", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".f95-page__title")).toHaveText("Home");
    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);

    const statLabels = await page.locator(".f95-tilegrid .f95-stat__label").allInnerTexts();
    expect(statLabels.some((label) => /total raised/i.test(label))).toBe(true);

    await expect(page.getByText("Recent gifts")).toBeVisible();
    await expect(page.getByText("Recent activity")).toBeVisible();

    const foilCard = page.locator('[aria-label="Major-gift likelihood"]');
    await expect(foilCard).toBeVisible();
    await expect(foilCard.locator(".f95-foil__value")).toHaveText(/^\d+$/);

    const foilText = (await foilCard.innerText()).toLowerCase();
    expect(foilText).not.toContain("provenance");
    expect(foilText).not.toContain("breakdown");
    expect(foilText).not.toContain("because");
  });
});

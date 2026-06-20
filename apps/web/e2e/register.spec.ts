import { test, expect } from "@playwright/test";

const HOST_ROUTES = ["/", "/constituents"];

test.describe("register switch", () => {
  for (const route of HOST_ROUTES) {
    test(`renders the host register on ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('[data-register="host"]')).toHaveCount(1);
      await expect(page.locator('[data-register="host"]')).toBeVisible();
      await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);
    });
  }

  test("renders the 95-forward register on a /95-forward route", async ({ page }) => {
    await page.goto("/95-forward/today");
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toBeVisible();
    await expect(page.locator('[data-register="host"]')).toHaveCount(0);
  });
});

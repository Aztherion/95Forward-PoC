import { test, expect } from "@playwright/test";

test.describe("styleguide", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/styleguide");
  });

  test("mounts the styleguide root", async ({ page }) => {
    await expect(page.locator('[data-testid="styleguide"]')).toBeVisible();
  });

  test("renders design-system primitives", async ({ page }) => {
    await expect(page.locator(".f95-btn").first()).toBeVisible();
    await expect(page.locator(".f95-badge").first()).toBeVisible();
    await expect(page.locator(".f95-role").first()).toBeVisible();
    await expect(page.locator(".f95-horizon").first()).toBeVisible();
  });

  test("includes both host and 95-forward register sections", async ({ page }) => {
    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(1);
    await expect(page.locator('[data-register="host"]')).toBeVisible();
    await expect(page.locator('[data-register="95-forward"]')).toBeVisible();
  });
});

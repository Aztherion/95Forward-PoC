import { test, expect } from "@playwright/test";

test.describe("95 Forward group toggle", () => {
  test("expands and collapses on a host route", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".shell")).toBeVisible();

    const toggle = page.getByRole("button", { name: /95 Forward/ });
    const greenSheet = page.getByRole("link", { name: "Green Sheet" });

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(greenSheet).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(greenSheet).toBeVisible();
    await expect(page.getByRole("link", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Prospects" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Initiatives" })).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(greenSheet).toBeHidden();
  });

  test("is expanded automatically inside the 95 Forward register", async ({ page }) => {
    await page.goto("/95-forward/today");
    await expect(page.locator(".shell")).toBeVisible();

    const toggle = page.getByRole("button", { name: /95 Forward/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Green Sheet" })).toBeVisible();
  });
});

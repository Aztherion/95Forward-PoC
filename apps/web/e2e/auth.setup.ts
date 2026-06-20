import { test as setup, expect } from "@playwright/test";

const DANA_EMAIL = "dana.reese@waterforpeople.org";
const DANA_AUTH_FILE = "playwright/.auth/dana.json";

setup("authenticate as Dana", async ({ page, context }) => {
  const response = await page.request.post("/api/test-login", {
    data: { email: DANA_EMAIL },
  });
  expect(response.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page.locator(".shell")).toBeVisible();
  await expect(page.locator(".shell-user__name")).toHaveText("Dana Reese");

  await context.storageState({ path: DANA_AUTH_FILE });
});

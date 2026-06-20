import { test, expect } from "@playwright/test";

const PROTECTED_ROUTES = ["/", "/95-forward/today", "/styleguide", "/constituents"];

test.describe("authenticated shell", () => {
  test("shows the logged-in user name and role label", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".shell")).toBeVisible();
    await expect(page.locator(".shell-user__name")).toHaveText("Dana Reese");
    await expect(page.locator(".shell-user__sub")).toHaveText("Major Gifts Officer");
  });

  test("sign-out control points to /auth/logout", async ({ page }) => {
    await page.goto("/");
    const signout = page.locator(".shell-signout");
    await expect(signout).toHaveAttribute("href", "/auth/logout");
    await expect(signout).toHaveAttribute("aria-label", "Sign out");
  });

  test("clearing the session cookie revokes access to protected routes", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await expect(page.locator(".shell")).toBeVisible();

    await context.clearCookies();

    await page.goto("/95-forward/today");
    await expect(page).toHaveURL(/\/login(\?|$)/);
    expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/95-forward/today");
  });
});

test.describe("email resolves to role and tenant", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("authenticating as Ruth shows the Chief Development Officer", async ({ page }) => {
    const response = await page.request.post("/api/test-login", {
      data: { email: "ruth.castellanos@waterforpeople.org" },
    });
    expect(response.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.locator(".shell-user__name")).toHaveText("Ruth Castellanos");
    await expect(page.locator(".shell-user__sub")).toHaveText("Chief Development Officer");
  });
});

test.describe("unauthenticated access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the login page renders the branded Sign in affordance", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login(\?|$)/);
    const signIn = page.getByRole("link", { name: "Sign in" });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute("href", /\/auth\/login/);
  });

  test("the root route redirects to /login with returnTo", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login(\?|$)/);
    expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/");
  });

  for (const route of PROTECTED_ROUTES) {
    test(`protected route ${route} redirects to /login when logged out`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login(\?|$)/);
      expect(new URL(page.url()).searchParams.get("returnTo")).toBe(route);
    });
  }
});

import { test, expect } from "@playwright/test";

const NAV_ORDER = [
  "Home",
  "Constituents",
  "Revenue",
  "Major Giving",
  "Lists",
  "95 Forward",
  "Marketing",
  "Events",
  "Volunteers",
  "Memberships",
  "Analysis",
  "Settings",
];

test.describe("app shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".shell")).toBeVisible();
  });

  test("renders nav rows in the expected order", async ({ page }) => {
    const labels = page.locator(".shell-row__label");
    await expect(labels).toHaveText(NAV_ORDER);
  });

  test("groups the Add-ons section between Lists and the host-more block", async ({ page }) => {
    const eyebrow = page.locator(".shell-eyebrow");
    await expect(eyebrow).toHaveText("Add-ons");

    const visit = page.locator(".shell-visit");
    await expect(visit).toHaveText("Enter visit mode");
    await expect(visit).toHaveAttribute("href", "/95-forward/visit");

    const order = await page.evaluate(() => {
      const shell = document.querySelector(".shell");
      if (!shell) return [] as string[];
      const tokens: string[] = [];
      shell.querySelectorAll(".shell-eyebrow, .shell-row__label, .shell-visit").forEach((el) => {
        if (el.classList.contains("shell-eyebrow")) {
          tokens.push("[eyebrow] Add-ons");
        } else if (el.classList.contains("shell-visit")) {
          tokens.push("[cta] Enter visit mode");
        } else {
          tokens.push(el.textContent?.trim() ?? "");
        }
      });
      return tokens;
    });

    expect(order).toEqual([
      "Home",
      "Constituents",
      "Revenue",
      "Major Giving",
      "Lists",
      "[eyebrow] Add-ons",
      "95 Forward",
      "[cta] Enter visit mode",
      "Marketing",
      "Events",
      "Volunteers",
      "Memberships",
      "Analysis",
      "Settings",
    ]);
  });

  test("shows brand header and user chip", async ({ page }) => {
    await expect(page.locator(".shell-brand__name")).toHaveText("Keystone CRM");
    await expect(page.locator(".shell-brand__org")).toHaveText("Water For People");
    await expect(page.locator(".shell-user__name")).toHaveText("Dana Reese");
    await expect(page.locator(".shell-user__sub")).toHaveText("Major Gifts Officer");
  });
});

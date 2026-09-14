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
      // Inside the group now, not beside it (I24).
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

// -------------------------------------------------------------------------------------------
// I24 — the add-on lives inside the host shell
// -------------------------------------------------------------------------------------------

const FORWARD_ITEMS: [string, string][] = [
  ["The Board", "/95-forward/board"],
  ["Opportunities", "/95-forward/opportunities"],
  ["Prospects", "/95-forward/prospects"],
  ["Initiatives", "/95-forward/initiatives"],
  ["Forecast", "/95-forward/forecast"],
  ["Green Sheet", "/95-forward/green-sheet"],
  ["Rules", "/rules"],
];

const HOST_ITEMS: [string, string][] = [
  ["Constituents", "/constituents"],
  ["Revenue", "/revenue"],
  ["Lists", "/lists"],
  ["Marketing", "/marketing"],
  ["Events", "/events"],
  ["Volunteers", "/volunteers"],
  ["Memberships", "/memberships"],
  ["Analysis", "/analysis"],
];

test.describe("95 Forward inside the Keystone shell", () => {
  test("expands to the seven war-room items in order", async ({ page }) => {
    await page.goto("/95-forward/board");
    const children = page.locator(".shell-group__children .shell-row__label");
    await expect(children).toHaveText(FORWARD_ITEMS.map(([label]) => label));
  });

  test("every 95 Forward nav item routes to something that renders", async ({ page }) => {
    for (const [label, href] of FORWARD_ITEMS) {
      const response = await page.goto(href);
      expect(response?.status(), `${label} → ${href}`).toBeLessThan(400);
      await expect(page.locator(".shell"), `${label} shell`).toBeVisible();
      await expect(page.locator("h1"), `${label} h1 count`).toHaveCount(1);
    }
  });

  test("exactly one h1 per screen, and it is the page's own title", async ({ page }) => {
    // I26 fixed this properly: `Topbar` takes `heading={false}` on screens that render their own
    // title, and those titles went back to being `h1`s. Seven screens had been demoting their own
    // heading to an `h2`, which put the host's chrome above the page's content in the outline.
    //
    // Deliberately a SMALL sample. The first version walked fifteen routes and took 22 seconds,
    // which under two parallel workers destabilised four unrelated specs — the same mistake I24
    // made with its nav walk. The invariant is held statically instead, over every Topbar call site
    // in the source: see components/shell/topbar-heading.test.tsx. This is the smoke test that the
    // static check corresponds to something real.
    for (const [label, href] of [
      ["Board", "/95-forward/board"],
      ["Opportunities (placeholder)", "/95-forward/opportunities"],
      ["Rules", "/rules"],
      ["Constituents", "/constituents"],
    ] as [string, string][]) {
      const response = await page.goto(href);
      expect(response?.status(), `${label} → ${href}`).toBeLessThan(400);
      await expect(page.locator("h1"), `${label} h1 count`).toHaveCount(1);
    }
  });

  test("Keystone's own sections are muted but still navigable", async ({ page }) => {
    await page.goto("/95-forward/board");

    // Muted VISUALLY: the host rows sit a weight and a colour step below the add-on's.
    const hostNav = page.locator('.shell-nav[data-tier="host"]').first();
    await expect(hostNav).toBeVisible();
    const hostWeight = await page
      .locator('.shell-nav[data-tier="host"] .shell-row')
      .first()
      .evaluate((el) => getComputedStyle(el).fontWeight);
    expect(Number(hostWeight)).toBeLessThan(600);

    // ...and still real links to real routes. Asserted on the markup rather than by navigating to
    // all eight: each of these pages already has its own spec, and walking them here made this one
    // test a load generator that destabilised the rest of the suite on a shared CI runner.
    for (const [label, href] of HOST_ITEMS) {
      const row = page.locator(`.shell-nav[data-tier="host"] a[href="${href}"]`);
      await expect(row, `${label} → ${href}`).toHaveCount(1);
      // Not muted to the point of being inert — this is a genuine host system, not a stage set.
      await expect(row).toBeEnabled();
    }

    // One real navigation, to prove the tier is not decorative.
    const response = await page.goto("/memberships");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator(".shell")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("the old prospect-centric dashboard is deleted, not parked", async ({ page }) => {
    // I25 deletes it. Two landing screens is two philosophies, and a parked one is a screen
    // somebody demos by accident.
    const response = await page.goto("/95-forward/today");
    expect(response?.status()).toBe(404);
    await expect(page.locator('[data-testid="today"]')).toHaveCount(0);
    await expect(page.locator(".shell-row__label", { hasText: /^Today$/ })).toHaveCount(0);
  });

  test("/95-forward lands on The Board", async ({ page }) => {
    await page.goto("/95-forward");
    await expect(page).toHaveURL(/\/95-forward\/board$/);
  });

  test("the prospect record hands off to Keystone for the full giving history", async ({
    page,
  }) => {
    await page.goto("/95-forward/prospects");
    await page.locator('[data-testid="prospect-row"]').first().click();
    await page.waitForURL(/\/95-forward\/prospects\/[0-9a-f-]+/, { timeout: 30_000 });
    const handoff = page.locator('[data-testid="open-in-keystone"]');
    await expect(handoff).toBeVisible();
    await expect(handoff).toContainText("Open in Keystone CRM");

    const href = await handoff.getAttribute("href");
    expect(href).toMatch(/^\/constituents\/[0-9a-f-]+$/);
    const response = await page.goto(href!);
    expect(response?.status()).toBeLessThan(400);
  });
});

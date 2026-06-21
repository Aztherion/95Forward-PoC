import { test, expect, type Page } from "@playwright/test";

const MPL = "/95-forward/prospects";
const HALLWORTH = "The Hallworth Family Foundation";
const BELLO = "Dr. Aisha Bello";

function rowByName(page: Page, name: string) {
  return page.locator('[data-testid="prospect-row"]').filter({ hasText: name });
}

test.describe("95 Forward — Master Prospect List", () => {
  test("renders the 95 Forward register and one ranked list", async ({ page }) => {
    await page.goto(MPL);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="prospects-mpl"]')).toBeVisible();
    await expect(page.locator(".f95-page__count")).toContainText("ranked by QPI");
  });

  test("ranks every prospect type together by QPI descending", async ({ page }) => {
    await page.goto(MPL);

    const rows = page.locator('[data-testid="prospect-row"]');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThanOrEqual(8);

    const hallworth = rowByName(page, HALLWORTH);
    await expect(hallworth.locator(".f95-prow__rank .n")).toHaveText("1");
    await expect(hallworth.locator(".f95-prow__qpi .v")).toHaveText("92");
    await expect(rows.first()).toContainText(HALLWORTH);

    await expect(rowByName(page, BELLO).locator(".f95-prow__qpi .v")).toHaveText("40");

    const seeded = [
      HALLWORTH,
      "Cordova Beverage Company",
      "The Osgood Foundation",
      "Marisol Vega",
      "Cornerstone Charitable Trust",
      "James & Eleanor Whitfield",
      "Northwater Capital",
      BELLO,
    ];

    function isStrictlyIncreasing(values: number[]): boolean {
      for (let index = 1; index < values.length; index += 1) {
        if (values[index]! <= values[index - 1]!) return false;
      }
      return true;
    }

    function isNonIncreasing(values: number[]): boolean {
      for (let index = 1; index < values.length; index += 1) {
        if (values[index]! > values[index - 1]!) return false;
      }
      return true;
    }

    await expect
      .poll(async () => {
        const names = await rows.locator(".f95-prow__name").allInnerTexts();
        const positions = seeded.map((name) => names.indexOf(name));
        if (positions.some((position) => position < 0)) return false;
        return isStrictlyIncreasing(positions);
      })
      .toBe(true);

    await expect
      .poll(async () => {
        const scores = (await rows.locator(".f95-prow__qpi .v").allInnerTexts()).map(Number);
        return isNonIncreasing(scores);
      })
      .toBe(true);
  });

  test("surfaces a single 'your next right move' banner for the top prospect", async ({ page }) => {
    await page.goto(MPL);
    const nextMove = page.locator('[data-testid="next-move"]');
    await expect(nextMove).toHaveCount(1);
    await expect(nextMove).toContainText("Your next right move");
    await expect(nextMove).toContainText(HALLWORTH);
    await expect(nextMove).toContainText("92");
    await expect(nextMove.getByRole("link")).toHaveAttribute("href", /\/95-forward\/prospects\//);
  });

  test("shows a QPI score pill on every prospect row", async ({ page }) => {
    await page.goto(MPL);
    const pills = page.locator('[data-testid="prospect-row"] .f95-prow__qpi');
    const count = await pills.count();
    expect(count).toBeGreaterThanOrEqual(8);
    for (let index = 0; index < count; index += 1) {
      await expect(pills.nth(index)).toBeVisible();
      await expect(pills.nth(index).locator(".v")).toHaveText(/^\d+$/);
      await expect(pills.nth(index)).toContainText("QPI");
    }
  });

  test("filters the list by entity type and by relationship manager", async ({ page }) => {
    await page.goto(MPL);
    const total = await page.locator('[data-testid="prospect-row"]').count();
    expect(total).toBeGreaterThanOrEqual(8);

    await page.getByLabel("Entity type").selectOption("foundation");
    await page.waitForURL(/type=foundation/);
    const foundationRows = page.locator('[data-testid="prospect-row"]');
    const foundationCount = await foundationRows.count();
    expect(foundationCount).toBeGreaterThan(0);
    expect(foundationCount).toBeLessThan(total);
    const subs = await foundationRows.locator(".f95-prow__sub").allInnerTexts();
    for (const sub of subs) {
      expect(sub).toContain("Foundation");
    }

    await page.goto(MPL);
    await page.getByLabel("Relationship manager").selectOption({ label: "Priya Nair" });
    await page.waitForURL(/rm=/);
    const rmCount = await page.locator('[data-testid="prospect-row"]').count();
    expect(rmCount).toBeGreaterThan(0);
    expect(rmCount).toBeLessThan(total);
  });

  test("links the Search prospects button to the search screen", async ({ page }) => {
    await page.goto(MPL);
    const link = page.getByRole("link", { name: "Search prospects" });
    await expect(link).toHaveAttribute("href", "/95-forward/search");
    await link.click();
    await page.waitForURL(/\/95-forward\/search$/);
    await expect(page.locator('[data-testid="prospect-search"]')).toBeVisible();
  });

  test("opens a prospect overview from its row on the list", async ({ page }) => {
    await page.goto(MPL);
    await rowByName(page, HALLWORTH).click();
    await page.waitForURL(/\/95-forward\/prospects\/[0-9a-f-]+/);
    await expect(page.locator(".f95-record-head__title")).toHaveText(HALLWORTH);
  });
});

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

    // Bello's presence, not her score. `prospect-overview.spec.ts` deliberately approves a copilot
    // suggestion that raises her capacity — 40 to 75 — and restores it afterwards, so asserting the
    // seeded constant here is a race against another spec's legitimate mutation, on a shared
    // database, under two parallel workers. The ordering assertion below is this test's actual
    // subject and is immune to it. (Found flaking in I26; the collision predates it.)
    await expect(rowByName(page, BELLO).locator(".f95-prow__qpi .v")).toHaveText(/^\d+$/);

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

    function isNonIncreasing(values: number[]): boolean {
      for (let index = 1; index < values.length; index += 1) {
        if (values[index]! > values[index - 1]!) return false;
      }
      return true;
    }

    // Every seeded type is PRESENT on one list — people, companies and foundations together, which
    // is the first half of this test's name. Their relative order is not asserted: it is a function
    // of QPI, and `prospect-overview.spec.ts` legitimately changes one prospect's QPI mid-suite
    // (approving a copilot capacity suggestion, then restoring it). Pinning the seeded order made
    // this test assert a snapshot it does not own, against a shared database under two parallel
    // workers. The descending-score poll below is the second half of the name, and it holds
    // whatever the scores currently are.
    await expect
      .poll(async () => {
        const names = await rows.locator(".f95-prow__name").allInnerTexts();
        return seeded.every((name) => names.includes(name));
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

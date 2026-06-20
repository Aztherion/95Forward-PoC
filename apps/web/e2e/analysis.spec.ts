import { test, expect } from "@playwright/test";

test.describe("analysis — host CRM register", () => {
  test("gallery renders cards in the host register with three live dashboards", async ({
    page,
  }) => {
    await page.goto("/analysis");
    await expect(page.locator(".f95-page__title")).toHaveText("Analysis");
    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);

    const cards = page.locator(".f95-tilegrid .f95-section-title");
    expect(await cards.count()).toBeGreaterThanOrEqual(3);

    const liveLinks = page.locator("a.f95-analysis-link");
    await expect(liveLinks).toHaveCount(3);
    const hrefs = await liveLinks.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(hrefs).toEqual([
      "/analysis/fundraising-performance",
      "/analysis/donor-retention",
      "/analysis/campaign-progress",
    ]);
  });

  test("fundraising performance shows a real total raised figure and a chart", async ({ page }) => {
    await page.goto("/analysis");
    await page.getByRole("link", { name: "Open dashboard" }).first().click();
    await page.waitForURL(/\/analysis\/fundraising-performance$/);
    await expect(page.locator(".f95-page__title")).toHaveText("Fundraising performance");

    const totalRaised = page
      .locator(".f95-stat", { has: page.getByText("Total raised", { exact: true }) })
      .locator(".f95-stat__value");
    await expect(totalRaised).toHaveText(/^\$[\d,]+$/);
    await expect(totalRaised).not.toHaveText("$0");

    await expect(page.locator(".f95-bars")).toBeVisible();
    await expect(page.locator(".f95-bars__fill").first()).toBeVisible();
  });

  test("donor retention shows real segment counts and a retention rate", async ({ page }) => {
    await page.goto("/analysis/donor-retention");
    await expect(page.locator(".f95-page__title")).toHaveText("Donor retention");

    const retentionRate = page
      .locator(".f95-stat", { has: page.getByText("Retention rate", { exact: true }) })
      .locator(".f95-stat__value");
    await expect(retentionRate).toHaveText(/^\d+%$/);

    await expect(page.locator(".f95-bars")).toBeVisible();
    const totalDonors = page
      .locator(".f95-stat", { has: page.getByText("Total donors", { exact: true }) })
      .locator(".f95-stat__value");
    await expect(totalDonors).toHaveText(/^\d[\d,]*$/);
  });

  test("campaign progress shows Everyone Forever with a goal-vs-raised bar", async ({ page }) => {
    await page.goto("/analysis/campaign-progress");
    await expect(page.locator(".f95-page__title")).toHaveText("Campaign & appeal progress");

    const everyoneForever = page
      .locator(".f95-tilegrid .f95-stack")
      .filter({ hasText: "Everyone Forever" })
      .first();
    await expect(everyoneForever).toBeVisible();
    await expect(everyoneForever).toContainText("$8,000,000");
    await expect(everyoneForever.locator(".f95-goalmeta__pct")).toHaveText(/^\d+% to goal$/);

    const fill = everyoneForever.locator(".f95-progress__fill");
    await expect(fill).toHaveAttribute("style", /width:\s*\d+%/);
  });
});

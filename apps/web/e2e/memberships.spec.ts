import { test, expect, type Page } from "@playwright/test";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function gotoMembers(page: Page): Promise<void> {
  await page.goto("/memberships");
  await page.waitForURL(/\/memberships\/members$/);
  await expect(page.locator(".f95-page__title")).toHaveText("Members");
}

async function createConstituent(page: Page, name: string): Promise<void> {
  await page.goto("/constituents/new");
  await page.getByLabel("Type", { exact: true }).selectOption("individual");
  await page.getByLabel("Display name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Add constituent" }).click();
  await page.waitForURL(/\/constituents\/[0-9a-f-]+$/);
}

function renewsValue(page: Page) {
  return page
    .locator(".f95-deflist__item", { has: page.getByText("Renews", { exact: true }) })
    .locator(".f95-deflist__desc");
}

test.describe("memberships — members", () => {
  test("redirects /memberships to members and lists seeded members", async ({ page }) => {
    await gotoMembers(page);

    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);

    const sofiaRow = page.locator(".f95-table tbody tr", { hasText: "Sofia Lin" });
    await expect(sofiaRow).toHaveCount(1);
    await expect(sofiaRow).toContainText("Friend");
    await expect(sofiaRow).toContainText("Active");

    const whitfieldRow = page.locator(".f95-table tbody tr", {
      hasText: "James & Eleanor Whitfield",
    });
    await expect(whitfieldRow).toHaveCount(1);
    await expect(whitfieldRow).toContainText("Champion");
  });

  test("adds a membership by assigning a constituent to a tier", async ({ page }) => {
    const name = `E2E Member ${uniqueSuffix()}`;
    await createConstituent(page, name);

    await gotoMembers(page);
    await page.getByRole("link", { name: "New membership" }).click();
    await page.waitForURL(/\/memberships\/members\/new$/);
    await expect(page.locator(".f95-page__title")).toHaveText("New membership");

    await page.getByLabel("Constituent", { exact: true }).selectOption({ label: name });
    await page.getByLabel("Tier", { exact: true }).selectOption({ label: "Champion" });
    await page.getByLabel("Status", { exact: true }).selectOption("active");
    await page.getByLabel("Start date", { exact: false }).fill("2026-01-15");
    await page.getByLabel("Renewal date", { exact: false }).fill("2027-01-15");
    await page.getByRole("button", { name: "Enroll member" }).click();

    await page.waitForURL(/\/memberships\/members\/[0-9a-f-]+$/);
    await expect(page.locator(".f95-record-head__title")).toHaveText(name);
    await expect(page.locator(".f95-record-head__meta")).toContainText("Champion");
    await expect(page.locator(".f95-record-head__meta")).toContainText("Active");

    await gotoMembers(page);
    const createdRow = page.locator(".f95-table tbody tr", { hasText: name });
    await expect(createdRow).toHaveCount(1);
    await expect(createdRow).toContainText("Champion");
    await expect(createdRow).toContainText("Active");
  });

  test("renews a membership and the renewal date advances by one year", async ({ page }) => {
    const name = `E2E Renew ${uniqueSuffix()}`;
    await createConstituent(page, name);

    await page.goto("/memberships/members/new");
    await page.getByLabel("Constituent", { exact: true }).selectOption({ label: name });
    await page.getByLabel("Tier", { exact: true }).selectOption({ label: "Sustainer" });
    await page.getByLabel("Status", { exact: true }).selectOption("active");
    await page.getByLabel("Start date", { exact: false }).fill("2026-02-01");
    await page.getByLabel("Renewal date", { exact: false }).fill("2027-02-01");
    await page.getByRole("button", { name: "Enroll member" }).click();
    await page.waitForURL(/\/memberships\/members\/[0-9a-f-]+$/);
    const recordUrl = page.url();

    await expect(renewsValue(page)).toHaveText("Feb 1, 2027");

    const lastRenewed = page
      .locator(".f95-deflist__item", { has: page.getByText("Last renewed", { exact: true }) })
      .locator(".f95-deflist__desc, .f95-deflist__desc--empty");
    await expect(lastRenewed).toHaveText("Not renewed yet");

    await page.getByRole("button", { name: "Renew" }).click();
    await page.waitForURL(recordUrl);

    await expect(lastRenewed).not.toHaveText("Not renewed yet");
    await expect(renewsValue(page)).toHaveText("Feb 1, 2028");
    await expect(page.locator(".f95-record-head__meta")).toContainText("Active");
  });
});

test.describe("memberships — tiers", () => {
  test("creates a new tier through the form and finds it in the tiers list", async ({ page }) => {
    const tierName = `E2E Tier ${uniqueSuffix()}`;

    await page.goto("/memberships/tiers");
    await expect(page.locator(".f95-page__title")).toHaveText("Tiers");
    await page.getByRole("link", { name: "New tier" }).click();
    await page.waitForURL(/\/memberships\/tiers\/new$/);
    await expect(page.locator(".f95-page__title")).toHaveText("New tier");

    await page.getByLabel("Name", { exact: true }).fill(tierName);
    await page.getByLabel("Level", { exact: false }).fill("5");
    await page.getByLabel("Annual dues (USD)", { exact: false }).fill("750");
    await page
      .getByLabel("Benefits", { exact: false })
      .fill("Quarterly impact briefings and a field visit.");
    await page.getByRole("button", { name: "Create tier" }).click();

    await page.waitForURL(/\/memberships\/tiers$/);
    const createdRow = page.locator(".f95-table tbody tr", { hasText: tierName });
    await expect(createdRow).toHaveCount(1);
    await expect(createdRow).toContainText("5");
    await expect(createdRow).toContainText("$750");
  });
});

test.describe("memberships — renewals and wavemaker", () => {
  test("renewals view shows upcoming and lapsed members", async ({ page }) => {
    await page.goto("/memberships/renewals");
    await expect(page.locator(".f95-page__title")).toHaveText("Renewals");

    const upcoming = page.locator(".f95-card", {
      has: page.getByRole("heading", { name: /Upcoming/ }),
    });
    await expect(upcoming).toContainText("Sofia Lin");
    await expect(upcoming).toContainText("James & Eleanor Whitfield");

    const lapsed = page.locator(".f95-card", {
      has: page.getByRole("heading", { name: /Lapsed/ }),
    });
    await expect(lapsed).toContainText("Marisol Vega");
  });

  test("wavemaker view lists recurring supporters with monthly amount and tenure", async ({
    page,
  }) => {
    await page.goto("/memberships/wavemaker");
    await expect(page.locator(".f95-page__title")).toHaveText("Wavemakers");

    const rows = page.locator(".f95-table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    const firstRow = rows.first();
    await expect(firstRow).toContainText(/\$[\d,]+/);
    await expect(firstRow).toContainText(/year|month/);
  });
});

test.describe("memberships — constituent record tabs", () => {
  test("renders the Volunteer and Membership tabs for a seeded constituent", async ({ page }) => {
    await page.goto("/constituents?search=Sofia+Lin");
    const sofiaRow = page.locator(".f95-table tbody tr", { hasText: "Sofia Lin" });
    await expect(sofiaRow).toHaveCount(1);
    await sofiaRow.getByRole("link", { name: "Sofia Lin" }).click();
    await page.waitForURL(/\/constituents\/[0-9a-f-]+/);
    await expect(page.locator(".f95-record-head__title")).toHaveText("Sofia Lin");

    await page.getByRole("tab", { name: "Volunteer" }).click();
    await page.waitForURL(/tab=volunteer/);
    await expect(page.getByRole("tabpanel")).toContainText("Volunteer activity");
    await expect(page.getByRole("tabpanel")).toContainText("10.00");

    await page.getByRole("tab", { name: "Membership" }).click();
    await page.waitForURL(/tab=membership/);
    await expect(page.getByRole("tabpanel")).toContainText("Memberships");
    await expect(page.getByRole("tabpanel")).toContainText("Friend");
  });
});

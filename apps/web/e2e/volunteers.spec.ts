import { test, expect, type Page } from "@playwright/test";

const BOOTH = "World Water Day Booth";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function gotoRoster(page: Page): Promise<void> {
  await page.goto("/volunteers");
  await page.waitForURL(/\/volunteers\/roster$/);
  await expect(page.locator(".f95-page__title")).toHaveText("Roster");
}

async function createConstituent(page: Page, name: string): Promise<void> {
  await page.goto("/constituents/new");
  await page.getByLabel("Type", { exact: true }).selectOption("individual");
  await page.getByLabel("Display name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Add constituent" }).click();
  await page.waitForURL(/\/constituents\/[0-9a-f-]+$/);
}

async function openBooth(page: Page): Promise<void> {
  await page.goto("/volunteers/opportunities");
  const boothRow = page.locator(".f95-table tbody tr", { hasText: BOOTH });
  await expect(boothRow).toHaveCount(1);
  await boothRow.getByRole("link", { name: BOOTH }).click();
  await page.waitForURL(/\/volunteers\/opportunities\/[0-9a-f-]+$/);
  await expect(page.locator(".f95-record-head__title")).toHaveText(BOOTH);
}

function totalHoursValue(page: Page) {
  return page
    .locator(".f95-stat", { has: page.getByText("Total hours", { exact: true }) })
    .locator(".f95-stat__value");
}

test.describe("volunteers — roster", () => {
  test("redirects /volunteers to the roster and lists seeded volunteers with total hours", async ({
    page,
  }) => {
    await gotoRoster(page);

    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);

    const sofiaRow = page.locator(".f95-table tbody tr", { hasText: "Sofia Lin" });
    await expect(sofiaRow).toHaveCount(1);
    await expect(sofiaRow).toContainText("10.00");

    const tomRow = page.locator(".f95-table tbody tr", { hasText: "Tom Bradley" });
    await expect(tomRow).toHaveCount(1);
    await expect(tomRow).toContainText("13.00");
  });

  test("marks a constituent as a volunteer and they appear in the roster", async ({ page }) => {
    const name = `E2E Volunteer ${uniqueSuffix()}`;
    await createConstituent(page, name);

    await gotoRoster(page);
    await expect(page.locator(".f95-table tbody tr", { hasText: name })).toHaveCount(0);

    await page.getByRole("button", { name: "Mark a constituent as a volunteer" }).click();
    await page.getByLabel("Constituent", { exact: true }).selectOption({ label: name });
    await page.getByRole("button", { name: "Mark as volunteer" }).click();

    const markedRow = page.locator(".f95-table tbody tr", { hasText: name });
    await expect(markedRow).toHaveCount(1);
    await expect(markedRow).toContainText("0.00");
  });
});

test.describe("volunteers — opportunities", () => {
  test("creates an opportunity through the form and finds it in the list", async ({ page }) => {
    const name = `E2E Opportunity ${uniqueSuffix()}`;

    await page.goto("/volunteers/opportunities");
    await expect(page.locator(".f95-page__title")).toHaveText("Opportunities");
    await page.getByRole("link", { name: "New opportunity" }).click();
    await page.waitForURL(/\/volunteers\/opportunities\/new$/);
    await expect(page.locator(".f95-page__title")).toHaveText("New opportunity");

    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Date", { exact: false }).fill("2026-10-10");
    await page.getByLabel("Location", { exact: false }).fill("Denver, CO");
    await page.getByLabel("Capacity", { exact: false }).fill("15");
    await page
      .getByLabel("Description", { exact: false })
      .fill("Help staff the booth and welcome supporters.");
    await page.getByRole("button", { name: "Create opportunity" }).click();

    await page.waitForURL(/\/volunteers\/opportunities\/[0-9a-f-]+$/);
    await expect(page.locator(".f95-record-head__title")).toHaveText(name);

    await page.goto("/volunteers/opportunities");
    const createdRow = page.locator(".f95-table tbody tr", { hasText: name });
    await expect(createdRow).toHaveCount(1);
    await expect(createdRow).toContainText("Denver, CO");
    await expect(createdRow).toContainText("15");
  });

  test("shows the booth roll-up and logs hours that increase the total", async ({ page }) => {
    const volunteerName = `E2E Hours ${uniqueSuffix()}`;
    await createConstituent(page, volunteerName);

    await openBooth(page);

    await expect(totalHoursValue(page)).toHaveText(/^\d+\.\d{2}$/);
    const before = Number(await totalHoursValue(page).innerText());
    expect(before).toBeGreaterThanOrEqual(18);

    const rowHours = await page.locator(".f95-itemrow__meta").evaluateAll((nodes) =>
      nodes
        .map((node) => /([\d.]+)\s+hours/.exec(node.textContent ?? "")?.[1])
        .filter((value): value is string => Boolean(value))
        .map(Number),
    );
    expect(rowHours.length).toBeGreaterThan(0);
    const rowSum = rowHours.reduce((sum, value) => sum + value, 0);
    expect(rowSum).toBeCloseTo(before, 2);

    await page.getByRole("button", { name: "Log hours" }).click();
    await page.getByLabel("Volunteer", { exact: true }).selectOption({ label: volunteerName });
    await page.getByLabel("Hours", { exact: true }).fill("3.50");
    await page.getByLabel("Date", { exact: true }).fill("2026-06-20");
    await page.getByRole("button", { name: "Log hours" }).last().click();

    const newRow = page.locator(".f95-itemrow", { hasText: volunteerName });
    await expect(newRow).toHaveCount(1);
    await expect(newRow).toContainText("3.50 hours");

    await expect(totalHoursValue(page)).toHaveText((before + 3.5).toFixed(2));
  });
});

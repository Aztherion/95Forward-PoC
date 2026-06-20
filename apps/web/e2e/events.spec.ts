import { test, expect, type Page } from "@playwright/test";

const GALA = "Year-End Gala 2025";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function gotoEvents(page: Page): Promise<void> {
  await page.goto("/events");
  await expect(page.locator(".f95-page__title")).toHaveText("Events");
}

async function openGala(page: Page): Promise<void> {
  await page.goto("/events?search=Year-End+Gala");
  const galaRow = page.locator(".f95-table tbody tr", { hasText: GALA });
  await expect(galaRow).toHaveCount(1);
  await galaRow.getByRole("link", { name: GALA }).click();
  await page.waitForURL(/\/events\/[0-9a-f-]+$/);
  await expect(page.locator(".f95-record-head__title")).toHaveText(GALA);
}

test.describe("events — list and record", () => {
  test("lists seeded events with type and date in the host register", async ({ page }) => {
    await gotoEvents(page);

    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);

    const galaRow = page.locator(".f95-table tbody tr", { hasText: GALA });
    await expect(galaRow).toHaveCount(1);
    await expect(galaRow).toContainText("Gala");
    await expect(galaRow).toContainText(/\d{4}/);

    const breakfastRow = page.locator(".f95-table tbody tr", {
      hasText: "Denver Donor Breakfast",
    });
    await expect(breakfastRow).toHaveCount(1);
    await expect(breakfastRow).toContainText("Breakfast");
  });

  test("creates an event through the form and finds it in the list", async ({ page }) => {
    const name = `E2E Event ${uniqueSuffix()}`;

    await gotoEvents(page);
    await page.getByRole("link", { name: "New event" }).click();
    await page.waitForURL(/\/events\/new$/);
    await expect(page.locator(".f95-page__title")).toHaveText("New event");

    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Type", { exact: true }).selectOption("gala");
    await page.getByLabel("Starts", { exact: true }).fill("2026-09-15");
    await page.getByLabel("Location", { exact: false }).fill("Denver, CO");
    await page.getByLabel("Capacity", { exact: false }).fill("120");
    await page.getByLabel("Fundraising goal (USD)", { exact: false }).fill("50000");
    await page
      .getByLabel("Description", { exact: false })
      .fill("An evening celebrating water access for everyone, forever.");
    await page.getByRole("button", { name: "Create event" }).click();
    await page.waitForURL(/\/events\/[0-9a-f-]+$/);
    await expect(page.locator(".f95-record-head__title")).toHaveText(name);

    await page.goto(`/events?search=${encodeURIComponent(name)}`);
    const createdRow = page.locator(".f95-table tbody tr", { hasText: name });
    await expect(createdRow).toHaveCount(1);
    await expect(createdRow).toContainText("Gala");
  });

  test("shows the gala revenue summary, goal progress, and registration list", async ({ page }) => {
    await openGala(page);

    const totalRevenue = page
      .locator(".f95-stat", { has: page.getByText("Total revenue", { exact: true }) })
      .locator(".f95-stat__value");
    await expect(totalRevenue).toHaveText(/^\$[\d,]+$/);
    const totalText = await totalRevenue.innerText();
    const totalCents = Number(totalText.replace(/[^\d]/g, ""));
    expect(totalCents).toBeGreaterThan(0);

    await expect(page.getByText(/% to goal/)).toBeVisible();

    const rows = page.locator(".f95-itemrow");
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(page.locator(".f95-itemrow").first()).toContainText(
      /Registered|Cancelled|Waitlisted/,
    );
    await expect(page.getByText("Checked in").first()).toBeVisible();
  });
});

test.describe("events — registrations", () => {
  test("adds a registration and toggles check-in", async ({ page }) => {
    const attendeeName = `E2E Attendee ${uniqueSuffix()}`;

    await page.goto("/constituents/new");
    await page.getByLabel("Type", { exact: true }).selectOption("individual");
    await page.getByLabel("Display name", { exact: true }).fill(attendeeName);
    await page.getByRole("button", { name: "Add constituent" }).click();
    await page.waitForURL(/\/constituents\/[0-9a-f-]+$/);

    await openGala(page);
    const recordUrl = page.url();

    await page.getByRole("button", { name: "Add registration" }).click();
    await page.getByLabel("Constituent", { exact: true }).selectOption({ label: attendeeName });
    await page.getByLabel("Status", { exact: true }).selectOption("registered");
    await page.getByLabel("Guests", { exact: true }).fill("2");
    await page.getByLabel("Fee (USD)", { exact: false }).fill("250");
    await page.getByRole("button", { name: "Add registration" }).last().click();

    await page.waitForURL(recordUrl);
    const newRow = page.locator(".f95-itemrow", { hasText: attendeeName });
    await expect(newRow).toHaveCount(1);
    await expect(newRow).toContainText("Registered");
    await expect(newRow).toContainText("2 guests");
    await expect(newRow).toContainText("$250");
    await expect(newRow.getByText("Checked in")).toHaveCount(0);

    await newRow.getByRole("button", { name: "Check in" }).click();
    const checkedInRow = page.locator(".f95-itemrow", { hasText: attendeeName });
    await expect(checkedInRow.getByText("Checked in")).toBeVisible();
    await expect(checkedInRow.getByRole("button", { name: "Undo check-in" })).toBeVisible();

    await checkedInRow.getByRole("button", { name: "Undo check-in" }).click();
    const revertedRow = page.locator(".f95-itemrow", { hasText: attendeeName });
    await expect(revertedRow.getByText("Checked in")).toHaveCount(0);
    await expect(revertedRow.getByRole("button", { name: "Check in" })).toBeVisible();
  });
});

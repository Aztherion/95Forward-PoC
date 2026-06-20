import { test, expect, type Page } from "@playwright/test";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function gotoCommunications(page: Page): Promise<void> {
  await page.goto("/marketing");
  await page.waitForURL(/\/marketing\/communications$/);
  await expect(page.locator(".f95-page__title")).toHaveText("Communications");
}

test.describe("marketing — communications", () => {
  test("redirects /marketing to communications and lists the seeded sends", async ({ page }) => {
    await gotoCommunications(page);

    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);

    const appealRow = page.locator(".f95-table tbody tr", {
      hasText: "World Water Day 2026 Appeal",
    });
    await expect(appealRow).toHaveCount(1);
    await expect(appealRow).toContainText("Appeal");
    await expect(appealRow).toContainText("Sent");

    const welcomeRow = page.locator(".f95-table tbody tr", {
      hasText: "Wavemaker Welcome Series",
    });
    await expect(welcomeRow).toHaveCount(1);
    await expect(welcomeRow).toContainText("Email");
    await expect(welcomeRow).toContainText("Sent");
  });

  test("creates a communication through the form and finds it in the list", async ({ page }) => {
    const name = `E2E Communication ${uniqueSuffix()}`;
    const subject = `E2E Subject ${uniqueSuffix()}`;

    await gotoCommunications(page);
    await page.getByRole("link", { name: "New communication" }).click();
    await page.waitForURL(/\/marketing\/communications\/new$/);
    await expect(page.locator(".f95-page__title")).toHaveText("New communication");

    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Channel", { exact: true }).selectOption("email");
    await page.getByLabel("Segment", { exact: true }).selectOption({ label: "Major Donors" });
    await page.getByLabel("Subject", { exact: false }).fill(subject);
    await page
      .getByLabel("Body", { exact: false })
      .fill("Thank you for bringing clean water to everyone, forever.");
    await page.getByRole("button", { name: "Create communication" }).click();

    await page.waitForURL(/\/marketing\/communications\/[0-9a-f-]+$/);
    await expect(page.locator(".f95-record-head__title")).toHaveText(name);

    await page.goto("/marketing/communications");
    const createdRow = page.locator(".f95-table tbody tr", { hasText: name });
    await expect(createdRow).toHaveCount(1);
    await expect(createdRow).toContainText("Email");
    await expect(createdRow).toContainText("Major Donors");
    await expect(createdRow).toContainText("Draft");
  });

  test("sends a draft communication via the simulated send and sees the status flip to Sent", async ({
    page,
  }) => {
    const name = `E2E Sendable ${uniqueSuffix()}`;

    await page.goto("/marketing/communications/new");
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Channel", { exact: true }).selectOption("email");
    await page.getByRole("button", { name: "Create communication" }).click();
    await page.waitForURL(/\/marketing\/communications\/[0-9a-f-]+$/);
    await expect(page.locator(".f95-record-head__title")).toHaveText(name);
    await expect(page.locator(".f95-record-head__meta")).toContainText("Draft");

    await expect(page.locator("main")).toContainText("Sending is simulated");

    const sendButton = page.getByRole("button", { name: "Send now" });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    await expect(page.getByRole("button", { name: "Send now" })).toBeDisabled();
    await expect(page.locator(".f95-record-head__meta")).toContainText("Sent");
    await expect(page.locator("main")).toContainText("Sent");

    await page.goto("/marketing/communications");
    const sentRow = page.locator(".f95-table tbody tr", { hasText: name });
    await expect(sentRow).toContainText("Sent");
  });
});

test.describe("marketing — segments", () => {
  test("lists seeded segments with matching constituent counts", async ({ page }) => {
    await page.goto("/marketing/segments");
    await expect(page.locator(".f95-page__title")).toHaveText("Segments");

    const majorRow = page.locator(".f95-itemrow", { hasText: "Major Donors" });
    await expect(majorRow).toHaveCount(1);
    await expect(majorRow).toContainText(/\d+ constituents?/);

    const lapsedRow = page.locator(".f95-itemrow", { hasText: "Lapsed Donors" });
    await expect(lapsedRow).toHaveCount(1);
    await expect(lapsedRow).toContainText(/\d+ constituents?/);
  });

  test("builds and saves a new segment with the filter builder", async ({ page }) => {
    const segmentName = `E2E Segment ${uniqueSuffix()}`;

    await page.goto("/marketing/segments");
    await page.getByRole("link", { name: "New segment" }).click();
    await page.waitForURL(/\/marketing\/segments\/new/);
    await expect(page.locator(".f95-page__title")).toHaveText("New segment");

    await page.getByRole("button", { name: "Add filter" }).click();
    await page.getByLabel("Filter field").selectOption("type");
    await page.getByLabel("Filter value").selectOption("foundation");
    await page.waitForURL(/value%22%3A%22foundation/);

    const previewValue = page.locator(".f95-stat__value");
    await expect(previewValue).toHaveText(/\d+ constituents?/);
    const previewText = await previewValue.innerText();
    const previewCount = Number(previewText.match(/\d+/)?.[0] ?? "0");
    expect(previewCount).toBeGreaterThan(0);

    await page.getByLabel("Name", { exact: true }).fill(segmentName);
    await page.getByRole("button", { name: "Create segment" }).click();

    await page.waitForURL(/\/marketing\/segments$/);
    const savedRow = page.locator(".f95-itemrow", { hasText: segmentName });
    await expect(savedRow).toHaveCount(1);
    await expect(savedRow).toContainText(`${previewCount} constituents`);
  });
});

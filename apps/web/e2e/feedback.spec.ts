import { test, expect, type Page } from "@playwright/test";

interface DebugPayload {
  title: string;
  body: string;
  labels: string[];
}

async function readDebugPayload(page: Page): Promise<DebugPayload> {
  const json = await page.locator('[data-testid="feedback-debug-payload"]').textContent();
  return JSON.parse(json ?? "{}") as DebugPayload;
}

test.describe("in-app feedback widget (mock mode)", () => {
  test("reports a bug from the top bar: menu → form → pending → confirmation", async ({ page }) => {
    await page.goto("/95-forward/prospects");
    await expect(page.locator('[data-testid="feedback-widget"]')).toBeVisible();

    await page.locator('[data-testid="feedback-trigger"]').click();
    await page.locator('[data-testid="feedback-menu-bug"]').click();

    const modal = page.locator('[data-testid="feedback-modal"]');
    await expect(modal).toBeVisible();

    await modal.getByLabel("One-line summary").fill("QPI gap renders off the card edge");
    await modal.getByLabel("What happened?").fill("The note overflows the copilot card.");
    await modal
      .getByLabel("Where in the app?")
      .selectOption("Prospect record (QPI / Knowledge Base / Strategy / Visits)");
    await modal.getByLabel("Where were you testing?").selectOption("Local dev");
    await modal.getByLabel("How bad is it? (your best guess)").selectOption("Low — cosmetic / minor");

    const sent = page.waitForResponse((r) => r.request().method() === "POST");
    await modal.getByRole("button", { name: "Send" }).click();
    await sent;

    await expect(page.locator('[data-testid="feedback-confirmation"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="feedback-confirmation"]')).toContainText(
      "Thanks — sent to the team",
    );

    const payload = await readDebugPayload(page);
    expect(payload.title).toBe("[Bug]: QPI gap renders off the card edge");
    expect(payload.labels).toEqual(["source:in-app"]);
    expect(payload.body).toContain("- Route: `/95-forward/prospects`");
    expect(payload.body).toContain("- Build:");
    expect(payload.body).toContain("- Reported by: Dana Reese");
  });

  test("requests a feature from the top bar", async ({ page }) => {
    await page.goto("/95-forward/prospects");
    await page.locator('[data-testid="feedback-trigger"]').click();
    await page.locator('[data-testid="feedback-menu-feature"]').click();

    const modal = page.locator('[data-testid="feedback-modal"]');
    await expect(modal).toBeVisible();
    await modal.getByLabel("One-line summary").fill("Filter the list by last gift amount");
    await modal
      .getByLabel("What would you like, and why?")
      .fill("I'd like to filter so that I can prioritise.");

    const sent = page.waitForResponse((r) => r.request().method() === "POST");
    await modal.getByRole("button", { name: "Send" }).click();
    await sent;

    await expect(page.locator('[data-testid="feedback-confirmation"]')).toBeVisible({
      timeout: 15000,
    });

    const payload = await readDebugPayload(page);
    expect(payload.title).toBe("[Idea]: Filter the list by last gift amount");
    expect(payload.labels).toEqual(["source:in-app"]);
    expect(payload.body).toContain("- Type: Feature request");
  });

  test("closes the modal on Escape", async ({ page }) => {
    await page.goto("/95-forward/prospects");
    await page.locator('[data-testid="feedback-trigger"]').click();
    await page.locator('[data-testid="feedback-menu-bug"]').click();
    await expect(page.locator('[data-testid="feedback-modal"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="feedback-modal"]')).toHaveCount(0);
  });
});

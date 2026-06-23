import { test, expect, type Page } from "@playwright/test";

const NORTHWATER = "Northwater Capital";

async function openProspectByName(page: Page, name: string): Promise<void> {
  await page.goto("/95-forward/prospects");
  await page.locator('[data-testid="prospect-row"]').filter({ hasText: name }).first().click();
  await page.waitForURL(/\/95-forward\/prospects\/[0-9a-f-]+/);
  await expect(page.locator(".f95-record-head__title")).toHaveText(name);
}

// Regression for the live-mode copilot hang: with MOCK_LATENCY_MS set (playwright.config.ts) the
// mock model resolves slowly, so this exercises the pending→resolved path that instant mocks never
// covered. Asserts the trigger shows a non-blocking pending state, the draft surfaces WITHOUT a
// manual reload, and the pending state clears — the three failures the bare-form trigger had.
test.describe("copilot trigger — slow action pending/resolution", () => {
  test("shows pending, renders the draft without a reload, then clears pending", async ({
    page,
  }) => {
    await openProspectByName(page, NORTHWATER);

    const copilot = page.locator('[data-testid="prospect-copilot"]');
    const trigger = copilot.getByRole("button", { name: "Ask the copilot" });
    const urlBefore = page.url();

    await trigger.click();

    // (i) a non-blocking pending state appears (button disabled + "Working…"), not a frozen UI.
    const pendingButton = copilot.getByRole("button", { name: "Working…" });
    await expect(pendingButton).toBeVisible();
    await expect(pendingButton).toBeDisabled();

    // (ii) the provisional draft surfaces WITHOUT a manual reload, and the URL never changed.
    const suggestion = copilot.locator(".f95-prov").filter({ hasText: "Capacity" });
    await expect(suggestion).toBeVisible({ timeout: 15000 });
    await expect(suggestion.getByRole("button", { name: "Approve" })).toBeVisible();
    expect(page.url()).toBe(urlBefore);

    // (iii) the pending state clears — the trigger is enabled again.
    await expect(trigger).toBeEnabled();

    // Clean up: dismissing applies nothing, leaving the seeded score untouched for other specs.
    await suggestion.getByRole("button", { name: "Dismiss" }).click();
    await expect(copilot.locator(".f95-prov").filter({ hasText: "Capacity" })).toHaveCount(0, {
      timeout: 15000,
    });
  });
});

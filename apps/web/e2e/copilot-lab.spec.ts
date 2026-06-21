import { test, expect } from "@playwright/test";

const LAB = "/95-forward/copilot-lab";

test.describe("Copilot lab demonstration harness", () => {
  test("runs the full loop: propose, approve, and dismiss with no applied write until approval", async ({
    page,
  }) => {
    await page.goto(LAB);

    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(1);
    await expect(page.locator(".f95-page__title")).toContainText("demonstration harness");
    await expect(page.locator(".f95-page__eyebrow")).toContainText("dev harness");

    const runButton = page.getByRole("button", { name: "Run copilot" });
    await expect(runButton).toBeVisible();
    await runButton.click();

    const aiCards = page.locator(".f95-card--ai");
    await expect(aiCards.first()).toBeVisible();

    const qpiCard = aiCards.filter({ hasText: "QPI" }).first();
    const draftCard = aiCards.filter({ hasText: "Draft" }).first();

    await expect(qpiCard).toBeVisible();
    await expect(draftCard).toBeVisible();

    await expect(qpiCard.locator(".f95-src--grounded")).toContainText("990-PF");
    await expect(qpiCard.locator(".f95-prov__to")).toHaveText("5");

    await qpiCard.getByRole("button", { name: "Approve" }).click();

    const approvedCard = page.locator(".f95-card--ai .f95-prov__resolved--ok").first();
    await expect(approvedCard).toBeVisible();
    await expect(approvedCard).toContainText("applied");

    const remainingDraft = page.locator(".f95-card--ai").filter({ hasText: "Draft" }).first();
    await expect(remainingDraft).toBeVisible();
    await remainingDraft.getByRole("button", { name: "Dismiss" }).click();

    const dismissedCard = page.locator(".f95-card--ai .f95-prov__resolved--no").first();
    await expect(dismissedCard).toBeVisible();
    await expect(dismissedCard).toContainText("kept as you had it");
  });
});

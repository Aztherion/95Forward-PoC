import { test, expect, type Page } from "@playwright/test";

const HALLWORTH = "The Hallworth Family Foundation";
const OPAQUE_TERMS = ["because", "provenance", "breakdown", "see inside"] as const;

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function uniqueAmount(): { dollars: string; display: string } {
  const dollars = 100_000 + Math.floor(Math.random() * 899_999);
  return { dollars: String(dollars), display: `$${dollars.toLocaleString("en-US")}` };
}

async function gotoOpportunities(page: Page): Promise<void> {
  await page.goto("/major-giving/opportunities");
  await expect(page.locator(".f95-page__title")).toHaveText("Opportunities");
}

test.describe("major giving — route nesting + sidebar", () => {
  test("renders the host register with the Major Giving group expanded", async ({ page }) => {
    await gotoOpportunities(page);

    await expect(page.locator('[data-register="host"]')).toHaveCount(1);
    await expect(page.locator('[data-register="host"]')).toBeVisible();
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(0);

    const sidebar = page.locator(".shell-sidebar");
    const group = sidebar.getByRole("button", { name: "Major Giving" });
    await expect(group).toHaveAttribute("aria-expanded", "true");

    await expect(sidebar.locator(".shell-group__children").first()).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Opportunities" })).toHaveAttribute(
      "href",
      "/major-giving/opportunities",
    );
    await expect(sidebar.getByRole("link", { name: "Proposals" })).toHaveAttribute(
      "href",
      "/major-giving/proposals",
    );
    await expect(sidebar.getByRole("link", { name: "Portfolio" })).toHaveAttribute(
      "href",
      "/major-giving/portfolio",
    );
  });

  test("the bare /opportunities route is not the opportunities page (404)", async ({ page }) => {
    const response = await page.request.get("/opportunities");
    expect(response.status()).toBe(404);

    await page.goto("/opportunities");
    await expect(page.locator(".f95-page__title", { hasText: "Opportunities" })).toHaveCount(0);
  });
});

test.describe("major giving — opportunities pipeline", () => {
  test("shows the four-stage pipeline with Hallworth under Solicitation", async ({ page }) => {
    await gotoOpportunities(page);

    for (const stage of ["Identification", "Cultivation", "Solicitation", "Stewardship"]) {
      await expect(page.getByRole("region", { name: stage })).toBeVisible();
    }

    const solicitation = page.getByRole("region", { name: "Solicitation" });
    const hallworthRow = solicitation.locator(".f95-itemrow", { hasText: HALLWORTH });
    await expect(hallworthRow).toHaveCount(1);
    await expect(hallworthRow).toContainText("Ask $2,800,000");
  });

  test("renders an opaque likelihood: a bare NN% with no explanation", async ({ page }) => {
    await gotoOpportunities(page);

    const solicitation = page.getByRole("region", { name: "Solicitation" });
    const hallworthRow = solicitation.locator(".f95-itemrow", { hasText: HALLWORTH });
    const likelihood = hallworthRow.locator(".f95-mg-likelihood");
    await expect(likelihood).toBeVisible();
    await expect(likelihood.locator(".f95-mg-likelihood__value")).toHaveText(/^\d+%$/);

    const likelihoodText = (await likelihood.innerText()).toLowerCase();
    for (const forbidden of OPAQUE_TERMS) {
      expect(likelihoodText).not.toContain(forbidden);
    }
    const rowText = (await hallworthRow.innerText()).toLowerCase();
    for (const forbidden of OPAQUE_TERMS) {
      expect(rowText).not.toContain(forbidden);
    }
  });
});

test.describe("major giving — create and edit an opportunity", () => {
  test("creates an opportunity, sees it in the pipeline, then edits it", async ({ page }) => {
    const ask = uniqueAmount();
    const editedAsk = uniqueAmount();

    await gotoOpportunities(page);
    await page.getByRole("link", { name: "New opportunity" }).click();
    await page.waitForURL(/\/major-giving\/opportunities\/new/);

    await page.getByLabel("Constituent").selectOption({ label: "Clara Holloway" });
    await page.getByLabel("Stage", { exact: false }).selectOption("cultivation");
    await page.getByLabel(/Ask amount/).fill(ask.dollars);
    await page.getByRole("button", { name: "Create opportunity" }).click();

    await page.waitForURL(/\/major-giving\/opportunities$/);
    const createdRow = page.locator(".f95-itemrow", { hasText: ask.display });
    await expect(createdRow).toHaveCount(1);
    const cultivation = page.getByRole("region", { name: "Cultivation" });
    await expect(cultivation.locator(".f95-itemrow", { hasText: ask.display })).toHaveCount(1);

    await createdRow.getByRole("link", { name: "Open" }).click();
    await page.waitForURL(/\/major-giving\/opportunities\/[0-9a-f-]+$/);
    const recordUrl = page.url();
    await expect(page.locator(".f95-record-head__title")).toHaveText("Clara Holloway");

    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL(/\/edit$/);
    await page.getByLabel(/Ask amount/).fill(editedAsk.dollars);
    await page.getByLabel("Stage", { exact: false }).selectOption("solicitation");
    await page.getByRole("button", { name: "Save changes" }).click();

    await page.waitForURL(recordUrl);
    await expect(page.getByText(editedAsk.display, { exact: true }).first()).toBeVisible();
    await expect(page.locator("main")).toContainText("Solicitation");
  });
});

test.describe("major giving — proposals", () => {
  test("lists proposals, creates one, then edits it", async ({ page }) => {
    const purpose = `E2E Proposal Purpose ${uniqueSuffix()}`;
    const editedPurpose = `E2E Proposal Edited ${uniqueSuffix()}`;
    const amount = uniqueAmount();

    await page.goto("/major-giving/proposals");
    await expect(page.locator(".f95-page__title")).toHaveText("Proposals");
    await expect(page.locator(".f95-table tbody tr").first()).toBeVisible();

    await page.getByRole("link", { name: "New proposal" }).click();
    await page.waitForURL(/\/major-giving\/proposals\/new/);

    await page.getByLabel("Constituent").selectOption({ label: "Clara Holloway" });
    await page.getByLabel(/Amount/).fill(amount.dollars);
    await page.getByLabel(/Purpose/).fill(purpose);
    await page.getByRole("button", { name: "Create proposal" }).click();

    await page.waitForURL(/\/major-giving\/proposals$/);
    const createdRow = page.locator(".f95-table tbody tr", { hasText: purpose });
    await expect(createdRow).toHaveCount(1);
    await expect(createdRow).toContainText(amount.display);

    await createdRow.getByRole("link", { name: "Open" }).click();
    await page.waitForURL(/\/major-giving\/proposals\/[0-9a-f-]+$/);
    const recordUrl = page.url();

    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL(/\/edit$/);
    await page.getByLabel(/Purpose/).fill(editedPurpose);
    await page.getByRole("button", { name: "Save changes" }).click();

    await page.waitForURL(recordUrl);
    await expect(page.getByText(editedPurpose).first()).toBeVisible();
  });
});

test.describe("major giving — portfolio", () => {
  test("renders the officer book with summary stats and switches officer", async ({ page }) => {
    await page.goto("/major-giving/portfolio");
    await expect(page.locator(".f95-page__title")).toHaveText("Portfolio");

    await expect(page.locator(".f95-page__count")).toContainText("Dana Reese");

    const statLabels = (await page.locator(".f95-statgrid .f95-stat__label").allInnerTexts()).map(
      (label) => label.toLowerCase(),
    );
    expect(statLabels).toContain("total ask");
    expect(statLabels).toContain("solicitation");
    const totalAsk = page
      .locator(".f95-stat", { has: page.getByText("Total ask", { exact: false }) })
      .locator(".f95-stat__value");
    await expect(totalAsk).toHaveText(/^\$[\d,]+$/);

    await expect(page.locator(".f95-itemrow", { hasText: HALLWORTH })).toHaveCount(1);

    await page.getByLabel("Gift officer").selectOption({ label: "Priya Nair" });
    await page.waitForURL(/owner=/);
    await expect(page.locator(".f95-page__count")).toContainText("Priya Nair");
  });
});

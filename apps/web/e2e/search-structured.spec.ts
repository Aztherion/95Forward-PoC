import { test, expect, type Page } from "@playwright/test";

const SEARCH = "/95-forward/search";
const HALLWORTH = "The Hallworth Family Foundation";

async function search(page: Page, query: string): Promise<void> {
  await page.goto(SEARCH);
  await page.getByLabel("Search prospects").fill(query);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL(/[?&]q=/);
}

test.describe("95 Forward — NL structured-query layer (Initiative 14)", () => {
  test("'QPI higher than 80' → pure-structured, returns the >80 prospects incl. Hallworth", async ({
    page,
  }) => {
    await search(page, "Prospects with QPI higher than 80");

    const interp = page.locator('[data-testid="interpreted-query"]');
    await expect(interp).toBeVisible();
    await expect(interp.locator('[data-testid="interpreted-filter"]')).toContainText("QPI > 80");

    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toBeVisible();
    await expect(matches).toContainText([HALLWORTH]);
    // Four prospects clear 80 after I18b widened the portfolio: Hallworth (92), Sterling (90),
    // Maya Abernathy (84) and Cordova (83).
    await expect(matches).toHaveCount(4);
  });

  test("'Foundations with high capacity' → structured (type + capacity), foundations only", async ({
    page,
  }) => {
    await search(page, "Foundations with high capacity");

    const filters = page.locator('[data-testid="interpreted-filter"]');
    await expect(filters).toContainText(["Type is foundation"]);
    await expect(filters).toContainText(["Capacity ≥ 4"]);

    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toBeVisible();
    // Every match is a Foundation (none individual/organization).
    const count = await matches.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i += 1) {
      await expect(matches.nth(i)).toContainText("Foundation");
    }
    await expect(matches).toContainText([HALLWORTH]);
  });

  test("'Not contacted in 60 days' → structured recency, a meaningful subset", async ({ page }) => {
    await search(page, "Not contacted in 60 days");

    await expect(page.locator('[data-testid="interpreted-filter"]')).toContainText(
      "Not contacted in 60 days",
    );
    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toBeVisible();
    const count = await matches.count();
    // A SUBSET is the claim — not everybody and not nobody. Measured against the live prospect
    // count rather than a hardcoded one, so widening the portfolio again does not re-break this.
    const total = await page.evaluate(async () => {
      const res = await fetch("/95-forward/prospects");
      const html = await res.text();
      return (html.match(/data-testid="prospect-row"/g) ?? []).length;
    });
    expect(total).toBeGreaterThan(8);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(total);
  });

  test("'Strong relationship to clean water' → hybrid (relationship filter + semantic)", async ({
    page,
  }) => {
    await search(page, "Strong relationship to clean water");

    const interp = page.locator('[data-testid="interpreted-query"]');
    await expect(interp.locator('[data-testid="interpreted-filter"]')).toContainText(
      "Relationship ≥ 4",
    );
    await expect(interp.locator('[data-testid="interpreted-semantic"]')).toContainText(
      "clean water",
    );

    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toBeVisible();
  });

  test("a pure-semantic query still works (name match), no structured filters", async ({
    page,
  }) => {
    await search(page, "Hallworth");
    const matches = page.locator('[data-testid="search-match"]');
    await expect(matches.first()).toContainText(HALLWORTH);
    // No structured filter chips for a free-text name query.
    await expect(page.locator('[data-testid="interpreted-filter"]')).toHaveCount(0);
  });

  test("an unparseable query falls back gracefully (no crash, first-class unknown)", async ({
    page,
  }) => {
    await search(page, "zzqwx nonsense unanswerable 99x");
    await expect(page.locator('[data-testid="search-match"]')).toHaveCount(0);
    await expect(page.getByText("No matched prospects")).toBeVisible();
  });
});

test.describe("95 Forward — search UI polish", () => {
  test("triggering a search via a SUGGESTION CHIP shows a pending affordance", async ({ page }) => {
    await page.goto(SEARCH);
    // Click the chip (a button, not a form submit) — under MOCK_LATENCY_MS the transition is pending
    // long enough to assert. This is the path that previously showed no loading feedback.
    await page.getByRole("button", { name: "Foundations with high capacity" }).click();
    await expect(page.getByTestId("search-pending")).toBeVisible();
    await page.waitForURL(/[?&]q=/);
    await expect(page.locator('[data-testid="search-match"]').first()).toBeVisible();
  });

  test("triggering a search via the Search button also shows a pending affordance", async ({
    page,
  }) => {
    await page.goto(SEARCH);
    await page.getByLabel("Search prospects").fill("Prospects with QPI higher than 80");
    await page
      .getByRole("button", { name: "Searching…" })
      .or(page.getByRole("button", { name: "Search", exact: true }))
      .click();
    await expect(page.getByTestId("search-pending")).toBeVisible();
    await page.waitForURL(/[?&]q=/);
  });

  test("a pure-structured query shows no 'Related to null' chip and the count is in the heading", async ({
    page,
  }) => {
    await search(page, "Prospects with QPI higher than 80");

    // #2: no stringified-null semantic chip.
    await expect(page.getByTestId("interpreted-semantic")).toHaveCount(0);
    await expect(page.getByText("Related to", { exact: false })).toHaveCount(0);

    // #3: the count moves into the "Who this is about" heading…
    await expect(
      page.getByRole("heading", { name: /Who this is about · 4 prospects/ }),
    ).toBeVisible();
    // …and "What we found" is omitted for pure-structured (no retrieved evidence, no dead chip).
    await expect(page.getByRole("heading", { name: "What we found" })).toHaveCount(0);
  });

  test("a semantic query keeps 'What we found' with its grounded sources", async ({ page }) => {
    await search(page, "Hallworth");
    await expect(
      page.getByRole("heading", { name: "Who this is about", exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "What we found" })).toBeVisible();
    await expect(page.locator(".f95-src").first()).toBeVisible();
  });
});

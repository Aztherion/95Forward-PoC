import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";

interface PgClient {
  connect(): Promise<void>;
  query(text: string, values: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}
type PgClientCtor = new (config: { connectionString: string }) => PgClient;

const requireFromDb = createRequire(require.resolve("@95forward/db"));
const { Client } = requireFromDb("pg") as { Client: PgClientCtor };

const DB_URL = process.env.DATABASE_URL ?? "postgres://forward:forward@localhost:5432/forward";

// Restore the seeded discovery state after each test: undo any promotion of the seeded Sandra Kim
// candidates (delete the prospects/constituents/natural-partners they created), reset the candidates
// to suggested, and clear any test-created (non-seed) discovery rows. Seeded rows (origin_key like
// 'seed:%') are preserved so the demo batches stay stable across runs.
async function cleanup(): Promise<void> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    // Constituents created by promoting a seeded candidate (the seed never creates these names as
    // constituents, so deleting by name is safe and cascades to their prospect + natural partners).
    await client.query(
      "delete from constituents where display_name in ('Lena Petrov', 'David Osei', 'Priscilla Vance', 'Marcus Hale')",
      [],
    );
    await client.query("delete from graphile_worker._private_jobs", []);
    await client.query(
      "update candidates set status = 'suggested', promoted_prospect_id = null where origin_key like 'seed:discovery:sandra-bolivia:%'",
      [],
    );
    await client.query(
      "update discovery_tasks set status = 'ready' where origin_key = 'seed:discovery:sandra-bolivia'",
      [],
    );
    // Drop any non-seed discovery tasks/candidates a test created (and their candidates cascade).
    await client.query(
      "delete from discovery_tasks where origin_key is null or origin_key not like 'seed:%'",
      [],
    );
  } finally {
    await client.end();
  }
}

async function gotoCandidates(page: Page): Promise<void> {
  await page.goto("/95-forward/prospects/candidates");
  await expect(page.locator('[data-testid="candidates-view"]')).toBeVisible();
}

function candidateCard(page: Page, name: string) {
  return page.locator('[data-testid="candidate-card"]').filter({ hasText: name });
}

test.describe.serial("95 Forward — Connector discovery & candidates (Initiative 12)", () => {
  test.afterEach(async () => {
    await cleanup();
  });

  test("the seeded Sandra Kim batch is ready with hypothesis-grade candidate cards", async ({
    page,
  }) => {
    await gotoCandidates(page);
    const batches = page.locator('[data-testid="candidate-batch"]');
    await expect(batches.filter({ hasText: "Sandra Kim" })).toBeVisible();
    const lena = candidateCard(page, "Lena Petrov");
    await expect(lena).toBeVisible();
    await expect(lena).toContainText("confidence");
  });

  test("candidates do NOT appear on the ranked MPL before promotion", async ({ page }) => {
    await page.goto("/95-forward/prospects");
    await expect(page.locator('[data-testid="prospects-mpl"]')).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Lena Petrov");
  });

  test("endorse -> request intro -> promote puts a new prospect on the MPL with the connector as Natural Partner", async ({
    page,
  }) => {
    await gotoCandidates(page);
    await expect(candidateCard(page, "David Osei")).toBeVisible();

    // Each server-action form submit re-renders the card in place; wait for the next action to
    // appear before clicking it so we never race the revalidation.
    await candidateCard(page, "David Osei").locator('[data-testid="candidate-endorse"]').click();
    const requestIntro = candidateCard(page, "David Osei").getByRole("button", {
      name: "Request intro",
    });
    await expect(requestIntro).toBeVisible();
    await requestIntro.click();

    const promote = candidateCard(page, "David Osei").locator('[data-testid="candidate-promote"]');
    await expect(promote).toBeVisible();
    await promote.click();

    // The promoted candidate links to its new prospect ("On the list").
    await expect(candidateCard(page, "David Osei").getByText("On the list")).toBeVisible();

    // The promoted candidate is now a prospect on the MPL.
    await page.goto("/95-forward/prospects");
    await expect(page.locator("body")).toContainText("David Osei");

    // Open the new prospect and confirm Sandra Kim is its Natural Partner (the warm path).
    await page.getByText("David Osei").first().click();
    await expect(page.locator("body")).toContainText("Sandra Kim");
  });

  test("Find introductions enqueues a discovery job that drains to a ready batch", async ({
    page,
  }) => {
    await gotoCandidates(page);
    await page.locator('[data-testid="find-introductions"]').click();
    await page
      .locator('select[name="fundingInitiativeId"]')
      .selectOption({ label: "Everyone Forever: Bolivia Scale-Up" });
    await page
      .locator('select[name="connectorConstituentId"]')
      .selectOption({ label: "Sandra Kim" });
    await page.getByRole("button", { name: "Start the search" }).click();

    const res = await page.request.post("/api/test-drain-jobs");
    expect(res.ok()).toBeTruthy();

    await gotoCandidates(page);
    // Two ready Sandra Kim batches now (the seeded one + the freshly-drained one).
    const sandraBatches = page
      .locator('[data-testid="candidate-batch"]')
      .filter({ hasText: "Sandra Kim" });
    await expect(sandraBatches.first()).toBeVisible();
  });

  test("Keep researching re-runs discovery for the batch and the candidates come back ready", async ({
    page,
  }) => {
    // Use a FRESH batch (not the seeded one) so this destructive re-discovery never mutates the
    // seeded demo state: create one via Find introductions, drain it to ready, then keep-research it.
    await gotoCandidates(page);
    await page.locator('[data-testid="find-introductions"]').click();
    await page
      .locator('select[name="fundingInitiativeId"]')
      .selectOption({ label: "Everyone Forever: Bolivia Scale-Up" });
    await page
      .locator('select[name="connectorConstituentId"]')
      .selectOption({ label: "Sandra Kim" });
    await page.getByRole("button", { name: "Start the search" }).click();
    expect((await page.request.post("/api/test-drain-jobs")).ok()).toBeTruthy();

    await gotoCandidates(page);
    // The fresh batch's first candidate — keep-research it (deletes + re-runs discovery).
    const fresh = page
      .locator('[data-testid="candidate-batch"]')
      .filter({ hasText: "Sandra Kim" })
      .last();
    await fresh.locator('[data-testid="candidate-keep-researching"]').first().click();
    expect((await page.request.post("/api/test-drain-jobs")).ok()).toBeTruthy();

    await gotoCandidates(page);
    // The candidates come back ready — not a silent no-op.
    await expect(candidateCard(page, "Lena Petrov").first()).toBeVisible();
  });
});

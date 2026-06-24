import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";

interface PgClient {
  connect(): Promise<void>;
  query(text: string, values: unknown[]): Promise<unknown>;
  end(): Promise<void>;
}
type PgClientCtor = new (config: { connectionString: string }) => PgClient;

const requireFromDb = createRequire(require.resolve("@95forward/db"));
const { Client } = requireFromDb("pg") as { Client: PgClientCtor };

const BOLIVIA_ID = "c99ee93a-5984-5d81-9e30-8db4267e29f1";
const KAMULI_ID = "fe80caf5-8071-5921-acc0-d51fa9993605";
const BELLO_ID = "f1beba00-7e04-5496-abab-ce8d2786d36c";

const SEEDED_BOLIVIA_STORY =
  "Over three years, we bring an entire Bolivian region to full, self-sustaining water coverage — and then we leave, because the services last without us. This is the patient, multi-year commitment behind Everyone Forever: infrastructure and institutions built together so that coverage holds for a generation.";

function stableId(key: string): string {
  const hash = createHash("sha1").update(key).digest("hex");
  const hex = hash.slice(0, 32);
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

const SEEDED_BOLIVIA_ASSOCIATION_IDS = ["hallworth", "osgood", "vega", "northwater"].map((key) =>
  stableId(`cultivation:${key}:bolivia`),
);

const DB_URL = process.env.DATABASE_URL ?? "postgres://forward:forward@localhost:5432/forward";

async function restoreBoliviaToSeed(): Promise<void> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query("update funding_initiatives set story = $1 where id = $2", [
      SEEDED_BOLIVIA_STORY,
      BOLIVIA_ID,
    ]);

    await client.query(
      "delete from prospect_funding_initiatives where funding_initiative_id = $1 and id <> all($2::uuid[])",
      [BOLIVIA_ID, SEEDED_BOLIVIA_ASSOCIATION_IDS],
    );

    await client.query("delete from copilot_proposals where subject_id = $1", [BOLIVIA_ID]);
  } finally {
    await client.end();
  }
}

async function gotoBolivia(page: Page): Promise<void> {
  await page.goto(`/95-forward/initiatives/${BOLIVIA_ID}`);
  await expect(page.locator('[data-testid="initiative-detail"]')).toBeVisible();
}

async function submitServerAction(
  page: Page,
  button: ReturnType<Page["getByRole"]>,
): Promise<void> {
  const done = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().includes("/initiatives/"),
  );
  await button.click();
  await done;
}

async function askRationale(page: Page) {
  const panel = page.locator('[data-testid="initiative-copilot"]');
  await submitServerAction(
    page,
    panel.getByRole("button", { name: "Ask the copilot to draft the rationale" }),
  );
  const suggestion = panel.locator(".f95-prov").first();
  await expect(suggestion).toBeVisible();
  await expect(suggestion.locator(".f95-prov__acts")).toBeVisible();
  return { panel, suggestion };
}

test.describe.serial("95 Forward — Funding Initiatives (Initiative 9)", () => {
  test.afterEach(async () => {
    await restoreBoliviaToSeed();
  });

  test("the initiatives list renders in the full-color 95 Forward register", async ({ page }) => {
    await page.goto("/95-forward/initiatives");
    await expect(page.locator('[data-testid="initiatives-list"]')).toBeVisible();
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(1);
  });

  test("initiatives are grouped into the Today, Tomorrow, and Forever frames", async ({ page }) => {
    await page.goto("/95-forward/initiatives");

    await expect(page.locator('[data-testid="frame-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="frame-tomorrow"]')).toBeVisible();
    await expect(page.locator('[data-testid="frame-forever"]')).toBeVisible();
  });

  test("each frame lists its seeded initiative with a HorizonTag, goal, progress bar, and timeline", async ({
    page,
  }) => {
    await page.goto("/95-forward/initiatives");

    const today = page.locator('[data-testid="frame-today"]');
    const tomorrow = page.locator('[data-testid="frame-tomorrow"]');
    const forever = page.locator('[data-testid="frame-forever"]');

    await expect(today.getByText("Everyone in Kamuli")).toBeVisible();
    await expect(tomorrow.getByText("Bolivia Scale-Up")).toBeVisible();
    await expect(forever.getByText("Forever Promise")).toBeVisible();

    const boliviaCard = tomorrow.locator('[data-testid="initiative-card"]').filter({
      hasText: "Bolivia Scale-Up",
    });
    await expect(boliviaCard.locator(".f95-horizon")).toBeVisible();
    await expect(boliviaCard).toContainText("Goal $3,200,000");
    await expect(boliviaCard.locator(".f95-progress")).toBeVisible();
    await expect(boliviaCard.locator(".f95-deflist__desc--empty")).toContainText("→");
  });

  test("a card with a committed ask reads a non-zero pct, while one with none stays an honest 0%", async ({
    page,
  }) => {
    await page.goto("/95-forward/initiatives");

    const kamuli = page
      .locator('[data-testid="initiative-card"]')
      .filter({ hasText: "Everyone in Kamuli" });
    await expect(kamuli).not.toContainText("0%");
    await expect(kamuli).toContainText("67%");

    const forever = page
      .locator('[data-testid="initiative-card"]')
      .filter({ hasText: "Forever Promise" });
    await expect(forever).toContainText("0%");
  });

  test("the Bolivia detail renders its frame, goal, and timeline", async ({ page }) => {
    await gotoBolivia(page);

    const detail = page.locator('[data-testid="initiative-detail"]');
    await expect(detail.locator(".f95-record-head__title")).toContainText("Bolivia Scale-Up");
    const meta = detail.locator(".f95-record-head__meta");
    await expect(meta.locator(".f95-horizon")).toBeVisible();
    await expect(meta).toContainText("$3,200,000");
    await expect(meta).toContainText("→");
  });

  test("the Bolivia story renders the seeded case for support in the Newsreader serif", async ({
    page,
  }) => {
    await gotoBolivia(page);

    const story = page.locator('[data-testid="initiative-story"]');
    await expect(story).toContainText("self-sustaining");
    await expect(story.locator(".f95-moment")).toBeVisible();
  });

  test("the cultivation pipeline lists the seeded Hallworth prospect", async ({ page }) => {
    await gotoBolivia(page);

    const pipeline = page.locator('[data-testid="cultivation-pipeline"]');
    await expect(pipeline).toBeVisible();
    await expect(
      pipeline.locator('[data-testid="pipeline-prospect"]').filter({ hasText: "Hallworth" }),
    ).toBeVisible();
  });

  test("the Progress rail reflects a committed ask on Kamuli", async ({ page }) => {
    await page.goto(`/95-forward/initiatives/${KAMULI_ID}`);
    await expect(page.locator('[data-testid="initiative-detail"]')).toBeVisible();

    const rail = page.locator(".f95-overview__rail");
    await expect(rail.locator(".f95-goalmeta")).toContainText("committed");
    await expect(rail.locator(".f95-goalmeta__pct")).not.toHaveText("0%");
    await expect(rail.locator(".f95-goalmeta__pct")).toHaveText("67%");
    await expect(rail.locator(".f95-goalmeta")).toContainText("$300,000 committed");
  });

  test("the Progress rail is an honest 0% for an initiative with no committed asks", async ({
    page,
  }) => {
    await gotoBolivia(page);

    const rail = page.locator(".f95-overview__rail");
    await expect(rail.locator(".f95-goalmeta")).toContainText("committed");
    await expect(rail.locator(".f95-goalmeta__pct")).toHaveText("0%");
  });

  test("attaching a new prospect adds it to the cultivation pipeline", async ({ page }) => {
    await gotoBolivia(page);

    const pipeline = page.locator('[data-testid="cultivation-pipeline"]');
    const before = await pipeline.locator('[data-testid="pipeline-prospect"]').count();

    await pipeline.getByRole("button", { name: "Cultivate a prospect" }).click();
    const form = page.locator('[data-testid="attach-prospect-form"]');
    await expect(form).toBeVisible();
    await form.locator("select[name=prospectId]").selectOption(BELLO_ID);
    await submitServerAction(page, form.getByRole("button", { name: "Add to the pipeline" }));

    const rows = pipeline.locator('[data-testid="pipeline-prospect"]');
    await expect(rows).toHaveCount(before + 1);
    await expect(rows.filter({ hasText: "Bello" })).toBeVisible();
  });

  test("removing a freshly attached prospect detaches it from the pipeline", async ({ page }) => {
    await gotoBolivia(page);

    const pipeline = page.locator('[data-testid="cultivation-pipeline"]');

    await pipeline.getByRole("button", { name: "Cultivate a prospect" }).click();
    const form = page.locator('[data-testid="attach-prospect-form"]');
    await form.locator("select[name=prospectId]").selectOption(BELLO_ID);
    await submitServerAction(page, form.getByRole("button", { name: "Add to the pipeline" }));

    const belloRow = pipeline.locator('[data-testid="pipeline-prospect"]').filter({
      hasText: "Bello",
    });
    await expect(belloRow).toBeVisible();

    await submitServerAction(page, belloRow.getByRole("button", { name: "Remove" }));

    await expect(
      pipeline.locator('[data-testid="pipeline-prospect"]').filter({ hasText: "Bello" }),
    ).toHaveCount(0, { timeout: 15000 });
  });

  test("the copilot drafts a rationale as a provisional iris suggestion", async ({ page }) => {
    await gotoBolivia(page);
    const { suggestion } = await askRationale(page);
    await expect(suggestion.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(suggestion.getByRole("button", { name: "Dismiss" })).toBeVisible();
  });

  test("approving the rationale writes the drafted story back to the initiative", async ({
    page,
  }) => {
    await gotoBolivia(page);

    const story = page.locator('[data-testid="initiative-story"]');
    await expect(story).toContainText("patient, multi-year commitment");

    const { panel, suggestion } = await askRationale(page);
    await submitServerAction(page, suggestion.getByRole("button", { name: "Approve" }));
    await page.reload();

    await expect(panel.getByRole("button", { name: "Approve" })).toHaveCount(0);
    await expect(story).toContainText("self-sustaining water coverage");
    await expect(story).toContainText("Everyone, Forever");
    await expect(story).not.toContainText("patient, multi-year commitment");
    await expect(story.locator(".f95-moment")).toBeVisible();
  });

  test("dismissing the rationale applies nothing and leaves the story unchanged", async ({
    page,
  }) => {
    await gotoBolivia(page);

    const story = page.locator('[data-testid="initiative-story"]');
    await expect(story).toContainText("patient, multi-year commitment");

    const { suggestion } = await askRationale(page);
    await submitServerAction(page, suggestion.getByRole("button", { name: "Dismiss" }));
    await page.reload();

    await expect(story).toContainText("patient, multi-year commitment");
    await expect(story).not.toContainText("Your gift moves a district past the milestone");
  });
});

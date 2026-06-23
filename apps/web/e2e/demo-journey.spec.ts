import { createHash } from "node:crypto";
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

const HALLWORTH = "The Hallworth Family Foundation";
const HALLWORTH_ID = "4d5139c5-467f-52a6-91c7-494e51d79f43";
const FOREVER_ID = "097072dd-9be5-5a11-961e-ab59f497fe5d";

const RUTH_EMAIL = "ruth.castellanos@waterforpeople.org";

const DB_URL = process.env.DATABASE_URL ?? "postgres://forward:forward@localhost:5432/forward";

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

const HALLWORTH_FOLLOWUP_ID = stableId("followup:hallworth-bolivia");
const SEEDED_VISIT_ID = "33afa5c5-5fb0-5bf4-9821-5a2a03f99cea";
const SEEDED_EXEC_VISIT_ID = "aa920ae5-c3d5-507a-b9d0-c5d64a5c2fbd";
const SEEDED_KDM_NAMES = ["David Hallworth", "Program Officer (WASH)"];
const SEEDED_GAP_LABELS = ["Wealth screen on the trustees", "Spouse / family giving connections"];
const PROMOTED_CANDIDATE_NAMES = ["Lena Petrov", "David Osei", "Priscilla Vance", "Marcus Hale"];

async function withDb<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Restore every seeded row the headline journey mutates so the spec is replay-safe even between the
// once-per-suite global-setup reseeds. Mirrors the per-feature cleanup the existing specs use.
async function restoreDemoState(): Promise<void> {
  await withDb(async (client) => {
    await client.query("delete from asks where prospect_id = $1 and funding_initiative_id = $2", [
      HALLWORTH_ID,
      FOREVER_ID,
    ]);
    await client.query("update follow_up_tasks set status = 'open' where id = $1", [
      HALLWORTH_FOLLOWUP_ID,
    ]);
    await client.query("delete from visits where prospect_id = $1 and id <> all($2::uuid[])", [
      HALLWORTH_ID,
      [SEEDED_VISIT_ID, SEEDED_EXEC_VISIT_ID],
    ]);
    await client.query(
      "delete from relationship_map_entries where prospect_id = $1 and name <> all($2::text[])",
      [HALLWORTH_ID, SEEDED_KDM_NAMES],
    );
    await client.query(
      "delete from research_gaps where prospect_id = $1 and label <> all($2::text[])",
      [HALLWORTH_ID, SEEDED_GAP_LABELS],
    );
    await client.query("update research_gaps set status = 'open' where prospect_id = $1", [
      HALLWORTH_ID,
    ]);
    await client.query("delete from copilot_proposals where subject_id = $1", [HALLWORTH_ID]);
    await client.query("delete from graphile_worker._private_jobs", []);
    await client.query(
      "delete from research_jobs where origin_key is null or origin_key not like 'seed:%'",
      [],
    );
    await client.query("update research_jobs set status = 'ready' where origin_key = $1", [
      "seed:research:hallworth",
    ]);
    await client.query("delete from constituents where display_name = any($1::text[])", [
      PROMOTED_CANDIDATE_NAMES,
    ]);
    await client.query(
      "update candidates set status = 'suggested', promoted_prospect_id = null where origin_key like 'seed:discovery:sandra-bolivia:%'",
      [],
    );
    await client.query(
      "update discovery_tasks set status = 'ready' where origin_key = 'seed:discovery:sandra-bolivia'",
      [],
    );
    await client.query(
      "delete from discovery_tasks where origin_key is null or origin_key not like 'seed:%'",
      [],
    );
  });
}

async function drainJobs(page: Page): Promise<void> {
  const res = await page.request.post("/api/test-drain-jobs");
  expect(res.ok()).toBeTruthy();
}

function candidateCard(page: Page, name: string) {
  return page.locator('[data-testid="candidate-card"]').filter({ hasText: name });
}

test.describe.serial("95 Forward — the headline demo journey (Initiative 13)", () => {
  test.afterAll(async () => {
    await restoreDemoState();
  });

  test("the host CRM keeps major-gift likelihood opaque (the foil)", async ({ page }) => {
    await page.goto(`/constituents/${HALLWORTH_ID}`);
    await expect(page.locator('[data-register="host"]')).toBeVisible();
    await expect(page.locator(".shell")).toBeVisible();
  });

  test("the MPL ranks Hallworth #1 by QPI and points to the next right move", async ({ page }) => {
    await page.goto("/95-forward/prospects");
    await expect(page.locator('[data-register="95-forward"]')).toBeVisible();
    await expect(page.locator('[data-testid="prospects-mpl"]')).toBeVisible();

    const row = page.locator('[data-testid="prospect-row"]').filter({ hasText: HALLWORTH });
    await expect(row.locator(".f95-prow__rank .n")).toHaveText("1");
    await expect(row.locator(".f95-prow__qpi .v")).toHaveText("92");
    await expect(page.locator('[data-testid="next-move"]')).toBeVisible();
  });

  test("the Hallworth QPI hides the math until the officer opens the score", async ({ page }) => {
    await page.goto(`/95-forward/prospects/${HALLWORTH_ID}`);
    await expect(page.locator(".f95-record-head__title")).toContainText(HALLWORTH);
    await expect(page.locator('[data-testid="prospect-qpi"] .f95-qpi__num')).toHaveText("92");

    await expect(page.locator(".f95-qpi__part")).toHaveCount(0);
    await page.getByRole("button", { name: /See inside the score/ }).click();
    await expect(page.locator(".f95-qpi__part")).toHaveCount(5);
    await page.getByRole("button", { name: /Hide the math/ }).click();
    await expect(page.locator(".f95-qpi__part")).toHaveCount(0);
  });

  test("a research gap turns into a queued job, drains, and is ready to review", async ({
    page,
  }) => {
    await page.goto(`/95-forward/prospects/${HALLWORTH_ID}?tab=knowledge`);
    await expect(page.locator('[data-testid="prospect-detail"]')).toBeVisible();

    const researchButton = page.locator('[data-testid="research-this"]').first();
    await expect(researchButton).toBeVisible();
    const done = page.waitForResponse((r) => r.request().method() === "POST");
    await researchButton.click();
    await done;

    await drainJobs(page);

    await page.goto("/95-forward/today");
    await expect(page.locator('[data-testid="today-research-jobs"]')).toContainText(
      "ready to review",
    );
  });

  test("planning a visit and entering Visit Mode surfaces the after-phase ask form", async ({
    page,
  }) => {
    await page.goto(`/95-forward/prospects/${HALLWORTH_ID}?tab=visits`);
    await expect(page.locator('[data-testid="prospect-detail"]')).toBeVisible();

    await page.goto(`/95-forward/visit?prospect=${HALLWORTH_ID}&phase=after`);
    await expect(page.locator('[data-testid="visit-mode"]')).toBeVisible();
    await expect(page.locator('[data-testid="outcome-commitment"]')).toBeVisible();
  });

  test("logging a commitment ask records it and rolls into the initiative progress", async ({
    page,
  }) => {
    await page.goto(`/95-forward/prospects/${HALLWORTH_ID}?tab=visits`);
    const asksList = page.locator('[data-testid="asks-list"]');
    const asksBefore = await asksList.locator('[data-testid="ask-row"]').count();
    await asksList.getByRole("button", { name: "Log an ask" }).click();

    const form = page.locator('[data-testid="log-ask-form"]');
    await form.locator("select[name=fundingInitiativeId]").selectOption(FOREVER_ID);
    await form.locator("select[name=outcome]").selectOption("commitment");
    await form.locator("input[name=commitmentAmountDollars]").fill("25000");
    const done = page.waitForResponse((r) => r.request().method() === "POST");
    await form.getByRole("button", { name: "Log the ask" }).click();
    await done;

    await expect(asksList.locator('[data-testid="ask-row"]')).toHaveCount(asksBefore + 1);

    await page.goto(`/95-forward/initiatives/${FOREVER_ID}`);
    await expect(page.locator(".f95-overview__rail .f95-goalmeta")).toContainText(
      "$25,000 committed",
    );

    // Parallel-safety: the Forever initiative's seeded baseline ($0 committed) is asserted by
    // execute.spec.ts running concurrently, so this ask must be removed within its own test rather
    // than deferred to afterAll.
    await withDb(async (client) => {
      await client.query("delete from asks where prospect_id = $1 and funding_initiative_id = $2", [
        HALLWORTH_ID,
        FOREVER_ID,
      ]);
    });
  });

  test("a 24h follow-up heartbeat is due on the prospect and can be marked done", async ({
    page,
  }) => {
    await withDb(async (client) => {
      await client.query("update follow_up_tasks set status = 'open' where id = $1", [
        HALLWORTH_FOLLOWUP_ID,
      ]);
    });
    await page.goto(`/95-forward/prospects/${HALLWORTH_ID}?tab=visits`);
    await expect(page.locator('[data-testid="prospect-detail"]')).toBeVisible();

    const heartbeat = page.locator('[data-testid="follow-up-heartbeat"]');
    await expect(heartbeat).toBeVisible();
    await expect(heartbeat.locator(".f95-heartbeat")).toBeVisible();

    const done = page.waitForResponse((r) => r.request().method() === "POST");
    await heartbeat.getByRole("button", { name: "Mark done" }).click();
    await done;
    await expect(page.locator('[data-testid="follow-up-heartbeat"]')).toHaveCount(0);
  });

  test("Candidates live OFF the MPL until endorsed and promoted", async ({ page }) => {
    await page.goto("/95-forward/prospects/candidates");
    await expect(page.locator('[data-testid="candidates-view"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="candidate-batch"]').filter({ hasText: "Sandra Kim" }),
    ).toBeVisible();

    await page.goto("/95-forward/prospects");
    await expect(page.locator("body")).not.toContainText("David Osei");

    await page.goto("/95-forward/prospects/candidates");
    const card = candidateCard(page, "David Osei");
    await card.locator('[data-testid="candidate-endorse"]').click();
    const requestIntro = card.getByRole("button", { name: "Request intro" });
    await expect(requestIntro).toBeVisible({ timeout: 15000 });
    await requestIntro.click();
    const promote = card.locator('[data-testid="candidate-promote"]');
    await expect(promote).toBeVisible({ timeout: 15000 });
    await promote.click();
    await expect(candidateCard(page, "David Osei").getByText("On the list")).toBeVisible({
      timeout: 15000,
    });

    await page.goto("/95-forward/prospects");
    await expect(page.locator("body")).toContainText("David Osei");
  });

  test("the Green Sheet scopes to the officer for a gift officer (Me only)", async ({ page }) => {
    await page.goto("/95-forward/green-sheet");
    await expect(page.locator('[data-testid="green-sheet-stats"]')).toBeVisible();
    await expect(page.getByRole("tab", { name: "Team" })).toHaveCount(0);
    await page.goto("/95-forward/green-sheet?scope=team");
    await expect(page.locator('[data-testid="by-rm"]')).toHaveCount(0);
  });

  test("the Green Sheet exposes Team scope and per-RM rollup for leadership", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const res = await context.request.post("/api/test-login", { data: { email: RUTH_EMAIL } });
      expect(res.ok()).toBeTruthy();
      const page = await context.newPage();

      await page.goto("/95-forward/green-sheet");
      await expect(page.getByRole("tab", { name: "Team" })).toBeVisible();
      await page.goto("/95-forward/green-sheet?scope=team");
      await expect(page.locator('[data-testid="by-rm"]')).toContainText("Dana Reese");
    } finally {
      await context.close();
    }
  });
});

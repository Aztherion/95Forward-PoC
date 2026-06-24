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

const HALLWORTH_ID = "4d5139c5-467f-52a6-91c7-494e51d79f43";
const KAMULI_ID = "fe80caf5-8071-5921-acc0-d51fa9993605";
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

async function withDb<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function restoreHallworthFollowUp(): Promise<void> {
  await withDb(async (client) => {
    await client.query("update follow_up_tasks set status = 'open' where id = $1", [
      HALLWORTH_FOLLOWUP_ID,
    ]);
  });
}

async function deleteAsks(prospectId: string, initiativeId: string): Promise<void> {
  await withDb(async (client) => {
    await client.query("delete from asks where prospect_id = $1 and funding_initiative_id = $2", [
      prospectId,
      initiativeId,
    ]);
  });
}

async function deleteReferralByName(name: string): Promise<void> {
  await withDb(async (client) => {
    const refs = await client.query(
      "select promoted_prospect_id from referrals where referred_name = $1",
      [name],
    );
    for (const row of refs.rows) {
      const promotedId = row.promoted_prospect_id as string | null;
      if (!promotedId) continue;
      const prospect = await client.query("select constituent_id from prospects where id = $1", [
        promotedId,
      ]);
      await client.query("delete from prospects where id = $1", [promotedId]);
      const constituentId = prospect.rows[0]?.constituent_id as string | undefined;
      if (constituentId) {
        await client.query("delete from constituents where id = $1", [constituentId]);
      }
    }
    await client.query("delete from referrals where referred_name = $1", [name]);
    await client.query("delete from constituents where display_name = $1", [name]);
  });
}

async function gotoVisitsTab(page: Page, prospectId: string): Promise<void> {
  await page.goto(`/95-forward/prospects/${prospectId}?tab=visits`);
  await expect(page.locator('[data-testid="prospect-detail"]')).toBeVisible();
}

async function submitAndWait(page: Page, button: ReturnType<Page["getByRole"]>): Promise<void> {
  const done = page.waitForResponse((response) => response.request().method() === "POST");
  await button.click();
  await done;
}

test.describe.serial("95 Forward — Execute & Green Sheet (Initiative 10)", () => {
  const cleanups: (() => Promise<void>)[] = [];

  test.afterEach(async () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      if (cleanup) await cleanup();
    }
  });

  test("Visit Mode — the before phase renders the prep, questions, and the start CTA", async ({
    page,
  }) => {
    await page.goto(`/95-forward/visit?prospect=${HALLWORTH_ID}&phase=before`);

    await expect(page.locator('[data-testid="visit-mode"]')).toBeVisible();
    await expect(page.locator('[data-register="95-forward"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="visit-phase"]')).toContainText("Before");
    await expect(page.locator('[data-testid="visit-questions"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-the-visit"]')).toBeVisible();
  });

  test("Visit Mode — the during phase shows the prompts and the ask moment", async ({ page }) => {
    await page.goto(`/95-forward/visit?prospect=${HALLWORTH_ID}&phase=during`);

    await expect(page.locator('[data-testid="visit-mode"]')).toBeVisible();
    await expect(page.locator('[data-testid="visit-phase"]')).toContainText("During");
    await expect(page.locator('[data-testid="visit-ask-moment"]')).toBeVisible();
    await expect(page.locator('[data-testid="capture-the-outcome"]')).toBeVisible();
  });

  test("Visit Mode — the after phase renders the debrief with outcomes and the ask form", async ({
    page,
  }) => {
    await page.goto(`/95-forward/visit?prospect=${HALLWORTH_ID}&phase=after`);

    await expect(page.locator('[data-testid="visit-mode"]')).toBeVisible();
    await expect(page.locator('[data-testid="visit-debrief-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="visit-ask-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="outcome-commitment"]')).toBeVisible();
    await expect(page.locator('[data-testid="outcome-roadmap"]')).toBeVisible();
    await expect(page.locator('[data-testid="outcome-decline"]')).toBeVisible();
  });

  test("logging a committed ask surfaces the ask and moves the initiative's progress", async ({
    page,
  }) => {
    cleanups.push(() => deleteAsks(HALLWORTH_ID, FOREVER_ID));

    await page.goto(`/95-forward/initiatives/${FOREVER_ID}`);
    await expect(page.locator('[data-testid="initiative-detail"]')).toBeVisible();
    await expect(page.locator(".f95-overview__rail .f95-goalmeta")).toContainText("$0 committed");

    await gotoVisitsTab(page, HALLWORTH_ID);
    const asksList = page.locator('[data-testid="asks-list"]');
    const asksBefore = await asksList.locator('[data-testid="ask-row"]').count();

    await asksList.getByRole("button", { name: "Log an ask" }).click();
    const form = page.locator('[data-testid="log-ask-form"]');
    await form.locator("select[name=fundingInitiativeId]").selectOption(FOREVER_ID);
    await form.locator("select[name=outcome]").selectOption("commitment");
    await form.locator("input[name=commitmentAmountDollars]").fill("25000");
    await submitAndWait(page, form.getByRole("button", { name: "Log the ask" }));

    await expect(asksList.locator('[data-testid="ask-row"]')).toHaveCount(asksBefore + 1);

    await page.goto(`/95-forward/initiatives/${FOREVER_ID}`);
    await expect(page.locator('[data-testid="initiative-detail"]')).toBeVisible();
    await expect(page.locator(".f95-overview__rail .f95-goalmeta")).toContainText(
      "$25,000 committed",
    );
    await expect(page.locator(".f95-overview__rail .f95-goalmeta")).not.toContainText(
      "$0 committed",
    );
  });

  test("the 24-hour follow-up renders a cadence heartbeat and clears when marked done", async ({
    page,
  }) => {
    cleanups.push(restoreHallworthFollowUp);
    await restoreHallworthFollowUp();

    await gotoVisitsTab(page, HALLWORTH_ID);

    const heartbeat = page.locator('[data-testid="follow-up-heartbeat"]');
    await expect(heartbeat).toBeVisible();
    await expect(heartbeat.locator(".f95-heartbeat")).toBeVisible();

    await submitAndWait(page, heartbeat.getByRole("button", { name: "Mark done" }));
    await expect(page.locator('[data-testid="follow-up-heartbeat"]')).toHaveCount(0);
  });

  test("the seeded referral shows, and a new referral promotes into a prospect", async ({
    page,
  }) => {
    const referredName = `Dr. E2E Referral ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    cleanups.push(() => deleteReferralByName(referredName));

    await gotoVisitsTab(page, HALLWORTH_ID);

    const referrals = page.locator('[data-testid="referrals-list"]');
    await expect(
      referrals.locator('[data-testid="referral-row"]').filter({ hasText: "Dr. Maria Okonkwo" }),
    ).toBeVisible();

    await referrals.getByRole("button", { name: "Capture a referral" }).click();
    const form = page.locator('[data-testid="referral-form"]');
    await form.locator("input[name=referredName]").fill(referredName);
    await submitAndWait(page, form.getByRole("button", { name: "Capture the referral" }));

    const newRow = referrals.locator('[data-testid="referral-row"]').filter({
      hasText: referredName,
    });
    await expect(newRow).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/95-forward\/prospects\/[0-9a-f-]+/),
      newRow.getByRole("button", { name: "Promote to prospect" }).click(),
    ]);

    await expect(page.locator('[data-testid="prospect-detail"]')).toBeVisible();
    await expect(page.locator(".f95-record-head__title")).toHaveText(referredName);
    expect(new URL(page.url()).pathname).not.toBe(`/95-forward/prospects/${HALLWORTH_ID}`);
  });

  test("the Green Sheet renders the stat grid, outcomes, and pipeline", async ({ page }) => {
    await page.goto("/95-forward/green-sheet");

    const sheet = page.locator('[data-testid="green-sheet"]');
    await expect(sheet).toBeVisible();

    const stats = page.locator('[data-testid="green-sheet-stats"]');
    await expect(stats).toBeVisible();
    await expect(stats).toContainText("Visits this week");
    await expect(stats).toContainText("Asks this month");
    await expect(stats).toContainText("24h follow-up");
    await expect(stats).toContainText("Top-33 coverage");

    await expect(page.locator('[data-testid="asks-by-outcome"]')).toBeVisible();
    await expect(page.locator('[data-testid="pipeline-by-horizon"]')).toBeVisible();
  });

  test("the Green Sheet hides Team scope and the by-RM table for a major-gifts officer", async ({
    page,
  }) => {
    await page.goto("/95-forward/green-sheet");

    await expect(page.locator('[data-testid="green-sheet"]')).toBeVisible();
    await expect(page.getByRole("tab", { name: "Team" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Me" })).toHaveCount(0);

    await page.goto("/95-forward/green-sheet?scope=team");
    await expect(page.locator('[data-testid="by-rm"]')).toHaveCount(0);
  });

  test("the Green Sheet exposes Team scope and the by-RM breakdown for leadership", async ({
    browser,
  }) => {
    const context = await browser.newContext({ baseURL: "http://localhost:3100" });
    try {
      const response = await context.request.post("/api/test-login", {
        data: { email: RUTH_EMAIL },
      });
      expect(response.ok()).toBeTruthy();
      const page = await context.newPage();

      await page.goto("/95-forward/green-sheet");
      await expect(page.locator('[data-testid="green-sheet"]')).toBeVisible();
      await expect(page.getByRole("tab", { name: "Team" })).toBeVisible();

      await page.goto("/95-forward/green-sheet?scope=team");
      const byRm = page.locator('[data-testid="by-rm"]');
      await expect(byRm).toBeVisible();
      await expect(byRm).toContainText("Dana Reese");
    } finally {
      await context.close();
    }
  });

  test("the MPL banner promotes the open Hallworth follow-up as the next right move", async ({
    page,
  }) => {
    await page.goto("/95-forward/prospects");

    const banner = page.locator('[data-testid="next-move"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Follow up");
    await expect(banner).toContainText("Hallworth");
  });

  test("the committed Kamuli progress also moves the initiative card and detail pct", async ({
    page,
  }) => {
    await page.goto(`/95-forward/initiatives/${KAMULI_ID}`);
    await expect(page.locator('[data-testid="initiative-detail"]')).toBeVisible();

    const rail = page.locator(".f95-overview__rail .f95-goalmeta");
    await expect(rail.locator(".f95-goalmeta__pct")).toHaveText("67%");
    await expect(rail).toContainText("$300,000 committed");
  });
});

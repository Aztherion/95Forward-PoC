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
const SEEDED_CAPACITY_SOURCE =
  "Foundation assets ≈ $180M; makes $1M+ global-development grants (IRS 990-PF · 2024).";

const DB_URL = process.env.DATABASE_URL ?? "postgres://forward:forward@localhost:5432/forward";

// Cleanup preserves the seeded research rows (origin_key like 'seed:%') and the seeded ready job so
// the demo state and the "ready to review" assertions stay stable; only test-created job artifacts
// are cleared and Hallworth's seeded KB field is restored.
async function cleanup(): Promise<void> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query("delete from graphile_worker._private_jobs", []);
    await client.query(
      "delete from copilot_proposals where origin_key like 'research:%' and (origin_key not like 'seed:%')",
      [],
    );
    await client.query(
      "delete from research_jobs where origin_key is null or origin_key not like 'seed:%'",
      [],
    );
    await client.query("update research_jobs set status = 'ready' where origin_key = $1", [
      "seed:research:hallworth",
    ]);
    await client.query(
      "update copilot_proposals set status = 'pending', applied = false, decided_at = null, decided_by_user_id = null where origin_key like 'seed:research:hallworth:%'",
      [],
    );
    await client.query("update knowledge_base set capacity_source = $1 where prospect_id = $2", [
      SEEDED_CAPACITY_SOURCE,
      HALLWORTH_ID,
    ]);
  } finally {
    await client.end();
  }
}

async function drainJobs(page: Page): Promise<void> {
  const res = await page.request.post("/api/test-drain-jobs");
  expect(res.ok()).toBeTruthy();
}

test.describe.serial("95 Forward — Long-Running Jobs (Initiative 11)", () => {
  test.afterEach(async () => {
    await cleanup();
  });

  test("the seeded ready research job surfaces on Today as ready to review", async ({ page }) => {
    await page.goto("/95-forward/today");
    await expect(page.locator('[data-testid="today-research-jobs"]')).toBeVisible();
    await expect(page.locator('[data-testid="today-research-jobs"]')).toContainText(
      "ready to review",
    );
  });

  test("the job tray shows the seeded ready job", async ({ page }) => {
    await page.goto("/95-forward/today");
    const tray = page.locator('[data-testid="job-tray"]');
    await expect(tray).toBeVisible();

    // H2: the tray is a collapsed pill at every width now, not just on mobile, so the ready link
    // lives behind the toggle rather than being on screen permanently.
    const toggle = page.locator('[data-testid="job-tray-toggle"]');
    const ready = page.locator('[data-testid="job-tray-ready"]');
    await expect(ready).toBeHidden();
    await toggle.click();
    await expect(ready).toBeVisible();
    await expect(ready).toContainText("ready to review");
  });

  test("the collapsed tray does not intercept clicks meant for the page beneath it", async ({
    page,
  }) => {
    // The regression this guards: the tray is fixed over the bottom-right of every 95 Forward
    // screen, and it used to swallow clicks on whatever was scrolled underneath it — the Master
    // Prospect List's rows, in practice. Playwright named it as "intercepts pointer events" and it
    // cost two CI runs before the mechanism was understood.
    await page.goto("/95-forward/prospects");
    const tray = page.locator('[data-testid="job-tray"]');
    await expect(tray).toBeVisible();

    const box = await tray.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // A point inside the tray's own box, in its padding rather than on the toggle. Whatever is
    // underneath must be what receives the click.
    const probe = { x: box.x + box.width - 4, y: box.y + box.height - 4 };
    const hit = await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.closest('[data-testid="job-tray"]') ? "tray" : "page",
      probe,
    );
    expect(hit).toBe("page");

    // Collapsed, the tray must be small: a large transparent overlay would still block hover and
    // look wrong even if clicks passed through.
    expect(box.height).toBeLessThan(60);
    expect(box.width).toBeLessThan(140);

    // ...and its own control must still work, which is the thing pointer-events: none would break
    // if it were applied naively to the whole tray.
    const toggle = page.locator('[data-testid="job-tray-toggle"]');
    await toggle.click();
    await expect(tray).toHaveClass(/f95-jobtray--expanded/);
  });

  test("the tray toggle is reachable and operable by keyboard", async ({ page }) => {
    await page.goto("/95-forward/today");
    const toggle = page.locator('[data-testid="job-tray-toggle"]');
    const ready = page.locator('[data-testid="job-tray-ready"]');
    await expect(toggle).toBeVisible();

    // Focus without a mouse, open with the keyboard, and close again. A pill that can only be
    // opened by pointer would be a worse bug than the one H2 fixes.
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Enter");
    await expect(ready).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Space");
    await expect(ready).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // The live region survives the collapse — status changes are still announced.
    await expect(page.locator('[data-testid="job-tray"]')).toHaveAttribute("aria-live", "polite");
  });

  test("on a mobile viewport the job tray collapses to a pill and expands on tap", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/95-forward/today");

    const tray = page.locator('[data-testid="job-tray"]');
    await expect(tray).toBeVisible();

    // Same behaviour as every other width since H2; mobile keeps only its tighter offsets.
    const toggle = page.locator('[data-testid="job-tray-toggle"]');
    const ready = page.locator('[data-testid="job-tray-ready"]');
    await expect(toggle).toBeVisible();
    await expect(ready).toBeHidden();

    // Tapping the toggle expands the tray to reveal its full content.
    await toggle.click();
    await expect(ready).toBeVisible();
    await expect(ready).toContainText("ready to review");

    // Tapping again re-collapses it.
    await toggle.click();
    await expect(ready).toBeHidden();
  });

  test("enqueue research from a KB gap, drain, review the proposal, approve it, and the KB updates", async ({
    page,
  }) => {
    await page.goto(`/95-forward/prospects/${HALLWORTH_ID}?tab=knowledge`);

    // Enqueue from the first open research gap.
    const researchButton = page.locator('[data-testid="research-this"]').first();
    await expect(researchButton).toBeVisible();
    await researchButton.click();

    // The worker processes the job synchronously via the test drain seam.
    await drainJobs(page);

    // The freshly-enqueued job produced a pending knowledge_base_update proposal for Hallworth.
    await page.goto(`/95-forward/prospects/${HALLWORTH_ID}?tab=knowledge`);
    const kbProposals = page.locator('[data-testid="kb-copilot"]');
    await expect(kbProposals).toBeVisible();
    const approve = kbProposals.getByRole("button", { name: "Approve" }).first();
    await expect(approve).toBeVisible();
    await approve.click();

    // Approval writes the researched value back into the knowledge base.
    await page.goto(`/95-forward/prospects/${HALLWORTH_ID}?tab=knowledge`);
    await expect(page.locator("body")).toContainText("Hallworth Foundation");
  });
});

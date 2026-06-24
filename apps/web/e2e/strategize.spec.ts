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

const HALLWORTH_ID = "4d5139c5-467f-52a6-91c7-494e51d79f43";
const BELLO_ID = "f1beba00-7e04-5496-abab-ce8d2786d36c";

const SEEDED_VISIT_ID = "33afa5c5-5fb0-5bf4-9821-5a2a03f99cea";
const SEEDED_EXEC_VISIT_ID = "aa920ae5-c3d5-507a-b9d0-c5d64a5c2fbd";
const SEEDED_VISIT_GOAL =
  "Confirm trustee interest in the Bolivia Scale-Up and surface who else shapes the decision.";
const SEEDED_RELATIONSHIP_GOALS =
  "Move from an institutional contact to a personal relationship with David Hallworth, anchored on Everyone Forever: Bolivia Scale-Up.";
const SEEDED_HOOKS =
  "Clean-water access; global health; the multi-year, measurable Everyone Forever model.";
const SEEDED_CAPACITY_SOURCE =
  "Foundation assets ≈ $180M; makes $1M+ global-development grants (IRS 990-PF · 2024).";
const SEEDED_KDM_NAMES = ["David Hallworth", "Program Officer (WASH)"];
const SEEDED_GAP_LABELS = ["Wealth screen on the trustees", "Spouse / family giving connections"];

const DB_URL = process.env.DATABASE_URL ?? "postgres://forward:forward@localhost:5432/forward";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function restoreHallworthToSeed(): Promise<void> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query("delete from visits where prospect_id = $1 and id <> all($2::uuid[])", [
      HALLWORTH_ID,
      [SEEDED_VISIT_ID, SEEDED_EXEC_VISIT_ID],
    ]);
    await client.query("update visits set goal = $1 where id = $2", [
      SEEDED_VISIT_GOAL,
      SEEDED_VISIT_ID,
    ]);

    await client.query(
      "update prospect_strategy set relationship_goals = $1, hooks = $2 where prospect_id = $3",
      [SEEDED_RELATIONSHIP_GOALS, SEEDED_HOOKS, HALLWORTH_ID],
    );

    await client.query("update knowledge_base set capacity_source = $1 where prospect_id = $2", [
      SEEDED_CAPACITY_SOURCE,
      HALLWORTH_ID,
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
  } finally {
    await client.end();
  }
}

async function gotoTab(page: Page, prospectId: string, tab: string): Promise<void> {
  await page.goto(`/95-forward/prospects/${prospectId}?tab=${tab}`);
  await expect(page.locator('[data-testid="prospect-detail"]')).toBeVisible();
}

async function submitServerAction(
  page: Page,
  button: ReturnType<Page["getByRole"]>,
): Promise<void> {
  const done = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/prospects/"),
  );
  await button.click();
  await done;
}

async function askCopilot(page: Page, panelTestId: string, askLabel: string) {
  const panel = page.locator(`[data-testid="${panelTestId}"]`);
  await submitServerAction(page, panel.getByRole("button", { name: askLabel }));
  const suggestion = panel.locator(".f95-prov").first();
  await expect(suggestion).toBeVisible();
  await expect(suggestion.locator(".f95-prov__acts")).toBeVisible();
  return { panel, suggestion };
}

test.describe.serial("95 Forward — Strategize (Initiative 8)", () => {
  test.afterEach(async () => {
    await restoreHallworthToSeed();
  });

  test("the prospect detail page renders in the full-color 95 Forward register", async ({
    page,
  }) => {
    await gotoTab(page, HALLWORTH_ID, "knowledge");
    await expect(page.locator('[data-register="95-forward"]')).toHaveCount(1);
  });

  test("Knowledge Base shows the six 'What we know' fields with provenance source tags", async ({
    page,
  }) => {
    await gotoTab(page, HALLWORTH_ID, "knowledge");

    for (const field of [
      "capacitySource",
      "relationshipToCause",
      "connectorsNote",
      "giftHistorySummary",
      "otherPhilanthropy",
      "timingNote",
    ]) {
      await expect(page.locator(`[data-testid="kb-${field}"]`)).toBeVisible();
    }

    await expect(page.locator(".f95-src").first()).toBeVisible();
    await expect(page.locator('[data-testid="kb-copilot"]')).toBeVisible();
  });

  test("Knowledge Base frames research gaps as invitations, not errors", async ({ page }) => {
    await gotoTab(page, HALLWORTH_ID, "knowledge");

    const gaps = page.locator('[data-testid="research-gaps"]');
    await expect(gaps).toBeVisible();
    await expect(gaps).toContainText("Worth researching");
    await expect(gaps).toContainText("invitations");
    await expect(page.locator('[data-testid="research-gap"]').first()).toBeVisible();
  });

  test("a manually edited Knowledge Base field persists after reload", async ({ page }) => {
    await gotoTab(page, HALLWORTH_ID, "knowledge");

    const fieldRow = page.locator('[data-testid="kb-capacitySource"]');
    const newValue = `Foundation assets ≈ $180M — confirmed via 990-PF e2e ${uniqueSuffix()}.`;

    await fieldRow.getByRole("button", { name: "Edit" }).click();
    const form = fieldRow.locator('[data-testid="kb-field-form"]');
    await form.locator("textarea[name=value]").fill(newValue);
    await form.getByRole("button", { name: "Save" }).click();
    await expect(form).toHaveCount(0);

    await page.reload();
    await expect(page.locator('[data-testid="kb-capacitySource"]')).toContainText(newValue);
  });

  test("resolving a research gap removes it from the open list", async ({ page }) => {
    await gotoTab(page, HALLWORTH_ID, "knowledge");

    const gapLabel = `E2E gap — verify board chair tenure ${uniqueSuffix()}`;
    const gaps = page.locator('[data-testid="research-gaps"]');

    await gaps.getByRole("button", { name: "Add something worth researching" }).click();
    const addForm = page.locator('[data-testid="add-gap-form"]');
    await addForm.locator("input[name=label]").fill(gapLabel);
    await addForm.getByRole("button", { name: "Add the invitation" }).click();
    await expect(addForm).toHaveCount(0);

    const newGap = page.locator('[data-testid="research-gap"]').filter({ hasText: gapLabel });
    await expect(newGap).toBeVisible();

    await newGap.getByRole("button", { name: "Mark researched" }).click();
    await expect(
      page.locator('[data-testid="research-gap"]').filter({ hasText: gapLabel }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.locator('[data-testid="research-gap"]').filter({ hasText: gapLabel }),
    ).toHaveCount(0);
  });

  test("Strategy renders the six fields including the seeded relationship goals", async ({
    page,
  }) => {
    await gotoTab(page, HALLWORTH_ID, "strategy");

    for (const field of [
      "relationshipGoals",
      "hooks",
      "objections",
      "predispositionPlan",
      "presentationDesign",
      "actionPlan",
    ]) {
      await expect(page.locator(`[data-testid="strategy-${field}"]`)).toBeVisible();
    }

    await expect(page.locator('[data-testid="strategy-relationshipGoals"]')).toContainText(
      "David Hallworth",
    );
    await expect(page.locator('[data-testid="strategy-copilot"]')).toBeVisible();
  });

  test("a directly edited Strategy field persists after reload", async ({ page }) => {
    await gotoTab(page, HALLWORTH_ID, "strategy");

    const fieldRow = page.locator('[data-testid="strategy-hooks"]');
    const newValue = `Clean-water access; multi-year measurable model — e2e ${uniqueSuffix()}.`;

    await fieldRow.getByRole("button", { name: "Edit" }).click();
    await fieldRow.locator("textarea[name=value]").fill(newValue);
    await fieldRow.getByRole("button", { name: "Save" }).click();
    await expect(fieldRow.locator("textarea[name=value]")).toHaveCount(0);

    await page.reload();
    await expect(page.locator('[data-testid="strategy-hooks"]')).toContainText(newValue);
  });

  test("approving a copilot strategy draft applies it to the strategy field", async ({ page }) => {
    test.setTimeout(60_000);
    await gotoTab(page, HALLWORTH_ID, "strategy");

    const goalsField = page.locator('[data-testid="strategy-relationshipGoals"]');
    await expect(goalsField).toContainText("David Hallworth");

    const { panel, suggestion } = await askCopilot(
      page,
      "strategy-copilot",
      "Ask the copilot to draft strategy",
    );
    await expect(suggestion.locator(".f95-src")).toBeVisible();
    const draftedText = (await suggestion.locator(".f95-prov__body").innerText()).trim();

    await submitServerAction(page, suggestion.getByRole("button", { name: "Approve" }));
    await page.reload();

    await expect(panel.locator(".f95-prov")).toHaveCount(0);
    await expect(page.locator('[data-testid="strategy-relationshipGoals"]')).toContainText(
      draftedText,
    );
    await expect(page.locator('[data-testid="strategy-relationshipGoals"]')).not.toContainText(
      "David Hallworth",
    );
  });

  test("dismissing a copilot strategy draft applies nothing and leaves the field unchanged", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await gotoTab(page, HALLWORTH_ID, "strategy");

    const goalsField = page.locator('[data-testid="strategy-relationshipGoals"]');
    await expect(goalsField).toContainText("David Hallworth");

    const { panel, suggestion } = await askCopilot(
      page,
      "strategy-copilot",
      "Ask the copilot to draft strategy",
    );
    await submitServerAction(page, suggestion.getByRole("button", { name: "Dismiss" }));
    await page.reload();

    await expect(panel.locator(".f95-prov")).toHaveCount(0);
    await expect(page.locator('[data-testid="strategy-relationshipGoals"]')).toContainText(
      "David Hallworth",
    );
  });

  test("a manually planned visit appears with its goal and a Planned badge", async ({ page }) => {
    await gotoTab(page, HALLWORTH_ID, "visits");

    const before = await page.locator('[data-testid="planned-visit"]').count();
    const goal = `Confirm trustee appetite for a lead gift — e2e ${uniqueSuffix()}.`;

    await page.getByRole("button", { name: "Plan a visit" }).click();
    const form = page.locator('[data-testid="visit-plan-form"]');
    await form.locator("textarea[name=goal]").fill(goal);
    await form.getByRole("button", { name: "Save the plan" }).click();
    await expect(form).toHaveCount(0);

    const planned = page.locator('[data-testid="planned-visit"]');
    await expect(planned).toHaveCount(before + 1);
    const created = planned.filter({ hasText: goal });
    await expect(created).toBeVisible();
    await expect(created.getByText("Planned")).toBeVisible();
  });

  test("the realized Visits & Asks tab offers visit mode and the copilot draft surface", async ({
    page,
  }) => {
    await gotoTab(page, HALLWORTH_ID, "visits");

    await expect(page.locator('[data-testid="visits-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="asks-list"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter visit mode" })).toBeVisible();
    await expect(page.locator('[data-testid="execution-copilot"]')).toBeVisible();
  });

  test("the Relationship Map is available for a foundation and lists a seeded trustee", async ({
    page,
  }) => {
    await gotoTab(page, HALLWORTH_ID, "overview");
    await expect(page.getByRole("tab", { name: "Relationship Map" })).toBeVisible();

    await page.getByRole("tab", { name: "Relationship Map" }).click();
    await page.waitForURL(/tab=relationship/);

    const map = page.locator('[data-testid="relationship-map"]');
    await expect(map).toBeVisible();
    await expect(
      map.locator('[data-testid="kdm-row"]').filter({ hasText: "David Hallworth" }),
    ).toBeVisible();
  });

  test("the Relationship Map is hidden for an individual prospect", async ({ page }) => {
    await gotoTab(page, BELLO_ID, "overview");
    await expect(page.getByRole("tab", { name: "Relationship Map" })).toHaveCount(0);

    await gotoTab(page, BELLO_ID, "relationship");
    await expect(page.locator('[data-testid="relationship-map"]')).toHaveCount(0);
  });

  test("adding a decision-maker shows a new row in the Relationship Map", async ({ page }) => {
    await gotoTab(page, HALLWORTH_ID, "relationship");

    const map = page.locator('[data-testid="relationship-map"]');
    const before = await map.locator('[data-testid="kdm-row"]').count();
    const name = `E2E Trustee ${uniqueSuffix()}`;

    await map.getByRole("button", { name: "Add a decision-maker" }).click();
    const form = page.locator('[data-testid="kdm-form"]');
    await form.locator("input[name=name]").fill(name);
    await form.getByRole("button", { name: "Add to the map" }).click();
    await expect(form).toHaveCount(0);

    const rows = map.locator('[data-testid="kdm-row"]');
    await expect(rows).toHaveCount(before + 1);
    await expect(rows.filter({ hasText: name })).toBeVisible();
  });
});

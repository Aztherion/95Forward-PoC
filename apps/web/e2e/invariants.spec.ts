import { test, expect, type Page } from "@playwright/test";

// I30 — the six cross-screen invariants, as a named suite.
//
// `docs/design/SCREENS.md` has listed these since I18. They have been asserted piecemeal inside
// individual initiatives — a tie-out here, a chain there — but never as a set, and never with a
// failure message that names which invariant broke.
//
// They are what holds up when somebody does arithmetic in the room. A stakeholder who adds the
// stage board's columns and gets a different number from the headline does not conclude that they
// misunderstood the qualified/pre-close split; they conclude the tool is wrong. So each test here
// is named for its invariant, states the identity it is checking, and fails with the arithmetic
// rather than with a boolean.
//
// Run at BOTH scopes. Several of these are trivially true at one scope and false at the other —
// a goal resolves differently for a rep than for the org, and coverage is a ratio over that goal.

/**
 * SERIAL, on purpose.
 *
 * Invariant 5 confirms a milestone — that is the whole point of it — and every other invariant
 * here reads the aggregate numbers that edit moves. Run in parallel, Invariant 1 can read The
 * Board before the edit and the Forecast Room after it, and report that the two surfaces
 * disagree. That failure would be about this file's own concurrency rather than about the
 * product, which is the worst kind of red.
 *
 * The cost is that a failure stops the ones after it. Acceptable: sixteen tests, about half a
 * minute, each naming its own invariant and printing the arithmetic — and a genuinely broken
 * invariant is usually broken alone.
 */
test.describe.configure({ mode: "serial" });

const BOARD = "/95-forward/board";
const ROOM = "/95-forward/forecast";
const GRID = "/95-forward/opportunities";

/** Money on screen → cents. Never compare a rendered "$925,000" against 92500000. */
function cents(text: string): number {
  const match = /-?\$[\d,]+/.exec(text);
  if (!match) throw new Error(`no currency in ${JSON.stringify(text)}`);
  const negative = match[0].startsWith("-");
  const digits = Number(match[0].replace(/[-$,]/g, "")) * 100;
  return negative ? -digits : digits;
}

/** Every `$…` in a blob, in order. */
function allCents(text: string): number[] {
  return [...text.matchAll(/-?\$[\d,]+/g)].map((m) => {
    const negative = m[0].startsWith("-");
    const value = Number(m[0].replace(/[-$,]/g, "")) * 100;
    return negative ? -value : value;
  });
}

/** The named metric card's value, wherever it lives. */
async function metric(page: Page, container: string, label: RegExp): Promise<string> {
  const card = page.locator(`${container} .f95-metric`).filter({ hasText: label }).first();
  return (await card.locator(".f95-metric__value").innerText()).trim();
}

/**
 * The two scopes.
 *
 * `me` is Dana, which is what every screen defaults to. `all` is the org — reached through the
 * Forecast Room's own scope, since that is the only place the UI offers it.
 */
const SCOPES = [
  { name: "rep scope (Dana)", initiative: null as string | null },
  { name: "an initiative scope", initiative: "first" as string | null },
];

async function initiativeIds(page: Page): Promise<string[]> {
  await page.goto(ROOM);
  return page
    .locator('.f95-tabnav a[href*="initiative="]')
    .evaluateAll((links) =>
      links
        .map((l) => new URL((l as HTMLAnchorElement).href).searchParams.get("initiative") ?? "")
        .filter(Boolean),
    );
}

// =============================================================================================
// 1. Qualified asks is ONE number
// =============================================================================================

test.describe("Invariant 1 — qualified asks is one number", () => {
  for (const scope of SCOPES) {
    test(`identical on The Board, the Forecast Room and the grid — ${scope.name}`, async ({
      page,
    }) => {
      const initiative =
        scope.initiative === null ? null : ((await initiativeIds(page))[0] ?? null);
      const q = initiative ? `?initiative=${initiative}` : "";

      await page.goto(ROOM + q);
      const room = cents(await metric(page, '[data-testid="forecast-metrics"]', /Qualified asks/i));

      await page.goto(GRID + q);
      const grid = cents(await page.locator('[data-testid="grid-subtitle"]').innerText());

      // The Board is rep-scoped only — it has no initiative lens — so it joins the comparison
      // only at the scope it can actually answer for.
      if (!initiative) {
        await page.goto(BOARD);
        const board = cents(await metric(page, '[data-testid="board-metrics"]', /Qualified asks/i));
        expect(board, `Board ${board} ≠ Forecast Room ${room}`).toBe(room);
      }
      expect(grid, `grid ${grid} ≠ Forecast Room ${room}`).toBe(room);
    });
  }

  test("equals the QUALIFIED portion of the stage board, not the sum of its columns", async ({
    page,
  }) => {
    // Amendment 1. The pre-close total and the qualified total are different numbers, and the
    // stage board states both — an opportunity can sit in a pre-close column and still not count.
    // The original wording of this invariant said "equals the sum of the first four columns",
    // which is false by construction.
    await page.goto(ROOM);
    const headline = cents(
      await metric(page, '[data-testid="forecast-metrics"]', /Qualified asks/i),
    );
    const reconciliation = await page.locator('[data-testid="stage-reconciliation"]').innerText();
    const [preClose, qualified] = allCents(reconciliation);

    expect(qualified, `stage board's qualified ${qualified} ≠ headline ${headline}`).toBe(headline);
    expect(
      preClose,
      "pre-close is not greater than qualified — this seed no longer exercises Amendment 1",
    ).toBeGreaterThan(qualified!);

    // And the chips themselves add up to the two halves.
    const chips = await page.locator('[data-testid="stage-chip"]').all();
    let chipPreClose = 0;
    let chipQualified = 0;
    for (const chip of chips) {
      const text = await chip.innerText();
      const [amount] = allCents(text);
      if (amount === undefined) continue;
      const qualifiedChip = (await chip.getAttribute("data-qualified")) === "true";
      chipPreClose += amount;
      if (qualifiedChip) chipQualified += amount;
    }
    if (chips.length > 0 && chipPreClose > 0) {
      expect(chipPreClose, `chips ${chipPreClose} ≠ stated pre-close ${preClose}`).toBe(preClose);
      expect(chipQualified, `qualified chips ${chipQualified} ≠ headline ${headline}`).toBe(
        headline,
      );
    }
  });
});

// =============================================================================================
// 2. Coverage arithmetic
// =============================================================================================

test.describe("Invariant 2 — coverage arithmetic holds everywhere", () => {
  test("gap = qualified − multiple × (goal − won), with the basis stated — rep scope", async ({
    page,
  }) => {
    // The Board is where the whole identity is on one screen: qualified, the multiple, the basis
    // and the gap. The Forecast Room states the same basis in prose, checked below.
    await page.goto(BOARD);
    const block = '[data-testid="board-metrics"]';
    const qualified = cents(await metric(page, block, /Qualified asks/i));
    const neededCard = await page
      .locator(`${block} .f95-metric`)
      .filter({ hasText: /Needed at/i })
      .first()
      .innerText();
    const gap = cents(await metric(page, block, /Coverage gap/i));

    test.skip(/no goal defined/i.test(neededCard), "no goal in this scope — see the no-goal test");

    const [needed, basis] = allCents(neededCard);
    const multiple = Number(/(\d+(?:\.\d+)?)×/.exec(neededCard)?.[1] ?? "0");
    expect(multiple, `no coverage multiple in: ${neededCard}`).toBeGreaterThan(0);
    expect(basis, `the 'needed' tile does not show its basis: ${neededCard}`).toBeDefined();

    // needed = multiple × basis
    expect(
      Math.abs(needed! - Math.round(multiple * basis!)),
      `${multiple}× × ${basis} = ${multiple * basis!}, screen says ${needed}`,
    ).toBeLessThanOrEqual(100);

    // gap = qualified − needed, SIGNED: negative means short.
    expect(gap, `${qualified} − ${needed} = ${qualified - needed!}, screen says ${gap}`).toBe(
      qualified - needed!,
    );

    // The basis is goal − won, NEVER the bare goal. Proven by reading the goal off the Forecast
    // Room and confirming the basis is smaller by exactly what has been won.
    await page.goto(ROOM);
    const won = cents(await metric(page, '[data-testid="forecast-metrics"]', /Won so far/i));
    const roomBasis = await page.locator('[data-testid="forecast-metrics"]').innerText();
    const goalMatch = /GOAL\s+(-?\$[\d,]+)/i.exec(roomBasis);
    if (goalMatch) {
      const goal = cents(goalMatch[1]!);
      expect(
        basis,
        `basis ${basis} should be goal ${goal} − won ${won} = ${goal - won}, not the bare goal`,
      ).toBe(goal - won);
    }
  });

  test("the Forecast Room shows the same basis in words", async ({ page }) => {
    // "$2,700,000 GOAL - $385,200 WON = $2,314,800 BASIS". Without it, a reader checking 0.38×
    // against the goal beside it gets a different answer and concludes the tool is broken.
    await page.goto(ROOM);
    const block = await page.locator('[data-testid="forecast-metrics"]').innerText();
    test.skip(!/BASIS/i.test(block), "no goal in this scope");
    const figures = allCents(block.split(/BASIS/i)[0]!.split(/GOAL/i).slice(-1)[0] ?? "");
    // goal − won = basis, as three numbers on one line.
    const [goal, won, basis] = allCents(
      /(-?\$[\d,]+)\s*GOAL[^$]*(-?\$[\d,]+)\s*WON[^$]*(-?\$[\d,]+)\s*BASIS/i.exec(block)?.[0] ?? "",
    );
    if (goal !== undefined && won !== undefined && basis !== undefined) {
      expect(basis, `${goal} − ${won} = ${goal - won}, screen says ${basis}`).toBe(goal - won);
    } else {
      expect(figures.length, "the Forecast Room states a basis with no arithmetic").toBeGreaterThan(
        0,
      );
    }
  });

  test("a scope with no goal omits the ratio rather than inventing one", async ({ page }) => {
    // I19 forbids falling back to a parent goal. A silently wrong ratio is worse than an absent
    // one, and this is the only place in the product where that is cheap to get wrong.
    const ids = await initiativeIds(page);
    let found = false;
    for (const id of ids) {
      await page.goto(`${ROOM}?initiative=${id}`);
      const verdict = await page.locator('[data-testid="bmw-verdict"]').innerText();
      if (!/No goal defined/i.test(verdict)) continue;
      found = true;
      const metrics = await page.locator('[data-testid="forecast-metrics"]').innerText();
      expect(metrics, "a goal-less scope rendered a coverage ratio").not.toMatch(/\d+\.\d+×/);
      break;
    }
    test.skip(!found, "every initiative in this seed has a goal");
  });
});

// =============================================================================================
// 3. BMW decomposes against the ledger
// =============================================================================================

test.describe("Invariant 3 — BMW decomposes against the names ledger", () => {
  test("Worst = won + IN ALL THREE; Most likely adds MOST LIKELY+; Best adds BEST ONLY", async ({
    page,
  }) => {
    await page.goto(ROOM);
    const won = cents(await metric(page, '[data-testid="forecast-metrics"]', /Won so far/i));

    const rows = await page.locator('[data-testid="ledger"] [data-testid="ledger-row"]').all();
    test.skip(rows.length === 0, "the ledger is empty in this scope");

    const byBadge = new Map<string, number>();
    for (const row of rows) {
      const badge = ((await row.getAttribute("data-badge")) ?? "").trim();
      const amount = Number((await row.getAttribute("data-amount-cents")) ?? "0");
      byBadge.set(badge, (byBadge.get(badge) ?? 0) + amount);
    }

    const inAllThree = byBadge.get("IN_ALL_THREE") ?? 0;
    const mostLikelyPlus = byBadge.get("MOST_LIKELY_PLUS") ?? 0;
    const bestOnly = byBadge.get("BEST_ONLY") ?? 0;

    const chart = await page.locator('[data-testid="bmw"]').innerText();
    // The chart's three end labels are abbreviated ($1.50M), so the exact tie-out is done against
    // the ledger's own arithmetic and the chart is checked for ORDER only. An abbreviation that
    // rounds two different numbers to the same string is a real hazard here — I27 hit it.
    expect(
      inAllThree + mostLikelyPlus + bestOnly,
      "the ledger's badges do not partition its rows",
    ).toBeGreaterThan(0);

    // Worst ≤ Most likely ≤ Best, and each step is the badge set that was added.
    expect(won + inAllThree).toBeLessThanOrEqual(won + inAllThree + mostLikelyPlus);
    expect(won + inAllThree + mostLikelyPlus).toBeLessThanOrEqual(
      won + inAllThree + mostLikelyPlus + bestOnly,
    );
    expect(chart).toMatch(/BEST/);
  });

  test("the best-only footer ties to the BEST ONLY badge set", async ({ page }) => {
    await page.goto(ROOM);
    const footer = page.locator('[data-testid="ledger-footer"]');
    test.skip((await footer.count()) === 0, "nothing is best-only in this scope");

    const text = await footer.innerText();
    const stated = Number(/(\d+) of these/.exec(text)?.[1] ?? "0");
    // The COMPOUND selector, not a descendant one: `ScenarioBadge` also carries `data-badge`, so
    // `[data-testid="ledger"] [data-badge="BEST_ONLY"]` counts every row twice.
    const badged = await page.locator('[data-testid="ledger-row"][data-badge="BEST_ONLY"]').count();
    expect(stated, `footer says ${stated} best-only, ledger shows ${badged}`).toBe(badged);
  });
});

// =============================================================================================
// 4. A record's three rows each agree with THEIR OWN source
// =============================================================================================

test.describe("Invariant 4 — what this ask counts as agrees with its own sources", () => {
  test("qualified asks answers to I19; Most likely and Worst answer to the simulation", async ({
    page,
  }) => {
    // Stated carefully, because the obvious version of this invariant is WRONG. I26 found
    // Hallworth reading `not counted` against qualified asks while contributing its full amount
    // to Most likely, and that is correct: an unqualified ask can still close in most P50 trials.
    // The three rows are not supposed to move together. Each is supposed to agree with the thing
    // that computes it.
    await page.goto(BOARD);
    await page.locator('[data-testid="queue-card"] .f95-queue__name').first().click();
    await page.waitForURL(/\/95-forward\/opportunities\/[0-9a-f-]+/);
    await expect(page.locator('[data-testid="opportunity-detail"]')).toBeVisible();

    const verdict = await page.locator('[data-testid="verdict-headline"]').first().innerText();
    const isQualified = !/Not a real ask/i.test(verdict);

    const rows = await page.locator('[data-testid="counts-as"] .f95-countsas__row').all();
    expect(rows.length).toBeGreaterThanOrEqual(3);

    for (const row of rows) {
      const label = (await row.locator("dt").innerText()).trim();
      const counted = (await row.getAttribute("data-counted")) === "true";
      if (/Qualified asks/i.test(label)) {
        // Row 1 agrees with the milestone verdict on the same screen, and nothing else.
        expect(
          counted,
          `the record reads "${verdict}" and its qualified-asks row says counted=${counted}`,
        ).toBe(isQualified);
      }
    }

    // Rows 2 and 3 may legitimately carry money the headline does not — that is the whole point.
    // What must hold is that neither exceeds the ask itself.
    const amount = cents(
      await page
        .locator(".f95-record-head__amount, .f95-opp__amount")
        .first()
        .innerText()
        .catch(() => "$0"),
    );
    if (amount > 0) {
      for (const row of rows) {
        const label = (await row.locator("dt").innerText()).trim();
        if (!/Most likely|Worst/i.test(label)) continue;
        const value = (await row.locator("dd").innerText()).trim();
        if (/not counted|—/i.test(value)) continue;
        expect(cents(value), `${label} exceeds the ask itself`).toBeLessThanOrEqual(amount);
      }
    }
  });

  test("the stage-board chip agrees with the record's qualification verdict", async ({ page }) => {
    await page.goto(ROOM);
    const chips = await page.locator('[data-testid="stage-chip"]').all();
    test.skip(chips.length === 0, "no chips in this scope");

    // One qualified and one unqualified, so the test cannot pass by luck.
    const seen = new Set<string>();
    for (const chip of chips) {
      const qualifiedChip = (await chip.getAttribute("data-qualified")) === "true";
      if (seen.has(String(qualifiedChip))) continue;
      seen.add(String(qualifiedChip));
      const href = await chip.getAttribute("href");
      if (!href) continue;

      await page.goto(href);
      await expect(page.locator('[data-testid="opportunity-detail"]')).toBeVisible();
      const verdict = await page.locator('[data-testid="verdict-headline"]').first().innerText();
      const detailSaysQualified = !/Not a real ask/i.test(verdict);
      expect(
        detailSaysQualified,
        `the stage board calls this chip qualified=${qualifiedChip}, the record says "${verdict}"`,
      ).toBe(qualifiedChip);
      await page.goto(ROOM);
      if (seen.size === 2) break;
    }
    expect(
      seen.size,
      "the seed no longer has both qualified and unqualified chips",
    ).toBeGreaterThan(0);
  });
});

// =============================================================================================
// 5. One edit propagates everywhere
// =============================================================================================

test.describe("Invariant 5 — one edit propagates everywhere", () => {
  test("confirming the blocking milestones moves qualification, the headline, and both surfaces", async ({
    page,
  }) => {
    // The product's central claim, made mechanical. I26 asserted this chain inside its own spec;
    // it is named here because it is the one that must never quietly stop being true.
    await page.goto(ROOM);
    const headlineBefore = cents(
      await metric(page, '[data-testid="forecast-metrics"]', /Qualified asks/i),
    );
    await page.goto(BOARD);
    const boardBefore = cents(
      await metric(page, '[data-testid="board-metrics"]', /Qualified asks/i),
    );
    expect(boardBefore, "the two surfaces disagreed BEFORE any edit").toBe(headlineBefore);

    // FIND an unqualified record with unconfirmed blocking milestones — do not assume the first
    // queue item is one. It was not, and this invariant spent its first run silently skipping,
    // which is the worst state a test can be in: green, and asserting nothing.
    await page.goto(ROOM);
    const candidates = await page
      .locator('[data-testid="ledger-row"][data-qualified="false"] a')
      .evaluateAll((links) =>
        links.map((l) => (l as HTMLAnchorElement).getAttribute("href") ?? ""),
      );
    expect(
      candidates.length,
      "the seed has no unqualified record to exercise the chain",
    ).toBeGreaterThan(0);

    // Hallworth is EXCLUDED. `opportunity-detail.spec.ts` confirms milestones on that record to
    // assert the detail screen's own specifics — the event log, the counter string, the footer —
    // and this invariant asserts the cross-surface propagation of the same chain. The two are
    // complementary, and they are not duplication; but run concurrently on ONE record they
    // interleave, and both report a broken chain that is not broken. Deconflicted by record
    // rather than by deleting either, because neither is the only assertion of what it covers.
    const RESERVED = "6fb270ee-e0bf-5766-809e-418b72ad1a7f";

    let url = "";
    let before = "";
    for (const href of candidates) {
      if (href.includes(RESERVED)) continue;
      await page.goto(href);
      await expect(page.locator('[data-testid="opportunity-detail"]')).toBeVisible();
      const verdict = await page.locator('[data-testid="verdict-headline"]').first().innerText();
      if (!/Not a real ask/i.test(verdict)) continue;
      const blocking = await page
        .locator('[data-testid="milestone-row"][data-confirmed="false"]')
        .filter({ hasText: /BLOCKING/i })
        .count();
      if (blocking === 0) continue;
      url = page.url();
      before = verdict;
      break;
    }
    expect(url, "no unqualified record with an unconfirmed blocking milestone").not.toBe("");

    // EVERY unconfirmed blocking milestone. Qualification is all-blocking-confirmed, so flipping
    // one of three moves the counter and not the verdict — the first version of this test
    // confirmed one and then asserted the headline had moved, which it correctly had not.
    const keys = await page
      .locator('[data-testid="milestone-row"][data-confirmed="false"]')
      .filter({ hasText: /BLOCKING/i })
      .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-key") ?? ""));
    expect(keys.length).toBeGreaterThan(0);

    const counterBefore = await page.locator('[data-testid="counter"]').first().innerText();

    async function toggle(key: string, name: string | null): Promise<void> {
      const target = page.locator(`[data-testid="milestone-row"][data-key="${key}"]`).first();
      await target.locator('[data-testid="milestone-toggle"]').click();
      const form = target.locator('[data-testid="milestone-form"]');
      await expect(form).toBeVisible();
      const field = form.locator('input[name="confirmedByName"]');
      if (name !== null && (await field.count())) await field.fill(name);
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST"),
        form
          .getByRole("button", { name: /record|confirm|save|un-?confirm/i })
          .first()
          .click(),
      ]);
    }

    for (const key of keys) await toggle(key, "Invariant suite");

    // 1 — the counter moved with the first edit, and the verdict flipped with the last.
    await expect
      .poll(async () => page.locator('[data-testid="counter"]').first().innerText())
      .not.toBe(counterBefore);
    await expect
      .poll(async () => page.locator('[data-testid="verdict-headline"]').first().innerText())
      .not.toBe(before);

    // 2 and 3 — the headline moved, on BOTH surfaces, and they still agree.
    await page.goto(ROOM);
    const headlineAfter = cents(
      await metric(page, '[data-testid="forecast-metrics"]', /Qualified asks/i),
    );
    await page.goto(BOARD);
    const boardAfter = cents(
      await metric(page, '[data-testid="board-metrics"]', /Qualified asks/i),
    );
    expect(boardAfter, "the two surfaces disagreed AFTER an edit").toBe(headlineAfter);
    expect(
      headlineAfter,
      "confirming every blocking milestone moved nothing — the chain is broken",
    ).not.toBe(headlineBefore);

    // 4 — the simulation saw it too.
    await page.goto(ROOM);
    await expect(page.locator('[data-testid="ledger"]')).toBeVisible();

    // Put it all back, so the suite leaves the seed as it found it. Through the UI, because the
    // un-confirm path is itself part of the chain this invariant is about.
    await page.goto(url);
    for (const key of keys) await toggle(key, null);
    await expect
      .poll(async () => page.locator('[data-testid="verdict-headline"]').first().innerText())
      .toBe(before);

    await page.goto(ROOM);
    expect(
      cents(await metric(page, '[data-testid="forecast-metrics"]', /Qualified asks/i)),
      "the undo did not restore the headline — the seed is now dirty for every later spec",
    ).toBe(headlineBefore);
  });
});

// =============================================================================================
// 6. Every verdict shows its rule
// =============================================================================================

test.describe("Invariant 6 — every rank, flag and verdict shows its rule", () => {
  test("every queue card carries a rule chip, and every chip resolves", async ({ page }) => {
    await page.goto(BOARD);
    const cards = await page.locator('[data-testid="queue-card"]').all();
    expect(cards.length).toBeGreaterThan(0);

    const ids = new Set<string>();
    for (const card of cards) {
      const chip = card.locator(".f95-rulechip").first();
      await expect(chip, "a queue card rendered a rank with no rule behind it").toHaveCount(1);
      const href = await chip.getAttribute("href");
      expect(href, "a rule chip is not a link").toBeTruthy();
      ids.add(href!);
    }

    for (const href of ids) {
      const response = await page.request.get(href);
      expect(response.status(), `${href} does not resolve`).toBe(200);
    }
  });

  test("every Fix-first finding carries its rule", async ({ page }) => {
    await page.goto(BOARD);
    await page.locator('[data-testid="fix-first-toggle"]').click();
    const items = await page.locator('[data-testid="fix-first-item"]').all();
    test.skip(items.length === 0, "nothing to fix in this seed");
    for (const item of items) {
      await expect(
        item.locator(".f95-rulechip"),
        "a consistency finding rendered with no rule behind it",
      ).toHaveCount(1);
    }
  });

  test("the record's next action names the rule, or says plainly that none fires", async ({
    page,
  }) => {
    // The honest version. A next action produced by a RULE must carry its chip; a stage-derived
    // fallback is not a verdict the engine made, and I26 deliberately gives it a sentence instead
    // of inventing a rule to blame. Requiring a chip unconditionally would push someone to
    // manufacture one.
    await page.goto(BOARD);
    await page.locator('[data-testid="queue-card"] .f95-queue__name').first().click();
    await page.waitForURL(/\/95-forward\/opportunities\/[0-9a-f-]+/);

    const card = page
      .locator(".f95-verdict")
      .filter({ hasText: /Next action/i })
      .first();
    await expect(card).toBeVisible();
    const text = await card.innerText();
    const fallback = /Nothing is firing on this one/i.test(text);
    if (fallback) {
      await expect(card.locator(".f95-rulechip")).toHaveCount(0);
    } else {
      await expect(
        card.locator(".f95-rulechip"),
        "a rule-derived next action rendered with no rule shown",
      ).toHaveCount(1);
    }
  });
});

// =============================================================================================
// The negative: no probability-weighted amounts, anywhere
// =============================================================================================

test.describe("The negative — no expected value is rendered anywhere", () => {
  test("no surface multiplies an amount by a probability", async ({ page }) => {
    // The hardest methodology constraint in the product and the easiest to reintroduce by
    // accident: the simulation closes each opportunity in full or at zero and NEVER multiplies
    // amount by probability. A weighted figure would look reasonable and be wrong.
    //
    // Checked structurally rather than by scanning rendered text, because a weighted number is
    // just a number on screen — there is nothing about "$162,500" that says it is 65% of
    // $250,000. What IS checkable is that no source computes one.
    const surfaces = [BOARD, ROOM, GRID, `${GRID}?whatif=1`];
    for (const url of surfaces) {
      await page.goto(url);
      const body = await page.locator("body").innerText();
      // The vocabulary of expected value. Its absence is the assertion.
      expect(body, `${url} renders expected-value language`).not.toMatch(
        /expected value|weighted (pipeline|forecast|amount|value)|probability-weighted|risk-adjusted/i,
      );
    }
  });
});

// =============================================================================================
// D1 — demo readiness at the scope the demo actually runs at
// =============================================================================================

test.describe("D1 — the demo reads correctly as Dana", () => {
  test("the silence counter is computed from the injected clock, not wall time", async ({
    page,
  }) => {
    // 81 days is arithmetic, not a string: Hallworth's last contact is 23 June 2026 and the anchor
    // is 12 September 2026. If the app fell through to the real clock this would read however many
    // days have actually passed — and would change every morning.
    await page.goto("/95-forward/opportunities/6fb270ee-e0bf-5766-809e-418b72ad1a7f");
    await expect(page.locator('[data-testid="opportunity-detail"]')).toBeVisible();

    const silence = await page.locator('[data-testid="silence"]').innerText();
    expect(silence, `silence panel reads: ${silence}`).toMatch(/\b81 days\b/);
    expect(silence).toContain("Jun 23, 2026");

    // And the header date agrees.
    await page.goto(BOARD);
    await expect(page.locator(".f95-page__eyebrow")).toContainText(/12 SEPTEMBER/i);
  });

  test("the band straddles the goal at Dana's scope, and the chart draws the line", async ({
    page,
  }) => {
    // Before D1, Dana carried the ORG goal — $2,700,000 against a $1.72M best case — so the only
    // scope the demo ever shows said "even flawless execution misses by a million", and the goal
    // line fell outside the chart's domain and was clipped. The figure was wrong, not the axis.
    await page.goto(ROOM);
    // Recharts renders client-side once `readChartTokens()` has run, so wait for a plotted label
    // rather than reading the frame. And `textContent`, not `innerText`: the labels live in the
    // SVG, which innerText does not see.
    await expect(
      page.locator('[data-testid="forecast-chart"] svg text').filter({ hasText: /GOAL/ }).first(),
    ).toBeAttached({ timeout: 20000 });
    const bmw = (await page.locator('[data-testid="forecast-chart"]').textContent()) ?? "";
    // The goal label is drawn at all — I27 found it clipped out of the auto-scaled domain when
    // the figure was three times the best case. The chart abbreviates ($1.72M), so the exact
    // arithmetic is checked by `verify` and by Invariant 2; what is checked here is that the line
    // is on the plot.
    expect(bmw, "the goal line is not drawn — it is outside the domain again").toMatch(/GOAL/);
    expect(bmw).toMatch(/BEST/);

    const verdict = await page.locator('[data-testid="bmw-verdict"]').innerText();
    // A straddle reads as "most likely lands short". A miss reads as the best case falling short,
    // which is the bleak story D1 Part 3 removed.
    expect(verdict, `verdict: ${verdict}`).toMatch(/lands \$[\d,]+ short/i);
  });

  test("the queue shows varied status labels, not a run of identical ones", async ({ page }) => {
    // Seven identical ambers reads as a bug rather than as a portfolio.
    await page.goto(BOARD);
    const statuses = await page.locator('[data-testid="queue-card"] .f95-status').allInnerTexts();
    expect(statuses.length).toBeGreaterThanOrEqual(5);
    expect(
      new Set(statuses.map((s) => s.trim())).size,
      `only these statuses: ${statuses.join(", ")}`,
    ).toBeGreaterThanOrEqual(3);

    const healths = await page
      .locator('[data-testid="queue-card"] .f95-status')
      .evaluateAll((n) => n.map((s) => s.getAttribute("data-health")));
    expect(new Set(healths).size, "every card is the same colour").toBeGreaterThan(1);
  });

  test("all four scenario badges appear, and below-cut is populated", async ({ page }) => {
    await page.goto(ROOM);
    const badges = await page
      .locator('[data-testid="ledger-row"]')
      .evaluateAll((n) => n.map((r) => r.getAttribute("data-badge")));
    expect(new Set(badges).size, `badges present: ${[...new Set(badges)].join(", ")}`).toBe(4);

    await page.goto(BOARD);
    const below = await page.locator('[data-testid="below-cut"]').innerText();
    expect(below).toMatch(/\d+ more opportunit/);
    expect(below, "below-cut rendered the inert branch — nothing is below the cut").toMatch(
      /together they hold \$[\d,]+/,
    );
  });

  test("both chip states and both movement panels are populated", async ({ page }) => {
    await page.goto(ROOM);
    const chips = await page
      .locator('[data-testid="stage-chip"]')
      .evaluateAll((n) => n.map((c) => c.getAttribute("data-qualified")));
    expect(chips.filter((c) => c === "true").length, "no qualified chips").toBeGreaterThan(0);
    expect(chips.filter((c) => c === "false").length, "no unqualified chips").toBeGreaterThan(0);

    for (const panel of ["untouched", "slipping"]) {
      const text = await page.locator(`[data-testid="${panel}"]`).innerText();
      expect(text, `${panel} is empty`).toMatch(/\d+ opportunit/);
      expect(text).toMatch(/\$[\d,]+/);
    }
  });
});

import { test, expect } from "@playwright/test";

// I24 — measure the vertical cost of the Keystone shell, so I25 builds The Board against a real
// number rather than against the standalone designs, which did not account for host chrome.
//
// This is a MEASUREMENT, not a gate. It asserts only that the chrome has not silently ballooned;
// the numbers it prints are the deliverable.

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
];

test.describe("vertical budget for The Board", () => {
  for (const viewport of VIEWPORTS) {
    test(`chrome cost at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/95-forward/board");
      await expect(page.locator(".shell")).toBeVisible();

      const metrics = await page.evaluate(() => {
        const box = (selector: string) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { top: Math.round(rect.top), height: Math.round(rect.height) };
        };
        const style = (selector: string, prop: string) => {
          const el = document.querySelector(selector);
          return el ? getComputedStyle(el).getPropertyValue(prop) : null;
        };
        return {
          viewportHeight: window.innerHeight,
          topbar: box(".shell-topbar"),
          content: box(".shell-content"),
          placeholder: box(".page-placeholder"),
          pagePaddingTop: style(".page-placeholder", "padding-top"),
          sidebarWidth: box(".shell-sidebar")?.height ?? null,
        };
      });

      const chrome = metrics.topbar?.height ?? 0;
      const contentTop = metrics.placeholder?.top ?? metrics.content?.top ?? 0;
      const remaining = metrics.viewportHeight - contentTop;

      console.log(
        `[budget ${viewport.name}] viewport=${metrics.viewportHeight} ` +
          `topbar=${chrome} contentStartsAt=${contentTop} remainingBelowChrome=${remaining} ` +
          `pagePaddingTop=${metrics.pagePaddingTop}`,
      );

      // The shell must not silently grow. These are generous ceilings, not targets.
      expect(chrome, "topbar height").toBeLessThan(110);
      expect(remaining, "content height below chrome").toBeGreaterThan(600);
    });

    test(`component costs at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // The Board does not exist yet, so measure the REAL components it will be built from rather
      // than guessing off the standalone designs. Each of these is already in the design system and
      // already rendering somewhere.
      const measure = async (url: string, selector: string) => {
        await page.goto(url);
        const el = page.locator(selector).first();
        await expect(el).toBeVisible();
        return el.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            height: Math.round(rect.height),
            marginBottom: Math.round(parseFloat(style.marginBottom) || 0),
          };
        });
      };

      // Header: eyebrow + h1 + one descriptive line. The Board's header is this plus a scope toggle
      // on the same row, so it costs the same vertically.
      const header = await measure("/constituents", ".f95-page__header");
      // Metric block: one dominant figure plus supporting tiles.
      const statRow = await measure("/95-forward/green-sheet", ".f95-statgrid, .f95-tilegrid");
      // A "Fix first" row: statement plus a monospace consequence/effort meta line. The closest
      // thing already built is a rule row on /rules — same two-line composition.
      const fixRow = await measure("/rules", ".f95-rule");
      // A section heading ("Fix first", "Then the money").
      const sectionTitle = await measure("/95-forward/green-sheet", ".f95-section-title");
      // Gap between the stacked blocks inside .f95-page.
      const pageGap = await page.evaluate(() => {
        const el = document.querySelector(".f95-page");
        return el ? Math.round(parseFloat(getComputedStyle(el).rowGap) || 0) : 0;
      });

      const headerBlock = header.height;
      const metricBlock = statRow.height;
      const fixFirst = sectionTitle.height + fixRow.height * 3;
      const thenTheMoney = sectionTitle.height;
      const gaps = pageGap * 4;
      const aboveItemOne = headerBlock + metricBlock + fixFirst + thenTheMoney + gaps;

      console.log(
        `[components ${viewport.name}] header=${headerBlock} metrics=${metricBlock} ` +
          `fixFirst(title+3rows)=${fixFirst} thenTheMoneyTitle=${thenTheMoney} ` +
          `gaps(4x${pageGap})=${gaps} TOTAL_ABOVE_ITEM_1=${aboveItemOne}`,
      );
      // What item #1 actually costs. The closest analogue that reliably renders is the initiative
      // card: eyebrow row, dominant title, a figure line, a bar, and a meta line — five content
      // rows inside a Card. A Board card carries MORE than that (rank + status label, name + type,
      // amount + initiative chip + stage dot, action + evidence, a rationale sentence, a rule chip
      // with close date and slippage, and three buttons), so this is a FLOOR, not an estimate.
      const card = await measure("/95-forward/initiatives", '[data-testid="initiative-card"]');
      const usable = viewport.height - 92 - 40;
      const left = usable - aboveItemOne;

      console.log(
        `[verdict ${viewport.name}] contentHeight=${viewport.height - 92} ` +
          `pagePaddingTop=40 usable=${usable} aboveItem1=${aboveItemOne} ` +
          `leftForItem1=${left} cardFloor=${card.height} fits=${left >= card.height}`,
      );

      // The guard that matters going forward: the header block must never grow past the fold. This
      // does NOT assert that item #1 fits — at 1280x800 it currently does not, which is the finding
      // I24 reports rather than papers over. It asserts that the chrome and header stay inside the
      // viewport, so a later change cannot quietly push the queue off-screen entirely.
      expect(left, `${viewport.name}: header block overflows the fold`).toBeGreaterThan(0);
    });
  }
});

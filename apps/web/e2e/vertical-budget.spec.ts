import { test, expect } from "@playwright/test";

// I24 measured the vertical cost of the Keystone shell so that I25 could build The Board against a
// real number rather than against the standalone designs, which did not account for host chrome.
//
// I25 turned it into a GATE. The Board exists now, so the constraint can be asserted on the real
// thing instead of estimated from analogues: item #1 of the queue must be visible without scrolling
// at 1280x800, not merely at 1440x900. The printed numbers stay, because when this fails the
// question is always "which block grew".

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
          // The Board is a real page now, so this measures it rather than the placeholder that
          // stood in for it while I24 ran.
          pageBox: box(".f95-board"),
          pagePaddingTop: style(".f95-board", "padding-top"),
          sidebarWidth: box(".shell-sidebar")?.height ?? null,
        };
      });

      const chrome = metrics.topbar?.height ?? 0;
      const contentTop = metrics.pageBox?.top ?? metrics.content?.top ?? 0;
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

    test(`item #1 clears the fold at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/95-forward/board");
      await expect(page.locator('[data-testid="board"]')).toBeVisible();

      const m = await page.evaluate(() => {
        const box = (selector: string) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), height: Math.round(r.height) };
        };
        const page_ = document.querySelector(".f95-board");
        return {
          viewportHeight: window.innerHeight,
          topbar: box(".shell-topbar"),
          header: box(".f95-page__header"),
          metrics: box('[data-testid="board-metrics"]'),
          fixFirst: box('[data-testid="fix-first"]'),
          queueHead: box(".f95-board__sectionhead"),
          itemOne: box('[data-rank="1"]'),
          padTop: page_ ? getComputedStyle(page_).paddingTop : null,
          gap: page_ ? getComputedStyle(page_).rowGap : null,
        };
      });

      const itemOne = m.itemOne;
      const bottom = itemOne ? itemOne.top + itemOne.height : null;

      console.log(
        `[board ${viewport.name}] viewport=${m.viewportHeight} topbar=${m.topbar?.height} ` +
          `padTop=${m.padTop} gap=${m.gap} header=${m.header?.height} ` +
          `metrics=${m.metrics?.height} fixFirst=${m.fixFirst?.height ?? 0} ` +
          `queueHead=${m.queueHead?.height} item1Top=${itemOne?.top} item1H=${itemOne?.height} ` +
          `item1Bottom=${bottom} slack=${bottom === null ? "n/a" : m.viewportHeight - bottom}`,
      );

      // THE constraint. I24 measured the original design failing this at 1280x800 by ~66px with
      // optimistic inputs; I17b's amendments (collapsed Fix-first, 24px top padding, 12px gap) plus
      // I25's horizontal metric block and three-column card are what buy it back. It is asserted
      // rather than printed so that it cannot silently drift as content grows.
      expect(itemOne, "item #1 did not render").not.toBeNull();
      expect(
        bottom!,
        `${viewport.name}: item #1 is cut off — it ends at ${bottom} in a ${m.viewportHeight}px viewport`,
      ).toBeLessThanOrEqual(m.viewportHeight);
    });

    test(`the verdict row clears the fold at ${viewport.name}`, async ({ page }) => {
      // Opportunity Detail may scroll — but it opens with a JUDGEMENT rather than fields, and if a
      // user has to scroll to learn the ask is not real, that argument is lost before it is made.
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/95-forward/prospects");
      await page.goto("/95-forward/board");
      await page.locator('[data-testid="queue-card"] .f95-queue__name').first().click();
      await page.waitForURL(/\/95-forward\/opportunities\/[0-9a-f-]+/);
      await expect(page.locator('[data-testid="opportunity-detail"]')).toBeVisible();

      const m = await page.evaluate(() => {
        const box = (selector: string) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), height: Math.round(r.height) };
        };
        return {
          viewportHeight: window.innerHeight,
          header: box(".f95-opp__head"),
          verdict: box('[data-testid="verdict-row"]'),
        };
      });
      const bottom = m.verdict ? m.verdict.top + m.verdict.height : null;

      console.log(
        `[opportunity ${viewport.name}] viewport=${m.viewportHeight} header=${m.header?.height} ` +
          `verdictTop=${m.verdict?.top} verdictH=${m.verdict?.height} verdictBottom=${bottom} ` +
          `slack=${bottom === null ? "n/a" : m.viewportHeight - bottom}`,
      );

      expect(m.verdict, "the verdict row did not render").not.toBeNull();
      expect(
        bottom!,
        `${viewport.name}: the verdict is cut off — it ends at ${bottom} in a ${m.viewportHeight}px viewport`,
      ).toBeLessThanOrEqual(m.viewportHeight);
    });
  }
});

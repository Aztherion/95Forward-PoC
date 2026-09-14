import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Topbar } from "./Topbar";

// One <h1> per screen, and it is the page's own title (I26).
//
// This was asserted by walking every route in Playwright, which took 22 seconds and destabilised
// four unrelated specs under two parallel workers. The invariant is structural, so it is checked
// structurally: the component's two modes here, and every call site below. A route walk can only
// ever sample; this cannot miss one.

const SRC = fileURLToPath(new URL("../..", import.meta.url));

/** A page-body title. Any of these means the page owns the heading, not the topbar. */
const BODY_TITLE = [
  "f95-page__title",
  "f95-record-head__title",
  "page-placeholder__title",
] as const;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) out.push(path);
  }
  return out;
}

describe("Topbar heading", () => {
  it("emits the h1 by default — most screens have no heading of their own", () => {
    const html = renderToStaticMarkup(<Topbar title="Settings" subtitle="Keystone CRM" />);
    expect(html).toContain('<h1 class="shell-topbar__title">Settings</h1>');
  });

  it("steps aside when the page renders its own title", () => {
    const html = renderToStaticMarkup(<Topbar title="The Board" heading={false} />);
    expect(html).not.toContain("<h1");
    // Same class, so nothing moves visually — base.css already zeroes heading margins.
    expect(html).toContain('<div class="shell-topbar__title">The Board</div>');
  });
});

describe("every Topbar call site", () => {
  const files = walk(SRC).filter((f) => readFileSync(f, "utf8").includes("<Topbar"));

  it("finds the call sites it is meant to be checking", () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  it("passes heading={false} wherever the page renders its own title", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const hasBodyTitle = BODY_TITLE.some((cls) => source.includes(cls));
      const stepsAside = source.includes("heading={false}");
      if (hasBodyTitle && !stepsAside) offenders.push(file.slice(SRC.length));
    }
    expect(
      offenders.sort(),
      "these screens render two <h1> elements: one from Topbar, one from the page body",
    ).toEqual([]);
  });

  it("leaves the h1 with the topbar wherever the page has no title of its own", () => {
    // The mirror of the rule. A screen that steps the topbar aside and then renders no heading has
    // no h1 at all, which is worse than two.
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const hasBodyTitle = BODY_TITLE.some((cls) => source.includes(cls));
      if (!hasBodyTitle && source.includes("heading={false}"))
        offenders.push(file.slice(SRC.length));
    }
    expect(offenders.sort(), "these screens have no <h1> at all").toEqual([]);
  });
});

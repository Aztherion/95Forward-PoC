import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// I31 — the what-if sandbox writes nothing, and this is the proof that it CANNOT.
//
// The guarantee is structural rather than procedural: there is no carefully-designed commit flow
// that must be followed correctly, because there is no code path from pending state to the
// database at all. It therefore cannot be broken by a misclick, a race, a bug in a confirmation
// dialog, or a future refactor of a review step.
//
// This is a SOURCE check on purpose. A behavioural test can only assert about the states it
// happens to drive — it would catch a write on the path it clicked and miss the one on the path
// it did not. Reading the source cannot miss a call site. Same reasoning as I26's one-<h1> check,
// which replaced a fifteen-route Playwright walk that could only ever sample.

const APP = fileURLToPath(new URL("../../..", import.meta.url));

/** Everything the sandbox is made of. Adding a file here without updating it fails the test. */
const WHAT_IF_MODULES = [
  "app/95-forward/opportunities/what-if-state.ts",
  "app/95-forward/opportunities/what-if-rows.ts",
  "app/95-forward/opportunities/what-if-copy.ts",
  "app/95-forward/opportunities/WhatIfPanel.tsx",
  "server/data/what-if.ts",
  "server/actions/what-if.ts",
];

function read(relative: string): string {
  return readFileSync(join(APP, relative), "utf8");
}

/** Strip comments — this file's own prose names the very things it forbids. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function importedModules(source: string): string[] {
  const out: string[] = [];
  for (const m of code(source).matchAll(/from\s+"([^"]+)"/g)) out.push(m[1]!);
  for (const m of code(source).matchAll(/import\("([^"]+)"\)/g)) out.push(m[1]!);
  return out;
}

/**
 * Repository functions that write. Not an exhaustive list of the db package — a list of the verbs
 * a mutation uses, so a new one is caught by its name.
 */
const WRITE_VERBS =
  /\b(insert|update|delete|upsert|save|create|confirm|log[A-Z]|append|decide|undecide|prune|complete|commit|reset|seed|migrate|truncate)[A-Za-z]*\s*\(/g;

describe("the what-if sandbox has no write path", () => {
  it("knows about every module in the sandbox", () => {
    // A guard on the guard: if someone adds `what-if-something.ts` and forgets this list, the
    // check would silently stop covering it.
    const dir = join(APP, "app/95-forward/opportunities");
    const strays = readdirSync(dir)
      .filter((f) => /what-if/i.test(f) || /WhatIf/.test(f))
      .filter((f) => !/\.test\.tsx?$/.test(f))
      .filter((f) => !WHAT_IF_MODULES.some((m) => m.endsWith(`/${f}`)));
    expect(strays, `unlisted what-if module(s): ${strays.join(", ")}`).toEqual([]);
  });

  it("every module exists, so the list cannot rot into vacuous truth", () => {
    for (const relative of WHAT_IF_MODULES) {
      expect(statSync(join(APP, relative)).isFile(), relative).toBe(true);
    }
  });

  it("imports no server action other than the read-only what-if one", () => {
    for (const relative of WHAT_IF_MODULES) {
      for (const imported of importedModules(read(relative))) {
        if (!imported.includes("server/actions")) continue;
        expect(imported, `${relative} imports a server action`).toBe("@/server/actions/what-if");
      }
    }
  });

  it("the pure state module imports nothing from the server at all", () => {
    // The reducer is where a hypothetical edit lands. It must be incapable of doing anything else.
    const source = read("app/95-forward/opportunities/what-if-state.ts");
    for (const imported of importedModules(source)) {
      expect(imported.startsWith("@/server"), `what-if-state imports ${imported}`).toBe(false);
      expect(imported).not.toBe("@95forward/db");
    }
    expect(code(source)).not.toMatch(/\bfetch\s*\(/);
    expect(code(source)).not.toMatch(/use server/);
  });

  it("the read path calls no write function", () => {
    // `server/data/what-if.ts` is the only module here that touches the database. It may load a
    // snapshot; it may not change one.
    const source = code(read("server/data/what-if.ts"));
    const offenders = [...source.matchAll(WRITE_VERBS)].map((m) => m[0]);
    // `loadMetricsSnapshot`, `loadOpportunityLabels` etc. are reads whose names contain no write
    // verb; anything that does is a finding.
    expect(offenders, `write-shaped calls in the read path: ${offenders.join(", ")}`).toEqual([]);
  });

  it("the read path opens no write transaction and revalidates nothing", () => {
    const source = code(read("server/data/what-if.ts")) + code(read("server/actions/what-if.ts"));
    // A hypothesis has no effect on any cached route, and revalidating would be the first step
    // towards behaving as though it did.
    expect(source).not.toMatch(/revalidatePath|revalidateTag/);
    expect(source).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });

  it("the workspace routes what-if edits to the reducer, never to the write action", () => {
    // GridWorkspace is the one file that legitimately holds both modes, so it necessarily
    // imports the real write. What is asserted is the WIRING: the hypothetical commit body calls
    // the pure reducer and nothing else, and the grid receives one or the other by mode.
    const source = code(read("app/95-forward/opportunities/GridWorkspace.tsx"));

    const body = /const commitHypothetical =[\s\S]*?\n {2}\);/.exec(source)?.[0] ?? "";
    expect(body, "commitHypothetical not found — has it been renamed?").not.toBe("");
    expect(body).toMatch(/applyCellEdit/);
    expect(body).not.toMatch(/editGridCellAction|fetch\(|revalidate/);

    // And the selection is by mode, in one place.
    expect(source).toMatch(/onCommitCell=\{whatIf \? commitHypothetical : commitReal\}/);
  });

  it("the grid component itself imports no server action", () => {
    // I31 hoisted the write out of OpportunityGrid so that "what-if writes nothing" stopped being
    // a runtime branch inside a component that still imported the write.
    for (const file of ["components/grid/OpportunityGrid.tsx", "components/grid/GridCell.tsx"]) {
      for (const imported of importedModules(read(file))) {
        expect(imported.includes("server/actions"), `${file} imports ${imported}`).toBe(false);
      }
    }
  });

  it("pending state never reaches the URL, a cookie, or any shared store", () => {
    // The Board and the Forecast Room must be structurally incapable of seeing a hypothesis, and
    // a reload must clear it — state that survives a reload is state that can be mistaken for
    // real. `whatif=1` and `preset=` are ENTRY flags only; neither carries a change.
    const source = code(read("app/95-forward/opportunities/GridWorkspace.tsx"));
    expect(source).not.toMatch(/document\.cookie|localStorage|sessionStorage|indexedDB/);
    expect(source).not.toMatch(/router\.(push|replace)\(/);
    expect(source).not.toMatch(/useSearchParams|history\.(pushState|replaceState)/);
    // No module-level mutable holder that another route could import.
    expect(source).not.toMatch(/^(let|var)\s/m);
  });
});

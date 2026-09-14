import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The stylesheet contract (I17b).
//
// I17 found six custom properties referenced but never defined and five `var()` fallbacks that
// contradicted the real token — `var(--radius-sm, 8px)` where it is 6px, `var(--text-lg, 18px)`
// naming a token that does not exist. Both classes fail silently: the property resolves to nothing
// and the declaration is dropped, or the fallback quietly wins and the screen is off-system.
//
// I17b resolved all eleven. This test is what stops the twelfth, and it is the reason a new
// war-room screen can reach for a token without checking whether it is real.

const STYLES_DIR = fileURLToPath(new URL(".", import.meta.url));
const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));

/**
 * Properties that are legitimately defined outside the stylesheets.
 *
 * `--_`-prefixed names are the house convention for a local set by the consuming markup — the
 * `.f95-prow` tier rail is the precedent. They are deliberately undefined at rest.
 */
const DEFINED_ELSEWHERE = new Set([
  // Bound to <html> by next/font/local in app/layout.tsx.
  "--font-hanken",
  "--font-newsreader",
  "--font-plex-mono",
]);

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path, ext));
    else if (entry.endsWith(ext)) out.push(path);
  }
  return out;
}

const cssFiles = walk(STYLES_DIR, ".css");
const tsxFiles = walk(SRC_DIR, ".tsx");

function definedProperties(): Set<string> {
  const defined = new Set<string>();
  for (const file of cssFiles) {
    for (const match of readFileSync(file, "utf8").matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) {
      defined.add(match[1]!);
    }
  }
  return defined;
}

function references(files: string[]): { name: string; file: string }[] {
  const out: { name: string; file: string }[] = [];
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
      out.push({ name: match[1]!, file: file.slice(SRC_DIR.length) });
    }
  }
  return out;
}

describe("the stylesheet token contract", () => {
  it("finds the stylesheets it is meant to be checking", () => {
    expect(cssFiles.length).toBeGreaterThanOrEqual(14);
    expect(definedProperties().size).toBeGreaterThan(150);
  });

  it("references no custom property that is never defined", () => {
    const defined = definedProperties();
    const undefinedRefs = [...references(cssFiles), ...references(tsxFiles)].filter(
      ({ name }) => !defined.has(name) && !DEFINED_ELSEWHERE.has(name) && !name.startsWith("--_"),
    );
    expect(
      undefinedRefs.map(({ name, file }) => `${name} (${file})`).sort(),
      "an undefined custom property resolves to nothing and the declaration is silently dropped",
    ).toEqual([]);
  });

  it("carries no var() fallback on a real token, which is how a token and its stand-in drift apart", () => {
    // Every one of the five I17 found had drifted: 8px against a 6px token, 120ms against 140ms,
    // a hex literal standing in for a register alias. On a defined token a fallback is only
    // reachable when the token is missing — which the test above now rules out — so it is pure
    // opportunity for the two values to diverge unnoticed.
    //
    // A `--_`-prefixed local is the opposite case: it is undefined by design until the consuming
    // markup or a modifier sets it, and the fallback IS its default. `.f95-prow`'s tier rail is
    // the precedent and `.f95-card--accent` follows it.
    const withFallback: string[] = [];
    for (const file of [...cssFiles, ...tsxFiles]) {
      for (const match of readFileSync(file, "utf8").matchAll(
        /var\(\s*(--[A-Za-z0-9_-]+)\s*,[^)]/g,
      )) {
        if (match[1]!.startsWith("--_")) continue;
        withFallback.push(`${match[0]}… (${file.slice(SRC_DIR.length)})`);
      }
    }
    expect(withFallback.sort()).toEqual([]);
  });

  it("applies no class that has no rule behind it, for the classes this initiative added", () => {
    // f95-field__error vs f95-field__err cost this app red error text at its only copilot error
    // site. These are the new war-room classes; a typo in one is the same silent failure.
    const css = cssFiles.map((f) => readFileSync(f, "utf8")).join("\n");
    const NEW_CLASSES = [
      "f95-status",
      "f95-status__dot",
      "f95-healthdot",
      "f95-rulechip",
      "f95-monocap",
      "f95-msbadge",
      "f95-scenario",
      "f95-initdot",
      "f95-metric",
      "f95-metric__value",
      "f95-tabnav",
      "f95-forecast",
    ];
    const missing = NEW_CLASSES.filter((name) => !css.includes(`.${name}`));
    expect(missing).toEqual([]);
  });
});

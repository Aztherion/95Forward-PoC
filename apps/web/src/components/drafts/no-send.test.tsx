import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The PoC sends nothing, and nothing in the UI may say otherwise (I28).
//
// This is structural rather than behavioural on purpose. "Never auto-send" holds because there is
// no send path to reach — but a CTA reading "Send for approval" makes the product promise one
// anyway, and the board shipped exactly that. A rendered-output test can only sample the states a
// test happens to drive; reading the source cannot miss a call site.

const SRC = fileURLToPath(new URL("../..", import.meta.url));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Button and link labels in the 95 Forward screens. Deliberately only user-facing STRINGS in JSX
 * text or a `name=`-ish prop — a `sendMessage()` identifier is not a promise to anybody.
 */
/** Comments explain the rule; they are not UI. Strip them before looking for labels. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function labels(raw: string): string[] {
  const source = stripComments(raw);
  const out: string[] = [];
  // Quoted strings assigned in the CTA/label maps and passed as button children.
  for (const m of source.matchAll(/"([A-Z][^"\n]{3,60})"/g)) out.push(m[1]!);
  for (const m of source.matchAll(/>\s*([A-Z][^<>{}\n]{3,60}?)\s*</g)) out.push(m[1]!);
  return out;
}

// "Send it" as an instruction about the rep's own mail client is fine and is the honest copy; what
// is not fine is a control that implies THIS product will send.
const ALLOWED = [
  /send it, then mark it done/i,
  /does not send email/i,
  /I've sent it/i, // past tense: the rep reporting what THEY did
  /Copy this into your own mail client/i,
];

describe("nothing in 95 Forward promises to send", () => {
  const files = sourceFiles(join(SRC, "app", "95-forward"))
    .concat(sourceFiles(join(SRC, "components", "drafts")))
    .filter((f) => !f.includes("no-send"));

  it("has files to check", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("has no control label offering to send something", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const label of labels(source)) {
        if (!/^(Send|Email|Deliver)\b/i.test(label)) continue;
        if (ALLOWED.some((re) => re.test(label))) continue;
        offenders.push(`${file.replace(SRC, "")}: ${label}`);
      }
    }
    expect(offenders, `a control promises to send:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("renders no send path in the draft panel", () => {
    const panel = readFileSync(join(SRC, "components", "drafts", "DraftPanel.tsx"), "utf8");
    expect(panel).toContain("does not send email");
    // No action, handler or route that would post an email anywhere.
    expect(panel).not.toMatch(/sendDraft|sendEmail|mailto:/);
  });
});

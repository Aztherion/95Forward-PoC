import type { NextActionKind } from "@95forward/shared";
import type { ModelId, Providers } from "../types";
import { DRAFT_AUDIENCE, renderContext, type DraftAudience, type DraftContext } from "./context";
import { fixtureDraft } from "./fixtures";
import { draftSystemPrompt } from "./prompts";
import { checkGrounding, type GroundingReport } from "./grounding";

export interface DraftResult {
  readonly kind: NextActionKind;
  readonly audience: DraftAudience;
  readonly subject: string | null;
  readonly text: string;
  readonly provider: "mock" | "live";
  readonly grounding: GroundingReport;
}

/** `Subject: …` on the first line, for the ones that are emails. */
function extractSubject(text: string): string | null {
  const match = /^\s*Subject:\s*(.+)$/m.exec(text);
  return match?.[1]?.trim() ?? null;
}

/**
 * Strip anything the model wrapped the artifact in.
 *
 * Models like to say "Here's a draft:" and to fence things. The panel shows the artifact, so the
 * artifact is what comes back.
 */
function unwrap(text: string): string {
  let out = text.trim();
  // Preface first, then fence, then preface again: a model that says "Here's a draft:" often then
  // fences it, and a model that fences often prefaces INSIDE the fence. Two passes covers both.
  for (let pass = 0; pass < 2; pass += 1) {
    out = out.replace(/^(?:here(?:'s| is)\b[^\n]*|draft:?)\s*\n+/i, "").trim();
    const fence = /^```[a-z]*\s*\n([\s\S]*?)\n?```$/.exec(out);
    if (fence?.[1] !== undefined) out = fence[1].trim();
  }
  return out.trim();
}

export interface GenerateDraftOptions {
  readonly providers: Providers;
  readonly context: DraftContext;
  /** `mock` skips the model entirely. Dev, CI and every e2e run. */
  readonly mode: "mock" | "live";
  readonly model?: ModelId;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

/**
 * Generate one drafted artifact.
 *
 * NO TOOLS. That is the strongest grounding enforcement available and it is structural rather than
 * instructed: the model is handed a briefing and physically cannot reach past it. The prompt states
 * the rules and `checkGrounding` re-reads the result, but neither of those is what makes an
 * invented gift history impossible — the absence of a way to look one up is.
 *
 * The grounding report travels with the result rather than throwing. A draft is reviewed by a human
 * before it is used, and surfacing "this mentions someone the record does not" to that human is
 * more useful than refusing to show them anything.
 */
export async function generateDraft(options: GenerateDraftOptions): Promise<DraftResult> {
  const { context, mode } = options;
  const audience = DRAFT_AUDIENCE[context.kind];

  if (mode === "mock") {
    const text = fixtureDraft(context);
    return {
      kind: context.kind,
      audience,
      subject: extractSubject(text),
      text,
      provider: "mock",
      grounding: checkGrounding(text, context),
    };
  }

  const response = await options.providers.model.createMessage({
    model: options.model ?? "claude-sonnet-4-6",
    maxTokens: options.maxTokens ?? 1600,
    temperature: options.temperature ?? 0.5,
    system: draftSystemPrompt(context.kind),
    messages: [{ role: "user", content: renderContext(context) }],
    // Deliberately no `tools`. See the doc comment.
  });

  const text = unwrap(
    response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim(),
  );

  return {
    kind: context.kind,
    audience,
    subject: extractSubject(text),
    text,
    provider: "live",
    grounding: checkGrounding(text, context),
  };
}

/**
 * How much of a draft the human changed, 0-100.
 *
 * Levenshtein over the whole body, normalised by the longer of the two. A boolean cannot tell a
 * typo fix from a rewrite, and the difference is exactly what the log exists to show.
 */
export function editedPercent(generated: string, final: string): number {
  const a = generated.trim();
  const b = final.trim();
  if (a === b) return 0;
  if (a.length === 0 || b.length === 0) return 100;

  // Row-wise Levenshtein: O(min) memory, which matters because these are letters, not labels.
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let previous = Array.from({ length: short.length + 1 }, (_, i) => i);
  for (let i = 1; i <= long.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= short.length; j += 1) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (long[i - 1] === short[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  const distance = previous[short.length]!;
  return Math.min(100, Math.max(1, Math.round((distance / long.length) * 100)));
}

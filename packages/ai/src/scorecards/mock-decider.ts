import { createHash } from "node:crypto";
import {
  normaliseForEvidence,
  snapshotCriteria,
  type CriterionResultInput,
} from "@95forward/shared";
import { SCORECARD_PROMPT_VERSION } from "./prompts";
import type {
  ClassifyMeetingInput,
  ClassifyMeetingResult,
  MeetingDecider,
  ScoreMeetingInput,
  ScoreMeetingResult,
} from "./types";

// 95 Forward — the deterministic MeetingDecider (Initiative 31).
//
// Key-free, network-free, and the same answer every time for the same input. This is what CI, the
// unit suite and the whole e2e harness run against, selected by AI_MODE exactly as the I28 drafter
// selects its fixtures.
//
// IT MUST WORK FOR ANY DEFINITION, not just the seeded two. A mock that only knows the fixtures
// cannot exercise a dynamically generated schema, and "an organisation added a criterion" is
// precisely the case the schema generation exists for. So every answer below is derived from the
// definition's own shape plus a hash of (criterion id, content): structurally valid for whatever
// it is handed, and stable across runs.
//
// It is NOT pretending to be a judgement. The rationale says so in as many words, so nobody reads
// a mock Scorecard as an opinion about a fundraiser.

/** Stable 32-bit value from a key. Same key, same number, every process, forever. */
function hashOf(key: string): number {
  return parseInt(createHash("sha1").update(key).digest("hex").slice(0, 8), 16);
}

const STOPWORDS = new Set([
  "about",
  "after",
  "where",
  "which",
  "their",
  "there",
  "those",
  "these",
  "other",
  "being",
  "while",
  "would",
  "could",
  "should",
  "meeting",
  "meetings",
  "person",
  "people",
]);

/** Words a description and a transcript can meaningfully share. */
function significantWords(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z]{5,}/g) ?? [];
  return new Set(words.filter((word) => !STOPWORDS.has(word)));
}

/** Sentences of the content, long enough to be worth quoting. */
function quotableSentences(content: string): string[] {
  return content
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 25 && line.length <= 220);
}

export class DeterministicMeetingDecider implements MeetingDecider {
  readonly kind = "mock" as const;

  /**
   * Pick the type whose DESCRIPTION overlaps the content most.
   *
   * Crude on purpose and documented as such: it is a stand-in, not a classifier. What matters is
   * that it is deterministic, that it works for any set of types, and that it can genuinely
   * return `none` — a mock that always finds a fit would leave the fallback path untested, which
   * is the path a real classifier reaches on exactly the meetings nobody thought about.
   */
  async classifyMeetingType(input: ClassifyMeetingInput): Promise<ClassifyMeetingResult> {
    const started = Date.now();
    const contentWords = significantWords(input.content);

    let bestId: string | "none" = "none";
    let bestScore = 0;
    let bestName = "";
    for (const type of input.meetingTypes) {
      const descriptionWords = significantWords(`${type.name} ${type.description}`);
      let overlap = 0;
      for (const word of descriptionWords) {
        if (contentWords.has(word)) overlap += 1;
      }
      // Ties break on the id so the answer does not depend on row order.
      if (overlap > bestScore || (overlap === bestScore && overlap > 0 && type.id < bestId)) {
        bestScore = overlap;
        bestId = type.id;
        bestName = type.name;
      }
    }

    // Two or fewer shared words is noise, not a match. The content then gets the fallback type.
    const matched = bestScore >= 3;
    return {
      meetingTypeId: matched ? bestId : "none",
      rationale: matched
        ? `Deterministic mock: the record shares ${String(bestScore)} distinctive terms with the "${bestName}" description.`
        : "Deterministic mock: the record did not overlap any meeting type description enough to call it.",
      audit: {
        model: "mock",
        promptVersion: SCORECARD_PROMPT_VERSION,
        latencyMs: Date.now() - started,
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  }

  async scoreMeeting(input: ScoreMeetingInput): Promise<ScoreMeetingResult> {
    const started = Date.now();
    const sentences = quotableSentences(input.content);
    // Hash the whole content once so two different meetings score differently against the same
    // definition — a mock that returned one answer per definition would make every Scorecard in
    // the demo identical.
    const contentSalt = hashOf(normaliseForEvidence(input.content)).toString(36);
    const results: CriterionResultInput[] = [];

    for (const { section, criterion } of snapshotCriteria(input.snapshot)) {
      const hash = hashOf(`${criterion.id}:${contentSalt}`);
      // Notes are sparser than transcripts, so the mock leaves more of them undetermined. This is
      // the shape the real prompt is told to produce, and it keeps the "sparse notes are not
      // punished" path exercised without a bespoke fixture.
      const undeterminedEvery = input.sourceType === "notes" ? 4 : 9;
      const determinable = hash % undeterminedEvery !== 0;

      if (!determinable) {
        results.push({
          criterionId: criterion.id,
          sectionId: section.id,
          criterionType: criterion.type,
          determinable: false,
          booleanValue: null,
          scoreValue: null,
          optionId: null,
          rationale: `Deterministic mock: the record does not say either way about "${criterion.prompt}".`,
          evidenceQuote: null,
        });
        continue;
      }

      const quote = sentences.length === 0 ? null : (sentences[hash % sentences.length] ?? null);
      const base = {
        criterionId: criterion.id,
        sectionId: section.id,
        criterionType: criterion.type,
        determinable: true as const,
        rationale: `Deterministic mock: a fixed judgement against "${criterion.prompt}". Not a real assessment.`,
        // Taken verbatim out of the content, so evidence verification is genuinely exercised
        // rather than trivially passing on a null.
        evidenceQuote: quote,
      };

      switch (criterion.type) {
        case "boolean":
          results.push({ ...base, booleanValue: hash % 2 === 0, scoreValue: null, optionId: null });
          break;
        case "score":
          results.push({
            ...base,
            booleanValue: null,
            scoreValue: Number(((hash % 101) / 100).toFixed(4)),
            optionId: null,
          });
          break;
        case "classification": {
          const options = criterion.options
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const option = options[hash % Math.max(1, options.length)];
          if (option === undefined) {
            // A classification criterion with no options cannot be answered. The definition
            // validator refuses that shape; this is the belt to its braces.
            results.push({
              ...base,
              determinable: false,
              booleanValue: null,
              scoreValue: null,
              optionId: null,
              evidenceQuote: null,
              rationale: "Deterministic mock: this classification criterion has no options.",
            });
            break;
          }
          results.push({ ...base, booleanValue: null, scoreValue: null, optionId: option.id });
          break;
        }
      }
    }

    return {
      results,
      audit: {
        model: "mock",
        promptVersion: SCORECARD_PROMPT_VERSION,
        latencyMs: Date.now() - started,
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  }
}

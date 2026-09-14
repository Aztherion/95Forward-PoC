import { renderContext, type DraftContext } from "./context";

// The third layer of grounding enforcement, after "no tools" and the prompt.
//
// It re-reads the output and asks one question: does this draft state anything the briefing did
// not? It cannot catch every fabrication — a plausible-sounding sentence with no proper nouns will
// pass — but it catches the two classes that actually hurt: an amount nobody agreed to, and a name
// nobody mentioned.

export interface GroundingIssue {
  readonly kind: "money" | "name" | "promise";
  readonly value: string;
  readonly why: string;
}

export interface GroundingReport {
  readonly grounded: boolean;
  readonly issues: readonly GroundingIssue[];
}

/**
 * Words that look like proper nouns but are not claims about anyone.
 *
 * Months, weekdays and sentence-initial words are capitalised without asserting anything. So are
 * the handful of words a letter uses structurally.
 */
const NOT_A_NAME = new Set(
  [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "subject",
    "dear",
    "hi",
    "hello",
    "best",
    "regards",
    "kind",
    "sincerely",
    "thanks",
    "thank",
    "yours",
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "if",
    "it",
    "we",
    "i",
    "you",
    "they",
    "he",
    "she",
    "this",
    "that",
    "when",
    "where",
    "what",
    "who",
    "why",
    "how",
    "there",
    "here",
    "would",
    "could",
    "should",
    "will",
    "can",
    "our",
    "your",
    "their",
    "his",
    "her",
    "its",
    "my",
    "me",
    "us",
    "them",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "of",
    "on",
    "to",
    "with",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "no",
    "not",
    "yes",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "who",
    "where",
    "what",
    "next",
    "last",
    "after",
    "before",
    "since",
    "until",
    "while",
    "once",
    "also",
    "please",
    "let",
    "make",
    "give",
    "take",
    "put",
    "keep",
    "tell",
    "ask",
    "say",
    "said",
    "meet",
    "meeting",
    "week",
    "month",
    "year",
    "day",
    "days",
    "time",
    "date",
    "board",
    "fund",
    "gift",
    "ask",
    "note",
    "brief",
  ].map((w) => w.toLowerCase()),
);

/** Phrases that promise something on the organisation's behalf. */
const PROMISE_PATTERNS: readonly { readonly re: RegExp; readonly why: string }[] = [
  { re: /\bnaming (?:rights?|opportunit)/i, why: "promises naming rights" },
  { re: /\bwe (?:will|can) (?:name|dedicate)\b/i, why: "promises to name or dedicate something" },
  { re: /\bplaque|\bengrav/i, why: "promises physical recognition" },
  { re: /\bboard (?:seat|position|appointment)\b/i, why: "promises a board seat" },
  {
    re: /\bwe (?:will|'ll) (?:send|provide) (?:you )?(?:a )?(?:quarterly|annual|monthly) report/i,
    why: "promises a reporting commitment",
  },
  { re: /\bguarantee\b/i, why: "guarantees an outcome" },
];

function normalise(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

/** `$250,000` → `250000`, so `$250,000` and `$250000` compare equal. */
function moneyKey(token: string): string {
  return token.replace(/[^0-9]/g, "");
}

/**
 * Check a draft against the briefing it was given.
 *
 * Money is a HARD check: every figure in the draft must appear in the briefing. A letter stating an
 * amount nobody agreed to is the failure this product can least afford, and there is no legitimate
 * reason for a drafter to produce a number the record does not hold.
 *
 * Names are a SOFT check by construction — capitalisation is a weak signal — but a capitalised
 * multi-word phrase absent from the briefing is exactly the shape of an invented person or place,
 * so it is reported.
 */
export function checkGrounding(draft: string, context: DraftContext): GroundingReport {
  const text = normalise(draft);
  const briefing = normalise(renderContext(context)).toLowerCase();
  const issues: GroundingIssue[] = [];

  const briefingMoney = new Set(
    (renderContext(context).match(/\$[\d,]+(?:\.\d+)?/g) ?? []).map(moneyKey),
  );
  for (const token of text.match(/\$[\d,]+(?:\.\d+)?/g) ?? []) {
    if (!briefingMoney.has(moneyKey(token))) {
      issues.push({
        kind: "money",
        value: token,
        why: "states an amount that is not on the record",
      });
    }
  }

  // Capitalised runs, minus the structural vocabulary.
  //
  // Two kinds of false positive had to go. ALL-CAPS tokens are headings in an internal brief
  // ("DISCOVERY QUESTIONS"), not claims about anyone. And a single capitalised word that opens a
  // sentence is capitalised by grammar, not by being a name — "Timing." and "Confirming" were both
  // flagged before this. A single word MID-sentence is still checked, because an invented place
  // ("Kampala") is usually one word and usually sits mid-sentence.
  const seen = new Set<string>();
  for (const match of text.matchAll(/\b[A-Z][a-zA-Z'’-]*(?:\s+[A-Z][a-zA-Z'’-]*)*/g)) {
    const candidate = match[0];
    const before = text.slice(0, match.index ?? 0);
    // A list marker opens a sentence too: "  - Timing." is grammar, not a person.
    const sentenceInitial = /(?:^|[.!?:]\s*|\n[\s>*\u2022-]*)$/.test(before);
    const words = candidate
      .split(/\s+/)
      .filter((w) => w !== w.toUpperCase() || w.length === 1)
      .filter((w) => !NOT_A_NAME.has(w.toLowerCase()));
    if (words.length === 0) continue;
    if (words.length === 1 && sentenceInitial) continue;
    const phrase = words.join(" ");
    if (phrase.length < 3 || seen.has(phrase.toLowerCase())) continue;
    seen.add(phrase.toLowerCase());
    // Present if the briefing contains the phrase, or every word of it (names get split across
    // lines and possessives).
    const whole = briefing.includes(phrase.toLowerCase());
    const everyWord = words.every((w) => briefing.includes(w.toLowerCase().replace(/['’]s$/, "")));
    if (!whole && !everyWord) {
      issues.push({ kind: "name", value: phrase, why: "names something the record does not" });
    }
  }

  for (const { re, why } of PROMISE_PATTERNS) {
    const match = re.exec(text);
    if (match) issues.push({ kind: "promise", value: match[0], why });
  }

  return { grounded: issues.length === 0, issues };
}

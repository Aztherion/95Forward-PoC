import {
  FORWARD_STAGES,
  type BelowCut,
  type DayWorkSummary,
  type ForwardStage,
  type TopItemFact,
} from "@95forward/shared";
import { formatCurrencyFromCents } from "@/lib/format";

// The Board's composed copy, kept pure so it can be tested without a database.
//
// I23 returns FACTS — counts, a kind and a number — and refuses to write sentences, because a
// sentence generated per render drifts between runs and a screen that reads differently on a
// refresh has told the user it is guessing. Composing them is the screen's job, and composing is
// all that happens here.

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** `Item #1 is 81 days idle.` — or nothing, when there is no fact worth quoting. */
export function topItemSentence(fact: TopItemFact | null): string | null {
  if (fact === null || fact.value === null) return null;
  switch (fact.kind) {
    case "idle-days":
      return `Item #1 is ${plural(fact.value, "day", "days")} idle.`;
    case "past-close":
      return `Item #1 is ${plural(fact.value, "day", "days")} past its close date.`;
    case "closes-in":
      return fact.value === 0
        ? "Item #1 closes today."
        : `Item #1 closes in ${plural(fact.value, "day", "days")}.`;
    case "unasked-visits":
      return `Item #1 has had ${plural(fact.value, "visit", "visits")} and no specific ask.`;
    case "none":
      return null;
  }
}

/**
 * `3 broken forecasts, then 6 moves that change the number today. Item #1 is 81 days idle.`
 *
 * Both counts can be zero, and a clean board should say so plainly rather than congratulate
 * itself — the screen is a coach, and a coach with nothing to say says nothing.
 */
export function boardSubtitle(summary: DayWorkSummary): string {
  const { findingCount, queueCount } = summary;
  const fact = topItemSentence(summary.topItemFact);

  if (findingCount === 0 && queueCount === 0) {
    return "Nothing needs you right now. Every forecast agrees with itself and no move changes the number today.";
  }

  const head =
    findingCount === 0
      ? `${plural(queueCount, "move", "moves")} that change the number today.`
      : queueCount === 0
        ? `${plural(findingCount, "broken forecast", "broken forecasts")} to clear, and no moves that change the number today.`
        : `${plural(findingCount, "broken forecast", "broken forecasts")}, then ${plural(queueCount, "move", "moves")} that change the number today.`;

  const capitalised = head.charAt(0).toUpperCase() + head.slice(1);
  return fact === null ? capitalised : `${capitalised} ${fact}`;
}

/**
 * `3 forecasts contradict themselves · clear them in under three minutes`
 *
 * The time claim is computed from the findings' own effort estimates. A hardcoded "three minutes"
 * would be a promise the screen cannot keep the moment a fourth finding appears.
 */
export function fixFirstSummary(count: number, totalEffortSeconds: number): string {
  const subject =
    count === 1 ? "1 forecast contradicts itself" : `${count} forecasts contradict themselves`;
  return `${subject} · clear ${count === 1 ? "it" : "them"} in ${effortPhrase(totalEffortSeconds)}`;
}

/** "under three minutes" · "about 90 seconds". Rounded up, so the claim is never optimistic. */
export function effortPhrase(totalSeconds: number): string {
  if (totalSeconds <= 0) return "no time at all";
  if (totalSeconds < 90) return `about ${Math.ceil(totalSeconds / 15) * 15} seconds`;
  const minutes = Math.ceil(totalSeconds / 60);
  const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const word = WORDS[minutes];
  return word ? `under ${word} minute${minutes === 1 ? "" : "s"}` : `under ${minutes} minutes`;
}

/**
 * The below-the-cut line, branching on what the engine computed rather than on what the design
 * assumed. `changesTheNumber` is null when the scope has no goal — then neither claim is earned,
 * so the amount is stated and the verdict is withheld.
 */
export function belowCutSentence(belowCut: BelowCut): string {
  const head = `${plural(belowCut.count, "more opportunity is", "more opportunities are")} ranked below the cut`;
  if (belowCut.changesTheNumber === false) {
    return `${head} — none of them change this week's number.`;
  }
  return `${head} — together they hold ${formatCurrencyFromCents(belowCut.cents)}.`;
}

const STAGE_LABELS: Record<ForwardStage, string> = {
  get_the_visit: "Get the visit",
  prep_the_visit: "Prep the visit",
  visit_and_ask: "Visit & ask",
  follow_up_and_close: "Follow up & close",
  celebrate_steward: "Celebrate / steward",
  repeat: "Repeat",
};

export function stageLabel(stage: ForwardStage): string {
  return STAGE_LABELS[stage];
}

/** The six stages in order, for anything that needs to render the vocabulary. */
export const STAGES_IN_ORDER: readonly ForwardStage[] = FORWARD_STAGES;

const TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  organization: "Organization",
  foundation: "Foundation",
  household: "Household",
  corporation: "Corporation",
};

export function prospectTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
}

/**
 * The card's close-date evidence, as one line: `CLOSES OCT 31, 2026 · PUSHED 3×, NEVER BY THEM`.
 *
 * One function rather than a date plus a separate slippage phrase, because the two are not
 * independent: with no date there is nothing to slip, and composing them separately rendered
 * "NO CLOSE DATE · NO CLOSE DATE SET" on three cards.
 *
 * A date nobody outside the building has agreed to is the thing this screen exists to expose, so
 * the absence of one is stated in full rather than abbreviated to a dash.
 */
export function closeDateLine(
  item: {
    readonly closeDate: string | null;
    readonly closeDateMoves: number;
    readonly closeDateMovesProspectSourced: boolean;
  },
  formatDate: (value: string) => string,
): string {
  if (item.closeDate === null) return "NO CLOSE DATE SET WITH THEM";
  const closes = `CLOSES ${formatDate(item.closeDate)}`;
  if (item.closeDateMoves === 0) return `${closes} · ON TIME`;
  const moved = `PUSHED ${item.closeDateMoves}×`;
  return item.closeDateMovesProspectSourced
    ? `${closes} · ${moved}`
    : `${closes} · ${moved}, NEVER BY THEM`;
}

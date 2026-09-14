import type {
  CoverageWith,
  CoverageWithout,
  InitiativeShare,
  MilestoneDefinition,
  QualificationResult,
  ScenarioBadge,
} from "@95forward/shared";
import { formatCurrencyFromCents } from "@/lib/format";

// The composed copy for Opportunity Detail, kept pure so the argument it makes can be tested
// without a browser. Every sentence here is a claim about the record; none of it is decoration.

/**
 * The verdict the screen opens with.
 *
 * Not a status field — a judgement, in the words a colleague would use. "Not a real ask yet" is the
 * whole product in four words, and it is only sayable because qualification is derived from
 * milestones rather than typed into a dropdown.
 */
export function verdictHeadline(qualification: QualificationResult): string {
  if (qualification.blockingTotal === 0) return "No milestones defined";
  return qualification.qualified ? "This is a real ask" : "Not a real ask yet";
}

/** `1/4 they said · 2/2 we said` — two counters, and they count different things. */
export function counterLine(qualification: QualificationResult): string {
  return (
    `${qualification.theySaidConfirmed}/${qualification.theySaidTotal} they said · ` +
    `${qualification.weSaidConfirmed}/${qualification.weSaidTotal} we said`
  );
}

/** Joins a list the way a person would: "a, b and c". */
export function andList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * *"Missing: close date confirmed by the prospect and confirmed in writing. Everything else is us
 * talking to ourselves."*
 *
 * The second sentence only earns its place while something is actually missing.
 */
export function missingLine(qualification: QualificationResult): string {
  if (qualification.qualified) {
    return "Every blocking milestone is confirmed. The prospect has said what needs saying.";
  }
  const names = qualification.missingBlocking.map((d: MilestoneDefinition) =>
    d.label.toLowerCase(),
  );
  return `Missing: ${andList(names)}. Everything else is us talking to ourselves.`;
}

/**
 * *"2 unconfirmed milestones hold $250,000 out of the numbers your leader reads on Monday."*
 *
 * Computed. A record with nothing missing says nothing rather than congratulating itself.
 */
export function milestoneFooter(
  qualification: QualificationResult,
  amountCents: number,
): string | null {
  const missing = qualification.missingBlocking.length;
  if (missing === 0) return null;
  return (
    `${missing} unconfirmed ${missing === 1 ? "milestone holds" : "milestones hold"} ` +
    `${formatCurrencyFromCents(amountCents)} out of the numbers your leader reads on Monday.`
  );
}

export interface CountsAsRow {
  readonly label: string;
  readonly value: string;
  readonly counted: boolean;
}

/**
 * `WHAT THIS ASK COUNTS AS` — the three rows that connect this record to the portfolio.
 *
 * "In Worst" is `$0` rather than `not counted` when the record misses: the worst case is a number,
 * and the number is zero. The other two are absences, and an absence reads as an absence.
 */
export function countsAsRows(
  amountCents: number,
  qualified: boolean,
  badge: ScenarioBadge | null,
): readonly CountsAsRow[] {
  const inMostLikely = badge === "IN_ALL_THREE" || badge === "MOST_LIKELY_PLUS";
  const inWorst = badge === "IN_ALL_THREE";
  const money = formatCurrencyFromCents(amountCents);
  return [
    {
      label: "Qualified asks on the table",
      value: qualified ? money : "not counted",
      counted: qualified,
    },
    { label: "In Most likely", value: inMostLikely ? money : "not counted", counted: inMostLikely },
    { label: "In Worst", value: inWorst ? money : "$0", counted: inWorst },
  ];
}

export function countsAsClosing(qualified: boolean): string {
  return qualified
    ? "The prospect has confirmed a date, so this amount is an ask rather than a claim."
    : "Until the prospect confirms a date, this amount is a claim, not an ask.";
}

function ratio(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)}×`;
}

/**
 * The coverage consequence, inverted by qualification.
 *
 * `coverageWithout` returns a delta of exactly zero for an unqualified ask — it was never in the
 * numerator — so "lose this one and coverage drops" is arithmetically false about the record this
 * screen was designed around. The forward-looking question is the true one, and it is also the
 * better one: what you would lose is the wrong question about something you do not have.
 */
export function coverageSentence(
  initiativeName: string,
  qualified: boolean,
  ifLost: CoverageWithout | undefined,
  ifQualified: CoverageWith | undefined,
): string | null {
  if (qualified) {
    if (!ifLost || ifLost.coverageRatio === null || ifLost.coverageRatioWithout === null) {
      return null;
    }
    return `Lose this one and ${initiativeName} drops from ${ratio(ifLost.coverageRatio)} to ${ratio(ifLost.coverageRatioWithout)} coverage.`;
  }
  if (
    !ifQualified ||
    ifQualified.coverageRatio === null ||
    ifQualified.coverageRatioWith === null
  ) {
    return null;
  }
  return `Qualify this and ${initiativeName} goes from ${ratio(ifQualified.coverageRatio)} to ${ratio(ifQualified.coverageRatioWith)} coverage.`;
}

/** The share line, likewise inverted: a share you would have is not a share you have. */
export function shareSentence(share: InitiativeShare | undefined): string {
  if (!share) return "";
  if (!share.counted) {
    // The superlative is earned against the largest ask that IS counted, not against the total —
    // which is why I19 returns `largestOtherCents`. Claiming it any other way would be a sentence
    // the data does not support, on the screen whose whole point is refusing those.
    return share.opportunityCents > share.largestOtherCents
      ? "Would be the largest single qualified ask in it."
      : "Would count towards the initiative's qualified asks once it is real.";
  }
  const pct = share.share === null ? 0 : Math.round(share.share * 100);
  const largest = share.isLargest ? " — the largest single ask in it." : ".";
  return `${pct}% of the initiative's qualified asks${largest}`;
}

/** `JUL 29 → AUG 31 → SEP 30 → OCT 31 · ALL THREE MOVES MADE BY US` */
export function slippageChain(
  chain: readonly string[],
  count: number,
  anyProspectSourced: boolean,
  formatDate: (value: string) => string,
): string {
  const dates = chain.map((d) => formatDate(d).toUpperCase()).join(" → ");
  if (count === 0) return dates;
  const WORDS = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"];
  const word = WORDS[count] ?? String(count);
  const attribution = anyProspectSourced
    ? `${count === 1 ? "ONE MOVE" : `ALL ${word} MOVES`} ON THE RECORD`
    : `${count === 1 ? "THE MOVE WAS" : `ALL ${word} MOVES WERE`} MADE BY US`;
  return `${dates} · ${attribution}`;
}

/** *"Close date moved 3 times · +94 days"* */
export function slippageHeadline(count: number, totalDaysMoved: number): string {
  const times = count === 1 ? "once" : `${count} times`;
  const sign = totalDaysMoved >= 0 ? "+" : "−";
  return `Close date moved ${times} · ${sign}${Math.abs(totalDaysMoved)} days`;
}

/** *"Hallworth has never given a date. A date we invent is not a date."* */
export function slippageVerdict(prospectName: string, anyProspectSourced: boolean): string {
  return anyProspectSourced
    ? `${prospectName} has been part of at least one of these moves.`
    : `${prospectName} has never given a date. A date we invent is not a date.`;
}

/** `Dana Reese · no prospect input` / `Ellen Hallworth, on a call` */
export function actorLine(actorName: string | null, prospectSourced: boolean): string {
  if (prospectSourced) return actorName ? `${actorName} · from the prospect` : "From the prospect";
  return actorName ? `${actorName} · no prospect input` : "No prospect input";
}

const FIELD_LABELS: Record<string, string> = {
  closeDate: "Close date",
  amountCents: "Ask amount",
  amountNote: "Amount note",
  stage: "Stage",
  dateConfidence: "Date confidence",
  probability: "Probability",
  visitRating: "Visit rating",
  status: "Status",
  ownerUserId: "Owner",
};

export interface TimelineEntry {
  readonly occurredAt: Date;
  readonly what: string;
  readonly who: string;
  readonly prospectSourced: boolean;
}

/**
 * One timeline row's sentence, from the event log.
 *
 * The log stores a field, an old value and a new value — deliberately structured — so the sentence
 * is composed here rather than written at the point of the change. A stored sentence would go stale
 * the first time anyone reworded anything, and could not be re-read in a different context.
 */
export function timelineSentence(
  event: {
    readonly eventType: string;
    readonly field: string | null;
    readonly oldValue: string | null;
    readonly newValue: string | null;
    readonly note?: string | null;
  },
  formatDate: (value: string) => string,
  milestoneLabels: Readonly<Record<string, string>>,
): string {
  switch (event.eventType) {
    case "field_change": {
      const label = FIELD_LABELS[event.field ?? ""] ?? event.field ?? "A field";
      if (event.field === "closeDate" && event.oldValue && event.newValue) {
        const days = Math.round(
          (Date.parse(event.newValue) - Date.parse(event.oldValue)) / 86_400_000,
        );
        const sign = days >= 0 ? "+" : "−";
        return `Close date moved ${formatDate(event.oldValue)} → ${formatDate(event.newValue)} (${sign}${Math.abs(days)} days).`;
      }
      return `${label} changed${event.oldValue ? ` from ${event.oldValue}` : ""}${event.newValue ? ` to ${event.newValue}` : ""}.`;
    }
    case "milestone_confirmed": {
      const label = milestoneLabels[event.field ?? ""] ?? event.field ?? "A milestone";
      const undone = event.newValue === "false";
      return undone ? `${label} un-confirmed.` : `${label} confirmed.`;
    }
    case "contact_logged":
      return event.note ? `Contact logged — ${event.note}` : "Contact logged.";
    case "stage_change":
      return `Stage moved${event.oldValue ? ` from ${event.oldValue.replace(/_/g, " ")}` : ""} to ${(event.newValue ?? "").replace(/_/g, " ")}.`;
    case "guidance_pinned":
      return "Pinned to the top of the board.";
    case "guidance_dismissed":
      return event.field ? `Dismissed the ${event.field} finding.` : "Dismissed from the board.";
    case "note":
      // Draft completions land here: "Follow-up drafted and sent · edited by Dana Reese (18%
      // changed)" against "· unedited". That visible difference is the whole point of the log —
      // it is what lets a leader see guidance was worked with rather than rubber-stamped.
      return event.note ?? "Note added.";
    default:
      return "Changed.";
  }
}

/** Green for what the prospect drove, amber for what we did alone. */
export function timelineHealth(prospectSourced: boolean): "moving" | "slowing" {
  return prospectSourced ? "moving" : "slowing";
}

/**
 * What to say about a milestone nobody has confirmed.
 *
 * Computed from the record's own facts, because "not confirmed" is true of every unconfirmed
 * milestone and therefore tells a reader nothing. "All 3 close dates were set by us" and "81 days
 * since the verbal yes" are the designed copy, and both are reads over the event log.
 */
export function unconfirmedNotes(input: {
  readonly closeDateMoves: number;
  readonly anyProspectSourced: boolean;
  readonly silenceDays: number | null;
  readonly amountAgreed: boolean;
}): Record<string, string> {
  const notes: Record<string, string> = {};

  if (input.closeDateMoves > 0 && !input.anyProspectSourced) {
    notes["close_date_confirmed"] =
      `Never given. All ${input.closeDateMoves} close ${input.closeDateMoves === 1 ? "date was" : "dates were"} set by us.`;
  } else if (input.closeDateMoves > 0) {
    notes["close_date_confirmed"] = "The date has moved, but they have never confirmed one.";
  } else {
    notes["close_date_confirmed"] = "Never given. No date has come from them.";
  }

  if (input.amountAgreed && input.silenceDays !== null) {
    notes["confirmed_in_writing"] =
      `${input.silenceDays} days since the verbal yes. No letter, no email, no signature.`;
  } else if (input.amountAgreed) {
    notes["confirmed_in_writing"] = "They agreed verbally. Nothing is in writing.";
  } else {
    notes["confirmed_in_writing"] = "Nothing in writing, and no verbal agreement either.";
  }

  notes["permission_to_share"] = "Not asked. Not blocking the gift.";
  return notes;
}

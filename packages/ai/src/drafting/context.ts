import type { NextActionKind } from "@95forward/shared";

// The context a drafter receives — and the ONLY thing it may use.
//
// Every value arrives pre-formatted as a string. The model never sees cents and never formats
// money, which removes the largest single class of invented detail: a letter to a donor stating an
// amount nobody agreed to. `$250,000 over three years` is composed server-side from the record and
// handed over whole.

export type DraftAudience = "prospect" | "connector" | "internal";

export interface DraftMilestone {
  readonly label: string;
  readonly source: "they_said" | "we_said";
  readonly blocking: boolean;
  readonly confirmed: boolean;
  readonly confirmedBy: string | null;
  readonly confirmedOn: string | null;
  readonly evidence: string | null;
}

export interface DraftPerson {
  readonly name: string;
  readonly role: string | null;
}

export interface DraftContext {
  readonly kind: NextActionKind;
  /** The injected clock's date. Never `new Date()` — the demo is arithmetic about a fixed anchor. */
  readonly today: string;

  readonly prospect: {
    readonly name: string;
    /** individual · organization · foundation. Shapes the salutation and the register. */
    readonly type: string;
    /** Relationship facts ON RECORD. Not research, not inference. */
    readonly facts: readonly string[];
  };

  readonly opportunity: {
    /** `$250,000`, formatted. */
    readonly amount: string;
    /** `over three years`, or null. */
    readonly amountNote: string | null;
    readonly closeDate: string | null;
    readonly stage: string;
    readonly closeDateMoves: number;
    readonly closeDateMovesProspectSourced: boolean;
    readonly silenceDays: number | null;
    readonly lastContact: string | null;
  };

  readonly initiative: {
    readonly name: string;
    readonly story: string | null;
    readonly goal: string | null;
  };

  readonly milestones: readonly DraftMilestone[];

  /** The rule that produced the action, its statement, and the engine's rationale. */
  readonly rule: {
    readonly id: string;
    readonly statement: string;
    readonly rationale: string;
  } | null;

  readonly people: {
    readonly relationshipManager: string | null;
    /** The natural partner — the person who can open the door. Null when nobody is identified. */
    readonly connector: (DraftPerson & { readonly introOfferedOn: string | null }) | null;
    /** Who must approve the ask. */
    readonly leader: string | null;
  };

  /** Recent entries from the event log, already rendered as sentences. */
  readonly recentEvents: readonly string[];
}

/**
 * The context, serialised for the prompt.
 *
 * Deliberately a flat labelled block rather than JSON: it reads as a briefing, and a model handed a
 * briefing writes prose better than one handed a data structure. Absences are stated rather than
 * omitted — "no close date has been agreed with them" is a fact the letter may need, and a missing
 * key is an invitation to assume.
 */
export function renderContext(context: DraftContext): string {
  const lines: string[] = [];
  const add = (label: string, value: string | null | undefined): void => {
    lines.push(`${label}: ${value && value.length > 0 ? value : "not on record"}`);
  };

  lines.push(`TODAY: ${context.today}`);
  lines.push("");
  lines.push("PROSPECT");
  add("  Name", context.prospect.name);
  add("  Type", context.prospect.type);
  if (context.prospect.facts.length === 0) {
    lines.push("  Facts on record: none");
  } else {
    lines.push("  Facts on record:");
    for (const fact of context.prospect.facts) lines.push(`    - ${fact}`);
  }

  lines.push("");
  lines.push("OPPORTUNITY");
  add(
    "  Ask amount",
    context.opportunity.amountNote
      ? `${context.opportunity.amount} ${context.opportunity.amountNote}`
      : context.opportunity.amount,
  );
  add("  Close date", context.opportunity.closeDate);
  add("  Stage", context.opportunity.stage);
  lines.push(
    `  Close date has moved: ${context.opportunity.closeDateMoves} time(s)` +
      (context.opportunity.closeDateMoves > 0
        ? context.opportunity.closeDateMovesProspectSourced
          ? " — at least one at the prospect's request"
          : " — every one of them decided by us, not by them"
        : ""),
  );
  add(
    "  Days since last contact",
    context.opportunity.silenceDays === null ? null : String(context.opportunity.silenceDays),
  );
  add("  Last contact", context.opportunity.lastContact);

  lines.push("");
  lines.push("INITIATIVE");
  add("  Name", context.initiative.name);
  add("  Goal", context.initiative.goal);
  add("  What it funds", context.initiative.story);

  lines.push("");
  lines.push("MILESTONES");
  for (const milestone of context.milestones) {
    const state = milestone.confirmed ? "CONFIRMED" : "not confirmed";
    const who = milestone.confirmed
      ? ` by ${milestone.confirmedBy ?? "unknown"}${milestone.confirmedOn ? ` on ${milestone.confirmedOn}` : ""}`
      : "";
    const evidence = milestone.evidence ? ` — ${milestone.evidence}` : "";
    const tag = milestone.source === "they_said" ? "they said" : "we said";
    lines.push(
      `  - ${milestone.label} [${tag}${milestone.blocking ? ", blocking" : ""}]: ${state}${who}${evidence}`,
    );
  }

  lines.push("");
  lines.push("PEOPLE");
  add("  Relationship manager", context.people.relationshipManager);
  add("  Leader who approves the ask", context.people.leader);
  if (context.people.connector) {
    const { name, role, introOfferedOn } = context.people.connector;
    lines.push(
      `  Connector: ${name}${role ? ` (${role})` : ""}${introOfferedOn ? ` — offered an introduction on ${introOfferedOn}` : " — has never been asked"}`,
    );
  } else {
    lines.push("  Connector: nobody identified");
  }

  if (context.rule) {
    lines.push("");
    lines.push("WHY THIS ACTION IS DUE");
    lines.push(`  Rule: ${context.rule.id} — ${context.rule.statement}`);
    lines.push(`  Reasoning: ${context.rule.rationale}`);
  }

  if (context.recentEvents.length > 0) {
    lines.push("");
    lines.push("RECENT HISTORY");
    for (const event of context.recentEvents) lines.push(`  - ${event}`);
  }

  return lines.join("\n");
}

/** Who each artifact is addressed to. Getting this wrong writes to the wrong human. */
export const DRAFT_AUDIENCE: Record<NextActionKind, DraftAudience> = {
  "follow-up-to-close": "prospect",
  "make-specific-ask": "prospect",
  "get-it-in-writing": "prospect",
  "get-the-visit": "prospect",
  "steward-the-gift": "prospect",
  "prep-the-visit": "internal",
  "get-ask-approved": "internal",
  // NOT prospect emails. These ask a person to open a door, and a letter addressed to the wrong
  // human is the most visible failure this feature can produce in a demo.
  "use-introduction": "connector",
  "ask-partner": "connector",
};

/** Who the artifact is written to, by name, given a context. */
export function draftRecipient(context: DraftContext): string {
  const audience = DRAFT_AUDIENCE[context.kind];
  if (audience === "connector") return context.people.connector?.name ?? "the connector";
  if (audience === "internal") {
    return context.kind === "get-ask-approved"
      ? (context.people.leader ?? "your leader")
      : (context.people.relationshipManager ?? "the team");
  }
  return context.prospect.name;
}

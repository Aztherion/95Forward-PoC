import type { NextActionKind } from "@95forward/shared";
import { draftRecipient, type DraftContext } from "./context";

// Deterministic fixture drafts. No model call, no network — dev, CI and every e2e run.
//
// These are COMPOSED FROM THE CONTEXT rather than stored as static strings, which is the point: a
// fixture assembled from the same briefing the live path gets cannot contain a fact the briefing
// lacks, so the mock path satisfies the grounding tests for the same reason the live one should.
// It also means the demo reads about the record in front of it rather than about Hallworth.
//
// They are written to be USED, not to stand in. A fixture that reads like a placeholder would
// undercut the exact moment this feature exists to create.

function firstName(full: string): string {
  const [first] = full.trim().split(/\s+/);
  return first ?? full;
}

/**
 * Who the letter opens to.
 *
 * For an institution, the person on the record beats the institution's name: "Dear The Hallworth
 * Family Foundation" is how nobody has ever opened a letter. A they-said milestone's `confirmedBy`
 * is a named human who actually spoke to us, which is both the right recipient and grounded — so it
 * is used when present, and the institution's name minus a leading "The" when it is not.
 */
function salutation(context: DraftContext): string {
  const recipient = draftRecipient(context);
  if (recipient !== context.prospect.name || context.prospect.type === "individual") {
    return `Hi ${firstName(recipient)}`;
  }
  const contact = context.milestones.find(
    (m) => m.source === "they_said" && m.confirmed && m.confirmedBy,
  )?.confirmedBy;
  if (contact) return `Dear ${contact}`;
  return `Dear ${context.prospect.name.replace(/^The\s+/i, "")}`;
}

function signOff(context: DraftContext): string {
  return `Best,\n${context.people.relationshipManager ?? "—"}`;
}

function amountPhrase(context: DraftContext): string {
  const { amount, amountNote } = context.opportunity;
  return amountNote ? `${amount} ${amountNote}` : amount;
}

function milestone(context: DraftContext, labelFragment: string) {
  return context.milestones.find((m) =>
    m.label.toLowerCase().includes(labelFragment.toLowerCase()),
  );
}

function email(subject: string, body: string, context: DraftContext): string {
  return `Subject: ${subject}\n\n${salutation(context)},\n\n${body.trim()}\n\n${signOff(context)}`;
}

function followUp(context: DraftContext): string {
  const agreed = milestone(context, "Amount agreed");
  const since =
    context.opportunity.silenceDays === null
      ? "since we last spoke"
      : `since we spoke ${context.opportunity.silenceDays} days ago`;
  const whatWasAgreed = agreed?.confirmed
    ? `When we spoke${agreed.confirmedOn ? ` on ${agreed.confirmedOn}` : ""} you agreed to ${amountPhrase(context)} for ${context.initiative.name}. Nothing has changed at our end.`
    : `We have ${amountPhrase(context)} for ${context.initiative.name} on the table.`;
  const askFor =
    milestone(context, "Close date")?.confirmed === false
      ? "The one thing I still need is a date. When does your board decide?"
      : "Is there anything you need from me to move this forward?";
  return email(
    `${context.initiative.name} — where are we?`,
    `I have not wanted to crowd you, but I do not want this to drift either, so I am checking in ${since}.\n\n${whatWasAgreed}\n\n${askFor}\n\nA one-line reply is plenty.`,
    context,
  );
}

function specificAsk(context: DraftContext): string {
  const what = context.initiative.story
    ? `${context.initiative.story}`
    : `our work on ${context.initiative.name}`;
  return email(
    `An ask for ${context.initiative.name}`,
    `I want to be direct rather than circle the subject.\n\nI would like to ask you for ${amountPhrase(context)} towards ${context.initiative.name}. ${what}\n\nIf that is the wrong number, tell me and I will listen. If it is the right one, the next step is a conversation about timing.\n\nCan we find half an hour?`,
    context,
  );
}

function confirmation(context: DraftContext): string {
  const agreed = milestone(context, "Amount agreed");
  const when = agreed?.confirmedOn ? ` on ${agreed.confirmedOn}` : "";
  const who = agreed?.confirmedBy ? `, with ${agreed.confirmedBy},` : "";
  return email(
    `Confirming ${amountPhrase(context)} for ${context.initiative.name}`,
    `I am putting our conversation${when}${who} in writing, so we both have the same note on file.\n\nAs I understood it: ${amountPhrase(context)} towards ${context.initiative.name}.\n\nIf that matches your understanding, a reply saying so is all I need. If I have any of it wrong, tell me and I will correct the record.`,
    context,
  );
}

function meetingRequest(context: DraftContext): string {
  return email(
    `Half an hour about ${context.initiative.name}?`,
    `I would like to sit down with you properly rather than keep this to email.\n\nI would use the time to walk you through ${context.initiative.name} and, more usefully, to hear what you make of it.\n\nI will work around you — name a week and I will find a time in it.`,
    context,
  );
}

function stewardship(context: DraftContext): string {
  return email(
    `Thank you — ${context.initiative.name}`,
    `I wanted to say thank you properly, now the paperwork is behind us.\n\n${context.initiative.story ?? `Your ${amountPhrase(context)} goes to ${context.initiative.name}.`}\n\nI will keep you posted as it moves. Nothing needed from you.`,
    context,
  );
}

function connectorOutreach(context: DraftContext): string {
  const connector = context.people.connector;
  const offered = connector?.introOfferedOn;
  const opener = offered
    ? `You offered on ${offered} to introduce me to ${context.prospect.name}, and I am finally taking you up on it.`
    : `I am writing to ask a favour, and please say no if it is the wrong one.`;
  const body = offered
    ? `${opener}\n\nWe are raising for ${context.initiative.name}, and ${context.prospect.name} is the kind of funder it was built for. An introduction from you would carry more weight than anything I could send cold.\n\nIf you are still happy to, a short email putting us in touch is all it needs. I will take it from there.`
    : `${opener}\n\nWe are raising for ${context.initiative.name}, and I think ${context.prospect.name} may be a good fit. You know them and I do not, which is why I am asking you rather than writing to them directly.\n\nWould you be willing to introduce us? If it is not the right moment, or not the right relationship to spend, tell me and that is genuinely fine.`;
  return email(`A small favour — an introduction to ${context.prospect.name}`, body, context);
}

function prepBrief(context: DraftContext): string {
  const missing = context.milestones.filter((m) => m.blocking && !m.confirmed);
  const known = context.prospect.facts.length > 0 ? context.prospect.facts : ["Nothing on record."];
  const questions = [
    missing.some((m) => m.label.toLowerCase().includes("close date"))
      ? "What is your decision timetable — when does the board actually decide?"
      : "Has anything changed in your timing since we last spoke?",
    "Who else is in the room when a gift like this is decided?",
    context.initiative.story
      ? `What part of ${context.initiative.name} matters most to you?`
      : "What are you trying to achieve with your giving this year?",
    "What would make this an easy yes — and what would make it a no?",
  ];
  return [
    "WHO WE ARE SEEING",
    `  ${context.prospect.name} (${context.prospect.type})`,
    `  Relationship manager: ${context.people.relationshipManager ?? "unassigned"}`,
    context.people.connector
      ? `  Connector: ${context.people.connector.name}${context.people.connector.role ? ` (${context.people.connector.role})` : ""}`
      : "  Connector: nobody identified",
    "",
    "WHERE THIS STANDS",
    `  ${amountPhrase(context)} towards ${context.initiative.name}, at stage: ${context.opportunity.stage}.`,
    `  Close date: ${context.opportunity.closeDate ?? "never agreed with them"}.`,
    context.opportunity.silenceDays === null
      ? "  No contact has been logged."
      : `  Last contact ${context.opportunity.lastContact ?? "—"} (${context.opportunity.silenceDays} days ago).`,
    "",
    "WHAT WE WANT FROM THE MEETING",
    missing.length > 0
      ? `  ${missing.map((m) => m.label.toLowerCase()).join("; ")} — without these it does not count as a real ask.`
      : "  Keep the relationship warm and confirm the next step.",
    "",
    "DISCOVERY QUESTIONS",
    ...questions.map((q) => `  - ${q}`),
    "",
    "WHAT WE KNOW",
    ...known.map((f) => `  - ${f}`),
    "",
    "THE ASK",
    `  ${amountPhrase(context)}.`,
    "",
    "LIKELY OBJECTIONS",
    "  - Timing. Answer with their calendar, not ours — ask when, do not propose when.",
    "  - Scale. If the number is wrong, ask what the right one is rather than defending it.",
    "",
    "THE NEXT STEP",
    "  Leave with a date in their words, and write down exactly what they said.",
  ].join("\n");
}

function approvalRequest(context: DraftContext): string {
  const forAmount =
    context.prospect.facts[0] ?? "The relationship is on record but thinly evidenced.";
  const against =
    context.opportunity.closeDateMoves > 0 && !context.opportunity.closeDateMovesProspectSourced
      ? `The close date has moved ${context.opportunity.closeDateMoves} times and every move was ours — they have never given us a date.`
      : context.opportunity.silenceDays !== null && context.opportunity.silenceDays > 30
        ? `It has been ${context.opportunity.silenceDays} days since any contact.`
        : "Nothing on record argues strongly against it.";
  return [
    `To: ${context.people.leader ?? "—"}`,
    `From: ${context.people.relationshipManager ?? "—"}`,
    `Re: approval to ask ${context.prospect.name} for ${amountPhrase(context)}`,
    "",
    `I would like your approval to ask ${context.prospect.name} for ${amountPhrase(context)} towards ${context.initiative.name}.`,
    "",
    `WHERE IT STANDS: ${context.opportunity.stage}. ${context.opportunity.closeDate ? `Close date on file is ${context.opportunity.closeDate}.` : "No close date has been agreed with them."}`,
    "",
    `WHAT SUPPORTS THE NUMBER: ${forAmount}`,
    "",
    `WHAT ARGUES AGAINST IT: ${against}`,
    "",
    "What I need from you is a yes, a different number, or a reason to wait.",
  ].join("\n");
}

const FIXTURES: Record<NextActionKind, (context: DraftContext) => string> = {
  "follow-up-to-close": followUp,
  "make-specific-ask": specificAsk,
  "get-it-in-writing": confirmation,
  "get-the-visit": meetingRequest,
  "steward-the-gift": stewardship,
  "use-introduction": connectorOutreach,
  "ask-partner": connectorOutreach,
  "prep-the-visit": prepBrief,
  "get-ask-approved": approvalRequest,
};

/** The deterministic draft for a kind. Same context in, same text out, every time. */
export function fixtureDraft(context: DraftContext): string {
  return FIXTURES[context.kind](context);
}

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronDown, Pin, PinOff, X } from "lucide-react";
import type { NextActionKind, RankedItem } from "@95forward/shared";
import {
  Button,
  Card,
  HealthDot,
  InitiativeChip,
  MonoCaption,
  RuleChip,
  StatusLabel,
} from "@/components/ds";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { decideBoardItemAction, undecideBoardItemAction } from "@/server/actions/board";
import { closeDateLine, prospectTypeLabel, stageLabel } from "./board-copy";

/**
 * What the primary action will produce, named honestly.
 *
 * I28 generates these. Until then the panel says what is coming and shows no draft — a
 * plausible-looking generated email in a screenshot reads as working software, and somebody asks
 * to send one.
 */
const ARTIFACT: Record<NextActionKind, string> = {
  "follow-up-to-close": "a follow-up email",
  "get-ask-approved": "an approval request for your leader",
  "make-specific-ask": "the ask",
  "prep-the-visit": "a visit prep brief",
  "get-it-in-writing": "a confirmation letter",
  "use-introduction": "an introduction request",
  "ask-partner": "a note asking them to open the door",
  // Stage-derived fallbacks (I26). A rule never produces these, but the type is closed and the
  // maps have to be total, so a future rule that does cannot land without a label.
  "get-the-visit": "a request for the meeting",
  "steward-the-gift": "a thank-you and a stewardship note",
};

/**
 * The primary button's label — specific, and NOT the move's own title.
 *
 * `nextAction.label` names the move ("Get the ask approved"); the button names the artifact it
 * produces. Using the label for both put the same sentence on the card twice and made the button
 * look like a restatement rather than a thing that happens. These are SCREENS.md's own strings.
 */
const PRIMARY_CTA: Record<NextActionKind, string> = {
  "follow-up-to-close": "Review drafted follow-up",
  "get-ask-approved": "Send for approval",
  "make-specific-ask": "Draft the ask",
  "prep-the-visit": "Open the prep brief",
  "get-it-in-writing": "Draft the confirmation letter",
  "use-introduction": "Draft the introduction request",
  "ask-partner": "Draft the ask to your partner",
  "get-the-visit": "Draft the meeting request",
  "steward-the-gift": "Draft the thank-you",
};

export interface QueueCardProps {
  item: RankedItem;
  prospectName: string;
  prospectType: string;
  initiativeName: string;
  initiativeColourKey: string | null;
  /** ruleId -> the org's effective statement of it, for the "why it ranks" disclosure. */
  ruleStatements: Readonly<Record<string, string | null>>;
}

export function QueueCard({
  item,
  prospectName,
  prospectType,
  initiativeName,
  initiativeColourKey,
  ruleStatements,
}: QueueCardProps) {
  const [why, setWhy] = useState(false);
  const [draft, setDraft] = useState(false);
  const [decideState, decide, deciding] = useActionState(decideBoardItemAction, {});
  const [undecideState, undecide, undeciding] = useActionState(undecideBoardItemAction, {});

  return (
    <Card
      accent
      health={item.health}
      pad="md"
      className="f95-queue"
      data-testid="queue-card"
      data-opportunity-id={item.opportunityId}
      data-rank={item.rank}
    >
      <div className="f95-queue__rank">
        <span className="f95-queue__num">#{item.rank}</span>
        <StatusLabel status={item.statusLabel} dot={false} />
        {item.pinned ? <span className="f95-queue__pinned">Pinned</span> : null}
      </div>

      <div className="f95-queue__body">
        {/* The hierarchy requirement lives in these two lines: the name and the amount are the
            biggest things on the card, and every verb is deliberately smaller and off to the side.
            If this reads as a task list the screen has failed, however complete it is. */}
        <div className="f95-queue__who">
          <Link
            href={`/95-forward/opportunities/${item.opportunityId}`}
            className="f95-queue__name"
          >
            {prospectName}
          </Link>
          <span className="f95-queue__type f95-muted">{prospectTypeLabel(prospectType)}</span>
        </div>

        <div className="f95-queue__line">
          <span className="f95-queue__amount">{formatCurrencyFromCents(item.amountCents)}</span>
          <InitiativeChip colourKey={initiativeColourKey}>{initiativeName}</InitiativeChip>
          <span className="f95-queue__stage">
            <HealthDot health={item.health} />
            {stageLabel(item.stage)}
          </span>
        </div>

        <div className="f95-queue__move">
          <span className="f95-queue__action-title">{item.nextAction.label}</span>
          <p className="f95-queue__rationale">{item.rationale}</p>
        </div>

        <div className="f95-cluster f95-queue__evidence">
          {/* The identifier only. The catalogue's `statement` is the rule's PROSE — a whole sentence
              of doctrine — and SCREENS.md's `RULE · live-ask-silence > 30d` is a compact threshold
              expression that no ranking rule actually has: their parameters are a per-stage cadence
              table and a multiplier, not one number. Prose in a chip wraps to three lines and stops
              being a chip, so it lives in "Why it ranks here", where prose belongs. */}
          <RuleChip ruleId={item.primaryRuleId} />
          <MonoCaption>{closeDateLine(item, formatDate)}</MonoCaption>
        </div>

        {decideState.error ? (
          <span className="f95-field__err" role="alert">
            {decideState.error}
          </span>
        ) : null}
        {undecideState.error ? (
          <span className="f95-field__err" role="alert">
            {undecideState.error}
          </span>
        ) : null}

        {why ? (
          <div className="f95-queue__why" data-testid="why-panel">
            {/* The no-black-box guarantee applies per card, not only through the rules editor: the
                rank is arithmetic, and the arithmetic is shown. */}
            <div className="f95-eyebrow f95-eyebrow--quiet">Why it ranks here</div>
            <div className="f95-cluster">
              {item.firingRuleIds.map((ruleId) => (
                <RuleChip key={ruleId} ruleId={ruleId} />
              ))}
            </div>
            <ul className="f95-queue__whylist">
              {item.firingRuleIds.map((ruleId) => (
                <li key={ruleId}>
                  <strong>{ruleId}</strong>{" "}
                  <span className="f95-muted">{ruleStatements[ruleId] ?? ""}</span>
                </li>
              ))}
            </ul>
            <MonoCaption tone="strong">
              MOVING THIS CHANGES QUALIFIED ASKS BY {formatCurrencyFromCents(item.impactCents)} ·
              URGENCY ×{item.multiplier.toFixed(2)}
            </MonoCaption>
            <p className="f95-queue__why-note f95-muted">
              Impact is what the metrics service says the number does if this one moves — measured
              against the same snapshot the figures above come from, not assumed. The multiplier is
              the highest of every rule firing here, not their product: two reasons to hurry are one
              reason to hurry.
            </p>
          </div>
        ) : null}

        {draft ? (
          <div className="f95-queue__draft" data-testid="draft-placeholder">
            <div className="f95-eyebrow f95-eyebrow--quiet">Not built yet</div>
            <p className="f95-queue__draft-line">
              This is where your copilot will draft{" "}
              <strong>{ARTIFACT[item.nextAction.kind]}</strong> for {prospectName}, for you to
              review before anything is sent.
            </p>
            <p className="f95-queue__draft-note f95-muted">
              Drafting arrives in I28. Nothing is shown here yet on purpose — a draft that looks
              real but was never generated is worse than no draft.
            </p>
          </div>
        ) : null}
      </div>

      {/* Actions sit BESIDE the name and the amount, not under them. That is what the design shows,
          and it is what keeps the verbs from reading as the point of the card. */}
      <div className="f95-queue__actions">
        <Button
          variant="go"
          size="sm"
          onClick={() => setDraft((open) => !open)}
          aria-expanded={draft}
          data-testid="primary-action"
        >
          {PRIMARY_CTA[item.nextAction.kind]}
        </Button>
        <Button
          href={`/95-forward/opportunities/${item.opportunityId}`}
          variant="secondary"
          size="sm"
        >
          Open opportunity
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWhy((open) => !open)}
          aria-expanded={why}
          data-testid="why-it-ranks"
          iconRight={
            <ChevronDown
              size={14}
              strokeWidth={1.8}
              style={{ transform: why ? "rotate(180deg)" : undefined }}
            />
          }
        >
          Why it ranks here
        </Button>
        <div className="f95-queue__decide">
          <form action={item.pinned ? undecide : decide}>
            <input type="hidden" name="opportunityId" value={item.opportunityId} />
            <input type="hidden" name="kind" value="pin" />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={deciding || undeciding}
              data-testid="pin-button"
              aria-label={item.pinned ? "Unpin this item" : "Pin this item to the top"}
              iconLeft={
                item.pinned ? (
                  <PinOff size={14} strokeWidth={1.8} />
                ) : (
                  <Pin size={14} strokeWidth={1.8} />
                )
              }
            >
              {item.pinned ? "Unpin" : "Pin"}
            </Button>
          </form>
          <form action={decide}>
            <input type="hidden" name="opportunityId" value={item.opportunityId} />
            <input type="hidden" name="kind" value="dismiss" />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={deciding}
              data-testid="dismiss-button"
              aria-label="Dismiss this item from the board"
              iconLeft={<X size={14} strokeWidth={1.8} />}
            >
              Dismiss
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}

"use client";

import { useActionState } from "react";
import { Lightbulb } from "lucide-react";
import type { ProposedRuleRow } from "@95forward/db";
import { Badge, Button, Card, Textarea } from "@/components/ds";
import { proposeRuleAction, type RulesFormState } from "@/server/actions/rules";

const initialState: RulesFormState = {};

/**
 * The escape hatch.
 *
 * This is where an organisation says what it wants that we do not have, and the answer is
 * deliberately "we wrote it down", not "the AI will work it out". A free-text rule engine cannot
 * answer "show me everything this is firing on", which is the one thing the RULE chip promises
 * everywhere else in the product. So a proposal is stored, listed, and clearly marked as not
 * running.
 */
export function ProposedRules({ proposals }: { proposals: readonly ProposedRuleRow[] }) {
  const [state, formAction, pending] = useActionState(proposeRuleAction, initialState);

  return (
    <section className="f95-settings__section" data-testid="rules-proposals">
      <header className="f95-settings__head">
        <div className="f95-page__eyebrow">95 Forward · wishlist</div>
        <h2 className="f95-settings__title">Rules you want that we do not have</h2>
        <p className="f95-settings__sub">
          Write it in your own words. We will read it &mdash; but until somebody implements it, it
          does nothing. Nothing here affects a single number on any screen.
        </p>
      </header>

      <Card pad="lg">
        <form action={formAction} className="f95-stack">
          <Textarea
            name="statement"
            label="What should the system do?"
            rows={3}
            placeholder="Never let a lapsed major donor go two years without a visit."
            error={state.error}
            data-testid="propose-rule-input"
          />
          <div className="f95-settings__actions">
            <Button type="submit" disabled={pending} iconLeft={<Lightbulb size={16} strokeWidth={1.8} />}>
              {pending ? "Saving…" : "Propose this rule"}
            </Button>
          </div>
        </form>

        {proposals.length > 0 ? (
          <ul className="f95-proposals" data-testid="proposed-rules-list">
            {proposals.map((proposal) => (
              <li className="f95-proposals__row" key={proposal.id}>
                <p className="f95-proposals__statement">{proposal.statement}</p>
                <div className="f95-proposals__meta">
                  <Badge tone="neutral" data-testid={`proposal-status-${proposal.id}`}>
                    Not active
                  </Badge>
                  <span>
                    {proposal.proposedByName ?? "Someone"} ·{" "}
                    {proposal.createdAt.toISOString().slice(0, 10)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  );
}

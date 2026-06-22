"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@/components/ds";
import { createAskAction, debriefVisitAction, type FormState } from "@/server/actions/execution";

const initialState: FormState = {};

const OUTCOMES = [
  { value: "commitment", label: "Commitment" },
  { value: "roadmap", label: "Roadmap" },
  { value: "decline", label: "Decline" },
];

export function VisitDebrief({
  visitId,
  prospectId,
  initiatives,
}: {
  visitId: string;
  prospectId: string;
  initiatives: { id: string; name: string }[];
}) {
  const [outcome, setOutcome] = useState<string>("roadmap");
  const [askState, askAction, askPending] = useActionState(createAskAction, initialState);
  const [debriefState, debriefAction, debriefPending] = useActionState(
    debriefVisitAction,
    initialState,
  );

  return (
    <div className="f95-visit__section">
      <div className="f95-visit__section">
        <span className="f95-visit__eyebrow">The outcome</span>
        <div className="f95-visit__outcomes" role="group" aria-label="Visit outcome">
          {OUTCOMES.map((o) => (
            <Button
              key={o.value}
              type="button"
              variant={outcome === o.value ? "primary" : "secondary"}
              onClick={() => setOutcome(o.value)}
              data-testid={`outcome-${o.value}`}
            >
              {o.label}
            </Button>
          ))}
        </div>
        {outcome === "roadmap" ? (
          <span className="f95-deflist__desc--empty">A clear next step is a win — not a no.</span>
        ) : null}
      </div>

      <Card>
        <form action={askAction} className="f95-inline-form" data-testid="visit-ask-form">
          <input type="hidden" name="prospectId" value={prospectId} />
          <input type="hidden" name="visitId" value={visitId} />
          <input type="hidden" name="outcome" value={outcome} />
          <span className="f95-deflist__term">Log the ask</span>
          <Select
            name="fundingInitiativeId"
            label="What it funds"
            options={initiatives.map((i) => ({ value: i.id, label: i.name }))}
            error={askState.fieldErrors?.fundingInitiativeId}
          />
          <Input
            name="amountMinDollars"
            label="Ask amount (USD)"
            type="number"
            optional
            error={askState.fieldErrors?.amountMinCents}
          />
          <label className="f95-check">
            <input type="checkbox" name="numbersOnTable" className="f95-check__box" />
            <span>Numbers were on the table</span>
          </label>
          {outcome === "commitment" ? (
            <Input
              name="commitmentAmountDollars"
              label="Committed amount (USD)"
              type="number"
              error={askState.fieldErrors?.commitmentAmountCents}
            />
          ) : null}
          {outcome === "roadmap" ? (
            <Textarea
              name="roadmapNextSteps"
              label="Roadmap — the next steps"
              error={askState.fieldErrors?.roadmapNextSteps}
            />
          ) : null}
          <Button type="submit" variant="secondary" size="sm" disabled={askPending}>
            {askPending ? "Logging" : askState.ok ? "Ask logged ✓" : "Log the ask"}
          </Button>
        </form>
      </Card>

      <Card>
        <form action={debriefAction} className="f95-inline-form" data-testid="visit-debrief-form">
          <input type="hidden" name="prospectId" value={prospectId} />
          <input type="hidden" name="visitId" value={visitId} />
          <input type="hidden" name="outcome" value={outcome} />
          <span className="f95-deflist__term">Debrief</span>
          <Textarea name="callMemo" label="Call memo" optional />
          <Input name="nextStep" label="The next step" optional />
          <Button type="submit" variant="primary" disabled={debriefPending}>
            {debriefPending ? "Saving" : debriefState.ok ? "Debrief saved ✓" : "Save the debrief"}
          </Button>
        </form>
      </Card>

      {debriefState.ok ? (
        <div className="f95-visit__section" data-testid="visit-finished">
          <span className="f95-deflist__desc--empty">
            The 24-hour follow-up is now live — find it on the prospect and on Today.
          </span>
          <Link href={`/95-forward/prospects/${prospectId}?tab=visits`}>
            <Button variant="go" iconRight={<ArrowRight size={16} strokeWidth={1.8} />}>
              Finish — see the follow-up
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

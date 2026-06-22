"use client";

import { useActionState, useState } from "react";
import { HandCoins } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@/components/ds";
import { createAskAction, type FormState } from "@/server/actions/execution";

const initialState: FormState = {};

const OUTCOMES = [
  { value: "", label: "No outcome yet" },
  { value: "commitment", label: "Commitment" },
  { value: "roadmap", label: "Roadmap" },
  { value: "decline", label: "Decline" },
];

export function LogAskForm({
  prospectId,
  initiatives,
}: {
  prospectId: string;
  initiatives: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [state, formAction, pending] = useActionState(createAskAction, initialState);

  if (state.ok && open) setOpen(false);

  if (!open) {
    return (
      <Button
        variant="primary"
        size="sm"
        iconLeft={<HandCoins size={15} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      >
        Log an ask
      </Button>
    );
  }

  return (
    <Card>
      <form action={formAction} className="f95-inline-form" data-testid="log-ask-form">
        <input type="hidden" name="prospectId" value={prospectId} />
        <Select
          name="fundingInitiativeId"
          label="What it funds"
          options={initiatives.map((i) => ({ value: i.id, label: i.name }))}
          error={state.fieldErrors?.fundingInitiativeId}
        />
        <Input name="amountMinDollars" label="Ask amount (USD)" type="number" optional />
        <Input name="askType" label="Ask type" optional placeholder="e.g. multi-year grant" />
        <label className="f95-check">
          <input type="checkbox" name="numbersOnTable" className="f95-check__box" />
          <span>Numbers were on the table</span>
        </label>
        <Select
          name="outcome"
          label="Outcome"
          options={OUTCOMES}
          value={outcome}
          onChange={(e) => setOutcome(e.currentTarget.value)}
        />
        {outcome === "commitment" ? (
          <Input
            name="commitmentAmountDollars"
            label="Committed amount (USD)"
            type="number"
            error={state.fieldErrors?.commitmentAmountCents}
          />
        ) : null}
        {outcome === "roadmap" ? (
          <Textarea
            name="roadmapNextSteps"
            label="Roadmap next steps"
            error={state.fieldErrors?.roadmapNextSteps}
          />
        ) : null}
        <div className="f95-cluster">
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? "Logging" : "Log the ask"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

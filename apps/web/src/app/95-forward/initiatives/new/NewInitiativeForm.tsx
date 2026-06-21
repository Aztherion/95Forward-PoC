"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, FormRow, Input, Select, Textarea } from "@/components/ds";
import { createInitiativeAction, type FormState } from "@/server/actions/initiatives";

const initialState: FormState = {};

const FRAME_OPTIONS = [
  { value: "today", label: "Today — reach everyone now" },
  { value: "tomorrow", label: "Tomorrow — multi-year scale-up" },
  { value: "forever", label: "Forever — sustainability & legacy" },
];

export function NewInitiativeForm() {
  const [state, formAction, pending] = useActionState(createInitiativeAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="f95-stack" data-testid="new-initiative-form">
      <FormRow columns={2}>
        <Input name="name" label="Name" error={errors.name} required />
        <Select name="frame" label="Frame" options={FRAME_OPTIONS} error={errors.frame} />
      </FormRow>
      <Textarea
        name="story"
        label="The story"
        optional
        hint="The case for support — the copilot can draft this later."
        error={errors.story}
      />
      <FormRow columns={3}>
        <Input
          name="goalAmountDollars"
          label="Goal (USD)"
          type="number"
          optional
          error={errors.goalAmountCents}
        />
        <Input
          name="timelineStart"
          label="Start"
          type="date"
          optional
          error={errors.timelineStart}
        />
        <Input name="timelineEnd" label="End" type="date" optional error={errors.timelineEnd} />
      </FormRow>
      {state.error ? <p className="f95-field__err">{state.error}</p> : null}
      <div className="f95-cluster">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving" : "Add initiative"}
        </Button>
        <Link href="/95-forward/initiatives">
          <Button variant="ghost" type="button">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ds";
import { createVisitPlanAction, type FormState } from "@/server/actions/strategize";

const initialState: FormState = {};

export function VisitPlanForm({ prospectId }: { prospectId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createVisitPlanAction, initialState);

  if (state.ok && open) setOpen(false);

  if (!open) {
    return (
      <Button
        variant="primary"
        size="sm"
        iconLeft={<CalendarPlus size={15} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      >
        Plan a visit
      </Button>
    );
  }

  return (
    <form action={formAction} className="f95-inline-form" data-testid="visit-plan-form">
      <input type="hidden" name="prospectId" value={prospectId} />
      <Textarea
        name="goal"
        label="Goal of the visit"
        placeholder="What does a good outcome look like?"
        error={state.fieldErrors?.goal}
      />
      <Textarea
        name="discoveryQuestions"
        label="Discovery questions"
        optional
        placeholder="What do you most want to learn?"
        error={state.fieldErrors?.discoveryQuestions}
      />
      <Input
        name="team"
        label="Who's going"
        optional
        placeholder="e.g. Dana Reese; Ruth Castellanos"
      />
      <Input
        name="locationType"
        label="Where / how"
        optional
        placeholder="e.g. In person — foundation office"
      />
      <div className="f95-cluster">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Saving" : "Save the plan"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

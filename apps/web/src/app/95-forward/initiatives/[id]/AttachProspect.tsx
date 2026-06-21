"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, Select } from "@/components/ds";
import { attachProspectAction, type FormState } from "@/server/actions/initiatives";

const initialState: FormState = {};

export function AttachProspect({
  fundingInitiativeId,
  options,
}: {
  fundingInitiativeId: string;
  options: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(attachProspectAction, initialState);

  if (state.ok && open) setOpen(false);

  if (!open) {
    return (
      <Button
        variant="primary"
        size="sm"
        iconLeft={<Plus size={15} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      >
        Cultivate a prospect
      </Button>
    );
  }

  return (
    <Card>
      <form action={formAction} className="f95-inline-form" data-testid="attach-prospect-form">
        <input type="hidden" name="fundingInitiativeId" value={fundingInitiativeId} />
        <Select
          name="prospectId"
          label="Prospect"
          options={options.map((o) => ({ value: o.id, label: o.name }))}
          placeholder="Choose a prospect to cultivate toward this initiative"
          error={state.fieldErrors?.prospectId}
        />
        <div className="f95-cluster">
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? "Adding" : "Add to the pipeline"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

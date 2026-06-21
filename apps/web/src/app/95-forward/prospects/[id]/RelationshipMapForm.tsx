"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button, Input } from "@/components/ds";
import { addRelationshipMapEntryAction, type FormState } from "@/server/actions/strategize";

const initialState: FormState = {};

export function RelationshipMapForm({ prospectId }: { prospectId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addRelationshipMapEntryAction, initialState);

  if (state.ok && open) setOpen(false);

  if (!open) {
    return (
      <Button
        variant="primary"
        size="sm"
        iconLeft={<UserPlus size={15} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      >
        Add a decision-maker
      </Button>
    );
  }

  return (
    <form action={formAction} className="f95-inline-form" data-testid="kdm-form">
      <input type="hidden" name="prospectId" value={prospectId} />
      <Input name="name" label="Name" error={state.fieldErrors?.name} />
      <Input name="role" label="Role" optional placeholder="e.g. Trustee, Program officer" />
      <Input
        name="decisionPower"
        label="Decision power"
        optional
        placeholder="e.g. High — chairs the grants committee"
      />
      <Input name="warmPathNote" label="Warm path" optional placeholder="How do we reach them?" />
      <Input name="source" label="Source" optional placeholder="e.g. Board minutes" />
      <div className="f95-cluster">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Saving" : "Add to the map"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

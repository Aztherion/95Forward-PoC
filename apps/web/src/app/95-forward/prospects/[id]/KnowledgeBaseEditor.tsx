"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ds";
import {
  updateKnowledgeBaseAction,
  addResearchGapAction,
  type FormState,
} from "@/server/actions/strategize";

const initialState: FormState = {};

export function KnowledgeFieldEditor({
  prospectId,
  field,
  label,
  value,
}: {
  prospectId: string;
  field: string;
  label: string;
  value: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateKnowledgeBaseAction, initialState);

  if (state.ok && open) setOpen(false);

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        iconLeft={<Pencil size={14} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      >
        {value ? "Edit" : "Add what you know"}
      </Button>
    );
  }

  return (
    <form action={formAction} className="f95-inline-form" data-testid="kb-field-form">
      <input type="hidden" name="prospectId" value={prospectId} />
      <input type="hidden" name="field" value={field} />
      <Textarea
        name="value"
        label={label}
        defaultValue={value ?? ""}
        optional
        error={state.fieldErrors?.value}
      />
      <Input name="source" label="Source" optional placeholder="e.g. IRS 990-PF · 2024" />
      <div className="f95-cluster">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddResearchGap({ prospectId }: { prospectId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addResearchGapAction, initialState);

  if (state.ok && open) setOpen(false);

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Add something worth researching
      </Button>
    );
  }

  return (
    <form action={formAction} className="f95-inline-form" data-testid="add-gap-form">
      <input type="hidden" name="prospectId" value={prospectId} />
      <Input
        name="label"
        label="Worth researching"
        placeholder="e.g. Wealth screen on the trustees"
        error={state.fieldErrors?.label}
      />
      <div className="f95-cluster">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Adding" : "Add the invitation"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

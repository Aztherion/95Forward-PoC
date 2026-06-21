"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Textarea } from "@/components/ds";
import { updateStrategyAction, type FormState } from "@/server/actions/strategize";

const initialState: FormState = {};

export function StrategyFieldEditor({
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
  const [state, formAction, pending] = useActionState(updateStrategyAction, initialState);

  if (state.ok && open) setOpen(false);

  return (
    <div className="f95-stack f95-stack--sm" data-testid={`strategy-${field}`}>
      <div className="f95-cluster">
        <span className="f95-deflist__term">{label}</span>
        <span className="f95-recordbar__spacer" />
        {!open ? (
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Pencil size={14} strokeWidth={1.8} />}
            onClick={() => setOpen(true)}
          >
            {value ? "Edit" : "Draft it"}
          </Button>
        ) : null}
      </div>

      {open ? (
        <form action={formAction} className="f95-inline-form">
          <input type="hidden" name="prospectId" value={prospectId} />
          <input type="hidden" name="field" value={field} />
          <Textarea
            name="value"
            defaultValue={value ?? ""}
            optional
            error={state.fieldErrors?.value}
          />
          <div className="f95-cluster">
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Saving" : "Save"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : value ? (
        <p className="f95-deflist__desc">{value}</p>
      ) : (
        <p className="f95-deflist__desc--empty">
          Not yet drafted — you or the copilot can start it.
        </p>
      )}
    </div>
  );
}

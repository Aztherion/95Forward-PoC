"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, FormRow, Select } from "@/components/ds";
import { markVolunteerAction, type FormState } from "@/server/actions/volunteers";

export interface MarkVolunteerFormProps {
  constituents: { id: string; name: string }[];
}

const initialState: FormState = {};

export function MarkVolunteerForm({ constituents }: MarkVolunteerFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(markVolunteerAction, initialState);
  const errors = state.fieldErrors ?? {};

  const options = constituents.map((c) => ({ value: c.id, label: c.name }));

  if (state.ok && open) {
    setOpen(false);
  }

  return (
    <div className="f95-stack">
      <div className="f95-cluster">
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
        >
          Mark a constituent as a volunteer
        </Button>
      </div>

      {open ? (
        <Card>
          <form action={formAction} className="f95-inline-form">
            <FormRow columns={2}>
              <Select
                name="constituentId"
                label="Constituent"
                placeholder="Select a constituent"
                options={options}
                error={errors.constituentId}
              />
            </FormRow>
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Saving" : "Mark as volunteer"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

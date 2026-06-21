"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, FormRow, Input, Select } from "@/components/ds";
import { logHoursAction, type FormState } from "@/server/actions/volunteers";

export interface LogHoursFormProps {
  opportunityId: string;
  constituents: { id: string; name: string }[];
}

const initialState: FormState = {};

export function LogHoursForm({ opportunityId, constituents }: LogHoursFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(logHoursAction, initialState);
  const errors = state.fieldErrors ?? {};

  const options = constituents.map((c) => ({ value: c.id, label: c.name }));

  if (state.ok && open) {
    setOpen(false);
  }

  return (
    <div className="f95-stack">
      <div className="f95-cluster">
        <h2 className="f95-section-title">Logged hours</h2>
        <span className="f95-recordbar__spacer" />
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
        >
          Log hours
        </Button>
      </div>

      {open ? (
        <Card>
          <form action={formAction} className="f95-inline-form">
            <input type="hidden" name="opportunityId" value={opportunityId} />
            <FormRow columns={3}>
              <Select
                name="constituentId"
                label="Volunteer"
                placeholder="Select a volunteer"
                options={options}
                error={errors.constituentId}
              />
              <Input
                name="hours"
                label="Hours"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                error={errors.hours}
                required
              />
              <Input
                name="loggedDate"
                label="Date"
                type="date"
                error={errors.loggedDate}
                required
              />
            </FormRow>
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Saving" : "Log hours"}
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

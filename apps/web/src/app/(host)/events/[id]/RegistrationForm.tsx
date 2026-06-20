"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { REGISTRATION_STATUSES } from "@95forward/shared";
import { Button, Card, FormRow, Input, Select } from "@/components/ds";
import { createRegistrationAction, type FormState } from "@/server/actions/registrations";
import { titleCaseFromSnake } from "@/lib/format";

export interface RegistrationFormProps {
  eventId: string;
  constituents: { id: string; name: string }[];
}

const initialState: FormState = {};

export function RegistrationForm({ eventId, constituents }: RegistrationFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createRegistrationAction, initialState);
  const errors = state.fieldErrors ?? {};

  const constituentOptions = constituents.map((c) => ({ value: c.id, label: c.name }));
  const statusOptions = REGISTRATION_STATUSES.map((status) => ({
    value: status,
    label: titleCaseFromSnake(status),
  }));

  if (state.ok && open) {
    setOpen(false);
  }

  return (
    <div className="f95-stack">
      <div className="f95-cluster">
        <h2 className="f95-section-title">Registrations</h2>
        <span className="f95-recordbar__spacer" />
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
        >
          Add registration
        </Button>
      </div>

      {open ? (
        <Card>
          <form action={formAction} className="f95-inline-form">
            <input type="hidden" name="eventId" value={eventId} />
            <FormRow columns={2}>
              <Select
                name="constituentId"
                label="Constituent"
                placeholder="Select a constituent"
                options={constituentOptions}
                error={errors.constituentId}
              />
              <Select
                name="status"
                label="Status"
                options={statusOptions}
                defaultValue="registered"
                error={errors.status}
              />
            </FormRow>
            <FormRow columns={2}>
              <Input
                name="guestCount"
                label="Guests"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue="0"
                error={errors.guestCount}
              />
              <Input
                name="fee"
                label="Fee (USD)"
                type="text"
                inputMode="decimal"
                optional
                placeholder="0.00"
                error={errors.feeAmountCents}
              />
            </FormRow>
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Saving" : "Add registration"}
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

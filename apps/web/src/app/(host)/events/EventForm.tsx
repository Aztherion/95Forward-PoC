"use client";

import { useActionState } from "react";
import Link from "next/link";
import { EVENT_TYPES } from "@95forward/shared";
import { Button, Card, FieldGroup, FormRow, Input, Select, Textarea } from "@/components/ds";
import type { FormState } from "@/server/actions/events";
import { titleCaseFromSnake } from "@/lib/format";

export interface EventFormInitial {
  id?: string;
  name?: string;
  eventType?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  capacity?: string;
  goalAmount?: string;
  description?: string;
}

export interface EventFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: EventFormInitial;
  submitLabel: string;
  cancelHref: string;
}

const initialState: FormState = {};

export function EventForm({ action, initial, submitLabel, cancelHref }: EventFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  const typeOptions = EVENT_TYPES.map((type) => ({
    value: type,
    label: titleCaseFromSnake(type),
  }));

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend="Event">
          <FormRow columns={2}>
            <Input
              name="name"
              label="Name"
              defaultValue={initial?.name ?? ""}
              error={errors.name}
              required
            />
            <Select
              name="eventType"
              label="Type"
              options={typeOptions}
              defaultValue={initial?.eventType ?? "other"}
              error={errors.eventType}
            />
          </FormRow>
          <FormRow columns={2}>
            <Input
              name="startsAt"
              label="Starts"
              type="date"
              defaultValue={initial?.startsAt ?? ""}
              error={errors.startsAt}
              required
            />
            <Input
              name="endsAt"
              label="Ends"
              type="date"
              optional
              defaultValue={initial?.endsAt ?? ""}
              error={errors.endsAt}
            />
          </FormRow>
          <FormRow columns={1}>
            <Input
              name="location"
              label="Location"
              optional
              placeholder="Where it happens"
              defaultValue={initial?.location ?? ""}
              error={errors.location}
            />
          </FormRow>
        </FieldGroup>
      </Card>

      <Card>
        <FieldGroup legend="Planning">
          <FormRow columns={2}>
            <Input
              name="capacity"
              label="Capacity"
              type="number"
              inputMode="numeric"
              min={1}
              optional
              placeholder="Seats available"
              defaultValue={initial?.capacity ?? ""}
              error={errors.capacity}
            />
            <Input
              name="goalAmount"
              label="Fundraising goal (USD)"
              type="text"
              inputMode="decimal"
              optional
              placeholder="0.00"
              defaultValue={initial?.goalAmount ?? ""}
              error={errors.goalAmountCents}
            />
          </FormRow>
          <Textarea
            name="description"
            label="Description"
            optional
            placeholder="What this event is about"
            defaultValue={initial?.description ?? ""}
            error={errors.description}
          />
        </FieldGroup>
      </Card>

      {state.error ? <span className="f95-field__err">{state.error}</span> : null}

      <div className="f95-cluster">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving" : submitLabel}
        </Button>
        <Link href={cancelHref}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </form>
  );
}

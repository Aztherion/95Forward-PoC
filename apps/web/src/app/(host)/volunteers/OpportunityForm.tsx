"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, FieldGroup, FormRow, Input, Textarea } from "@/components/ds";
import type { FormState } from "@/server/actions/volunteers";

export interface OpportunityFormInitial {
  id?: string;
  name?: string;
  startsAt?: string;
  location?: string;
  capacity?: string;
  description?: string;
}

export interface OpportunityFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: OpportunityFormInitial;
  submitLabel: string;
  cancelHref: string;
}

const initialState: FormState = {};

export function OpportunityForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: OpportunityFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend="Opportunity">
          <FormRow columns={1}>
            <Input
              name="name"
              label="Name"
              defaultValue={initial?.name ?? ""}
              error={errors.name}
              required
            />
          </FormRow>
          <FormRow columns={2}>
            <Input
              name="startsAt"
              label="Date"
              type="date"
              optional
              defaultValue={initial?.startsAt ?? ""}
              error={errors.startsAt}
            />
            <Input
              name="capacity"
              label="Capacity"
              type="number"
              inputMode="numeric"
              min={1}
              optional
              placeholder="Volunteers needed"
              defaultValue={initial?.capacity ?? ""}
              error={errors.capacity}
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
          <Textarea
            name="description"
            label="Description"
            optional
            placeholder="What volunteers will do"
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

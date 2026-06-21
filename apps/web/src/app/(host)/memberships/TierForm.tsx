"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, FieldGroup, FormRow, Input, Textarea } from "@/components/ds";
import type { FormState } from "@/server/actions/memberships";

export interface TierFormInitial {
  name?: string;
  level?: string;
  dues?: string;
  benefits?: string;
}

export interface TierFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: TierFormInitial;
  submitLabel: string;
  cancelHref: string;
}

const initialState: FormState = {};

export function TierForm({ action, initial, submitLabel, cancelHref }: TierFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend="Tier">
          <FormRow columns={2}>
            <Input
              name="name"
              label="Name"
              placeholder="Friend, Sustainer, Champion…"
              defaultValue={initial?.name ?? ""}
              error={errors.name}
              required
            />
            <Input
              name="level"
              label="Level"
              type="number"
              inputMode="numeric"
              min={0}
              optional
              placeholder="Higher means more giving"
              defaultValue={initial?.level ?? ""}
              error={errors.level}
            />
          </FormRow>
          <FormRow columns={1}>
            <Input
              name="dues"
              label="Annual dues (USD)"
              type="text"
              inputMode="decimal"
              optional
              placeholder="0.00"
              defaultValue={initial?.dues ?? ""}
              error={errors.amountCents}
            />
          </FormRow>
          <Textarea
            name="benefits"
            label="Benefits"
            optional
            placeholder="What members at this tier receive"
            defaultValue={initial?.benefits ?? ""}
            error={errors.benefits}
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

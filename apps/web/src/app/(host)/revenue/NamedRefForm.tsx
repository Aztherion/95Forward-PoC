"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, FieldGroup, FormRow, Input } from "@/components/ds";
import type { FormState } from "@/server/actions/revenue-config";

export interface NamedRefFormInitial {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
}

export interface NamedRefFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: NamedRefFormInitial;
  submitLabel: string;
  cancelHref: string;
  legend: string;
}

const initialState: FormState = {};

export function NamedRefForm({
  action,
  initial,
  submitLabel,
  cancelHref,
  legend,
}: NamedRefFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend={legend}>
          <FormRow columns={2}>
            <Input
              name="name"
              label="Name"
              defaultValue={initial?.name ?? ""}
              error={errors.name}
              required
            />
            <Input
              name="code"
              label="Code"
              optional
              defaultValue={initial?.code ?? ""}
              error={errors.code}
            />
          </FormRow>
          <FormRow columns={2}>
            <Input
              name="startDate"
              label="Start date"
              type="date"
              optional
              defaultValue={initial?.startDate ?? ""}
              error={errors.startDate}
            />
            <Input
              name="endDate"
              label="End date"
              type="date"
              optional
              defaultValue={initial?.endDate ?? ""}
              error={errors.endDate}
            />
          </FormRow>
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

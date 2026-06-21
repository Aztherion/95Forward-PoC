"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, FormRow, Select } from "@/components/ds";
import { createProspectAction } from "@/server/actions/prospect-create";
import type { FormState } from "@/server/actions/prospects";

interface Ref {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "research", label: "Research stage" },
  { value: "cultivation", label: "Cultivating" },
  { value: "solicitation", label: "Solicitation" },
  { value: "stewardship", label: "Stewardship" },
  { value: "active", label: "Active" },
];

const initialState: FormState = {};

export function NewProspectForm({
  constituents,
  rmUsers,
}: {
  constituents: Ref[];
  rmUsers: Ref[];
}) {
  const [state, formAction, pending] = useActionState(createProspectAction, initialState);
  const errors = state.fieldErrors ?? {};

  const constituentOptions = constituents.map((ref) => ({ value: ref.id, label: ref.name }));
  const rmOptions = rmUsers.map((ref) => ({ value: ref.id, label: ref.name }));

  return (
    <Card>
      <form action={formAction} className="f95-inline-form">
        <Select
          name="constituentId"
          label="Constituent"
          placeholder="Pick someone to track"
          options={constituentOptions}
          error={errors.constituentId}
        />
        <FormRow columns={2}>
          <Select
            name="rmUserId"
            label="Relationship manager"
            placeholder="No manager yet"
            options={rmOptions}
            error={errors.rmUserId}
          />
          <Select
            name="status"
            label="Stage"
            defaultValue="research"
            options={STATUS_OPTIONS}
            error={errors.status}
          />
        </FormRow>
        {state.error ? <p className="f95-field__err">{state.error}</p> : null}
        <div className="f95-cluster">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Adding" : "Add to the list"}
          </Button>
          <Link href="/95-forward/prospects">
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}

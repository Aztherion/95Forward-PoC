"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  CONSTITUENT_PROSPECT_STATUSES,
  CONSTITUENT_TYPES,
  type ConstituentInput,
} from "@95forward/shared";
import { Button, Card, Checkbox, FieldGroup, FormRow, Input, Select } from "@/components/ds";
import type { FormState } from "@/server/actions/constituents";
import { titleCaseFromSnake } from "@/lib/format";

export interface ConstituentFormValues extends Partial<ConstituentInput> {
  id?: string;
}

export interface ConstituentFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  users: { id: string; name: string }[];
  initial?: ConstituentFormValues;
  submitLabel: string;
}

const initialState: FormState = {};

export function ConstituentForm({ action, users, initial, submitLabel }: ConstituentFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  const typeOptions = CONSTITUENT_TYPES.map((type) => ({
    value: type,
    label: titleCaseFromSnake(type),
  }));
  const statusOptions = CONSTITUENT_PROSPECT_STATUSES.map((status) => ({
    value: status,
    label: titleCaseFromSnake(status),
  }));
  const userOptions = users.map((user) => ({ value: user.id, label: user.name }));

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend="Identity">
          <FormRow columns={2}>
            <Select
              name="type"
              label="Type"
              options={typeOptions}
              defaultValue={initial?.type ?? "individual"}
              error={errors.type}
            />
            <Input
              name="displayName"
              label="Display name"
              defaultValue={initial?.displayName ?? ""}
              error={errors.displayName}
              required
            />
          </FormRow>
          <FormRow columns={3}>
            <Input
              name="firstName"
              label="First name"
              optional
              defaultValue={initial?.firstName ?? ""}
              error={errors.firstName}
            />
            <Input
              name="lastName"
              label="Last name"
              optional
              defaultValue={initial?.lastName ?? ""}
              error={errors.lastName}
            />
            <Input
              name="organizationName"
              label="Organization name"
              optional
              defaultValue={initial?.organizationName ?? ""}
              error={errors.organizationName}
            />
          </FormRow>
        </FieldGroup>
      </Card>

      <Card>
        <FieldGroup legend="Contact">
          <FormRow columns={2}>
            <Input
              name="email"
              label="Email"
              type="email"
              optional
              defaultValue={initial?.email ?? ""}
              error={errors.email}
            />
            <Input
              name="phone"
              label="Phone"
              optional
              defaultValue={initial?.phone ?? ""}
              error={errors.phone}
            />
          </FormRow>
          <FormRow columns={2}>
            <Input
              name="addressLine1"
              label="Address line 1"
              optional
              defaultValue={initial?.addressLine1 ?? ""}
              error={errors.addressLine1}
            />
            <Input
              name="addressLine2"
              label="Address line 2"
              optional
              defaultValue={initial?.addressLine2 ?? ""}
              error={errors.addressLine2}
            />
          </FormRow>
          <FormRow columns={3}>
            <Input
              name="city"
              label="City"
              optional
              defaultValue={initial?.city ?? ""}
              error={errors.city}
            />
            <Input
              name="region"
              label="Region"
              optional
              defaultValue={initial?.region ?? ""}
              error={errors.region}
            />
            <Input
              name="postalCode"
              label="Postal code"
              optional
              defaultValue={initial?.postalCode ?? ""}
              error={errors.postalCode}
            />
          </FormRow>
          <FormRow columns={3}>
            <Input
              name="country"
              label="Country"
              optional
              defaultValue={initial?.country ?? ""}
              error={errors.country}
            />
          </FormRow>
        </FieldGroup>
      </Card>

      <Card>
        <FieldGroup legend="Relationship">
          <FormRow columns={2}>
            <Select
              name="prospectStatus"
              label="Prospect status"
              options={statusOptions}
              defaultValue={initial?.prospectStatus ?? "none"}
              error={errors.prospectStatus}
            />
            <Select
              name="assignedUserId"
              label="Assigned to"
              placeholder="Unassigned"
              options={userOptions}
              defaultValue={initial?.assignedUserId ?? ""}
              error={errors.assignedUserId}
            />
          </FormRow>
          <div className="f95-cluster" style={{ gap: "var(--space-5)" }}>
            <Checkbox
              name="boardMember"
              label="Board member"
              defaultChecked={initial?.boardMember}
            />
            <Checkbox name="volunteer" label="Volunteer" defaultChecked={initial?.volunteer} />
            <Checkbox
              name="wavemakerMonthly"
              label="Wavemaker (monthly)"
              defaultChecked={initial?.wavemakerMonthly}
            />
            <Checkbox name="legacy" label="Legacy" defaultChecked={initial?.legacy} />
          </div>
        </FieldGroup>
      </Card>

      {state.error ? <span className="f95-field__err">{state.error}</span> : null}

      <div className="f95-cluster">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving" : submitLabel}
        </Button>
        <Link href={initial?.id ? `/constituents/${initial.id}` : "/constituents"}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </form>
  );
}

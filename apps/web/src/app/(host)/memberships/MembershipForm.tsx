"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, FieldGroup, FormRow, Input, Select } from "@/components/ds";
import type { SelectOption } from "@/components/ds";
import type { FormState } from "@/server/actions/memberships";
import { MEMBERSHIP_STATUS_OPTIONS } from "@/lib/membership-params";

export interface MembershipFormInitial {
  constituentId?: string;
  tierId?: string;
  status?: string;
  startDate?: string;
  renewalDate?: string;
}

export interface MembershipFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  constituents: SelectOption[];
  tiers: SelectOption[];
  initial?: MembershipFormInitial;
  submitLabel: string;
  cancelHref: string;
}

const initialState: FormState = {};

export function MembershipForm({
  action,
  constituents,
  tiers,
  initial,
  submitLabel,
  cancelHref,
}: MembershipFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend="Membership">
          <FormRow columns={2}>
            <Select
              name="constituentId"
              label="Constituent"
              placeholder="Choose a constituent"
              options={constituents}
              defaultValue={initial?.constituentId ?? ""}
              error={errors.constituentId}
            />
            <Select
              name="tierId"
              label="Tier"
              placeholder="Choose a tier"
              options={tiers}
              defaultValue={initial?.tierId ?? ""}
              error={errors.tierId}
            />
          </FormRow>
          <FormRow columns={3}>
            <Select
              name="status"
              label="Status"
              options={MEMBERSHIP_STATUS_OPTIONS}
              defaultValue={initial?.status ?? "active"}
              error={errors.status}
            />
            <Input
              name="startDate"
              label="Start date"
              type="date"
              optional
              defaultValue={initial?.startDate ?? ""}
              error={errors.startDate}
            />
            <Input
              name="renewalDate"
              label="Renewal date"
              type="date"
              optional
              defaultValue={initial?.renewalDate ?? ""}
              error={errors.renewalDate}
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

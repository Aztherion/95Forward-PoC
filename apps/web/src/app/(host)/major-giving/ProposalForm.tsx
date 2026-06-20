"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PROPOSAL_STATUSES } from "@95forward/shared";
import { Button, Card, FieldGroup, FormRow, Input, Select, Textarea } from "@/components/ds";
import type { FormState } from "@/server/actions/proposals";
import { titleCaseFromSnake } from "@/lib/format";

export interface ProposalFormInitial {
  id?: string;
  constituentId?: string;
  purpose?: string;
  amount?: string;
  status?: string;
  deadline?: string;
}

export interface ProposalFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  constituents: { id: string; name: string }[];
  initial?: ProposalFormInitial;
  submitLabel: string;
  cancelHref: string;
  lockConstituent?: boolean;
}

const initialState: FormState = {};

export function ProposalForm({
  action,
  constituents,
  initial,
  submitLabel,
  cancelHref,
  lockConstituent = false,
}: ProposalFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  const constituentOptions = constituents.map((c) => ({ value: c.id, label: c.name }));
  const statusOptions = PROPOSAL_STATUSES.map((status) => ({
    value: status,
    label: titleCaseFromSnake(status),
  }));

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend="Proposal">
          <FormRow columns={2}>
            {lockConstituent && initial?.constituentId ? (
              <>
                <input type="hidden" name="constituentId" value={initial.constituentId} />
                <Select
                  label="Constituent"
                  options={constituentOptions}
                  defaultValue={initial.constituentId}
                  disabled
                />
              </>
            ) : (
              <Select
                name="constituentId"
                label="Constituent"
                placeholder="Select a constituent"
                options={constituentOptions}
                defaultValue={initial?.constituentId ?? ""}
                error={errors.constituentId}
              />
            )}
            <Select
              name="status"
              label="Status"
              options={statusOptions}
              defaultValue={initial?.status ?? "draft"}
              error={errors.status}
            />
          </FormRow>
          <FormRow columns={2}>
            <Input
              name="amount"
              label="Amount (USD)"
              optional
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={initial?.amount ?? ""}
              error={errors.amountCents}
            />
            <Input
              name="deadline"
              label="Deadline"
              optional
              type="date"
              defaultValue={initial?.deadline ?? ""}
              error={errors.deadline}
            />
          </FormRow>
          <Textarea
            name="purpose"
            label="Purpose"
            optional
            placeholder="What this proposal funds"
            defaultValue={initial?.purpose ?? ""}
            error={errors.purpose}
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

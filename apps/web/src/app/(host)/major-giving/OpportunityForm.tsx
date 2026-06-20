"use client";

import { useActionState } from "react";
import Link from "next/link";
import { OPPORTUNITY_STAGES } from "@95forward/shared";
import { Button, Card, FieldGroup, FormRow, Input, Select } from "@/components/ds";
import type { FormState } from "@/server/actions/opportunities";
import { titleCaseFromSnake } from "@/lib/format";

export interface OpportunityFormInitial {
  id?: string;
  constituentId?: string;
  stage?: string;
  askAmount?: string;
  expectedAmount?: string;
  expectedCloseDate?: string;
  likelihoodPct?: string;
  ownerUserId?: string;
}

export interface OpportunityFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  constituents: { id: string; name: string }[];
  owners: { id: string; name: string }[];
  initial?: OpportunityFormInitial;
  submitLabel: string;
  cancelHref: string;
  lockConstituent?: boolean;
}

const initialState: FormState = {};

export function OpportunityForm({
  action,
  constituents,
  owners,
  initial,
  submitLabel,
  cancelHref,
  lockConstituent = false,
}: OpportunityFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  const constituentOptions = constituents.map((c) => ({ value: c.id, label: c.name }));
  const ownerOptions = owners.map((o) => ({ value: o.id, label: o.name }));
  const stageOptions = OPPORTUNITY_STAGES.map((stage) => ({
    value: stage,
    label: titleCaseFromSnake(stage),
  }));

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend="Opportunity">
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
              name="stage"
              label="Stage"
              options={stageOptions}
              defaultValue={initial?.stage ?? "identification"}
              error={errors.stage}
            />
          </FormRow>
          <FormRow columns={2}>
            <Input
              name="askAmount"
              label="Ask amount (USD)"
              optional
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={initial?.askAmount ?? ""}
              error={errors.askAmountCents}
            />
            <Input
              name="expectedAmount"
              label="Expected amount (USD)"
              optional
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={initial?.expectedAmount ?? ""}
              error={errors.expectedAmountCents}
            />
          </FormRow>
          <FormRow columns={3}>
            <Input
              name="expectedCloseDate"
              label="Expected close date"
              optional
              type="date"
              defaultValue={initial?.expectedCloseDate ?? ""}
              error={errors.expectedCloseDate}
            />
            {/* PoC seam: the host CRM's opaque "AI" likelihood is hand-entered here so it
                can be seeded/edited; production would ML-populate it and make it read-only.
                It must stay a bare, unexplained number — the black-box foil 95 Forward upstages. */}
            <Input
              name="likelihoodPct"
              label="Likelihood %"
              optional
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              defaultValue={initial?.likelihoodPct ?? ""}
              error={errors.likelihoodPct}
            />
            <Select
              name="ownerUserId"
              label="Owner"
              placeholder="Unassigned"
              options={ownerOptions}
              defaultValue={initial?.ownerUserId ?? ""}
              error={errors.ownerUserId}
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

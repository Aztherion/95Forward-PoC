"use client";

import { useActionState } from "react";
import Link from "next/link";
import { GIFT_TYPES, RECEIPT_STATUSES } from "@95forward/shared";
import { Button, Card, FieldGroup, FormRow, Input, Select, Textarea } from "@/components/ds";
import type { FormState } from "@/server/actions/gifts";
import { titleCaseFromSnake } from "@/lib/format";

export interface GiftFormInitial {
  id?: string;
  constituentId?: string;
  amount?: string;
  giftDate?: string;
  giftType?: string;
  fundId?: string;
  campaignId?: string;
  appealId?: string;
  designation?: string;
  receiptStatus?: string;
}

export interface GiftFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  constituents: { id: string; name: string }[];
  funds: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
  appeals: { id: string; name: string }[];
  initial?: GiftFormInitial;
  submitLabel: string;
  cancelHref: string;
  lockConstituent?: boolean;
}

const initialState: FormState = {};

export function GiftForm({
  action,
  constituents,
  funds,
  campaigns,
  appeals,
  initial,
  submitLabel,
  cancelHref,
  lockConstituent = false,
}: GiftFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  const constituentOptions = constituents.map((c) => ({ value: c.id, label: c.name }));
  const fundOptions = funds.map((f) => ({ value: f.id, label: f.name }));
  const campaignOptions = campaigns.map((c) => ({ value: c.id, label: c.name }));
  const appealOptions = appeals.map((a) => ({ value: a.id, label: a.name }));
  const typeOptions = GIFT_TYPES.map((type) => ({
    value: type,
    label: titleCaseFromSnake(type),
  }));
  const receiptOptions = RECEIPT_STATUSES.map((status) => ({
    value: status,
    label: titleCaseFromSnake(status),
  }));

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend="Gift">
          <FormRow columns={2}>
            {lockConstituent && initial?.constituentId ? (
              <>
                <input type="hidden" name="constituentId" value={initial.constituentId} />
                <Select
                  label="Donor"
                  options={constituentOptions}
                  defaultValue={initial.constituentId}
                  disabled
                />
              </>
            ) : (
              <Select
                name="constituentId"
                label="Donor"
                placeholder="Select a constituent"
                options={constituentOptions}
                defaultValue={initial?.constituentId ?? ""}
                error={errors.constituentId}
              />
            )}
            <Input
              name="amount"
              label="Amount (USD)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={initial?.amount ?? ""}
              error={errors.amountCents}
              required
            />
          </FormRow>
          <FormRow columns={2}>
            <Input
              name="giftDate"
              label="Date"
              type="date"
              defaultValue={initial?.giftDate ?? ""}
              error={errors.giftDate}
              required
            />
            <Select
              name="giftType"
              label="Gift type"
              options={typeOptions}
              defaultValue={initial?.giftType ?? "one_time"}
              error={errors.giftType}
            />
          </FormRow>
        </FieldGroup>
      </Card>

      <Card>
        <FieldGroup legend="Designation">
          <FormRow columns={3}>
            <Select
              name="fundId"
              label="Fund"
              placeholder="No fund"
              options={fundOptions}
              defaultValue={initial?.fundId ?? ""}
              error={errors.fundId}
            />
            <Select
              name="campaignId"
              label="Campaign"
              placeholder="No campaign"
              options={campaignOptions}
              defaultValue={initial?.campaignId ?? ""}
              error={errors.campaignId}
            />
            <Select
              name="appealId"
              label="Appeal"
              placeholder="No appeal"
              options={appealOptions}
              defaultValue={initial?.appealId ?? ""}
              error={errors.appealId}
            />
          </FormRow>
          <Textarea
            name="designation"
            label="Designation note"
            optional
            placeholder="Where this gift is directed"
            defaultValue={initial?.designation ?? ""}
            error={errors.designation}
          />
        </FieldGroup>
      </Card>

      <Card>
        <FieldGroup legend="Receipting">
          <FormRow columns={2}>
            <Select
              name="receiptStatus"
              label="Receipt status"
              options={receiptOptions}
              defaultValue={initial?.receiptStatus ?? "unreceipted"}
              error={errors.receiptStatus}
              hint="Receipting is simulated in this PoC — no email is sent."
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

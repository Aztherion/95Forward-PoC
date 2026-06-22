"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ds";
import { createReferralAction, type FormState } from "@/server/actions/execution";

const initialState: FormState = {};

export function ReferralForm({ prospectId }: { prospectId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createReferralAction, initialState);

  if (state.ok && open) setOpen(false);

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="sm"
        iconLeft={<UserPlus size={15} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      >
        Capture a referral
      </Button>
    );
  }

  return (
    <Card>
      <form action={formAction} className="f95-inline-form" data-testid="referral-form">
        <input type="hidden" name="sourceProspectId" value={prospectId} />
        <Input
          name="referredName"
          label="Who were you referred to?"
          error={state.fieldErrors?.referredName}
        />
        <label className="f95-check">
          <input type="checkbox" name="mayUseName" className="f95-check__box" />
          <span>May we use the referrer&apos;s name?</span>
        </label>
        <label className="f95-check">
          <input type="checkbox" name="willSendNote" className="f95-check__box" />
          <span>Will they send a predisposition note?</span>
        </label>
        <Textarea name="relationshipNote" label="Relationship to the referrer" optional />
        <div className="f95-cluster">
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? "Saving" : "Capture the referral"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

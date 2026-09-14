"use client";

import { useActionState, useState } from "react";
import { CalendarClock, PencilLine, Radio } from "lucide-react";
import { Button, Checkbox, Input, Textarea } from "@/components/ds";
import {
  changeAmountAction,
  logContactAction,
  moveCloseDateAction,
} from "@/server/actions/opportunity";

/**
 * Move the close date — and ask who chose it.
 *
 * The question is the point of the control. "All three moves made by us" and
 * "Dana Reese · no prospect input" are reads over `prospectSourced`, and if the UI never asks, that
 * flag can only ever be true of seeded data: the slippage argument would work in the demo and be
 * structurally impossible for a real user to reproduce. So the checkbox is here, it defaults to
 * unchecked, and the answer is written with the change.
 */
export function MoveCloseDate({
  opportunityId,
  closeDate,
}: {
  opportunityId: string;
  closeDate: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, move, pending] = useActionState(moveCloseDateAction, {});

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="move-close-date"
        iconLeft={<CalendarClock size={14} strokeWidth={1.8} />}
      >
        Move close date
      </Button>
    );
  }

  return (
    <form action={move} className="f95-inline-form" data-testid="move-close-date-form">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <Input
        label="New close date"
        name="closeDate"
        type="date"
        defaultValue={closeDate ?? ""}
        error={state.fieldErrors?.closeDate}
        required
      />
      <Checkbox
        name="prospectSourced"
        label="The prospect gave us this date"
        data-testid="date-prospect-sourced"
      />
      <span className="f95-field__hint">
        Leave it unchecked if we picked the date. A date we invent is not a date, and the record
        will say so.
      </span>
      <div className="f95-cluster">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Moving…" : "Move it"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {state.error ? (
        <span className="f95-field__err" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function ChangeAmount({
  opportunityId,
  amountCents,
  amountNote,
}: {
  opportunityId: string;
  amountCents: number;
  amountNote: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, change, pending] = useActionState(changeAmountAction, {});

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="change-amount"
        iconLeft={<PencilLine size={14} strokeWidth={1.8} />}
      >
        Change amount
      </Button>
    );
  }

  return (
    <form action={change} className="f95-inline-form" data-testid="change-amount-form">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <Input
        label="Ask amount"
        name="amount"
        defaultValue={String(Math.round(amountCents / 100))}
        error={state.fieldErrors?.amount}
        required
      />
      <Input
        label="Note"
        name="amountNote"
        optional
        defaultValue={amountNote ?? ""}
        placeholder="over three years"
      />
      {/* Not asked here on purpose: an amount WE change is ours. A figure they agreed to is the
          `amount agreed` milestone, which is a different record with a different meaning. */}
      <div className="f95-cluster">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {state.error ? (
        <span className="f95-field__err" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

/** Logging a contact is what resets the silence counter, which is what the rule reads. */
export function LogWhatHappened({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false);
  const [state, log, pending] = useActionState(logContactAction, {});

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="log-what-happened"
        iconLeft={<Radio size={14} strokeWidth={1.8} />}
      >
        Log what happened
      </Button>
    );
  }

  return (
    <form action={log} className="f95-inline-form" data-testid="log-form">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <Textarea label="What happened" name="note" placeholder="Called Ellen — she is checking…" />
      <div className="f95-cluster">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Logging…" : "Log it"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {state.error ? (
        <span className="f95-field__err" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

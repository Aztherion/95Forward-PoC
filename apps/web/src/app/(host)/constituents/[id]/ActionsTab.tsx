"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { INTERACTION_TYPES } from "@95forward/shared";
import { Button, Card, FormRow, Input, Select, Textarea } from "@/components/ds";
import {
  addInteractionAction,
  deleteInteractionAction,
  type FormState,
} from "@/server/actions/constituents";
import { formatDate, titleCaseFromSnake } from "@/lib/format";

export interface InteractionItem {
  id: string;
  type: string;
  occurredAt: string;
  summary: string | null;
  ownerName: string | null;
}

export interface ActionsTabProps {
  constituentId: string;
  users: { id: string; name: string }[];
  interactions: InteractionItem[];
}

const initialState: FormState = {};

export function ActionsTab({ constituentId, users, interactions }: ActionsTabProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addInteractionAction, initialState);
  const errors = state.fieldErrors ?? {};

  const typeOptions = INTERACTION_TYPES.map((type) => ({
    value: type,
    label: titleCaseFromSnake(type),
  }));
  const userOptions = users.map((user) => ({ value: user.id, label: user.name }));

  if (state.ok && open) {
    setOpen(false);
  }

  return (
    <div className="f95-stack">
      <div className="f95-cluster">
        <h2 className="f95-section-title">Actions</h2>
        <span className="f95-recordbar__spacer" />
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
        >
          Log a touch
        </Button>
      </div>

      {open ? (
        <Card>
          <form action={formAction} className="f95-inline-form">
            <input type="hidden" name="constituentId" value={constituentId} />
            <FormRow columns={3}>
              <Select name="type" label="Type" options={typeOptions} error={errors.type} />
              <Input
                name="occurredAt"
                label="Date"
                type="date"
                error={errors.occurredAt}
                required
              />
              <Select
                name="ownerUserId"
                label="Owner"
                placeholder="No owner"
                options={userOptions}
                error={errors.ownerUserId}
              />
            </FormRow>
            <Textarea
              name="summary"
              label="Summary"
              optional
              placeholder="What happened, and what comes next"
              error={errors.summary}
            />
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Saving" : "Log the touch"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {interactions.length === 0 ? (
        <p className="f95-deflist__desc--empty">No contact yet — log your first touch.</p>
      ) : (
        <div>
          {interactions.map((item) => (
            <div key={item.id} className="f95-itemrow">
              <div className="f95-itemrow__body">
                <span className="f95-itemrow__title">{titleCaseFromSnake(item.type)}</span>
                <span className="f95-itemrow__meta">
                  <span>{formatDate(item.occurredAt)}</span>
                  {item.ownerName ? <span>· {item.ownerName}</span> : null}
                </span>
                {item.summary ? <span>{item.summary}</span> : null}
              </div>
              <div className="f95-itemrow__actions">
                <form action={deleteInteractionAction}>
                  <input type="hidden" name="interactionId" value={item.id} />
                  <input type="hidden" name="constituentId" value={constituentId} />
                  <Button variant="ghost" size="sm" type="submit">
                    Remove
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

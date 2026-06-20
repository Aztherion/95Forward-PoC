"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MARKETING_CHANNELS, MARKETING_STATUSES } from "@95forward/shared";
import { Button, Card, FieldGroup, FormRow, Input, Select, Textarea } from "@/components/ds";
import type { FormState } from "@/server/actions/communications";
import { titleCaseFromSnake } from "@/lib/format";

export interface CommunicationFormInitial {
  id?: string;
  name?: string;
  channel?: string;
  segmentId?: string;
  subject?: string;
  body?: string;
  status?: string;
  scheduledAt?: string;
}

export interface CommunicationFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  segments: { id: string; name: string }[];
  initial?: CommunicationFormInitial;
  submitLabel: string;
  cancelHref: string;
}

const initialState: FormState = {};

export function CommunicationForm({
  action,
  segments,
  initial,
  submitLabel,
  cancelHref,
}: CommunicationFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  const channelOptions = MARKETING_CHANNELS.map((channel) => ({
    value: channel,
    label: titleCaseFromSnake(channel),
  }));
  const statusOptions = MARKETING_STATUSES.map((status) => ({
    value: status,
    label: titleCaseFromSnake(status),
  }));
  const segmentOptions = segments.map((segment) => ({ value: segment.id, label: segment.name }));

  return (
    <form action={formAction} className="f95-stack">
      <Card>
        <FieldGroup legend="Communication">
          <FormRow columns={2}>
            <Input
              name="name"
              label="Name"
              placeholder="Spring appeal"
              defaultValue={initial?.name ?? ""}
              error={errors.name}
              required
            />
            <Select
              name="channel"
              label="Channel"
              options={channelOptions}
              defaultValue={initial?.channel ?? "email"}
              error={errors.channel}
            />
          </FormRow>
          <FormRow columns={2}>
            <Select
              name="segmentId"
              label="Segment"
              placeholder="No segment"
              options={segmentOptions}
              defaultValue={initial?.segmentId ?? ""}
              error={errors.segmentId}
            />
            <Select
              name="status"
              label="Status"
              options={statusOptions}
              defaultValue={initial?.status ?? "draft"}
              error={errors.status}
            />
          </FormRow>
          <Input
            name="scheduledAt"
            label="Scheduled date"
            optional
            type="date"
            hint="Used when the status is scheduled"
            defaultValue={initial?.scheduledAt ?? ""}
            error={errors.scheduledAt}
          />
        </FieldGroup>
      </Card>

      <Card>
        <FieldGroup legend="Message">
          <Input
            name="subject"
            label="Subject"
            optional
            placeholder="What this communication is about"
            defaultValue={initial?.subject ?? ""}
            error={errors.subject}
          />
          <Textarea
            name="body"
            label="Body"
            optional
            rows={8}
            placeholder="Write the message your audience will read"
            defaultValue={initial?.body ?? ""}
            error={errors.body}
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

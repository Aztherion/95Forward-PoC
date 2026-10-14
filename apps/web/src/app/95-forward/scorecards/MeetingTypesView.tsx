"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Tags } from "lucide-react";
import { Button, Checkbox, EmptyState, Input, Textarea } from "@/components/ds";
import {
  deleteMeetingTypeAction,
  saveMeetingTypeAction,
  type ScorecardFormState,
} from "@/server/actions/scorecards";
import { MEETING_TYPE_DESCRIPTION_HELP } from "./scorecards-copy";

interface TypeRow {
  id: string;
  name: string;
  description: string;
  isFallback: boolean;
  scorecardCount: number;
}

const INITIAL: ScorecardFormState = {};

/** One line of a description, enough to recognise it by without the list becoming prose. */
function truncate(value: string, max = 160): string {
  return value.length <= max ? value : `${value.slice(0, max).trimEnd()}…`;
}

export function MeetingTypesView({ types }: { types: TypeRow[] }) {
  const [editing, setEditing] = useState<TypeRow | "new" | null>(null);

  return (
    <div className="f95-stack" data-testid="meeting-types-view">
      <div className="f95-sc-filters">
        <span className="f95-sc-filters__spacer" />
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          onClick={() => {
            setEditing("new");
          }}
          data-testid="new-meeting-type"
        >
          New meeting type
        </Button>
      </div>

      {types.length === 0 ? (
        <EmptyState
          icon={<Tags size={20} strokeWidth={1.8} />}
          title="No meeting types yet"
          line="A meeting type is a kind of meeting the system can recognise from what a transcript contains."
          data-testid="meeting-types-empty"
        />
      ) : (
        <div className="f95-sc-list">
          {types.map((type) => (
            <div key={type.id} className="f95-sc-row" data-testid="meeting-type-row">
              <div className="f95-sc-row__body">
                <span className="f95-sc-row__name">
                  {type.name}
                  {type.isFallback ? (
                    <span className="f95-monocap f95-monocap--quiet"> · fallback</span>
                  ) : null}
                </span>
                <span className="f95-sc-row__meta">{truncate(type.description)}</span>
              </div>
              <div className="f95-sc-row__right">
                <span className="f95-sc-row__meta">
                  {type.scorecardCount} Scorecard{type.scorecardCount === 1 ? "" : "s"}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(type);
                  }}
                  data-testid="edit-meeting-type"
                >
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null ? (
        <MeetingTypeDialog
          row={editing === "new" ? null : editing}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function MeetingTypeDialog({ row, onClose }: { row: TypeRow | null; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveMeetingTypeAction, INITIAL);
  const [deleteState, deleteAction, deleting] = useActionState(deleteMeetingTypeAction, INITIAL);

  useEffect(() => {
    if (state.ok === true) onClose();
  }, [state, onClose]);

  return (
    <div className="f95-modal__scrim" onClick={onClose} role="presentation">
      <div
        className="f95-modal"
        role="dialog"
        aria-modal="true"
        aria-label={row === null ? "New meeting type" : "Edit meeting type"}
        onClick={(event) => {
          event.stopPropagation();
        }}
        data-testid="meeting-type-dialog"
      >
        <h2 className="f95-modal__title">{row === null ? "New meeting type" : row.name}</h2>
        <form action={formAction} className="f95-inline-form">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <Input
            label="Name"
            name="name"
            defaultValue={row?.name ?? ""}
            error={state.fieldErrors?.name}
            required
          />
          <Textarea
            label="Description"
            name="description"
            rows={6}
            hint={MEETING_TYPE_DESCRIPTION_HELP}
            defaultValue={row?.description ?? ""}
            error={state.fieldErrors?.description}
            required
            data-testid="meeting-type-description"
          />
          <Checkbox
            label="Use this type when no other one fits"
            name="isFallback"
            defaultChecked={row?.isFallback ?? false}
          />

          {state.error ? (
            <span className="f95-field__err" role="alert" data-testid="meeting-type-error">
              {state.error}
            </span>
          ) : null}
          {deleteState.error ? (
            <span className="f95-field__err" role="alert" data-testid="meeting-type-delete-error">
              {deleteState.error}
            </span>
          ) : null}

          <div className="f95-cluster">
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {row ? (
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={deleting}
                formAction={deleteAction}
                name="id"
                value={row.id}
                data-testid="delete-meeting-type"
              >
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

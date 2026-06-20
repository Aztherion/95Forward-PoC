"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RELATIONSHIP_TYPES } from "@95forward/shared";
import { Button, Card, FormRow, Input, Select, Textarea } from "@/components/ds";
import {
  addRelationshipAction,
  deleteRelationshipAction,
  type FormState,
} from "@/server/actions/constituents";
import { titleCaseFromSnake } from "@/lib/format";

export interface RelationshipItem {
  id: string;
  type: string;
  note: string | null;
  toConstituentId: string | null;
  toConstituentName: string | null;
  externalName: string | null;
}

export interface RelationshipsTabProps {
  constituentId: string;
  relationships: RelationshipItem[];
  candidates: { id: string; displayName: string }[];
}

const initialState: FormState = {};

export function RelationshipsTab({
  constituentId,
  relationships,
  candidates,
}: RelationshipsTabProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addRelationshipAction, initialState);
  const errors = state.fieldErrors ?? {};

  const typeOptions = RELATIONSHIP_TYPES.map((type) => ({
    value: type,
    label: titleCaseFromSnake(type),
  }));
  const candidateOptions = candidates.map((candidate) => ({
    value: candidate.id,
    label: candidate.displayName,
  }));

  if (state.ok && open) {
    setOpen(false);
  }

  return (
    <div className="f95-stack">
      <div className="f95-cluster">
        <h2 className="f95-section-title">Relationships</h2>
        <span className="f95-recordbar__spacer" />
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
        >
          Add relationship
        </Button>
      </div>

      {open ? (
        <Card>
          <form action={formAction} className="f95-inline-form">
            <input type="hidden" name="fromConstituentId" value={constituentId} />
            <FormRow columns={2}>
              <Select
                name="type"
                label="Relationship type"
                options={typeOptions}
                error={errors.type}
              />
              <Select
                name="toConstituentId"
                label="Linked constituent"
                placeholder="External contact"
                options={candidateOptions}
                error={errors.toConstituentId}
              />
            </FormRow>
            <Input
              name="externalName"
              label="External contact name"
              optional
              placeholder="Use when not a constituent on file"
              error={errors.externalName}
            />
            <Textarea name="note" label="Note" optional error={errors.note} />
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Saving" : "Add relationship"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {relationships.length === 0 ? (
        <p className="f95-deflist__desc--empty">
          No relationships mapped yet — worth researching who connects here.
        </p>
      ) : (
        <div>
          {relationships.map((item) => (
            <div key={item.id} className="f95-itemrow">
              <div className="f95-itemrow__body">
                <span className="f95-itemrow__title">
                  {item.toConstituentId && item.toConstituentName ? (
                    <Link
                      href={`/constituents/${item.toConstituentId}`}
                      className="f95-table__cell-link"
                    >
                      {item.toConstituentName}
                    </Link>
                  ) : (
                    (item.externalName ?? "Unknown contact")
                  )}
                </span>
                <span className="f95-itemrow__meta">
                  <span>{titleCaseFromSnake(item.type)}</span>
                </span>
                {item.note ? <span>{item.note}</span> : null}
              </div>
              <div className="f95-itemrow__actions">
                <form action={deleteRelationshipAction}>
                  <input type="hidden" name="relationshipId" value={item.id} />
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

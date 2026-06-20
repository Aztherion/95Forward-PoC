"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, FormRow, Input, Select, Tag } from "@/components/ds";
import { addTagAction, removeTagAction, type FormState } from "@/server/actions/constituents";

export interface TagItem {
  id: string;
  name: string;
}

export interface TagsTabProps {
  constituentId: string;
  tags: TagItem[];
  allTags: TagItem[];
}

const initialState: FormState = {};

export function TagsTab({ constituentId, tags, allTags }: TagsTabProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addTagAction, initialState);
  const errors = state.fieldErrors ?? {};

  const assignedIds = new Set(tags.map((tag) => tag.id));
  const available = allTags.filter((tag) => !assignedIds.has(tag.id));
  const tagOptions = available.map((tag) => ({ value: tag.id, label: tag.name }));

  if (state.ok && open) {
    setOpen(false);
  }

  return (
    <div className="f95-stack">
      <div className="f95-cluster">
        <h2 className="f95-section-title">Tags</h2>
        <span className="f95-recordbar__spacer" />
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
        >
          Add tag
        </Button>
      </div>

      {open ? (
        <Card>
          <form action={formAction} className="f95-inline-form">
            <input type="hidden" name="constituentId" value={constituentId} />
            <FormRow columns={2}>
              <Select
                name="tagId"
                label="Existing tag"
                placeholder="Choose a tag"
                options={tagOptions}
                error={errors.tagId}
              />
              <Input name="newTagName" label="Or create a new tag" optional />
            </FormRow>
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Saving" : "Add tag"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {tags.length === 0 ? (
        <p className="f95-deflist__desc--empty">No tags yet — add what you know.</p>
      ) : (
        <div className="f95-flagboard">
          {tags.map((tag) => (
            <form key={tag.id} action={removeTagAction} style={{ display: "inline-flex" }}>
              <input type="hidden" name="constituentId" value={constituentId} />
              <input type="hidden" name="tagId" value={tag.id} />
              <Tag>
                {tag.name}
                <button
                  type="submit"
                  className="f95-tag__x"
                  aria-label={`Remove tag ${tag.name}`}
                  style={{ background: "none", border: "none" }}
                >
                  ×
                </button>
              </Tag>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

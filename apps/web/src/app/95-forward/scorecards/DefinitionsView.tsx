"use client";

import { useActionState, useEffect, useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import type { CriterionType, ScorecardDefinitionSnapshot } from "@95forward/shared";
import { Button, Card, EmptyState, Input, Select, Switch, Textarea } from "@/components/ds";
import {
  deleteDefinitionAction,
  saveDefinitionAction,
  type ScorecardFormState,
} from "@/server/actions/scorecards";
import { CRITERION_TYPE_TEXT, DEFINITION_SNAPSHOT_NOTE } from "./scorecards-copy";

interface DefinitionRow {
  id: string;
  name: string;
  meetingTypeId: string;
  isActive: boolean;
}

interface Props {
  definitions: DefinitionRow[];
  meetingTypes: { id: string; name: string }[];
  trees: Record<string, ScorecardDefinitionSnapshot>;
}

// ---- The editor's working shape. Ids travel through it unchanged, which is the whole point: a
// ---- criterion that keeps its id keeps the results already recorded against it when its wording
// ---- is rewritten. A new row has no id and the service mints one.

interface DraftOption {
  id?: string;
  label: string;
  description: string;
}
interface DraftCriterion {
  id?: string;
  type: CriterionType;
  prompt: string;
  guidance: string;
  options: DraftOption[];
}
interface DraftSection {
  id?: string;
  title: string;
  description: string;
  criteria: DraftCriterion[];
}
interface Draft {
  id?: string;
  name: string;
  meetingTypeId: string;
  isActive: boolean;
  sections: DraftSection[];
}

function draftFrom(tree: ScorecardDefinitionSnapshot, row: DefinitionRow): Draft {
  return {
    id: row.id,
    name: row.name,
    meetingTypeId: row.meetingTypeId,
    isActive: row.isActive,
    sections: tree.sections
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description ?? "",
        criteria: section.criteria
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((criterion) => ({
            id: criterion.id,
            type: criterion.type,
            prompt: criterion.prompt,
            guidance: criterion.guidance ?? "",
            options: criterion.options
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((option) => ({
                id: option.id,
                label: option.label,
                description: option.description,
              })),
          })),
      })),
  };
}

/** A new definition opens with one section and one criterion — an empty form is a worse start. */
function blankDraft(meetingTypeId: string): Draft {
  return {
    name: "",
    meetingTypeId,
    isActive: true,
    sections: [
      {
        title: "",
        description: "",
        criteria: [{ type: "boolean", prompt: "", guidance: "", options: [] }],
      },
    ],
  };
}

function move<T>(items: T[], from: number, delta: number): T[] {
  const to = from + delta;
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export function DefinitionsView({ definitions, meetingTypes, trees }: Props) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const typeName = (id: string): string =>
    meetingTypes.find((type) => type.id === id)?.name ?? "Unassigned";

  if (editing !== null) {
    return (
      <DefinitionEditor
        draft={editing}
        meetingTypes={meetingTypes}
        onClose={() => {
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="f95-stack" data-testid="definitions-view">
      <div className="f95-sc-filters">
        <span className="f95-sc-filters__spacer" />
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          disabled={meetingTypes.length === 0}
          onClick={() => {
            setEditing(blankDraft(meetingTypes[0]?.id ?? ""));
          }}
          data-testid="new-definition"
        >
          New definition
        </Button>
      </div>

      {definitions.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={20} strokeWidth={1.8} />}
          title="No definitions yet"
          line="A definition is what a meeting is scored against — sections of plain-language criteria."
          data-testid="definitions-empty"
        />
      ) : (
        <div className="f95-sc-list">
          {definitions.map((row) => {
            const tree = trees[row.id];
            const criteria =
              tree?.sections.reduce((total, section) => total + section.criteria.length, 0) ?? 0;
            return (
              <div key={row.id} className="f95-sc-row" data-testid="definition-row">
                <div className="f95-sc-row__body">
                  <span className="f95-sc-row__name">{row.name}</span>
                  <span className="f95-sc-row__meta">
                    {[
                      typeName(row.meetingTypeId),
                      row.isActive ? "Active" : "Inactive",
                      `${String(criteria)} criteri${criteria === 1 ? "on" : "a"}`,
                    ].map((part, index) => (
                      <span key={part}>
                        {index > 0 ? <span className="f95-sc-row__sep">·</span> : null}
                        {part}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="f95-sc-row__right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (tree) setEditing(draftFrom(tree, row));
                    }}
                    data-testid="edit-definition"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const INITIAL: ScorecardFormState = {};

function DefinitionEditor({
  draft,
  meetingTypes,
  onClose,
}: {
  draft: Draft;
  meetingTypes: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [value, setValue] = useState<Draft>(draft);
  const [state, formAction, pending] = useActionState(saveDefinitionAction, INITIAL);
  const [deleteState, deleteAction, deleting] = useActionState(deleteDefinitionAction, INITIAL);

  useEffect(() => {
    if (state.ok === true) onClose();
  }, [state, onClose]);

  const patchSection = (index: number, patch: Partial<DraftSection>): void => {
    setValue((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    }));
  };
  const patchCriterion = (si: number, ci: number, patch: Partial<DraftCriterion>): void => {
    setValue((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === si
          ? {
              ...section,
              criteria: section.criteria.map((criterion, j) =>
                j === ci ? { ...criterion, ...patch } : criterion,
              ),
            }
          : section,
      ),
    }));
  };

  // The service's validator keys its issues by path — `sections[0].criteria[1].prompt` — so the
  // error lands on the field it is about rather than in a banner above the form.
  const fieldError = (path: string): string | undefined => state.fieldErrors?.[path];

  return (
    <form action={formAction} className="f95-sc-editor" data-testid="definition-editor">
      <input type="hidden" name="definition" value={JSON.stringify(toPayload(value))} />

      <Card tone="sunk">
        <span className="f95-deflist__desc">{DEFINITION_SNAPSHOT_NOTE}</span>
      </Card>

      <Card>
        <div className="f95-inline-form">
          <Input
            label="Name"
            value={value.name}
            onChange={(event) => {
              setValue({ ...value, name: event.target.value });
            }}
            error={fieldError("name")}
            data-testid="definition-name"
          />
          <Select
            label="Meeting type"
            value={value.meetingTypeId}
            onChange={(event) => {
              setValue({ ...value, meetingTypeId: event.target.value });
            }}
            options={meetingTypes.map((type) => ({ value: type.id, label: type.name }))}
          />
          <Switch
            label="Active"
            checked={value.isActive}
            onChange={(event) => {
              setValue({ ...value, isActive: event.target.checked });
            }}
          />
        </div>
      </Card>

      {fieldError("sections") ? (
        <span className="f95-field__err" role="alert">
          {fieldError("sections")}
        </span>
      ) : null}

      {value.sections.map((section, si) => (
        <div key={si} className="f95-sc-block" data-testid="section-block">
          <div className="f95-sc-block__head">
            <span className="f95-sc-block__title">Section {si + 1}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue({ ...value, sections: move(value.sections, si, -1) });
              }}
              aria-label="Move section up"
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue({ ...value, sections: move(value.sections, si, 1) });
              }}
              aria-label="Move section down"
            >
              ↓
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue({
                  ...value,
                  sections: value.sections.filter((_, i) => i !== si),
                });
              }}
              aria-label="Remove section"
            >
              Remove
            </Button>
          </div>

          <Input
            label="Title"
            value={section.title}
            onChange={(event) => {
              patchSection(si, { title: event.target.value });
            }}
            error={fieldError(`sections[${String(si)}].title`)}
          />
          <Input
            label="Description"
            optional
            value={section.description}
            onChange={(event) => {
              patchSection(si, { description: event.target.value });
            }}
          />

          {fieldError(`sections[${String(si)}].criteria`) ? (
            <span className="f95-field__err" role="alert">
              {fieldError(`sections[${String(si)}].criteria`)}
            </span>
          ) : null}

          {section.criteria.map((criterion, ci) => (
            <div key={ci} className="f95-sc-block f95-sc-block--nested" data-testid="criterion-block">
              <div className="f95-sc-block__head">
                <span className="f95-sc-block__title">Criterion {ci + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    patchSection(si, { criteria: move(section.criteria, ci, -1) });
                  }}
                  aria-label="Move criterion up"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    patchSection(si, { criteria: move(section.criteria, ci, 1) });
                  }}
                  aria-label="Move criterion down"
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    patchSection(si, {
                      criteria: section.criteria.filter((_, i) => i !== ci),
                    });
                  }}
                  aria-label="Remove criterion"
                >
                  Remove
                </Button>
              </div>

              <Select
                label="Type"
                value={criterion.type}
                onChange={(event) => {
                  patchCriterion(si, ci, { type: event.target.value as CriterionType });
                }}
                options={(Object.keys(CRITERION_TYPE_TEXT) as CriterionType[]).map((type) => ({
                  value: type,
                  label: CRITERION_TYPE_TEXT[type],
                }))}
              />
              <Textarea
                label="What the system judges"
                rows={2}
                value={criterion.prompt}
                onChange={(event) => {
                  patchCriterion(si, ci, { prompt: event.target.value });
                }}
                error={fieldError(`sections[${String(si)}].criteria[${String(ci)}].prompt`)}
                data-testid="criterion-prompt"
              />
              <Textarea
                label="Guidance"
                optional
                rows={2}
                value={criterion.guidance}
                onChange={(event) => {
                  patchCriterion(si, ci, { guidance: event.target.value });
                }}
              />

              {criterion.type === "classification" ? (
                <>
                  {fieldError(`sections[${String(si)}].criteria[${String(ci)}].options`) ? (
                    <span className="f95-field__err" role="alert">
                      {fieldError(`sections[${String(si)}].criteria[${String(ci)}].options`)}
                    </span>
                  ) : null}
                  {criterion.options.map((option, oi) => (
                    <div key={oi} className="f95-sc-block f95-sc-block--nested">
                      <div className="f95-sc-block__head">
                        <span className="f95-sc-block__title">Option {oi + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            patchCriterion(si, ci, {
                              options: move(criterion.options, oi, -1),
                            });
                          }}
                          aria-label="Move option up"
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            patchCriterion(si, ci, { options: move(criterion.options, oi, 1) });
                          }}
                          aria-label="Move option down"
                        >
                          ↓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            patchCriterion(si, ci, {
                              options: criterion.options.filter((_, i) => i !== oi),
                            });
                          }}
                          aria-label="Remove option"
                        >
                          Remove
                        </Button>
                      </div>
                      <Input
                        label="Label"
                        value={option.label}
                        onChange={(event) => {
                          patchCriterion(si, ci, {
                            options: criterion.options.map((o, i) =>
                              i === oi ? { ...o, label: event.target.value } : o,
                            ),
                          });
                        }}
                      />
                      <Textarea
                        label="Description"
                        rows={2}
                        hint="The system chooses on the description, not the label."
                        value={option.description}
                        onChange={(event) => {
                          patchCriterion(si, ci, {
                            options: criterion.options.map((o, i) =>
                              i === oi ? { ...o, description: event.target.value } : o,
                            ),
                          });
                        }}
                        error={fieldError(
                          `sections[${String(si)}].criteria[${String(ci)}].options[${String(oi)}].description`,
                        )}
                      />
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Plus size={14} strokeWidth={1.8} />}
                    onClick={() => {
                      patchCriterion(si, ci, {
                        options: [...criterion.options, { label: "", description: "" }],
                      });
                    }}
                  >
                    Add option
                  </Button>
                </>
              ) : null}
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.8} />}
            onClick={() => {
              patchSection(si, {
                criteria: [
                  ...section.criteria,
                  { type: "boolean", prompt: "", guidance: "", options: [] },
                ],
              });
            }}
            data-testid="add-criterion"
          >
            Add criterion
          </Button>
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        iconLeft={<Plus size={15} strokeWidth={1.8} />}
        onClick={() => {
          setValue({
            ...value,
            sections: [
              ...value.sections,
              {
                title: "",
                description: "",
                criteria: [{ type: "boolean", prompt: "", guidance: "", options: [] }],
              },
            ],
          });
        }}
        data-testid="add-section"
      >
        Add section
      </Button>

      {state.error ? (
        <span className="f95-field__err" role="alert" data-testid="definition-error">
          {state.error}
        </span>
      ) : null}
      {deleteState.error ? (
        <span className="f95-field__err" role="alert" data-testid="definition-delete-error">
          {deleteState.error}
        </span>
      ) : null}

      <div className="f95-cluster">
        <Button type="submit" variant="primary" size="sm" disabled={pending} data-testid="save-definition">
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        {value.id ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={deleting}
            formAction={deleteAction}
            name="id"
            value={value.id}
            type="submit"
            data-testid="delete-definition"
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** Empty optional strings go back as null so the service stores an absence, not a blank. */
function toPayload(draft: Draft) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name,
    meetingTypeId: draft.meetingTypeId,
    isActive: draft.isActive,
    sections: draft.sections.map((section) => ({
      ...(section.id ? { id: section.id } : {}),
      title: section.title,
      description: section.description.trim().length === 0 ? null : section.description,
      criteria: section.criteria.map((criterion) => ({
        ...(criterion.id ? { id: criterion.id } : {}),
        type: criterion.type,
        prompt: criterion.prompt,
        guidance: criterion.guidance.trim().length === 0 ? null : criterion.guidance,
        options:
          criterion.type === "classification"
            ? criterion.options.map((option) => ({
                ...(option.id ? { id: option.id } : {}),
                label: option.label,
                description: option.description,
              }))
            : [],
      })),
    })),
  };
}

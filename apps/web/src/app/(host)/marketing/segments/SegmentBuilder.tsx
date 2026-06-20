"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import type { ListFilter, SavedListDefinition } from "@95forward/shared";
import { Button, Card, Input, Select, Textarea } from "@/components/ds";
import type { SelectOption } from "@/components/ds";
import { filterFieldsFor, findFilterField, sortOptionsFor } from "@/lib/list-fields";
import type { FormState } from "@/server/actions/segments";

export interface SegmentRefOptions {
  users: SelectOption[];
  tags: SelectOption[];
}

export interface SegmentBuilderProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  definition: SavedListDefinition;
  previewCount: number;
  refOptions: SegmentRefOptions;
  builderBasePath: string;
  cancelHref: string;
  submitLabel: string;
  initial?: { name?: string; description?: string };
}

const RECORD_TYPE = "constituent" as const;
const initialState: FormState = {};

export function SegmentBuilder({
  action,
  definition,
  previewCount,
  refOptions,
  builderBasePath,
  cancelHref,
  submitLabel,
  initial,
}: SegmentBuilderProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const errors = state.fieldErrors ?? {};

  const fields = useMemo(() => filterFieldsFor(RECORD_TYPE), []);
  const sortOptions = useMemo(() => sortOptionsFor(RECORD_TYPE), []);

  const filters = definition.filters ?? [];

  function commit(next: SavedListDefinition) {
    const sp = new URLSearchParams();
    sp.set("def", JSON.stringify(next));
    router.push(`${builderBasePath}?${sp.toString()}`);
  }

  function addFilter() {
    const firstField = fields[0];
    if (!firstField) return;
    const next: ListFilter = {
      field: firstField.field,
      operator: firstField.operators[0]!,
      value: "",
    };
    commit({ ...definition, filters: [...filters, next] });
  }

  function updateFilter(index: number, patch: Partial<ListFilter>) {
    const nextFilters = filters.map((filter, i) =>
      i === index ? { ...filter, ...patch } : filter,
    );
    commit({ ...definition, filters: nextFilters });
  }

  function removeFilter(index: number) {
    commit({ ...definition, filters: filters.filter((_, i) => i !== index) });
  }

  function updateSearch(value: string) {
    commit({ ...definition, search: value || undefined });
  }

  function updateSort(field: string) {
    commit({ ...definition, sort: { field, dir: definition.sort?.dir ?? "desc" } });
  }

  function updateSortDir(dir: string) {
    const field = definition.sort?.field ?? sortOptions[0]?.value ?? "";
    commit({ ...definition, sort: { field, dir: dir === "asc" ? "asc" : "desc" } });
  }

  function refOptionsFor(source: NonNullable<ReturnType<typeof findFilterField>>["refSource"]) {
    switch (source) {
      case "users":
        return refOptions.users;
      case "tags":
        return refOptions.tags;
      default:
        return [];
    }
  }

  const cleanDefinition: SavedListDefinition = {
    filters: filters.filter((filter) => filter.value !== undefined && filter.value !== ""),
    search: definition.search,
    sort: definition.sort,
  };

  return (
    <form action={formAction} className="f95-stack">
      <input type="hidden" name="definition" value={JSON.stringify(cleanDefinition)} />

      <Card pad="lg">
        <div className="f95-stack f95-stack--sm">
          <Input
            name="name"
            label="Name"
            placeholder="Name this segment"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
            required
          />
          <Textarea
            name="description"
            label="Description"
            optional
            placeholder="Who this segment reaches and why"
            defaultValue={initial?.description ?? ""}
            error={errors.description}
          />
          <Input
            label="Search"
            placeholder="Optional keyword"
            icon={<Search size={16} strokeWidth={1.8} />}
            defaultValue={definition.search ?? ""}
            onBlur={(event) => updateSearch(event.target.value.trim())}
          />
        </div>
      </Card>

      <Card pad="lg">
        <div className="f95-cluster" style={{ justifyContent: "space-between" }}>
          <h2 className="f95-section-title">Who&rsquo;s included</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.8} />}
            onClick={addFilter}
          >
            Add filter
          </Button>
        </div>
        {filters.length === 0 ? (
          <p className="f95-table__muted" style={{ marginTop: "var(--space-3)" }}>
            No filters yet. Add one to narrow the constituents. Filters combine with AND.
          </p>
        ) : (
          <div style={{ marginTop: "var(--space-3)" }} className="f95-stack f95-stack--sm">
            {filters.map((filter, index) => {
              const def = findFilterField(RECORD_TYPE, filter.field);
              return (
                <div key={index} className="f95-cluster">
                  <Select
                    aria-label="Filter field"
                    options={fields.map((field) => ({
                      value: field.field,
                      label: field.label,
                    }))}
                    value={filter.field}
                    onChange={(event) => {
                      const nextDef = findFilterField(RECORD_TYPE, event.target.value);
                      updateFilter(index, {
                        field: event.target.value,
                        operator: nextDef?.operators[0] ?? "eq",
                        value: "",
                      });
                    }}
                  />
                  {def && def.operators.length > 1 ? (
                    <Select
                      aria-label="Filter operator"
                      options={def.operators.map((operator) => ({
                        value: operator,
                        label:
                          operator === "gte"
                            ? "On or after"
                            : operator === "lte"
                              ? "On or before"
                              : operator,
                      }))}
                      value={filter.operator}
                      onChange={(event) =>
                        updateFilter(index, {
                          operator: event.target.value as ListFilter["operator"],
                        })
                      }
                    />
                  ) : null}
                  {def?.kind === "enum" ? (
                    <Select
                      aria-label="Filter value"
                      placeholder="Choose"
                      options={def.options ?? []}
                      value={typeof filter.value === "string" ? filter.value : ""}
                      onChange={(event) => updateFilter(index, { value: event.target.value })}
                    />
                  ) : null}
                  {def?.kind === "ref" ? (
                    <Select
                      aria-label="Filter value"
                      placeholder="Choose"
                      options={refOptionsFor(def.refSource)}
                      value={typeof filter.value === "string" ? filter.value : ""}
                      onChange={(event) => updateFilter(index, { value: event.target.value })}
                    />
                  ) : null}
                  {def?.kind === "date" ? (
                    <Input
                      aria-label="Filter value"
                      type="date"
                      defaultValue={typeof filter.value === "string" ? filter.value : ""}
                      onBlur={(event) => updateFilter(index, { value: event.target.value })}
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove filter"
                    iconLeft={<X size={14} strokeWidth={1.8} />}
                    onClick={() => removeFilter(index)}
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card pad="lg">
        <h2 className="f95-section-title">Sort</h2>
        <div className="f95-formrow f95-formrow--2" style={{ marginTop: "var(--space-3)" }}>
          <Select
            label="Sort by"
            options={sortOptions}
            value={definition.sort?.field ?? sortOptions[0]?.value ?? ""}
            onChange={(event) => updateSort(event.target.value)}
          />
          <Select
            label="Direction"
            options={[
              { value: "desc", label: "Descending" },
              { value: "asc", label: "Ascending" },
            ]}
            value={definition.sort?.dir ?? "desc"}
            onChange={(event) => updateSortDir(event.target.value)}
          />
        </div>
      </Card>

      <Card pad="lg" tone="sunk">
        <div className="f95-cluster" style={{ justifyContent: "space-between" }}>
          <div className="f95-stat">
            <span className="f95-stat__label">Matching constituents</span>
            <span className="f95-stat__value">
              {previewCount === 1 ? "1 constituent" : `${previewCount} constituents`}
            </span>
            <span className="f95-stat__sub">Matching the filters above (AND logic)</span>
          </div>
          <div className="f95-cluster">
            <Link href={cancelHref}>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={pending || name.trim() === ""}>
              {pending ? "Saving" : submitLabel}
            </Button>
          </div>
        </div>
        {state.error ? (
          <p className="f95-field__err" style={{ marginTop: "var(--space-2)" }}>
            {state.error}
          </p>
        ) : null}
      </Card>
    </form>
  );
}

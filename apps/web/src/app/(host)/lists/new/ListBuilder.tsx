"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import type { ListFilter, SavedListDefinition } from "@95forward/shared";
import { Button, Card, Input, Select } from "@/components/ds";
import type { SelectOption } from "@/components/ds";
import {
  filterFieldsFor,
  findFilterField,
  sortOptionsFor,
  type RecordType,
} from "@/lib/list-fields";
import { encodeBuilderHref } from "@/lib/list-edit";
import { saveListAction, type SaveListState } from "@/server/actions/lists";

export interface RefOptions {
  users: SelectOption[];
  tags: SelectOption[];
  funds: SelectOption[];
  campaigns: SelectOption[];
  appeals: SelectOption[];
  constituents: SelectOption[];
}

export interface ListBuilderProps {
  recordType: RecordType;
  definition: SavedListDefinition;
  previewCount: number;
  refOptions: RefOptions;
}

const RECORD_TYPE_OPTIONS: SelectOption[] = [
  { value: "constituent", label: "Constituents" },
  { value: "gift", label: "Gifts" },
  { value: "interaction", label: "Actions" },
];

const initialState: SaveListState = {};

export function ListBuilder({
  recordType,
  definition,
  previewCount,
  refOptions,
}: ListBuilderProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveListAction, initialState);
  const [name, setName] = useState("");

  const fields = useMemo(() => filterFieldsFor(recordType), [recordType]);
  const sortOptions = useMemo(() => sortOptionsFor(recordType), [recordType]);

  const filters = definition.filters ?? [];

  function commit(next: SavedListDefinition) {
    router.push(encodeBuilderHref(recordType, next));
  }

  function changeRecordType(value: string) {
    const nextType = value as RecordType;
    router.push(encodeBuilderHref(nextType, { filters: [] }));
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
      case "funds":
        return refOptions.funds;
      case "campaigns":
        return refOptions.campaigns;
      case "appeals":
        return refOptions.appeals;
      case "constituents":
        return refOptions.constituents;
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
    <div className="f95-stack">
      <Card pad="lg">
        <div className="f95-stack f95-stack--sm">
          <div className="f95-formrow f95-formrow--2">
            <Select
              label="Record type"
              options={RECORD_TYPE_OPTIONS}
              value={recordType}
              onChange={(event) => changeRecordType(event.target.value)}
            />
            <Input
              label="Search"
              placeholder="Optional keyword"
              icon={<Search size={16} strokeWidth={1.8} />}
              defaultValue={definition.search ?? ""}
              onBlur={(event) => updateSearch(event.target.value.trim())}
            />
          </div>
        </div>
      </Card>

      <Card pad="lg">
        <div className="f95-cluster" style={{ justifyContent: "space-between" }}>
          <h2 className="f95-section-title">Filters</h2>
          <Button
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
            No filters yet. Add one to narrow the records. Filters combine with AND.
          </p>
        ) : (
          <div style={{ marginTop: "var(--space-3)" }} className="f95-stack f95-stack--sm">
            {filters.map((filter, index) => {
              const def = findFilterField(recordType, filter.field);
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
                      const nextDef = findFilterField(recordType, event.target.value);
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
            <span className="f95-stat__label">Preview</span>
            <span className="f95-stat__value">
              {previewCount === 1 ? "1 record" : `${previewCount} records`}
            </span>
            <span className="f95-stat__sub">Matching the filters above (AND logic)</span>
          </div>
          <form action={formAction} className="f95-cluster">
            <input type="hidden" name="recordType" value={recordType} />
            <input type="hidden" name="definition" value={JSON.stringify(cleanDefinition)} />
            <Input
              name="name"
              placeholder="Name this list"
              aria-label="List name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Button type="submit" variant="primary" disabled={pending || name.trim() === ""}>
              {pending ? "Saving" : "Save list"}
            </Button>
          </form>
        </div>
        {state.error ? (
          <p className="f95-field__err" style={{ marginTop: "var(--space-2)" }}>
            {state.error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

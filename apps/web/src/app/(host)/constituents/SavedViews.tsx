"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Check, Trash2 } from "lucide-react";
import type { SavedListDefinition } from "@95forward/shared";
import { Button, Input } from "@/components/ds";
import {
  deleteConstituentViewAction,
  saveConstituentViewAction,
  type SaveViewState,
} from "@/server/actions/lists";

export interface SavedViewItem {
  id: string;
  name: string;
  search: string;
}

export interface SavedViewsProps {
  views: SavedViewItem[];
  definition: SavedListDefinition;
}

const initialState: SaveViewState = {};

export function SavedViews({ views, definition }: SavedViewsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [state, formAction, pending] = useActionState(saveConstituentViewAction, initialState);

  useEffect(() => {
    if (state.ok) setSaving(false);
  }, [state.ok]);

  const activeSearch = searchParams.toString();

  return (
    <div className="f95-cluster">
      <div style={{ position: "relative" }}>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Bookmark size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          Views
        </Button>
        {open ? (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 20,
              minWidth: 240,
              background: "var(--surface-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              padding: "var(--space-2)",
            }}
          >
            {views.length === 0 ? (
              <div
                style={{
                  padding: "var(--space-3)",
                  font: "var(--text-caption)",
                  color: "var(--text-muted)",
                }}
              >
                No saved views yet. Filter the list, then save it.
              </div>
            ) : (
              views.map((view) => {
                const isActive = view.search === activeSearch;
                return (
                  <div key={view.id} className="f95-itemrow" style={{ padding: "6px 8px" }}>
                    <button
                      type="button"
                      className="f95-table__cell-link"
                      style={{
                        flex: 1,
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        router.push(`/constituents${view.search ? `?${view.search}` : ""}`);
                        setOpen(false);
                      }}
                    >
                      {isActive ? <Check size={14} strokeWidth={2} /> : null} {view.name}
                    </button>
                    <form action={deleteConstituentViewAction}>
                      <input type="hidden" name="id" value={view.id} />
                      <button
                        type="submit"
                        aria-label={`Delete view ${view.name}`}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          display: "inline-flex",
                        }}
                      >
                        <Trash2 size={15} strokeWidth={1.8} />
                      </button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {saving ? (
        <form action={formAction} className="f95-cluster">
          <input type="hidden" name="definition" value={JSON.stringify(definition)} />
          <Input name="name" placeholder="Name this view" aria-label="View name" required />
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? "Saving" : "Save view"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSaving(false)}>
            Cancel
          </Button>
          {state.error ? <span className="f95-field__err">{state.error}</span> : null}
        </form>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setSaving(true)}>
          Save view
        </Button>
      )}
    </div>
  );
}

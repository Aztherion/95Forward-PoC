"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

export interface EditorOption {
  value: string;
  label: string;
}

export interface GridCellProps {
  /** The COLUMN key, which is what the cell is identified by — see the testid below. */
  readonly columnKey: string;
  /** The column's human label, which is the editor's accessible name. */
  readonly label: string;
  /** What the cell reads when it is not being edited. */
  readonly display: React.ReactNode;
  /** The raw value an editor opens on. */
  readonly value: string;
  /** A select for enums and FKs; a text or date input otherwise. */
  readonly editor: "text" | "date" | "select";
  readonly options?: readonly EditorOption[];
  readonly align?: "left" | "right";
  readonly saving: boolean;
  readonly error: string | null;
  /** Commit. `prospectSourced` is only ever passed for the close date. */
  readonly onCommit: (value: string, prospectSourced?: boolean) => void;
  readonly onDismissError: () => void;
  /** Roving tabindex: exactly one cell in the grid is tabbable at a time. */
  readonly tabbable: boolean;
  readonly onFocus: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly cellRef?: (el: HTMLTableCellElement | null) => void;
  /** The close date asks who chose it before it commits. */
  readonly askProspectSourced?: boolean;
  readonly title?: string;
}

/**
 * One editable cell.
 *
 * Enter opens the editor, Enter commits, Escape cancels and returns focus to the cell. That is the
 * whole interaction, and it is the same for all eight fields so a rep going down a column never
 * has to learn a second one.
 *
 * A rejected edit does NOT silently snap back. Optimistic UI is fine — the value appears instantly
 * and the action catches up — but a revert with no explanation is how a rep comes to believe the
 * tool randomly loses their work, so the cell keeps the error visible until it is acknowledged or
 * the next edit succeeds.
 */
export function GridCell({
  columnKey,
  label,
  display,
  value,
  editor,
  options,
  align,
  saving,
  error,
  onCommit,
  onDismissError,
  tabbable,
  onFocus,
  onKeyDown,
  cellRef,
  askProspectSourced,
  title,
}: GridCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [sourced, setSourced] = useState(false);
  const [askAt, setAskAt] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const tdRef = useRef<HTMLTableCellElement>(null);

  // The server is the truth. When it answers, the editor's draft is stale.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  /**
   * The close-date question is rendered in a PORTAL, positioned over the cell.
   *
   * The grid scrolls horizontally inside `overflow: auto`, which clips any absolutely-positioned
   * child — and the child being clipped here was the prospect-sourced checkbox, so the one guard
   * that must not be skippable was invisible while the date input above it worked fine. A portal
   * escapes the clip; the position is measured from the cell and re-measured while it is open,
   * because the thing it is anchored to lives in a scrolling container.
   */
  const place = useCallback(() => {
    const rect = tdRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAskAt({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 266)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!editing || !askProspectSourced) {
      setAskAt(null);
      return;
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [editing, askProspectSourced, place]);

  function open() {
    setDraft(value);
    setSourced(false);
    onDismissError();
    setEditing(true);
  }

  function close(refocus: boolean) {
    setEditing(false);
    if (refocus) requestAnimationFrame(() => tdRef.current?.focus());
  }

  /**
   * `next` is explicit rather than read from state: a select commits from inside its own onChange,
   * where the state update has not flushed yet. Reading `draft` there committed the PREVIOUS value
   * — or, before that, nothing at all.
   */
  function commit(next: string = draft) {
    close(true);
    if (next === value && !(askProspectSourced && sourced)) return;
    onCommit(next, askProspectSourced ? sourced : undefined);
  }

  function handleCellKey(event: KeyboardEvent<HTMLTableCellElement>) {
    if (editing) return;
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      open();
      return;
    }
    onKeyDown(event);
  }

  function handleEditorKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    // Enter commits from a text or date input. A select commits on change, so Enter there is the
    // browser's own "close the listbox" and must not be hijacked.
    if (event.key === "Enter" && editor !== "select") {
      event.preventDefault();
      event.stopPropagation();
      commit();
    }
  }

  const cls = [
    "f95-grid__cell",
    "f95-grid__cell--edit",
    align === "right" ? "f95-grid__cell--num" : "",
    saving ? "is-saving" : "",
    error ? "is-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <td
      ref={(el) => {
        tdRef.current = el;
        cellRef?.(el);
      }}
      role="gridcell"
      className={cls}
      tabIndex={tabbable ? 0 : -1}
      onFocus={onFocus}
      onKeyDown={handleCellKey}
      onDoubleClick={open}
      // The COLUMN key, not the field name. An editable cell identified as `cell-amountCents`
      // while the read-only ones next to it were `cell-impact` is two naming schemes in one row,
      // and it cost a debugging session: a spec waited on `cell-amount`, which never existed.
      data-testid={`cell-${columnKey}`}
      title={title}
      aria-invalid={error ? true : undefined}
    >
      {editing ? (
        <div className="f95-grid__editor" data-testid={`editor-${columnKey}`}>
          {editor === "select" ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              className="f95-grid__input"
              value={draft}
              aria-label={label}
              // A select commits the moment it changes: picking an option IS the decision, and
              // making someone then press Enter or click away is a second step for nothing.
              onChange={(e) => {
                setDraft(e.target.value);
                commit(e.target.value);
              }}
              onKeyDown={handleEditorKey}
              onBlur={() => close(true)}
            >
              {(options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              className="f95-grid__input"
              type={editor === "date" ? "date" : "text"}
              value={draft}
              aria-label={label}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleEditorKey}
              // A date cell must not commit on blur: the prospect-sourced question lives below it,
              // and clicking the checkbox blurs the input.
              onBlur={askProspectSourced ? undefined : () => commit()}
            />
          )}

          {askProspectSourced && askAt
            ? createPortal(
                // I26's question, carried into the grid rather than reinvented. Without it a grid
                // edit would write `prospectSourced: false` by default, and the slippage argument
                // — "all three moves made by us", the Forecast Room's slipping panel — would be
                // something no real user could ever reproduce.
                <div className="f95-grid__ask" style={{ top: askAt.top, left: askAt.left }}>
                  <label className="f95-grid__asklabel">
                    <input
                      type="checkbox"
                      checked={sourced}
                      onChange={(e) => setSourced(e.target.checked)}
                      data-testid="grid-prospect-sourced"
                    />
                    The prospect gave us this date
                  </label>
                  <div className="f95-grid__askhint">
                    Leave it unchecked if we picked it. A date we invent is not a date.
                  </div>
                  <div className="f95-grid__askrow">
                    <button
                      type="button"
                      className="f95-grid__ok"
                      onClick={() => commit()}
                      data-testid="grid-date-commit"
                    >
                      Move it
                    </button>
                    <button type="button" className="f95-grid__cancel" onClick={() => close(true)}>
                      Cancel
                    </button>
                  </div>
                </div>,
                document.body,
              )
            : null}
        </div>
      ) : (
        <span className="f95-grid__value">{display}</span>
      )}

      {error ? (
        <button
          type="button"
          className="f95-grid__err"
          onClick={onDismissError}
          data-testid={`cell-error-${columnKey}`}
          title={error}
        >
          <AlertTriangle size={11} strokeWidth={2} />
          <span>{error}</span>
        </button>
      ) : null}
    </td>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CircleAlert } from "lucide-react";
import type { GridEditableField, GridGroup, GridRow } from "@95forward/shared";
import { HealthDot, InitiativeDot, ScenarioBadge } from "@/components/ds";
import { formatCurrencyFromCents } from "@/lib/format";
import {
  CONFIDENCE_LABEL,
  CONFIDENCE_OPTIONS,
  PROBABILITY_LABEL,
  PROBABILITY_OPTIONS,
  STAGE_OPTIONS,
  VISIT_LABEL,
  VISIT_OPTIONS,
  rankText,
  shortDate,
  silenceText,
  stageLabelOf,
  subtotalLine,
} from "@/app/95-forward/opportunities/grid-copy";
import { GridCell, type EditorOption } from "./GridCell";

export interface GridColumnSpec {
  readonly key: string;
  readonly label: string;
  readonly sortKey?: string;
  readonly align?: "left" | "right";
  readonly width: number;
  /** Editable columns say which field they write. */
  readonly field?: GridEditableField;
}

export interface OpportunityGridProps {
  readonly groups: readonly GridGroup[];
  readonly columns: readonly GridColumnSpec[];
  readonly initiativeOptions: readonly EditorOption[];
  readonly ownerOptions: readonly EditorOption[];
  readonly milestoneKeys: readonly { key: string; label: string }[];
  readonly today: string;
  /**
   * sortKey → the href that sorts by it next.
   *
   * A map rather than a function: this is a client component, and a function cannot cross the
   * boundary. Building the hrefs on the server also keeps "sort state lives in the URL" a single
   * decision made in one place rather than two halves that can disagree.
   */
  readonly sortHrefs: Readonly<Record<string, string>>;
  readonly sort: { field: string; dir: "asc" | "desc" };
  readonly grouped: boolean;
  /**
   * What a committed cell does. Supplied by the caller; THE GRID DOES NOT KNOW.
   *
   * This is the structural half of I31's no-write guarantee. The grid used to call
   * `editGridCellAction` itself, so "what-if mode writes nothing" would have been a runtime `if`
   * inside a component that still imported the write — one refactor away from being wrong. Now
   * the module imports no server action at all: `GridEditingHost` supplies the writing commit,
   * the what-if workspace supplies one that only changes local state, and neither can reach the
   * other's.
   *
   * Resolve with an error string to reject the edit; resolve with null to accept it.
   */
  readonly onCommitCell: (
    row: GridRow,
    field: GridEditableField,
    value: string,
    prospectSourced?: boolean,
  ) => Promise<string | null>;
  /** Cells the caller considers changed, as `opportunityId:field` — marked in the UI. */
  readonly changedCells?: ReadonlySet<string>;
  /** Baseline display values for changed cells, keyed the same way. The comparison is the point. */
  readonly baselineValues?: Readonly<Record<string, string>>;
  /** Milestone dots become togglable in what-if mode. Absent means display-only. */
  readonly onToggleMilestone?: (row: GridRow, milestoneKey: string) => void;
  /**
   * A hypothesis is pending, so the DERIVED columns and the group subtotals are showing baseline
   * figures (I30 fold-in).
   *
   * I31 leaves them at baseline deliberately — recomputing rank, next action, impact, flags or
   * scenario in the browser would mean a second implementation of I23's ranking and I20's checks,
   * and recomputing a subtotal would be a second definition of "qualified". Both are the drift
   * this codebase has spent its life avoiding. But the consequence was that the grid's footer and
   * the what-if chart answered different questions with nothing saying so, which is an invisible
   * inconsistency. Marking them turns it into a stated one.
   */
  readonly baselineOnly?: boolean;
}

type CellKey = `${string}:${string}`;
const cellKey = (opportunityId: string, field: string): CellKey => `${opportunityId}:${field}`;

/**
 * The Opportunities grid.
 *
 * Two situations it exists for: the Monday meeting, where everything is on one surface sorted the
 * leader's way, and sitting beside a rep going deal by deal — "I don't have to bounce in and out
 * of subpages to make changes, I can make them all here and see the effect on the forecast
 * immediately".
 *
 * WHAT IT IS NOT is the harder half. There is no formula engine, no cell dependency graph, no
 * user-authored expressions, no new columns, no row insert and no row delete — creation and
 * deletion carry consequences a grid cell cannot express, and the tool is not a place to do them.
 * Every cell is one typed field of the Opportunity model, validated server-side before it lands.
 */
export function OpportunityGrid({
  groups,
  columns,
  initiativeOptions,
  ownerOptions,
  milestoneKeys,
  today,
  sortHrefs,
  sort,
  grouped,
  onCommitCell,
  changedCells,
  baselineValues,
  onToggleMilestone,
  baselineOnly = false,
}: OpportunityGridProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});
  const [focused, setFocused] = useState<CellKey | null>(null);
  const cells = useRef(new Map<CellKey, HTMLTableCellElement>());

  const editableColumns = columns.filter((c) => c.field);
  const rowOrder = groups.flatMap((g) => g.rows.map((r) => r.opportunityId));

  // Fresh server data supersedes every optimistic value.
  //
  // Without this the optimistic map would shadow the props forever: the cell would keep showing
  // what this browser typed even after somebody else changed it, or after the server normalised
  // it — "$250,000.4" typed, 25000040 stored, and the cell still reading the typo. An optimistic
  // value is a promise about a round trip, and it expires when the round trip lands.
  useEffect(() => {
    setOptimistic({});
  }, [groups]);

  const commit = useCallback(
    (row: GridRow, field: GridEditableField, value: string, prospectSourced?: boolean) => {
      const key = cellKey(row.opportunityId, field);
      setSaving((s) => ({ ...s, [key]: true }));
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
      // Optimistic: the value is on screen before the round trip. A rejection puts the stored
      // value back AND says why — a silent revert is what teaches a rep the tool loses their work.
      setOptimistic((o) => ({ ...o, [key]: value }));

      void onCommitCell(row, field, value, prospectSourced).then((error) => {
        setSaving((s) => {
          const next = { ...s };
          delete next[key];
          return next;
        });
        if (error) {
          setOptimistic((o) => {
            const next = { ...o };
            delete next[key];
            return next;
          });
          setErrors((e) => ({ ...e, [key]: error }));
        }
      });
    },
    [onCommitCell],
  );

  /**
   * Arrow-key movement across the grid, with a roving tabindex so the whole grid is ONE tab stop
   * rather than a hundred and forty.
   */
  const move = useCallback(
    (event: KeyboardEvent<HTMLElement>, opportunityId: string, field: GridEditableField) => {
      const colIndex = editableColumns.findIndex((c) => c.field === field);
      const rowIndex = rowOrder.indexOf(opportunityId);
      if (colIndex < 0 || rowIndex < 0) return;

      let nextRow = rowIndex;
      let nextCol = colIndex;
      switch (event.key) {
        case "ArrowRight":
          nextCol = Math.min(editableColumns.length - 1, colIndex + 1);
          break;
        case "ArrowLeft":
          nextCol = Math.max(0, colIndex - 1);
          break;
        case "ArrowDown":
          nextRow = Math.min(rowOrder.length - 1, rowIndex + 1);
          break;
        case "ArrowUp":
          nextRow = Math.max(0, rowIndex - 1);
          break;
        case "Home":
          nextCol = 0;
          break;
        case "End":
          nextCol = editableColumns.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const target = cells.current.get(
        cellKey(rowOrder[nextRow]!, editableColumns[nextCol]!.field!),
      );
      target?.focus();
    },
    [editableColumns, rowOrder],
  );

  const firstCell = rowOrder[0]
    ? cellKey(rowOrder[0], editableColumns[0]?.field ?? "amountCents")
    : null;

  function valueOf(row: GridRow, field: GridEditableField): string {
    const key = cellKey(row.opportunityId, field);
    const override = optimistic[key];
    if (override !== undefined) return override;
    switch (field) {
      case "amountCents":
        return String(row.amountCents / 100);
      case "probability":
        return row.probability;
      case "closeDate":
        return row.closeDate ?? "";
      case "dateConfidence":
        return row.dateConfidence;
      case "stage":
        return row.stage;
      case "visitRating":
        return row.visitRating ?? "";
      case "initiativeId":
        return row.initiativeId;
      case "ownerUserId":
        return row.ownerUserId ?? "";
    }
  }

  function displayOf(row: GridRow, field: GridEditableField): React.ReactNode {
    const raw = valueOf(row, field);
    switch (field) {
      case "amountCents":
        return formatCurrencyFromCents(Math.round(Number(raw) * 100));
      case "probability":
        return PROBABILITY_LABEL[raw as keyof typeof PROBABILITY_LABEL] ?? raw;
      case "closeDate":
        return (
          <>
            {shortDate(raw === "" ? null : raw, today)}
            {row.closeDateMoves > 0 ? (
              // The move count lives IN the date cell rather than in a column of its own: it is a
              // fact about this date, and it is the thing that makes a date suspicious.
              <span
                className={`f95-grid__moves${row.closeDateMovesProspectSourced ? "" : " is-ours"}`}
                title={
                  row.closeDateMovesProspectSourced
                    ? `Moved ${row.closeDateMoves}×, at least once by them`
                    : `Moved ${row.closeDateMoves}×, every time by us`
                }
              >
                ×{row.closeDateMoves}
              </span>
            ) : null}
          </>
        );
      case "dateConfidence":
        return CONFIDENCE_LABEL[raw as keyof typeof CONFIDENCE_LABEL] ?? raw;
      case "stage":
        return stageLabelOf(raw as GridRow["stage"]);
      case "visitRating":
        return raw === "" ? "—" : (VISIT_LABEL[raw as keyof typeof VISIT_LABEL] ?? raw);
      case "initiativeId":
        return (
          <span className="f95-grid__init">
            <InitiativeDot colourKey={row.initiativeColourKey} />
            {initiativeOptions.find((o) => o.value === raw)?.label ?? row.initiativeName}
          </span>
        );
      case "ownerUserId":
        return ownerOptions.find((o) => o.value === raw)?.label ?? row.ownerName;
    }
  }

  function editorFor(field: GridEditableField): {
    editor: "text" | "date" | "select";
    options?: readonly EditorOption[];
  } {
    switch (field) {
      case "amountCents":
        return { editor: "text" };
      case "closeDate":
        return { editor: "date" };
      case "probability":
        return { editor: "select", options: PROBABILITY_OPTIONS };
      case "dateConfidence":
        return { editor: "select", options: CONFIDENCE_OPTIONS };
      case "stage":
        return { editor: "select", options: STAGE_OPTIONS };
      case "visitRating":
        return { editor: "select", options: VISIT_OPTIONS };
      case "initiativeId":
        return { editor: "select", options: initiativeOptions };
      case "ownerUserId":
        return { editor: "select", options: ownerOptions };
    }
  }

  return (
    <div className="f95-grid-wrap" data-testid="opportunity-grid-wrap">
      <table
        className="f95-grid"
        role="grid"
        aria-label="Opportunities"
        aria-rowcount={rowOrder.length}
        data-testid="opportunity-grid"
      >
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={{ width: `${c.width}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr role="row">
            {columns.map((col) => (
              <th
                key={col.key}
                role="columnheader"
                scope="col"
                className={[
                  "f95-grid__th",
                  col.align === "right" ? "f95-grid__cell--num" : "",
                  col.key === "prospect" ? "f95-grid__sticky" : "",
                  col.key === "rank" ? "f95-grid__sticky f95-grid__sticky--rank" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-sort={
                  col.sortKey && sort.field === col.sortKey
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : col.sortKey
                      ? "none"
                      : undefined
                }
              >
                {col.sortKey ? (
                  <Link
                    href={sortHrefs[col.sortKey] ?? "/95-forward/opportunities"}
                    className="f95-grid__sortlink"
                    data-testid={`sort-${col.sortKey}`}
                  >
                    {col.label}
                  </Link>
                ) : (
                  col.label
                )}
                {col.field ? <span className="f95-grid__pencil" aria-hidden="true" /> : null}
                {baselineOnly && !col.field && col.key !== "prospect" && col.key !== "rank" ? (
                  <span
                    className="f95-grid__baseonly"
                    title="Baseline — this column does not move with a what-if"
                    data-testid="baseline-only-marker"
                  >
                    baseline
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group.key} aria-label={grouped ? group.label : undefined}>
            {grouped ? (
              <tr role="row" className="f95-grid__grouprow">
                <th
                  scope="rowgroup"
                  colSpan={columns.length}
                  className="f95-grid__groupth"
                  data-testid="grid-group"
                >
                  <span className="f95-grid__groupname">
                    {group.colourKey ? <InitiativeDot colourKey={group.colourKey} /> : null}
                    {group.label}
                  </span>
                  <span className="f95-grid__groupcount">{group.rows.length}</span>
                  {/* Two totals, never one. See subtotalLine. */}
                  <span className="f95-grid__groupsub" data-testid="grid-subtotal">
                    {subtotalLine(group.subtotal)}
                    {baselineOnly ? (
                      <span className="f95-grid__baseonly" data-testid="subtotal-baseline-only">
                        baseline
                      </span>
                    ) : null}
                  </span>
                </th>
              </tr>
            ) : null}

            {group.rows.map((row) => (
              <tr
                key={row.opportunityId}
                role="row"
                data-testid="grid-row"
                data-opportunity-id={row.opportunityId}
              >
                {columns.map((col) => {
                  if (col.field) {
                    const key = cellKey(row.opportunityId, col.field);
                    const { editor, options } = editorFor(col.field);
                    return (
                      <GridCell
                        key={col.key}
                        columnKey={col.key}
                        label={col.label}
                        display={displayOf(row, col.field)}
                        value={valueOf(row, col.field)}
                        editor={editor}
                        options={options}
                        align={col.align}
                        saving={!!saving[key]}
                        error={errors[key] ?? null}
                        askProspectSourced={col.field === "closeDate"}
                        onCommit={(value, sourced) => commit(row, col.field!, value, sourced)}
                        onDismissError={() =>
                          setErrors((e) => {
                            const next = { ...e };
                            delete next[key];
                            return next;
                          })
                        }
                        changed={changedCells?.has(key) ?? false}
                        baseline={baselineValues?.[key]}
                        tabbable={focused === null ? key === firstCell : focused === key}
                        onFocus={() => setFocused(key)}
                        onKeyDown={(event) => move(event, row.opportunityId, col.field!)}
                        cellRef={(el) => {
                          if (el) cells.current.set(key, el);
                          else cells.current.delete(key);
                        }}
                      />
                    );
                  }
                  return (
                    <ReadOnlyCell
                      key={col.key}
                      col={col}
                      row={row}
                      milestoneKeys={milestoneKeys}
                      onToggleMilestone={onToggleMilestone}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/**
 * A derived cell. Read-only by construction, and announced as such.
 *
 * These are the columns that make this a war-room surface rather than a table: a leader can sort
 * by rank and filter to at-risk and see the same verdicts The Board gives, because they ARE The
 * Board's verdicts — nothing here recomputes one.
 */
function ReadOnlyCell({
  col,
  row,
  milestoneKeys,
  onToggleMilestone,
}: {
  col: GridColumnSpec;
  row: GridRow;
  milestoneKeys: readonly { key: string; label: string }[];
  onToggleMilestone?: (row: GridRow, milestoneKey: string) => void;
}) {
  const cls = [
    "f95-grid__cell",
    col.align === "right" ? "f95-grid__cell--num" : "",
    col.key === "prospect" ? "f95-grid__sticky" : "",
    col.key === "rank" ? "f95-grid__sticky f95-grid__sticky--rank" : "",
  ]
    .filter(Boolean)
    .join(" ");

  let content: React.ReactNode = null;
  switch (col.key) {
    case "rank":
      content = <span className="f95-grid__rank">{rankText(row.rank)}</span>;
      break;
    case "prospect":
      content = (
        <Link href={`/95-forward/opportunities/${row.opportunityId}`} className="f95-grid__name">
          <span className="f95-grid__namerow">
            {row.health ? <HealthDot health={row.health} /> : null}
            <span className="f95-grid__nametext">{row.prospectName}</span>
          </span>
          {row.statusText ? (
            <span className="f95-grid__status">{row.statusText}</span>
          ) : (
            <span className="f95-grid__status f95-muted">No rule fires</span>
          )}
        </Link>
      );
      break;
    case "qualification":
      content = (
        <span
          className={`f95-grid__qual${row.qualification.qualified ? " is-yes" : ""}`}
          title={
            row.qualification.qualified
              ? "A real ask"
              : `Missing: ${row.qualification.missingBlocking.map((m) => m.label).join(", ")}`
          }
        >
          {row.qualification.blockingConfirmed}/{row.qualification.blockingTotal}
        </span>
      );
      break;
    case "milestones":
      content = (
        <span className="f95-grid__dots" data-testid="grid-milestones">
          {milestoneKeys.map((m) => {
            const hit = row.milestones.find((x) => x.key === m.key);
            const on = !!hit?.confirmed;
            const theySaid = hit?.source === "they_said";
            // Disc for they-said, ring for we-said — the system's existing channel, kept so a
            // confirmed we-said dot cannot be misread as the prospect having said it. Fill
            // carries confirmed; colour carries it too, which is the "turns green means yes"
            // the source sheet asks for.
            const glyph = (
              <svg viewBox="0 0 10 10" aria-hidden="true" className="f95-grid__dotglyph">
                <circle
                  cx="5"
                  cy="5"
                  r={theySaid ? 4 : 3.4}
                  fill={theySaid && on ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={theySaid && on ? 0 : 1.6}
                />
              </svg>
            );
            const title = `${m.label} — ${on ? "confirmed" : "not confirmed"}${
              theySaid ? " (they said)" : " (we said)"
            }`;

            // Togglable ONLY in what-if mode, and even then only hypothetically. Confirming for
            // real requires confirmedBy, prospectSourced and evidence, and I26 rejects a
            // they-said claim with nobody named — a grid checkbox would walk past that guard, so
            // the normal-mode dot is a link to the checklist rather than a control.
            if (onToggleMilestone) {
              return (
                <button
                  key={m.key}
                  type="button"
                  className={`f95-grid__dot f95-grid__dot--toggle${on ? " is-on" : ""}`}
                  title={`${title} · click to try it`}
                  aria-label={`${m.label}: ${on ? "confirmed" : "not confirmed"}. Toggle hypothetically.`}
                  aria-pressed={on}
                  onClick={() => onToggleMilestone(row, m.key)}
                  data-testid={`milestone-toggle-${m.key}`}
                >
                  {glyph}
                </button>
              );
            }
            return (
              <Link
                key={m.key}
                href={`/95-forward/opportunities/${row.opportunityId}#milestones`}
                className={`f95-grid__dot${on ? " is-on" : ""}`}
                title={title}
                aria-label={`${m.label}: ${on ? "confirmed" : "not confirmed"}`}
              >
                {glyph}
              </Link>
            );
          })}
        </span>
      );
      break;
    case "nextAction":
      content = row.nextAction ? (
        <span className="f95-grid__next" title={row.statusText ?? undefined}>
          {row.nextAction.label}
        </span>
      ) : (
        <span className="f95-muted">—</span>
      );
      break;
    case "impact":
      content =
        row.impactCents === null ? (
          <span className="f95-muted">—</span>
        ) : (
          formatCurrencyFromCents(row.impactCents)
        );
      break;
    case "silence":
      content = (
        <span
          className={
            row.silenceDays !== null && row.silenceDays >= 30 ? "f95-grid__hot" : undefined
          }
        >
          {silenceText(row.silenceDays)}
        </span>
      );
      break;
    case "findings":
      content =
        row.findings.length === 0 ? (
          <span className="f95-muted">—</span>
        ) : (
          <Link
            href={`/95-forward/opportunities/${row.opportunityId}`}
            className="f95-grid__flag"
            title={row.findings.map((f) => f.statement).join("\n")}
            data-testid="grid-finding"
          >
            <CircleAlert size={12} strokeWidth={2} />
            {row.findings.length}
          </Link>
        );
      break;
    case "membership":
      content = row.membership ? (
        <ScenarioBadge badge={row.membership} />
      ) : (
        // Outside every scenario, or closed work the simulation does not carry. Not a gap.
        <span className="f95-muted">—</span>
      );
      break;
    default:
      content = null;
  }

  return (
    <td role="gridcell" className={cls} aria-readonly="true" data-testid={`cell-${col.key}`}>
      {content}
    </td>
  );
}

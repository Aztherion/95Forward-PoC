"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import type { GridEditableField, GridGroup, GridRow } from "@95forward/shared";
import { OpportunityGrid, type GridColumnSpec } from "@/components/grid";
import { editGridCellAction, type GridEditState } from "@/server/actions/grid";
import { computeWhatIfAction } from "@/server/actions/what-if";
import type { WhatIfResultView } from "@/server/data/what-if";
import { WhatIfPanel } from "./WhatIfPanel";
import { PRESETS, applyPreset, pendingSummary, type PresetId } from "./what-if-copy";
import { applyPendingToGroups } from "./what-if-rows";
import {
  EMPTY_PENDING,
  applyCellEdit,
  changedCellKeys,
  pendingCount,
  toOverrides,
  toggleMilestone as toggleMilestoneIn,
  type PendingState,
} from "./what-if-state";

export interface GridWorkspaceProps {
  readonly groups: readonly GridGroup[];
  readonly columns: readonly GridColumnSpec[];
  readonly initiativeOptions: readonly { value: string; label: string }[];
  readonly ownerOptions: readonly { value: string; label: string }[];
  readonly milestoneKeys: readonly { key: string; label: string }[];
  readonly today: string;
  readonly sortHrefs: Readonly<Record<string, string>>;
  readonly sort: { field: string; dir: "asc" | "desc" };
  readonly grouped: boolean;
  readonly scope: { readonly rep: string; readonly initiative: string };
  /** Entered in what-if mode from the URL — the Forecast Room's door. */
  readonly initialWhatIf: boolean;
  readonly initialPreset: PresetId | null;
}

/**
 * The Opportunities page's client shell: normal editing, or the what-if sandbox.
 *
 * THE SANDBOX WRITES NOTHING, AND THERE IS NO CODE HERE THAT COULD.
 *
 * The guarantee is structural rather than procedural — there is no carefully-designed commit flow
 * that has to be followed correctly, because there is no path at all from pending state to the
 * database. `onCommitCell` is chosen by mode, and in what-if mode it is a function that sets
 * React state and returns. `editGridCellAction` is not reachable from it: no branch inside it, no
 * shared helper, no callback it hands off to.
 *
 * The pending state lives here and nowhere else. Not in the URL, not in a cookie, not in server
 * session state, not in any store or context another route could read — so The Board and the
 * Forecast Room are structurally incapable of seeing a hypothesis. A reload clears it, which is
 * correct rather than a limitation: state that survives a reload is state that can be mistaken
 * for real.
 *
 * If a user likes what they see, they leave the mode and make the changes normally, where every
 * per-edit guard applies. That is slightly more work and it is the right amount of friction for
 * turning a hypothesis into a record.
 */
export function GridWorkspace({
  groups,
  columns,
  initiativeOptions,
  ownerOptions,
  milestoneKeys,
  today,
  sortHrefs,
  sort,
  grouped,
  scope,
  initialWhatIf,
  initialPreset,
}: GridWorkspaceProps) {
  const [whatIf, setWhatIf] = useState(initialWhatIf);
  const [pending, setPending] = useState<PendingState>(EMPTY_PENDING);
  const [result, setResult] = useState<WhatIfResultView | null>(null);
  const [computing, startCompute] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const presetApplied = useRef(false);

  const allRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  // What the grid actually renders. In what-if mode the rows carry the hypothesis, so the table
  // and the chart are describing the same portfolio — the first build let them disagree, and a
  // date cell reading its old value beside a curve that had collapsed was genuinely baffling.
  const shownGroups = useMemo(
    () => (whatIf ? applyPendingToGroups(groups, pending) : groups),
    [whatIf, groups, pending],
  );
  const changedCount = pendingCount(pending);

  const overrides = useMemo(() => toOverrides(pending), [pending]);

  // Recompute on COMMIT, never per keystroke — the grid already commits on Enter or on a select's
  // change, so this fires once per decision rather than once per character.
  useEffect(() => {
    if (!whatIf) {
      setResult(null);
      return;
    }
    let cancelled = false;
    startCompute(async () => {
      const response = await computeWhatIfAction({
        rep: scope.rep,
        initiative: scope.initiative,
        overrides,
      });
      if (cancelled) return;
      if (response.ok) {
        setResult(response.result);
        setError(null);
      } else {
        setError(response.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [whatIf, overrides, scope.rep, scope.initiative]);

  // The Forecast Room's door can carry a preset. Applied once, after the rows are known.
  useEffect(() => {
    if (!initialPreset || presetApplied.current || allRows.length === 0) return;
    presetApplied.current = true;
    setPending((current) => applyPreset(initialPreset, allRows, current, today));
  }, [initialPreset, allRows, today]);

  /**
   * Normal mode: the real write, with every per-edit guard behind it.
   */
  const commitReal = useCallback(
    async (
      row: GridRow,
      field: GridEditableField,
      value: string,
      prospectSourced?: boolean,
    ): Promise<string | null> => {
      const formData = new FormData();
      formData.set("opportunityId", row.opportunityId);
      formData.set("field", field);
      formData.set("value", value);
      if (prospectSourced) formData.set("prospectSourced", "on");
      const state: GridEditState = await editGridCellAction({}, formData);
      return state.ok ? null : (state.error ?? "That change was not saved.");
    },
    [],
  );

  /**
   * What-if mode: the pure reducer from `what-if-state`, and that is the entire implementation.
   *
   * Note what is absent — no action, no fetch, no revalidation, no optimistic/rollback pair,
   * because there is nothing to roll back from. `applyCellEdit` cannot reach a server: its module
   * imports nothing from `@/server`, which `no-write-path.test.ts` asserts by reading the source.
   */
  const commitHypothetical = useCallback(
    async (row: GridRow, field: GridEditableField, value: string): Promise<string | null> => {
      setPending((current) => applyCellEdit(current, row, field, value, today));
      return null;
    },
    [today],
  );

  const onToggleMilestone = useCallback((row: GridRow, milestoneKey: string) => {
    setPending((current) => toggleMilestoneIn(current, row, milestoneKey));
  }, []);

  const discard = useCallback(() => {
    setPending(EMPTY_PENDING);
    presetApplied.current = true;
  }, []);

  const exit = useCallback(() => {
    if (changedCount > 0) {
      const ok = window.confirm(
        `Leave what-if mode? ${changedCount} pending ${
          changedCount === 1 ? "change" : "changes"
        } will be discarded. Nothing was ever saved.`,
      );
      if (!ok) return;
    }
    setPending(EMPTY_PENDING);
    setWhatIf(false);
    presetApplied.current = true;
  }, [changedCount]);

  const changedCells = useMemo(() => changedCellKeys(pending), [pending]);

  return (
    <div className={whatIf ? "f95-whatif-on" : undefined} data-testid="grid-workspace">
      {whatIf ? (
        <div className="f95-wibar" role="status" data-testid="whatif-banner">
          <span className="f95-wibar__badge">
            <FlaskConical size={13} strokeWidth={2} />
            What if
          </span>
          <span className="f95-wibar__claim">These numbers are not real. Nothing is saved.</span>
          <span className="f95-wibar__count" data-testid="whatif-count">
            {pendingSummary(changedCount, result?.outOfViewCount ?? 0)}
          </span>
          <span className="f95-wibar__actions">
            <button
              type="button"
              className="f95-wibar__btn"
              onClick={discard}
              disabled={changedCount === 0}
              data-testid="whatif-discard"
            >
              <RotateCcw size={12} strokeWidth={2} />
              Discard
            </button>
            <button
              type="button"
              className="f95-wibar__btn f95-wibar__btn--exit"
              onClick={exit}
              data-testid="whatif-exit"
            >
              <X size={12} strokeWidth={2} />
              Exit what-if
            </button>
          </span>
        </div>
      ) : (
        <div className="f95-gridmode">
          <button
            type="button"
            className="f95-gridmode__enter"
            onClick={() => setWhatIf(true)}
            data-testid="whatif-enter"
          >
            <FlaskConical size={13} strokeWidth={2} />
            Explore a what-if
          </button>
          <span className="f95-gridmode__hint">
            Try changes without saving them. Nothing you do in there touches the record.
          </span>
        </div>
      )}

      {whatIf ? (
        <WhatIfPanel
          result={result}
          computing={computing}
          error={error}
          changedCount={changedCount}
          onPreset={(id: PresetId) =>
            setPending((current) => applyPreset(id, allRows, current, today))
          }
          presets={PRESETS}
        />
      ) : null}

      <OpportunityGrid
        groups={shownGroups}
        columns={columns}
        initiativeOptions={initiativeOptions}
        ownerOptions={ownerOptions}
        milestoneKeys={milestoneKeys}
        today={today}
        sortHrefs={sortHrefs}
        sort={sort}
        grouped={grouped}
        onCommitCell={whatIf ? commitHypothetical : commitReal}
        changedCells={whatIf ? changedCells : undefined}
        baselineValues={whatIf ? pending.baseline : undefined}
        onToggleMilestone={whatIf ? onToggleMilestone : undefined}
        // Only once something is actually pending: an empty sandbox shows the real numbers, and
        // marking them baseline then would be noise that teaches people to ignore the marker.
        baselineOnly={whatIf && changedCount > 0}
      />
    </div>
  );
}

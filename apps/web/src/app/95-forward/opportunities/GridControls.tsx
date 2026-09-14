"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Filter, X } from "lucide-react";
import { FORWARD_STAGES, FORWARD_STAGE_META, type GridGroupBy } from "@95forward/shared";
import { GROUP_BY_LABEL } from "./grid-copy";

export interface GridControlsProps {
  readonly initiatives: readonly { value: string; label: string }[];
  readonly owners: readonly { value: string; label: string }[];
  readonly repUserId: string;
}

/**
 * Scope, grouping and filters — all of it in the URL.
 *
 * A leader's Monday view is a link they can send, and a rep's "show me just the at-risk ones" has
 * to survive a reload and a back button. Client-side state that lives only in a component would
 * make every one of those quietly not work, and the Forecast Room already set the precedent that
 * scope travels in the query string.
 */
export function GridControls({ initiatives, owners, repUserId }: GridControlsProps) {
  const router = useRouter();
  const params = useSearchParams();

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.push(qs ? `/95-forward/opportunities?${qs}` : "/95-forward/opportunities");
    },
    [params, router],
  );

  const value = (key: string, fallback = "") => params.get(key) ?? fallback;
  const active =
    ["stage", "qualification", "flags", "health", "q"].some((k) => params.get(k)) ||
    value("initiative", "all") !== "all" ||
    value("rep", repUserId) !== repUserId;

  return (
    <div className="f95-gridbar" data-testid="grid-controls">
      <label className="f95-gridbar__field">
        <span className="f95-gridbar__label">Rep</span>
        <select
          className="f95-gridbar__select"
          value={value("rep", repUserId)}
          onChange={(e) => set({ rep: e.target.value === repUserId ? null : e.target.value })}
          data-testid="filter-rep"
        >
          {owners.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          {/* `All reps` is a leader view nobody has designed. An option that silently changed
              every number on the screen is worse than one that is not there. */}
        </select>
      </label>

      <label className="f95-gridbar__field">
        <span className="f95-gridbar__label">Initiative</span>
        <select
          className="f95-gridbar__select"
          value={value("initiative", "all")}
          onChange={(e) => set({ initiative: e.target.value === "all" ? null : e.target.value })}
          data-testid="filter-initiative"
        >
          <option value="all">Everything</option>
          {initiatives.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </label>

      <label className="f95-gridbar__field">
        <span className="f95-gridbar__label">Group</span>
        <select
          className="f95-gridbar__select"
          value={value("group", "none")}
          onChange={(e) => set({ group: e.target.value === "none" ? null : e.target.value })}
          data-testid="filter-group"
        >
          {(Object.keys(GROUP_BY_LABEL) as GridGroupBy[]).map((g) => (
            <option key={g} value={g}>
              {GROUP_BY_LABEL[g]}
            </option>
          ))}
        </select>
      </label>

      <label className="f95-gridbar__field">
        <span className="f95-gridbar__label">Stage</span>
        <select
          className="f95-gridbar__select"
          value={value("stage")}
          onChange={(e) => set({ stage: e.target.value || null })}
          data-testid="filter-stage"
        >
          <option value="">Any stage</option>
          {FORWARD_STAGES.map((s) => (
            <option key={s} value={s}>
              {FORWARD_STAGE_META[s].label}
            </option>
          ))}
        </select>
      </label>

      <label className="f95-gridbar__field">
        <span className="f95-gridbar__label">Real ask</span>
        <select
          className="f95-gridbar__select"
          value={value("qualification")}
          onChange={(e) => set({ qualification: e.target.value || null })}
          data-testid="filter-qualification"
        >
          <option value="">Either</option>
          <option value="qualified">Qualified</option>
          <option value="unqualified">Not yet</option>
        </select>
      </label>

      <label className="f95-gridbar__field">
        <span className="f95-gridbar__label">Health</span>
        <select
          className="f95-gridbar__select"
          value={value("health")}
          onChange={(e) => set({ health: e.target.value || null })}
          data-testid="filter-health"
        >
          <option value="">Any</option>
          <option value="moving">Moving</option>
          <option value="slowing">Slowing</option>
          <option value="stuck">Stuck</option>
        </select>
      </label>

      <label className="f95-gridbar__field f95-gridbar__field--check">
        <input
          type="checkbox"
          checked={params.get("flags") === "1"}
          onChange={(e) => set({ flags: e.target.checked ? "1" : null })}
          data-testid="filter-flags"
        />
        <Filter size={12} strokeWidth={2} />
        Contradicts itself
      </label>

      {active ? (
        <button
          type="button"
          className="f95-gridbar__clear"
          onClick={() =>
            set({
              stage: null,
              qualification: null,
              flags: null,
              health: null,
              q: null,
              initiative: null,
              rep: null,
            })
          }
          data-testid="filter-clear"
        >
          <X size={12} strokeWidth={2} />
          Clear
        </button>
      ) : null}
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ds";
import { undecideBoardItemAction } from "@/server/actions/board";
import type { DismissedEntry } from "@/server/data/board";

/**
 * What the user has hidden from themselves, and the way back.
 *
 * A dismissal with no visible trace is a one-way trapdoor: a mis-click silently removes coaching
 * from the person it was written for, and nothing on the screen admits it happened. Dismissals also
 * expire on their own when the underlying data moves — that is handled server-side — so this is
 * only about the ones still in force.
 */
export function Dismissed({ entries }: { entries: readonly DismissedEntry[] }) {
  const [open, setOpen] = useState(false);
  const [state, restore, pending] = useActionState(undecideBoardItemAction, {});

  if (entries.length === 0) return null;

  return (
    <div className="f95-dismissed" data-testid="dismissed">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="dismissed-toggle"
      >
        {entries.length} dismissed
      </Button>
      {open ? (
        <ul className="f95-dismissed__list" data-testid="dismissed-list">
          {entries.map((entry) => (
            <li
              className="f95-dismissed__item"
              key={`${entry.opportunityId}:${entry.ruleId ?? ""}`}
            >
              <span className="f95-dismissed__who">
                {entry.prospectName}
                {entry.ruleId ? <span className="f95-muted"> · {entry.ruleId}</span> : null}
              </span>
              <form action={restore}>
                <input type="hidden" name="opportunityId" value={entry.opportunityId} />
                <input type="hidden" name="ruleId" value={entry.ruleId ?? ""} />
                <input type="hidden" name="kind" value="dismiss" />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  iconLeft={<Undo2 size={14} strokeWidth={1.8} />}
                >
                  Restore
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      {state.error ? (
        <span className="f95-field__err" role="alert">
          {state.error}
        </span>
      ) : null}
    </div>
  );
}

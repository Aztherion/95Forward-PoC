"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, EmptyState, Input, Textarea } from "@/components/ds";
import { formatCurrencyFromCents } from "@/lib/format";
import { reportMeetingAction, type ScorecardFormState } from "@/server/actions/scorecards";
import type { MeetingLinkTarget } from "@/server/data/scorecards";
import { linkTargetLabel, SOURCE_HELP } from "./scorecards-copy";

const INITIAL: ScorecardFormState = {};

/**
 * Report a meeting.
 *
 * On success this NAVIGATES to the new Scorecard rather than closing with a toast. The wait is
 * 15–20 seconds of real work and watching it come back is the demo; a confirmation that left the
 * reader on the list would hide the only interesting part.
 *
 * The dialog is the FeedbackWidget's modal pattern — scrim, `role="dialog"`, Escape, focus on
 * open, Tab trapping — because the app has no Modal primitive (design-system.md §5.9). It takes
 * the wider variant: 520px cannot show a transcript being pasted.
 */
export function AddScorecardDialog({
  targets,
  today,
  onClose,
}: {
  targets: MeetingLinkTarget[];
  /**
   * The demo clock's today, resolved on the SERVER.
   *
   * `new Date()` here would be the browser's clock, and this demo runs at a fixed 2026-09-12 —
   * a meeting defaulting to the real date would sort above every seeded one and sit a month
   * after the war room thinks it is. Never read the wall clock (AGENTS.md).
   */
  today: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(reportMeetingAction, INITIAL);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MeetingLinkTarget | null>(null);
  const [source, setSource] = useState<"transcript" | "notes">("transcript");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (state.ok === true && state.scorecardId) {
      router.push(`/95-forward/scorecards/${state.scorecardId}`);
    }
  }, [state, router]);

  const matches = targets
    .filter((target) =>
      query.trim().length === 0
        ? true
        : `${target.prospectName} ${target.initiativeName ?? ""}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
    )
    .slice(0, 8);

  return (
    <div
      className="f95-modal__scrim"
      onClick={onClose}
      role="presentation"
      data-testid="add-scorecard-scrim"
    >
      <div
        className="f95-modal f95-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label="Add Scorecard"
        ref={dialogRef}
        onClick={(event) => {
          event.stopPropagation();
        }}
        data-testid="add-scorecard-dialog"
      >
        <h2 className="f95-modal__title">Add Scorecard</h2>
        <p className="f95-modal__lede">
          Paste what happened. The system decides what kind of meeting it was and scores it against
          the definition for that kind.
        </p>

        {targets.length === 0 ? (
          <EmptyState
            icon={<Search size={20} strokeWidth={1.8} />}
            title="Nothing to link a meeting to"
            line="Meetings hang off one of your own opportunities or prospects, and you do not hold any. A rep who owns the relationship reports the meeting."
            action={
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            }
            data-testid="add-scorecard-no-targets"
          />
        ) : (
          <form action={formAction} className="f95-inline-form">
            <input
              type="hidden"
              name={selected?.kind === "prospect" ? "prospectId" : "opportunityId"}
              value={selected?.id ?? ""}
            />
            <input type="hidden" name="sourceType" value={source} />

            {selected === null ? (
              <>
                <Input
                  label="Meeting with"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                  placeholder="Search your opportunities and prospects"
                  icon={<Search size={15} strokeWidth={1.8} />}
                  data-testid="target-search"
                />
                <div className="f95-sc-options" data-testid="target-results">
                  {matches.map((target) => (
                    <button
                      key={`${target.kind}-${target.id}`}
                      type="button"
                      className="f95-sc-option"
                      onClick={() => {
                        setSelected(target);
                      }}
                      data-testid="target-option"
                    >
                      {linkTargetLabel(
                        target.prospectName,
                        target.initiativeName,
                        target.amountCents === null
                          ? null
                          : formatCurrencyFromCents(target.amountCents),
                      )}
                    </button>
                  ))}
                  {matches.length === 0 ? (
                    <span className="f95-deflist__desc--empty">Nothing matches that.</span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="f95-cluster" data-testid="target-selected">
                <span className="f95-sc-row__name">
                  {linkTargetLabel(
                    selected.prospectName,
                    selected.initiativeName,
                    selected.amountCents === null
                      ? null
                      : formatCurrencyFromCents(selected.amountCents),
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelected(null);
                  }}
                >
                  Change
                </Button>
              </div>
            )}

            <Input
              label="Date"
              name="occurredAt"
              type="date"
              defaultValue={today}
              // A meeting in the future has not happened, so it cannot be reported.
              max={today}
              required
            />

            <div className="f95-stack f95-stack--sm">
              <div className="f95-cluster" role="group" aria-label="Source">
                <Button
                  variant={source === "transcript" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => {
                    setSource("transcript");
                  }}
                  data-testid="source-transcript"
                >
                  Transcript
                </Button>
                <Button
                  variant={source === "notes" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => {
                    setSource("notes");
                  }}
                  data-testid="source-notes"
                >
                  Notes
                </Button>
              </div>
              <span className="f95-deflist__desc--empty">{SOURCE_HELP}</span>
            </div>

            <Textarea
              label="What happened"
              name="content"
              rows={8}
              placeholder="Paste the transcript or your notes."
              required
              data-testid="meeting-content"
            />

            {state.error ? (
              <span className="f95-field__err" role="alert" data-testid="add-scorecard-error">
                {state.error}
              </span>
            ) : null}

            <div className="f95-cluster">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={pending || selected === null}
                data-testid="add-scorecard-submit"
              >
                {pending ? "Scoring…" : "Add Scorecard"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

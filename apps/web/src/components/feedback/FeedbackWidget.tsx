"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, Lightbulb, MessageSquarePlus } from "lucide-react";
import {
  FEEDBACK_AREAS,
  FEEDBACK_ENVIRONMENTS,
  FEEDBACK_SEVERITIES,
} from "@95forward/shared";
import { Button, Input, Select, Textarea } from "@/components/ds";
import { submitFeedbackAction } from "@/server/actions/feedback";
import { initialFeedbackState } from "@/server/actions/feedback-state";

type Kind = "bug" | "feature";

function toOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: value }));
}

export function FeedbackWidget() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const [state, formAction, isPending] = useActionState(
    submitFeedbackAction,
    initialFeedbackState,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (kind === null) return;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(
      "input, textarea, select, button",
    );
    first?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setKind(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const firstEl = focusable[0]!;
      const lastEl = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [kind]);

  function openForm(next: Kind) {
    setMenuOpen(false);
    setKind(next);
  }

  function closeForm() {
    setKind(null);
    triggerRef.current?.focus();
  }

  return (
    <div className="f95-feedback" ref={containerRef} data-testid="feedback-widget">
      <button
        type="button"
        className="shell-bell"
        aria-label="Send feedback"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        ref={triggerRef}
        onClick={() => setMenuOpen((open) => !open)}
        data-testid="feedback-trigger"
      >
        <MessageSquarePlus size={18} strokeWidth={1.8} />
      </button>

      {menuOpen ? (
        <div className="f95-feedback__menu" role="menu" data-testid="feedback-menu">
          <button
            type="button"
            role="menuitem"
            className="f95-feedback__menuitem"
            onClick={() => openForm("bug")}
            data-testid="feedback-menu-bug"
          >
            <Bug size={15} strokeWidth={1.8} />
            Report a bug
          </button>
          <button
            type="button"
            role="menuitem"
            className="f95-feedback__menuitem"
            onClick={() => openForm("feature")}
            data-testid="feedback-menu-feature"
          >
            <Lightbulb size={15} strokeWidth={1.8} />
            Request a feature
          </button>
        </div>
      ) : null}

      {kind !== null ? (
        <div className="f95-modal__scrim" onClick={closeForm}>
          <div
            className="f95-modal"
            role="dialog"
            aria-modal="true"
            aria-label={kind === "bug" ? "Report a bug" : "Request a feature"}
            ref={dialogRef}
            onClick={(event) => event.stopPropagation()}
            data-testid="feedback-modal"
          >
            {state.ok ? (
              <div className="f95-feedback__done" data-testid="feedback-confirmation">
                {state.debugPayload ? (
                  <script
                    type="application/json"
                    data-testid="feedback-debug-payload"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(state.debugPayload) }}
                  />
                ) : null}
                <h2 className="f95-modal__title">Thanks — sent to the team</h2>
                <p className="f95-modal__lede">
                  We&rsquo;ve logged your {kind === "bug" ? "report" : "idea"}
                  {state.reference ? ` (ref ${state.reference})` : ""}. Someone will take a look.
                </p>
                <div className="f95-cluster">
                  <Button variant="primary" size="sm" onClick={closeForm}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form action={formAction} className="f95-inline-form" data-testid="feedback-form">
                <h2 className="f95-modal__title">
                  {kind === "bug" ? "Report a bug" : "Request a feature"}
                </h2>
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="route" value={pathname} />

                <Input
                  name="summary"
                  label="One-line summary"
                  required
                  maxLength={200}
                  placeholder={
                    kind === "bug"
                      ? "The 'based on…' note runs off the edge of the copilot card"
                      : "Let me filter the prospect list by last gift amount"
                  }
                />

                {kind === "bug" ? (
                  <>
                    <Textarea
                      name="whatHappened"
                      label="What happened?"
                      required
                      rows={3}
                      placeholder={"What happened: …\nWhat I expected: …"}
                    />
                    <Textarea
                      name="steps"
                      label="Steps to reproduce"
                      optional
                      rows={3}
                      placeholder={"1. Go to …\n2. Click …\n3. Notice …"}
                    />
                    <Select
                      name="area"
                      label="Where in the app?"
                      required
                      options={toOptions(FEEDBACK_AREAS)}
                    />
                    <Select
                      name="environment"
                      label="Where were you testing?"
                      required
                      options={toOptions(FEEDBACK_ENVIRONMENTS)}
                    />
                    <Select
                      name="severity"
                      label="How bad is it? (your best guess)"
                      required
                      options={toOptions(FEEDBACK_SEVERITIES)}
                    />
                    <Textarea
                      name="screenshots"
                      label="Screenshots or recording"
                      optional
                      rows={2}
                      placeholder="Paste a link or describe what you saw…"
                    />
                  </>
                ) : (
                  <Textarea
                    name="detail"
                    label="What would you like, and why?"
                    required
                    rows={4}
                    placeholder={"I'd like … so that …"}
                  />
                )}

                {state.error ? (
                  <span className="f95-field__err" role="alert">
                    {state.error}
                  </span>
                ) : null}

                <div className="f95-cluster">
                  <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                    {isPending ? "Sending…" : "Send"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

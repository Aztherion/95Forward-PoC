"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, RefreshCw, Sparkle } from "lucide-react";
import type { NextActionKind } from "@95forward/shared";
import { Button, Card, MonoCaption, Textarea } from "@/components/ds";
import {
  generateDraftAction,
  markDraftDoneAction,
  saveDraftEditAction,
  type DraftFormState,
} from "@/server/actions/drafts";
import type { DraftView } from "@/server/data/drafts";

const ARTIFACT: Record<NextActionKind, string> = {
  "follow-up-to-close": "follow-up email",
  "make-specific-ask": "ask",
  "get-it-in-writing": "confirmation letter",
  "prep-the-visit": "visit prep brief",
  "get-ask-approved": "approval request",
  "use-introduction": "introduction request",
  // Not "introduction request" as well: the board's CTA for this kind is "Draft the ask to your
  // partner", and the two are different acts. `use-introduction` follows through on a door someone
  // already offered to open; this one asks them to offer.
  "ask-partner": "ask to your partner",
  "get-the-visit": "meeting request",
  "steward-the-gift": "thank-you",
};

// "A ask", "A approval request", "A introduction request" — three of the nine labels start with a
// vowel, and the lede reads them aloud.
function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? "An" : "A";
}

const DONE_LABEL: Record<string, string> = {
  prospect: "I've sent it",
  connector: "I've sent it",
  internal: "Done",
};

export interface DraftPanelProps {
  opportunityId: string;
  kind: NextActionKind;
  prospectName: string;
  /** The draft already on the record, if any. Server-rendered, so a reload shows it. */
  initial: DraftView | null;
}

/**
 * The panel a primary action opens.
 *
 * "Here's the next step. It's drafted. Just hit click." That is the moment this exists to create,
 * so the panel opens on the artifact rather than on a form, and the artifact is editable where it
 * sits.
 *
 * THE PoC SENDS NOTHING. There is no email integration and no send path anywhere in the product, so
 * the panel says so plainly instead of rendering a Send button that lies. The flow ends in copy out
 * and mark done — which is honest, complete, and demoable. "Never auto-send" is structural here,
 * not a policy.
 */
export function DraftPanel({ opportunityId, kind, prospectName, initial }: DraftPanelProps) {
  const [draft, setDraft] = useState<DraftView | null>(initial);
  const [text, setText] = useState(initial?.finalText ?? "");
  const [copied, setCopied] = useState(false);
  const [effect, setEffect] = useState<string | null>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const hadDraft = useRef(initial !== null);

  const [genState, generate, generating] = useActionState(
    generateDraftAction,
    {} as DraftFormState,
  );
  const [saveState, save, saving] = useActionState(saveDraftEditAction, {} as DraftFormState);
  const [doneState, markDone, completing] = useActionState(
    markDraftDoneAction,
    {} as DraftFormState,
  );

  // The first draft on a record scrolls itself into view. On a Board card the panel opens INLINE
  // below the metric block and the card header, which at 1280x800 puts the letter off the bottom of
  // the screen: the rep presses "draft it", something happens somewhere they cannot see, and the
  // moment the whole feature exists for is spent scrolling. Only on the first one — a regenerate or
  // a save should not yank the page while they are reading.
  useEffect(() => {
    if (!genState.ok || !genState.draft || hadDraft.current) return;
    hadDraft.current = true;
    // `start`, not `nearest`: the panel is taller than the space it opens in, so bringing its top
    // to the top of the viewport is what actually puts the letter on screen.
    headRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [genState]);

  useEffect(() => {
    for (const state of [genState, saveState, doneState]) {
      if (state.ok && state.draft) {
        setDraft(state.draft);
        setText(state.draft.finalText);
      }
    }
    if (doneState.ok && doneState.effect) setEffect(doneState.effect);
  }, [genState, saveState, doneState]);

  const artifact = ARTIFACT[kind];
  const dirty = draft !== null && text.trim() !== draft.finalText.trim();
  const error = genState.error ?? saveState.error ?? doneState.error;

  return (
    <Card
      tone="ai"
      accent
      pad="md"
      className="f95-draft"
      data-testid="draft-panel"
      // The kind drives the artifact, the recipient and what `done` writes back. Exposed so a
      // test can find the connector panel by kind rather than by matching prose.
      data-kind={kind}
    >
      <div className="f95-draft__head" ref={headRef}>
        <div>
          <div className="f95-eyebrow">Drafted for you</div>
          <p className="f95-draft__lede">
            {article(artifact)} {artifact} for {prospectName}, grounded in this record. Read it,
            change what you want.
          </p>
        </div>
        {draft ? (
          <form action={generate}>
            <input type="hidden" name="opportunityId" value={opportunityId} />
            <input type="hidden" name="kind" value={kind} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={generating}
              data-testid="draft-regenerate"
              iconLeft={<RefreshCw size={14} strokeWidth={1.8} />}
            >
              {generating ? "Drafting…" : "Draft again"}
            </Button>
          </form>
        ) : null}
      </div>

      {draft === null ? (
        <form action={generate} className="f95-draft__empty">
          <input type="hidden" name="opportunityId" value={opportunityId} />
          <input type="hidden" name="kind" value={kind} />
          <Button
            type="submit"
            variant="go"
            size="sm"
            disabled={generating}
            aria-busy={generating}
            data-testid="draft-generate"
            iconLeft={<Sparkle size={15} strokeWidth={1.8} />}
          >
            {generating ? "Drafting…" : `Draft the ${artifact}`}
          </Button>
          {/* A pending state that says what it is doing, so it is never mistaken for a hang. */}
          {generating ? (
            <span className="f95-draft__pending" data-testid="draft-pending">
              Reading the record and writing a first version…
            </span>
          ) : null}
        </form>
      ) : (
        <>
          {draft.subject ? (
            // Not a MonoCaption: that uppercases, and a subject line is a sentence a human wrote.
            <p className="f95-draft__subject" data-testid="draft-subject">
              <span className="f95-muted">Subject:</span> {draft.subject}
            </p>
          ) : null}

          <Textarea
            label="The draft"
            name="draft-body"
            value={text}
            rows={16}
            onChange={(event) => setText(event.target.value)}
            data-testid="draft-body"
          />

          {draft.groundingIssues.length > 0 ? (
            // Advisory, not blocking. A human reviews this before it is used, and telling them
            // "this mentions someone the record does not" is more useful than refusing to show it.
            <div className="f95-draft__warn" data-testid="draft-grounding">
              <AlertTriangle size={14} strokeWidth={1.8} />
              <span>
                Check before sending — this mentions something the record does not:{" "}
                {draft.groundingIssues.join("; ")}
              </span>
            </div>
          ) : null}

          <div className="f95-cluster f95-draft__actions">
            <form action={save}>
              <input type="hidden" name="opportunityId" value={opportunityId} />
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="finalText" value={text} />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={!dirty || saving}
                data-testid="draft-save"
              >
                {saving ? "Saving…" : "Save my version"}
              </Button>
            </form>

            <Button
              variant="secondary"
              size="sm"
              data-testid="draft-copy"
              iconLeft={<Copy size={14} strokeWidth={1.8} />}
              onClick={() => {
                // Subject and body are separate fields here, so copy re-joins them: the rep pastes
                // one block into a mail client and nothing has been left behind.
                const out = draft?.subject ? `Subject: ${draft.subject}\n\n${text}` : text;
                void navigator.clipboard?.writeText(out).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
            >
              {copied ? "Copied" : "Copy it out"}
            </Button>

            <form action={markDone}>
              <input type="hidden" name="opportunityId" value={opportunityId} />
              <input type="hidden" name="kind" value={kind} />
              <Button
                type="submit"
                variant="go"
                size="sm"
                disabled={completing || draft.completedAt !== null}
                data-testid="draft-done"
                iconLeft={<Check size={14} strokeWidth={1.8} />}
              >
                {draft.completedAt ? "Done" : (DONE_LABEL[draft.audience] ?? "Done")}
              </Button>
            </form>
          </div>

          <MonoCaption data-testid="draft-provenance">
            {draft.provider === "mock" ? "FIXTURE DRAFT" : "GENERATED"}
            {draft.regeneratedCount > 0 ? ` · DRAFTED ${draft.regeneratedCount + 1}×` : ""}
            {draft.edited ? ` · EDITED BY YOU · ${draft.editedPercent}% CHANGED` : " · UNEDITED"}
          </MonoCaption>

          {/* Said plainly rather than implied by a disabled button. */}
          <p className="f95-draft__nosend f95-muted" data-testid="draft-no-send">
            95 Forward does not send email. Copy this into your own mail client, send it, then mark
            it done here so the record catches up.
          </p>

          {effect ? (
            <p className="f95-draft__effect" data-testid="draft-effect">
              {effect}
            </p>
          ) : null}
        </>
      )}

      {error ? (
        // The panel stays open. Closing it would leave a rep looking at the button they pressed
        // with no sign anything happened — which is what a hang looks like.
        <div className="f95-draft__warn" role="alert" data-testid="draft-error">
          <AlertTriangle size={14} strokeWidth={1.8} />
          <span>{error}</span>
          <form action={generate}>
            <input type="hidden" name="opportunityId" value={opportunityId} />
            <input type="hidden" name="kind" value={kind} />
            <Button type="submit" variant="ghost" size="sm" data-testid="draft-retry">
              Try again
            </Button>
          </form>
        </div>
      ) : null}
    </Card>
  );
}

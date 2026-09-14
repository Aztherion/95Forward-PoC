"use client";

import { useActionState, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { MilestoneState } from "@95forward/db";
import { Button, Checkbox, Input, MilestoneBadge, MonoCaption } from "@/components/ds";
import { formatDate } from "@/lib/format";
import { confirmMilestoneAction } from "@/server/actions/opportunity";

export interface MilestoneListProps {
  opportunityId: string;
  milestones: readonly MilestoneState[];
  /**
   * Per-key sentence for a milestone that is NOT confirmed, computed by the page from the record's
   * own facts — "All 3 close dates were set by us", "81 days since the verbal yes". A generic
   * "not confirmed" is true of every unconfirmed milestone and therefore says nothing.
   */
  unconfirmedNotes: Readonly<Record<string, string>>;
  footer: string | null;
  blockingCount: number;
}

function badgeFor(m: MilestoneState) {
  if (m.confirmed) return m.source === "they_said" ? "they-said" : "we-said";
  return m.blocking ? "blocking" : "not-asked";
}

/**
 * The evidence line under a milestone.
 *
 * A confirmed milestone shows its evidence, which is what makes it evidence rather than a tick. It
 * does NOT also prepend the date and the confirmer: the seeded evidence already reads
 * "Jun 23 · Ellen Hallworth, verbally — nothing in writing", and composing a second date in front
 * of it printed the same fact twice. Who and when are on the record either way — the timeline below
 * carries them for every change, which is where "who moved it" belongs.
 *
 * An unconfirmed one states the absence plainly rather than leaving a blank. "Not asked. Not
 * blocking the gift." is a fact about the deal, not a missing field.
 */
function evidenceLine(m: MilestoneState, unconfirmedNote: string | undefined): string {
  if (m.confirmed) {
    if (m.evidence) return m.evidence;
    const when = m.confirmedAt ? formatDate(m.confirmedAt) : null;
    return [when, m.confirmedBy].filter(Boolean).join(" · ") || "Confirmed.";
  }
  if (unconfirmedNote) return unconfirmedNote;
  return m.blocking ? "Not confirmed by the prospect." : "Not asked. Not blocking the gift.";
}

function MilestoneRow({
  milestone,
  opportunityId,
  unconfirmedNote,
}: {
  milestone: MilestoneState;
  opportunityId: string;
  unconfirmedNote: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [state, confirm, pending] = useActionState(confirmMilestoneAction, {});
  const theySaid = milestone.source === "they_said";

  return (
    <li
      className={`f95-ms ${milestone.confirmed ? "f95-ms--confirmed" : ""}`}
      data-testid="milestone-row"
      data-key={milestone.key}
      data-confirmed={milestone.confirmed}
    >
      <span className="f95-ms__mark" aria-hidden>
        {milestone.confirmed ? <Check size={15} strokeWidth={2.2} /> : null}
      </span>
      <div className="f95-ms__body">
        <div className="f95-ms__head">
          <span className="f95-ms__label">{milestone.label}</span>
          <MilestoneBadge kind={badgeFor(milestone)} />
        </div>
        <p className="f95-ms__evidence f95-muted">{evidenceLine(milestone, unconfirmedNote)}</p>
        {milestone.documentUrl ? (
          <a className="f95-table__cell-link" href={milestone.documentUrl} rel="noreferrer">
            The document
          </a>
        ) : null}

        {open ? (
          <form action={confirm} className="f95-ms__form" data-testid="milestone-form">
            <input type="hidden" name="opportunityId" value={opportunityId} />
            <input type="hidden" name="key" value={milestone.key} />
            <input type="hidden" name="confirmed" value={milestone.confirmed ? "false" : "true"} />
            {milestone.confirmed ? (
              <p className="f95-muted">
                Un-confirm this? The change is recorded, and qualification recomputes.
              </p>
            ) : (
              <>
                {/* Asked, never inferred. A they-said milestone is only they-said if the prospect
                    actually said it; deriving the flag from the milestone's own source would make
                    the field a tautology and the event log worthless as evidence. */}
                <Checkbox
                  name="prospectSourced"
                  defaultChecked={theySaid}
                  label={
                    theySaid
                      ? "The prospect told us this"
                      : "The prospect was involved in this (usually not)"
                  }
                />
                <Input
                  label="Who said it"
                  name="confirmedByName"
                  placeholder={theySaid ? "Ellen Hallworth, verbally" : "optional"}
                  error={state.fieldErrors?.confirmedByName}
                />
                <Input
                  label="Evidence"
                  name="evidence"
                  optional
                  placeholder="What was said, and where"
                />
                <Input
                  label="Link to the document"
                  name="documentUrl"
                  optional
                  placeholder="https://…"
                />
              </>
            )}
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Recording…" : milestone.confirmed ? "Un-confirm" : "Record it"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
            {state.error ? (
              <span className="f95-field__err" role="alert">
                {state.error}
              </span>
            ) : null}
          </form>
        ) : (
          <div className="f95-cluster f95-ms__actions">
            <Button
              variant={milestone.confirmed ? "ghost" : "secondary"}
              size="sm"
              onClick={() => setOpen(true)}
              data-testid="milestone-toggle"
              iconLeft={
                milestone.confirmed ? (
                  <X size={14} strokeWidth={1.8} />
                ) : (
                  <Plus size={14} strokeWidth={1.8} />
                )
              }
            >
              {milestone.confirmed
                ? "Un-confirm"
                : // The milestone's own verb — "Record their date", "Ask at close" — because the
                  // milestone set is data and a screen that hardcoded six verbs would drift the
                  // moment an org changed one. The generic verb is the fallback (I27).
                  (milestone.actionLabel ?? (theySaid ? "Record their answer" : "Record it"))}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * "Is this ask real?" — six objective milestones, in two sections.
 *
 * The asymmetry is the most novel idea in the product, so it is carried by the STRUCTURE: what the
 * prospect said sits above what we said, under headings that say which is which, and the badges
 * separate solid-and-filled from empty-and-dashed. Read the page in greyscale, or read only the
 * headings, and the argument still lands.
 *
 * These rows are a scoreboard, not a form. Nothing is an input until you choose to record
 * something — which is also what keeps a confirmation deliberate rather than a stray click.
 */
export function MilestoneList({
  opportunityId,
  milestones,
  unconfirmedNotes,
  footer,
  blockingCount,
}: MilestoneListProps) {
  const theySaid = milestones.filter((m) => m.source === "they_said");
  const weSaid = milestones.filter((m) => m.source === "we_said");

  return (
    <section className="f95-card f95-msblock" data-testid="milestones">
      <div className="f95-card__pad">
        <div className="f95-msblock__head">
          <div>
            <h2 className="f95-section-title">Is this ask real?</h2>
            <p className="f95-msblock__lede f95-muted">
              {milestones.length} objective milestones. Only what the prospect said makes it real.
            </p>
          </div>
          <MonoCaption tone={blockingCount > 0 ? "alert" : "muted"}>
            TAP TO RECORD · {blockingCount} BLOCKING
          </MonoCaption>
        </div>

        <div className="f95-msblock__section f95-msblock__section--they">
          <div className="f95-eyebrow">They said — this is what counts</div>
          <ul className="f95-msblock__list">
            {theySaid.map((m) => (
              <MilestoneRow
                key={m.key}
                milestone={m}
                opportunityId={opportunityId}
                unconfirmedNote={unconfirmedNotes[m.key]}
              />
            ))}
          </ul>
        </div>

        <div className="f95-msblock__section f95-msblock__section--we">
          <div className="f95-eyebrow f95-eyebrow--quiet">
            We said — our own claims, worth nothing alone
          </div>
          <ul className="f95-msblock__list">
            {weSaid.map((m) => (
              <MilestoneRow
                key={m.key}
                milestone={m}
                opportunityId={opportunityId}
                unconfirmedNote={unconfirmedNotes[m.key]}
              />
            ))}
          </ul>
        </div>

        {footer ? (
          <p className="f95-msblock__footer" data-testid="milestone-footer">
            {footer}
          </p>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import { useActionState, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { Finding } from "@95forward/shared";
import { Button, Card, MonoCaption, RuleChip } from "@/components/ds";
import { formatCurrencyFromCents } from "@/lib/format";
import { decideBoardItemAction } from "@/server/actions/board";
import { effortPhrase, fixFirstSummary } from "./board-copy";

export interface FixFirstProps {
  findings: readonly Finding[];
  /** From DayWorkSummary. Summed by the engine so the claim cannot drift from the findings. */
  totalEffortSeconds: number;
  labels: Readonly<Record<string, { prospectName: string; initiativeName: string }>>;
}

/**
 * Data-integrity items, collapsed by default.
 *
 * The original design rendered all three expanded. I24 measured that block at 52% of everything
 * above item #1, and the no-scroll constraint at 1280x800 fails by ~66px with it — so I17b amended
 * the spec to a summary line that expands in place. It is also the better design: the count and the
 * time cost are what persuade, and the detail belongs one click away, at the moment you act on it.
 */
export function FixFirst({ findings, totalEffortSeconds, labels }: FixFirstProps) {
  const [open, setOpen] = useState(false);
  const [state, dismiss, pending] = useActionState(decideBoardItemAction, {});

  // A clean forecast is silent. An empty-state card here would congratulate the user for the
  // absence of a problem, which is noise on a screen whose whole job is signal.
  if (findings.length === 0) return null;

  return (
    <section className="f95-stack f95-stack--sm" data-testid="fix-first">
      <Card accent pad="md" className="f95-fixfirst">
        <div className="f95-fixfirst__summary">
          <div>
            <div className="f95-eyebrow">Fix first</div>
            <div className="f95-fixfirst__line" data-testid="fix-first-summary">
              {fixFirstSummary(findings.length, totalEffortSeconds)}
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            data-testid="fix-first-toggle"
            iconRight={
              <ChevronDown
                size={14}
                strokeWidth={1.8}
                style={{ transform: open ? "rotate(180deg)" : undefined }}
              />
            }
          >
            {open ? "Hide" : "Review"}
          </Button>
        </div>

        {open ? (
          <ol className="f95-fixfirst__list" data-testid="fix-first-items">
            {findings.map((finding, index) => {
              const label = labels[finding.opportunityId];
              return (
                <li
                  className="f95-fixfirst__item"
                  key={`${finding.opportunityId}:${finding.ruleId}`}
                  data-testid="fix-first-item"
                >
                  <span className="f95-fixfirst__num">{String(index + 1).padStart(2, "0")}</span>
                  <div className="f95-fixfirst__body">
                    <div className="f95-fixfirst__who">
                      <strong>{label?.prospectName ?? "Unknown prospect"}</strong>
                      <span className="f95-muted">
                        {" · "}
                        {label?.initiativeName ?? "—"}
                        {" · "}
                        {formatCurrencyFromCents(finding.amountCents)}
                      </span>
                    </div>
                    <p className="f95-fixfirst__statement">{finding.statement}</p>
                    {/* The consequence is COMPUTED — what this record does to the actual numbers
                        above, not a generic warning. `provisional` means it is the metric-backed
                        stand-in for a figure that wants the simulation, and it says so. */}
                    <MonoCaption tone={finding.consequence.cents === null ? "muted" : "alert"}>
                      {finding.consequence.text.toUpperCase()} ·{" "}
                      {effortPhrase(finding.effortSeconds).toUpperCase()}
                      {finding.consequence.provisional ? " · ESTIMATE" : ""}
                    </MonoCaption>
                    <div className="f95-cluster f95-fixfirst__actions">
                      <Button
                        href={`/95-forward/opportunities/${finding.opportunityId}`}
                        variant="primary"
                        size="sm"
                      >
                        {finding.resolution.label}
                      </Button>
                      <RuleChip ruleId={finding.ruleId} kind="CHECK" />
                      <form action={dismiss}>
                        <input type="hidden" name="opportunityId" value={finding.opportunityId} />
                        <input type="hidden" name="ruleId" value={finding.ruleId} />
                        <input type="hidden" name="kind" value="dismiss" />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          aria-label={`Dismiss ${finding.ruleId} on ${label?.prospectName ?? "this opportunity"}`}
                          iconLeft={<X size={14} strokeWidth={1.8} />}
                        >
                          Dismiss
                        </Button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}

        {state.error ? (
          <span className="f95-field__err" role="alert">
            {state.error}
          </span>
        ) : null}
      </Card>
    </section>
  );
}

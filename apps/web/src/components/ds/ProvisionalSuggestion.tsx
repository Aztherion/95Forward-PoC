"use client";

import type { ReactNode } from "react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { SourceTag } from "./SourceTag";

export type ProvisionalSuggestionState = "pending" | "approved" | "edited" | "dismissed";

export interface ProvisionalSuggestionProps {
  title?: string;
  children: ReactNode;
  source?: string;
  from?: string;
  to?: string;
  confidence?: number;
  state?: ProvisionalSuggestionState;
  busy?: boolean;
  onApprove?: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
  actionsSlot?: ReactNode;
  className?: string;
}

const RESOLVED_COPY: Record<"approved" | "edited" | "dismissed", { text: string; ok: boolean }> = {
  approved: { text: "Approved — applied.", ok: true },
  edited: { text: "Updated — applied.", ok: true },
  dismissed: { text: "Dismissed — kept as you had it.", ok: false },
};

export function ProvisionalSuggestion({
  title = "Copilot suggests",
  children,
  source,
  from,
  to,
  confidence,
  state = "pending",
  busy = false,
  onApprove,
  onEdit,
  onDismiss,
  actionsSlot,
  className = "",
}: ProvisionalSuggestionProps) {
  const cls = ["f95-prov", className].filter(Boolean).join(" ");

  if (state !== "pending") {
    const resolved = RESOLVED_COPY[state];
    return (
      <Card tone="ai" accent className={cls}>
        <div
          className={[
            "f95-prov__resolved",
            resolved.ok ? "f95-prov__resolved--ok" : "f95-prov__resolved--no",
          ].join(" ")}
        >
          {resolved.text}
        </div>
      </Card>
    );
  }

  const hasDelta = from != null && to != null;

  return (
    <Card tone="ai" accent className={cls} aria-busy={busy || undefined}>
      <div className="f95-prov__top">
        <Badge tone="ai">{title}</Badge>
        {typeof confidence === "number" ? (
          <span className="f95-prov__confidence">{confidence}% confident</span>
        ) : null}
      </div>

      <div className="f95-prov__body">{children}</div>

      {hasDelta ? (
        <div className="f95-prov__delta">
          <span className="f95-prov__from">{from}</span>
          <span className="f95-prov__arrow" aria-hidden="true">
            →
          </span>
          <span className="f95-prov__to">{to}</span>
        </div>
      ) : null}

      <div className="f95-prov__footer">
        <SourceTag source={source} />
        {actionsSlot ?? (
          <div className="f95-prov__acts">
            <Button variant="primary" size="sm" disabled={busy} onClick={onApprove}>
              Approve
            </Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

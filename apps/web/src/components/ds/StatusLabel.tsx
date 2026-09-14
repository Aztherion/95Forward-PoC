import type { HTMLAttributes } from "react";
import {
  STATUS_HEALTH,
  STATUS_LABEL_TEXT,
  type QueueHealth,
  type QueueStatusLabel,
} from "@95forward/shared";

export interface StatusLabelProps extends HTMLAttributes<HTMLSpanElement> {
  /** One of the seven closed status labels from the ranking engine. */
  status: QueueStatusLabel;
  /** Hide the dot where the row already carries one. */
  dot?: boolean;
}

/**
 * `AT RISK` · `ON TRACK` · `COLD` — the queue's status label, coloured by its health.
 *
 * Both the health and the wording come from `@95forward/shared`, never from the caller. A screen
 * that re-cased the label or picked its own colour would be a second source for one value, and the
 * red/amber/green vocabulary is only learnable while every surface agrees.
 */
export function StatusLabel({ status, dot = true, className = "", ...rest }: StatusLabelProps) {
  const health: QueueHealth = STATUS_HEALTH[status];
  const cls = ["f95-status", `f95-status--${health}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} data-health={health} data-status={status} {...rest}>
      {dot ? <span className="f95-status__dot" /> : null}
      {STATUS_LABEL_TEXT[status]}
    </span>
  );
}

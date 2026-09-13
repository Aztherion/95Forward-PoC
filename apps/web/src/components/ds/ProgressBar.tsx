import type { HTMLAttributes } from "react";
import type { QueueHealth } from "@95forward/shared";

export type ProgressTone = "accent" | QueueHealth;

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Completed units. Clamped into `[0, max]`. */
  value: number;
  /** Total units. Values below 1 are treated as 1 — an empty denominator is not a bar. */
  max?: number;
  tone?: ProgressTone;
  size?: "sm" | "lg";
  /** What the bar is measuring, for the accessible name. Required: a bare bar says nothing. */
  label: string;
}

/**
 * The qualification counter's bar and the initiative-share bar.
 *
 * Rides `.f95-progress`, which already exists. What is new is the two things none of its five
 * existing call sites do: it clamps (two of the five feed raw unclamped percentages straight into
 * a width, so a share above 100% overflows its track), and it carries a role and an accessible
 * name (none of the five carry either, so the bar is silent to a screen reader).
 *
 * The existing five are left as they are; this is for the new screens.
 */
export function ProgressBar({
  value,
  max = 100,
  tone = "accent",
  size = "sm",
  label,
  className = "",
  ...rest
}: ProgressBarProps) {
  const ceiling = Math.max(1, max);
  const clamped = Math.min(ceiling, Math.max(0, Number.isFinite(value) ? value : 0));
  const pct = (clamped / ceiling) * 100;
  const cls = ["f95-progress", size === "lg" ? "f95-progress--lg" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={cls}
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={ceiling}
      {...rest}
    >
      <div
        className={`f95-progress__fill f95-progress__fill--${tone}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

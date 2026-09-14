import type { HTMLAttributes } from "react";
import type { QueueHealth } from "@95forward/shared";

export const HEALTH_TEXT: Record<QueueHealth, string> = {
  moving: "Moving",
  slowing: "Slowing",
  stuck: "Stuck",
};

export interface HealthDotProps extends HTMLAttributes<HTMLSpanElement> {
  health: QueueHealth;
  /** Override the accessible name where the surrounding row already says it. */
  label?: string;
}

/**
 * The bare health dot — timeline rows, stage chips, legends.
 *
 * On the chip the word carries the meaning and the colour reinforces it. Here colour is the only
 * visible channel, so the dot always has an accessible name; without one it is invisible to a
 * screen reader and ambiguous to anyone who cannot separate the amber from the red.
 */
export function HealthDot({ health, label, className = "", ...rest }: HealthDotProps) {
  const cls = ["f95-healthdot", `f95-healthdot--${health}`, className].filter(Boolean).join(" ");
  const name = label ?? HEALTH_TEXT[health];
  return (
    <span className={cls} role="img" aria-label={name} title={name} data-health={health} {...rest} />
  );
}

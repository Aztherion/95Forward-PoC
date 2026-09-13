import type { HTMLAttributes, ReactNode } from "react";
import type { QueueHealth } from "@95forward/shared";

export type CardTone = "default" | "ai" | "go" | "sunk";
export type CardElevation = "sm" | "md" | "none";
export type CardPad = "sm" | "md" | "lg" | "none";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: CardTone;
  elevation?: CardElevation;
  pad?: CardPad;
  /**
   * Draws the 3px left border.
   *
   * Until I17b this was styled only as `.f95-card--ai.f95-card--accent`, so 5 of the 12 call
   * sites — every one that paired it with `tone="go"` — rendered nothing at all. It now draws on
   * any tone, taking its colour from the tone or from `health`.
   */
  accent?: boolean;
  /** Moving / Slowing / Stuck. Colours the accent, for queue cards and stage chips. */
  health?: QueueHealth;
  interactive?: boolean;
}

export function Card({
  children,
  tone = "default",
  elevation = "sm",
  pad = "md",
  accent = false,
  health,
  interactive = false,
  className = "",
  ...rest
}: CardProps) {
  const cls = [
    "f95-card",
    tone !== "default" ? `f95-card--${tone}` : "",
    elevation === "md" ? "f95-card--raised" : elevation === "none" ? "f95-card--flat" : "",
    health ? `f95-card--health-${health}` : "",
    accent ? "f95-card--accent" : "",
    interactive ? "f95-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const padCls =
    pad === "none"
      ? ""
      : `f95-card__pad${pad === "lg" ? " f95-card__pad--lg" : pad === "sm" ? " f95-card__pad--sm" : ""}`;
  return (
    <div className={cls} {...(health ? { "data-health": health } : {})} {...rest}>
      {pad === "none" ? children : <div className={padCls}>{children}</div>}
    </div>
  );
}

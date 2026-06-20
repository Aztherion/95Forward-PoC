import type { HTMLAttributes, ReactNode } from "react";

export type CardTone = "default" | "ai" | "go" | "sunk";
export type CardElevation = "sm" | "md" | "none";
export type CardPad = "sm" | "md" | "lg" | "none";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: CardTone;
  elevation?: CardElevation;
  pad?: CardPad;
  accent?: boolean;
  interactive?: boolean;
}

export function Card({
  children,
  tone = "default",
  elevation = "sm",
  pad = "md",
  accent = false,
  interactive = false,
  className = "",
  ...rest
}: CardProps) {
  const cls = [
    "f95-card",
    tone !== "default" ? `f95-card--${tone}` : "",
    elevation === "md" ? "f95-card--raised" : elevation === "none" ? "f95-card--flat" : "",
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
    <div className={cls} {...rest}>
      {pad === "none" ? children : <div className={padCls}>{children}</div>}
    </div>
  );
}

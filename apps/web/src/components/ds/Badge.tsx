import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "attention"
  | "danger"
  | "go"
  | "ai"
  | "unknown";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  solid?: boolean;
}

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  solid = false,
  className = "",
  ...rest
}: BadgeProps) {
  const cls = ["f95-badge", `f95-badge--${tone}`, solid ? "f95-badge--solid" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {dot ? <span className="f95-badge__dot" /> : null}
      {children}
    </span>
  );
}

import React from "react";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "attention"
  | "danger"
  | "go"
  | "ai"
  | "unknown";

/**
 * Badge — compact status pill. Tone carries meaning; `unknown` renders as a
 * dashed, neutral research-gap (never an error). `ai` is the copilot tint.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Leading status dot. */
  dot?: boolean;
  /** Filled (high-emphasis) instead of tinted. */
  solid?: boolean;
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): JSX.Element;

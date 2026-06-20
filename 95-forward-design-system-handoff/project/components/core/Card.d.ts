import React from "react";

/**
 * Card — the base surface. Defined by a hairline + a quiet lift.
 * `tone="ai"` = copilot surface; `tone="go"` = 90+ energizing state;
 * `tone="sunk"` = a research-gap well.
 *
 * @startingPoint section="Core" subtitle="Surfaces — default, AI, go, sunk" viewport="700x220"
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "default" | "ai" | "go" | "sunk";
  elevation?: "none" | "sm" | "md";
  pad?: "none" | "sm" | "md" | "lg";
  /** Left accent stripe (pairs with tone="ai"). */
  accent?: boolean;
  interactive?: boolean;
  children?: React.ReactNode;
}

export function Card(props: CardProps): JSX.Element;

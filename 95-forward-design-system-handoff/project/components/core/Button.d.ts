import React from "react";

export type ButtonVariant = "primary" | "go" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Button — the system's primary action control. Active, encouraging labels
 * ("Plan the visit", "Log the ask"); never salesy.
 *
 * @startingPoint section="Core" subtitle="Actions — primary, go, secondary, ghost" viewport="700x160"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. `go` is the dawn-gold momentum CTA — reserve for the single next right move. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to fill container width. */
  block?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;

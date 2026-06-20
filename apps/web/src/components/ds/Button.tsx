"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "go" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  iconLeft = null,
  iconRight = null,
  type = "button",
  className = "",
  ...rest
}: ButtonProps) {
  const cls = [
    "f95-btn",
    `f95-btn--${variant}`,
    size !== "md" ? `f95-btn--${size}` : "",
    block ? "f95-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {iconLeft ? <span className="f95-btn__ic">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="f95-btn__ic">{iconRight}</span> : null}
    </button>
  );
}

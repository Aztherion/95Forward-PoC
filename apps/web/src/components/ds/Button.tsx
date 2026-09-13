"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "go" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonCommon {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export type NativeButtonProps = ButtonCommon &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonCommon> & { href?: undefined };

export type LinkButtonProps = ButtonCommon &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonCommon | "href"> & {
    /** Renders a single `<a>` through next/link instead of a `<button>`. */
    href: string;
    /** Inert link, following Pagination's existing treatment. */
    disabled?: boolean;
  };

export type ButtonProps = NativeButtonProps | LinkButtonProps;

/**
 * The button, and — since I17b — the link that looks like one.
 *
 * `<Link><Button/></Link>` puts a `<button>` inside an `<a>`, which is nested interactive content:
 * invalid HTML, two tab stops for one control, and an announcement a screen reader has to guess
 * at. It is the dominant pattern in this app at 70 sites across 43 files, and those 70 are
 * deliberately NOT refactored here — they are their own cleanup. This exists so the three new
 * screens, which are full of name-to-detail links wearing button clothes, do not add another 40.
 *
 * Pass `href` and you get one anchor with the button's classes. Pass `disabled` with it and you
 * get the inert treatment Pagination already uses, because an `<a>` cannot be disabled.
 */
export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    block = false,
    iconLeft = null,
    iconRight = null,
    className = "",
    children,
    ...rest
  } = props;

  const cls = [
    "f95-btn",
    `f95-btn--${variant}`,
    size !== "md" ? `f95-btn--${size}` : "",
    block ? "f95-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      {iconLeft ? <span className="f95-btn__ic">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="f95-btn__ic">{iconRight}</span> : null}
    </>
  );

  if (rest.href !== undefined) {
    const { href, disabled, ...anchorRest } = rest;
    if (disabled) {
      return (
        <a className={cls} aria-disabled="true" tabIndex={-1} {...anchorRest}>
          {body}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...anchorRest}>
        {body}
      </Link>
    );
  }

  // `href` is typed `undefined` on this branch but still present as a key; a `<button>` has no
  // href attribute, so it is dropped rather than spread through.
  const { href: _href, type = "button", ...buttonRest } = rest;
  return (
    <button type={type} className={cls} {...buttonRest}>
      {body}
    </button>
  );
}

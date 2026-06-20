"use client";

import type { HTMLAttributes, MouseEvent } from "react";

export interface SourceTagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "onClick"> {
  source?: string;
  label?: string;
  onClick?: (event: MouseEvent<HTMLSpanElement>) => void;
}

function DocIcon() {
  return (
    <svg
      className="f95-src__ic"
      viewBox="0 0 11 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    >
      <path d="M3 1.5h3.5L8.5 3.5V9.5H3z" />
      <path d="M6.5 1.5V3.5H8.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="f95-src__ic"
      viewBox="0 0 11 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M5.5 2.2v6.6M2.2 5.5h6.6" />
    </svg>
  );
}

export function SourceTag({ source, onClick, label, className = "", ...rest }: SourceTagProps) {
  if (!source) {
    const cls = ["f95-src", "f95-src--unknown", className].filter(Boolean).join(" ");
    return (
      <span className={cls} role="button" onClick={onClick} {...rest}>
        <PlusIcon /> {label ?? "Unknown — worth researching"}
      </span>
    );
  }
  const cls = ["f95-src", "f95-src--grounded", onClick ? "f95-src--link" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} onClick={onClick} {...rest}>
      <DocIcon /> {source}
    </span>
  );
}

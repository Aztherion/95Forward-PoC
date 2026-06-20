"use client";

import type { HTMLAttributes, MouseEvent, ReactNode } from "react";

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "onClick"> {
  children: ReactNode;
  color?: string;
  selected?: boolean;
  onRemove?: (event: MouseEvent<HTMLSpanElement>) => void;
  onClick?: (event: MouseEvent<HTMLSpanElement>) => void;
}

export function Tag({
  children,
  color,
  selected = false,
  onRemove,
  onClick,
  className = "",
  ...rest
}: TagProps) {
  const interactive = !!onClick || selected;
  const cls = [
    "f95-tag",
    interactive ? "f95-tag--interactive" : "",
    selected ? "f95-tag--selected" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} onClick={onClick} {...rest}>
      {color ? <span className="f95-tag__dot" style={{ background: color }} /> : null}
      {children}
      {onRemove ? (
        <span
          className="f95-tag__x"
          role="button"
          aria-label="Remove"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(event);
          }}
        >
          ×
        </span>
      ) : null}
    </span>
  );
}

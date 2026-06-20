import React from "react";

/**
 * Tag — a category/filter chip (distinct from Badge, which is status).
 * Carries an optional color dot, can be selectable or removable.
 */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Leading dot color (any CSS color / token). */
  color?: string;
  selected?: boolean;
  /** When provided, renders a remove (×) affordance. */
  onRemove?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export function Tag(props: TagProps): JSX.Element;

import React from "react";

/**
 * RoleChip — the two roles that must never be confused. `manager` is ownership
 * (one staff owner who carries the relationship — solid blue, anchored, avatar);
 * `partner` is leverage (the warm path who opens the door — dashed sage, door
 * glyph). Ownership vs leverage, made visually unmistakable.
 */
export interface RoleChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  role: "manager" | "partner";
  name: string;
}

export function RoleChip(props: RoleChipProps): JSX.Element;

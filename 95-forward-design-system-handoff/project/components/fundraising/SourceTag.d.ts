import React from "react";

/**
 * SourceTag — provenance on a grounded fact (mono citation tag), or the
 * honorable research-gap prompt when `source` is omitted ("Unknown — worth
 * researching"). A missing source reads as an invitation, never a broken field.
 */
export interface SourceTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Citation text (e.g. "IRS 990-PF · 2024"). Omit → renders the unknown prompt. */
  source?: string;
  /** Override the unknown-state label. */
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function SourceTag(props: SourceTagProps): JSX.Element;

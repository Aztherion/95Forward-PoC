import React from "react";

/**
 * AISuggestion — "AI proposes, the human disposes," made visible. A provisional
 * copilot proposal carrying provenance and explicit approve / edit / dismiss
 * controls. Optionally shows a before → after delta. Never silently applied.
 *
 * @startingPoint section="Fundraising" subtitle="Copilot proposal — approve / edit / dismiss, with provenance" viewport="520x240"
 */
export interface AISuggestionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The suggestion text. */
  children: React.ReactNode;
  /** Provenance citation shown top-right. */
  source?: string;
  /** Optional before value (struck through). */
  from?: React.ReactNode;
  /** Optional after value (proposed). */
  to?: React.ReactNode;
  onApprove?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDismiss?: (e: React.MouseEvent) => void;
}

export function AISuggestion(props: AISuggestionProps): JSX.Element;

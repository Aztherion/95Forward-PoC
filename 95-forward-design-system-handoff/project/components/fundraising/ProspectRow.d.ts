import React from "react";

/**
 * ProspectRow — one line of the Master Prospect List, where individuals,
 * companies and foundations share one ranked surface. A left accent in the QPI
 * tier color makes priority feel real; the cadence dot beats when a follow-up
 * is due soon.
 *
 * @startingPoint section="Fundraising" subtitle="A ranked Master Prospect List row" viewport="760x96"
 */
export interface ProspectRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Rank on the one Master Prospect List (#1 genuinely matters more than #40). */
  rank?: number;
  name: string;
  kind?: "person" | "company" | "foundation";
  subtitle?: string;
  /** 0–100 QPI; colors the rank accent and the inline score. */
  qpi?: number;
  horizon?: "today" | "tomorrow" | "forever";
  /** Relationship Manager (ownership) name. */
  manager?: string;
  /** Natural Partner (the door) name. */
  partner?: string;
  /** Cadence label, e.g. "Follow up in 18h" or "Last contact 6d". */
  cadence?: string;
  /** Pulses the cadence dot (a follow-up is due soon). */
  dueSoon?: boolean;
  interactive?: boolean;
}

export function ProspectRow(props: ProspectRowProps): JSX.Element;

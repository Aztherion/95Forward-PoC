import React from "react";

/**
 * HorizonTag — the three funding horizons, near → far: `today` (current need),
 * `tomorrow` (multi-year priority), `forever` (legacy / planned gift).
 */
export interface HorizonTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  horizon: "today" | "tomorrow" | "forever";
  /** Filled high-emphasis instead of tinted. */
  solid?: boolean;
}

export function HorizonTag(props: HorizonTagProps): JSX.Element;

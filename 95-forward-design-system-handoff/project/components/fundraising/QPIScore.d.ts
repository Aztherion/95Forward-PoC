import React from "react";

export interface QPIPart {
  /** Points earned for this part. */
  score: number;
  /** Max points (defaults: capacity/relationship 25, timing 20, history/philanthropy 15). */
  max?: number;
  /** Plain-language reasoning shown when the score is opened. */
  reason?: string;
  /** Provenance citation (mono tag). Omit → renders "Unknown — worth researching". */
  source?: string;
}

export interface QPIParts {
  capacity?: QPIPart;
  relationship?: QPIPart;
  timing?: QPIPart;
  history?: QPIPart;
  philanthropy?: QPIPart;
}

/**
 * QPIScore — the signature component. A 0–100 Qualified Prospect Index that
 * opens to reveal its five visible parts, the reasoning, and the source behind
 * each. 90+ gets the energizing "go" state. The copilot proposes; the human
 * decides (and can adjust).
 *
 * @startingPoint section="Fundraising" subtitle="The score you can see inside — open to reveal its five parts" viewport="520x520"
 */
export interface QPIScoreProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100 composite. */
  value: number;
  parts?: QPIParts;
  /** Smaller number for inline/list contexts. */
  compact?: boolean;
  defaultOpen?: boolean;
  /** Invoked by the "Adjust the score" action — respects the fundraiser's judgment. */
  onAdjust?: () => void;
}

export function QPIScore(props: QPIScoreProps): JSX.Element;

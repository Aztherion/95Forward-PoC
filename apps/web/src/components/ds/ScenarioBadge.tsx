import type { HTMLAttributes } from "react";
import type { ScenarioBadge as ScenarioBadgeKind } from "@95forward/shared";

export const SCENARIO_BADGE_TEXT: Record<ScenarioBadgeKind, string> = {
  IN_ALL_THREE: "IN ALL THREE",
  MOST_LIKELY_PLUS: "MOST LIKELY +",
  BEST_ONLY: "BEST ONLY",
  OUTSIDE_BEST: "OUTSIDE BEST",
};

const SCENARIO_CLASS: Record<ScenarioBadgeKind, string> = {
  IN_ALL_THREE: "in-all-three",
  MOST_LIKELY_PLUS: "most-likely-plus",
  BEST_ONLY: "best-only",
  OUTSIDE_BEST: "outside-best",
};

export interface ScenarioBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  badge: ScenarioBadgeKind;
}

/**
 * Which scenario an opportunity lands in, under the BMW curve.
 *
 * A confidence ladder, and the colours descend with it: money that closes even in Worst, then
 * money that needs Most likely, then money that needs Best, then money in no scenario at all.
 * Green, amber, red, and the dashed Unknown treatment for "in none of them".
 *
 * SCREENS.md assigns `MOST LIKELY +` red and `BEST ONLY` amber, putting red in the middle of the
 * ramp. That is a slip rather than a decision — it makes the second-safest band louder than the
 * least safe one, and a ladder whose colours are not monotonic teaches a reader that the colours
 * carry no meaning. The copy is exactly as specified; only the ordering of the palette differs,
 * and it is documented in docs/design-system.md.
 */
export function ScenarioBadge({ badge, className = "", ...rest }: ScenarioBadgeProps) {
  const cls = ["f95-scenario", `f95-scenario--${SCENARIO_CLASS[badge]}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} data-badge={badge} {...rest}>
      {SCENARIO_BADGE_TEXT[badge]}
    </span>
  );
}

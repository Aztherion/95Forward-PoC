import type { HTMLAttributes, ReactElement } from "react";

export type Horizon = "today" | "tomorrow" | "forever";

export interface HorizonTagProps extends HTMLAttributes<HTMLSpanElement> {
  horizon: Horizon;
  solid?: boolean;
}

const LABELS: Record<Horizon, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  forever: "Forever",
};

const ICONS: Record<Horizon, ReactElement> = {
  today: <circle cx="6.5" cy="6.5" r="4" fill="currentColor" stroke="none" />,
  tomorrow: <path d="M2.5 6.5a4 4 0 0 1 8 0" fill="currentColor" stroke="none" />,
  forever: <circle cx="6.5" cy="6.5" r="4" fill="none" />,
};

export function HorizonTag({
  horizon = "today",
  solid = false,
  className = "",
  ...rest
}: HorizonTagProps) {
  const cls = [
    "f95-horizon",
    `f95-horizon--${horizon}`,
    solid ? "f95-horizon--solid" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      <svg className="f95-horizon__ic" viewBox="0 0 13 13" stroke="currentColor" strokeWidth="1.4">
        {ICONS[horizon]}
      </svg>
      {LABELS[horizon]}
    </span>
  );
}

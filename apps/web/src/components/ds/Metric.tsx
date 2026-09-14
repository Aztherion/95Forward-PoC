import type { HTMLAttributes, ReactNode } from "react";

export interface MetricProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  value: ReactNode;
  /** The plain-language basis — "to land the $2,700,000 FY26 goal". */
  sub?: ReactNode;
  /** The arithmetic, monospace — "$2,700,000 GOAL − $385,200 WON = $2,314,800 BASIS". */
  basis?: ReactNode;
  /** One per metric block. Binds the 52px step. */
  dominant?: boolean;
  /** Negative coverage gap and its kin. */
  alert?: boolean;
  children?: ReactNode;
}

/**
 * One metric: label, figure, and the basis the figure is measured against.
 *
 * `dominant` binds `--fs-5xl` (52px) — above every heading in the system, and deliberately below
 * the QPI number's 64px, whose binding is untouched. The other orphaned step, 88px, is the wrong
 * answer for The Board: it is already ~66px over its vertical budget at 1280x800, and a headline
 * that costs the queue its first card has defeated the screen it leads.
 *
 * `sub` and `basis` exist because a ratio without its denominator is the failure mode this screen
 * family was redesigned to fix — a reader who does the mental arithmetic against the wrong number
 * concludes the tool is broken.
 */
export function Metric({
  label,
  value,
  sub,
  basis,
  dominant = false,
  alert = false,
  className = "",
  children,
  ...rest
}: MetricProps) {
  const cls = [
    "f95-metric",
    dominant ? "f95-metric--dominant" : "",
    alert ? "f95-metric--alert" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      <div className="f95-metric__label">{label}</div>
      <div className="f95-metric__value">{value}</div>
      {sub ? <div className="f95-metric__sub">{sub}</div> : null}
      {basis ? <div className="f95-metric__basis">{basis}</div> : null}
      {children}
    </div>
  );
}

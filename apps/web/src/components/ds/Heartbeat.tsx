import type { HTMLAttributes } from "react";

export type HeartbeatStatus = "on-track" | "due-soon" | "overdue";

export interface HeartbeatProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
  status?: HeartbeatStatus;
}

export function Heartbeat({ label, status, className = "", ...rest }: HeartbeatProps) {
  const cls = ["f95-heartbeat", status ? `f95-heartbeat--${status}` : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      <span className="f95-heartbeat__pulse" />
      {label ? <span className="f95-heartbeat__label">{label}</span> : null}
    </span>
  );
}

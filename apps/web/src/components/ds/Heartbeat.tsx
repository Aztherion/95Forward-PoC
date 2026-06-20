import type { HTMLAttributes } from "react";

export interface HeartbeatProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
}

export function Heartbeat({ label, className = "", ...rest }: HeartbeatProps) {
  const cls = ["f95-heartbeat", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      <span className="f95-heartbeat__pulse" />
      {label ? <span className="f95-heartbeat__label">{label}</span> : null}
    </span>
  );
}

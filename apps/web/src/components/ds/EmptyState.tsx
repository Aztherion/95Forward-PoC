import type { HTMLAttributes, ReactNode } from "react";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  line?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  line,
  action,
  className = "",
  ...rest
}: EmptyStateProps) {
  const cls = ["f95-empty", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {icon ? <span className="f95-empty__icon">{icon}</span> : null}
      <span className="f95-empty__title">{title}</span>
      {line ? <span className="f95-empty__line">{line}</span> : null}
      {action ? <span className="f95-empty__action">{action}</span> : null}
    </div>
  );
}

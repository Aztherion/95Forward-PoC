import type { HTMLAttributes, ReactNode } from "react";

export interface FieldGroupProps extends HTMLAttributes<HTMLDivElement> {
  legend?: string;
  children: ReactNode;
}

export function FieldGroup({ legend, children, className = "", ...rest }: FieldGroupProps) {
  const cls = ["f95-fieldgroup", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {legend ? <div className="f95-fieldgroup__legend">{legend}</div> : null}
      {children}
    </div>
  );
}

export interface FormRowProps extends HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3;
  children: ReactNode;
}

export function FormRow({ columns = 2, children, className = "", ...rest }: FormRowProps) {
  const cls = ["f95-formrow", columns > 1 ? `f95-formrow--${columns}` : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

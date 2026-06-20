import type { InputHTMLAttributes } from "react";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, className = "", ...rest }: CheckboxProps) {
  const cls = ["f95-check__box", className].filter(Boolean).join(" ");
  if (!label) {
    return <input type="checkbox" className={cls} {...rest} />;
  }
  return (
    <label className="f95-check">
      <input type="checkbox" className={cls} {...rest} />
      <span>{label}</span>
    </label>
  );
}

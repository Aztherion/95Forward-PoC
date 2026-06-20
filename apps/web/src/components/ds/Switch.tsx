import type { InputHTMLAttributes } from "react";

export interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Switch({ label, className = "", ...rest }: SwitchProps) {
  const cls = ["f95-switch__input", className].filter(Boolean).join(" ");
  return (
    <label className="f95-switch">
      <span className="f95-switch__track">
        <input type="checkbox" className={cls} {...rest} />
        <span className="f95-switch__thumb" />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}

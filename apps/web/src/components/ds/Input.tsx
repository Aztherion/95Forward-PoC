import type { InputHTMLAttributes, ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  ai?: boolean;
}

export function Input({
  label,
  optional = false,
  hint,
  error,
  icon = null,
  ai = false,
  id,
  className = "",
  ...rest
}: InputProps) {
  const fid = id ?? (label ? `f95-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const inputCls = [
    "f95-input",
    icon ? "f95-input--has-icon" : "",
    error ? "f95-input--invalid" : "",
    ai ? "f95-input--ai" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="f95-field">
      {label ? (
        <label className="f95-field__label" htmlFor={fid}>
          {label} {optional ? <span className="f95-field__opt">· optional</span> : null}
        </label>
      ) : null}
      <div className="f95-input-wrap">
        {icon ? <span className="f95-input__icon">{icon}</span> : null}
        <input id={fid} className={inputCls} aria-invalid={!!error} {...rest} />
      </div>
      {error ? (
        <span className="f95-field__err">{error}</span>
      ) : hint ? (
        <span className="f95-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

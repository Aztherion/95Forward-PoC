import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  optional?: boolean;
  hint?: string;
  error?: string;
}

export function Textarea({
  label,
  optional = false,
  hint,
  error,
  id,
  className = "",
  ...rest
}: TextareaProps) {
  const fid = id ?? (label ? `f95-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const cls = ["f95-textarea", error ? "f95-textarea--invalid" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="f95-field">
      {label ? (
        <label className="f95-field__label" htmlFor={fid}>
          {label} {optional ? <span className="f95-field__opt">· optional</span> : null}
        </label>
      ) : null}
      <textarea id={fid} className={cls} aria-invalid={!!error} {...rest} />
      {error ? (
        <span className="f95-field__err">{error}</span>
      ) : hint ? (
        <span className="f95-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

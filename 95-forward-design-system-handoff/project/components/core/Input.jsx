import React from "react";

const CSS = `
.f95-field { display: flex; flex-direction: column; gap: 6px; }
.f95-field__label { font: var(--text-label); color: var(--text-strong); }
.f95-field__label .f95-field__opt { color: var(--text-muted); font-weight: var(--fw-regular); }
.f95-field__hint { font: var(--text-caption); color: var(--text-muted); }
.f95-field__err { font: var(--text-caption); color: var(--color-danger); }
.f95-input-wrap { position: relative; display: flex; align-items: center; }
.f95-input {
  width: 100%; height: var(--control-md); box-sizing: border-box;
  padding: 0 12px; font: var(--text-body-r); color: var(--text-strong);
  background: var(--surface-card); border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.f95-input::placeholder { color: var(--text-muted); }
.f95-input:hover { border-color: var(--border-strong); }
.f95-input:focus { outline: none; border-color: var(--blue-500); box-shadow: var(--ring); }
.f95-input--has-icon { padding-left: 36px; }
.f95-input__icon { position: absolute; left: 11px; width: 16px; height: 16px; color: var(--text-muted); display: inline-flex; pointer-events: none; }
.f95-input--invalid { border-color: var(--color-danger); }
.f95-input--invalid:focus { box-shadow: 0 0 0 3px rgba(168,64,47,0.25); }
/* AI-proposed value — provisional, tinted, never silently committed */
.f95-input--ai { background: var(--ai-surface); border-color: var(--ai-border); color: var(--iris-700); }
.f95-input--ai:focus { box-shadow: 0 0 0 3px rgba(91,97,168,0.25); border-color: var(--iris-500); }
.f95-input[disabled] { background: var(--haze-100); color: var(--text-muted); cursor: not-allowed; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-input-css")) {
  const el = document.createElement("style");
  el.id = "f95-input-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Input — a labelled text field. Empties read as invitations
 * ("Add what you know"), not warnings. `ai` marks a provisional copilot value.
 */
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
}) {
  const fid = id || (label ? `f95-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
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
      {error ? <span className="f95-field__err">{error}</span> : hint ? <span className="f95-field__hint">{hint}</span> : null}
    </div>
  );
}

import React from "react";

const CSS = `
.f95-badge {
  display: inline-flex; align-items: center; gap: 6px;
  height: 22px; padding: 0 9px; box-sizing: border-box;
  font: var(--fw-semibold) var(--fs-micro)/1 var(--font-sans);
  letter-spacing: 0.01em; border-radius: var(--radius-pill);
  white-space: nowrap; border: 1px solid transparent;
}
.f95-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
.f95-badge--neutral  { background: var(--haze-100); color: var(--ink-600); }
.f95-badge--info     { background: var(--blue-100); color: var(--blue-700); }
.f95-badge--success  { background: var(--sage-100); color: var(--sage-700); }
.f95-badge--attention{ background: var(--gold-100); color: var(--gold-700); }
.f95-badge--danger   { background: var(--brick-100); color: var(--brick-600); }
.f95-badge--go       { background: var(--gold-600); color: var(--white); }
.f95-badge--ai       { background: var(--ai-tint); color: var(--ai-ink); border-color: var(--ai-border); }
/* Unknown — honorable research gap, never an error */
.f95-badge--unknown  { background: var(--unknown-surface); color: var(--unknown-ink); border: 1px dashed var(--unknown-border); }
.f95-badge--solid.f95-badge--info     { background: var(--blue-600);  color: #fff; }
.f95-badge--solid.f95-badge--success  { background: var(--sage-600);  color: #fff; }
.f95-badge--solid.f95-badge--attention{ background: var(--gold-600);  color: #fff; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-badge-css")) {
  const el = document.createElement("style");
  el.id = "f95-badge-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Badge — a compact status pill (visit planned, ask logged, follow-up due).
 * Tone carries meaning; `unknown` is the honorable research-gap state.
 */
export function Badge({ children, tone = "neutral", dot = false, solid = false, className = "", ...rest }) {
  const cls = ["f95-badge", `f95-badge--${tone}`, solid ? "f95-badge--solid" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {dot ? <span className="f95-badge__dot" /> : null}
      {children}
    </span>
  );
}

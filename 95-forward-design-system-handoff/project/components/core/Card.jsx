import React from "react";

const CSS = `
.f95-card {
  background: var(--surface-card);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.f95-card--raised { box-shadow: var(--shadow-md); }
.f95-card--flat { box-shadow: none; }
.f95-card--sunk { background: var(--surface-sunk); box-shadow: var(--inset-sunk); border-color: transparent; }
.f95-card--interactive { cursor: pointer; transition: box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.f95-card--interactive:hover { box-shadow: var(--shadow-md); border-color: var(--border-default); transform: translateY(-1px); }
/* AI card — the copilot surface, set apart but harmonious */
.f95-card--ai { background: var(--ai-surface); border-color: var(--ai-border); }
.f95-card--ai.f95-card--accent { border-left: 3px solid var(--ai-ink); }
/* Go card — the 90+ energizing state */
.f95-card--go { border-color: var(--gold-300); box-shadow: var(--ring-go); }
.f95-card__pad { padding: var(--space-5); }
.f95-card__pad--lg { padding: var(--space-7); }
.f95-card__pad--sm { padding: var(--space-4); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-card-css")) {
  const el = document.createElement("style");
  el.id = "f95-card-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Card — the base surface. A hairline + quiet lift, not a heavy drop shadow.
 * `tone="ai"` is the copilot surface; `tone="go"` the 90+ energizing state.
 */
export function Card({
  children,
  tone = "default",
  elevation = "sm",
  pad = "md",
  accent = false,
  interactive = false,
  className = "",
  ...rest
}) {
  const cls = [
    "f95-card",
    tone !== "default" ? `f95-card--${tone}` : "",
    elevation === "md" ? "f95-card--raised" : elevation === "none" ? "f95-card--flat" : "",
    accent ? "f95-card--accent" : "",
    interactive ? "f95-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const padCls = pad === "none" ? "" : `f95-card__pad${pad === "lg" ? " f95-card__pad--lg" : pad === "sm" ? " f95-card__pad--sm" : ""}`;
  return (
    <div className={cls} {...rest}>
      {pad === "none" ? children : <div className={padCls}>{children}</div>}
    </div>
  );
}

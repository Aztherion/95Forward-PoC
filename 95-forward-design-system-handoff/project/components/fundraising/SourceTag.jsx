import React from "react";

const CSS = `
.f95-src { display: inline-flex; align-items: center; gap: 5px; font: var(--fw-medium) var(--fs-micro)/1.3 var(--font-mono); padding: 2px 7px; border-radius: var(--radius-xs); white-space: nowrap; }
.f95-src--grounded { color: var(--ai-ink); background: var(--ai-tint); }
.f95-src--grounded.f95-src--link { cursor: pointer; }
.f95-src--grounded.f95-src--link:hover { background: var(--iris-100); text-decoration: underline; }
.f95-src--unknown { color: var(--unknown-ink); background: var(--unknown-surface); border: 1px dashed var(--unknown-border); font-family: var(--font-sans); cursor: pointer; }
.f95-src--unknown:hover { color: var(--text-strong); border-color: var(--border-strong); }
.f95-src__ic { width: 11px; height: 11px; flex: none; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-src-css")) {
  const el = document.createElement("style");
  el.id = "f95-src-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

const DocIcon = () => (
  <svg className="f95-src__ic" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
    <path d="M3 1.5h3.5L8.5 3.5V9.5H3z" /><path d="M6.5 1.5V3.5H8.5" />
  </svg>
);
const PlusIcon = () => (
  <svg className="f95-src__ic" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M5.5 2.2v6.6M2.2 5.5h6.6" />
  </svg>
);

/**
 * SourceTag — provenance for a grounded fact (mono citation), or the honorable
 * "Unknown — worth researching" prompt when a fact isn't known. A missing
 * source is an invitation to research, never a broken/empty field.
 */
export function SourceTag({ source, onClick, label, className = "", ...rest }) {
  if (!source) {
    const cls = ["f95-src", "f95-src--unknown", className].filter(Boolean).join(" ");
    return (
      <span className={cls} role="button" onClick={onClick} {...rest}>
        <PlusIcon /> {label || "Unknown — worth researching"}
      </span>
    );
  }
  const cls = ["f95-src", "f95-src--grounded", onClick ? "f95-src--link" : "", className].filter(Boolean).join(" ");
  return (
    <span className={cls} onClick={onClick} {...rest}>
      <DocIcon /> {source}
    </span>
  );
}

import React from "react";
import { Button } from "../core/Button.jsx";
import { SourceTag } from "./SourceTag.jsx";

const CSS = `
.f95-ai { background: var(--ai-surface); border: 1px solid var(--ai-border); border-left: 3px solid var(--ai-ink); border-radius: var(--radius-md); padding: var(--space-4) var(--space-5); }
.f95-ai__top { display: flex; align-items: center; gap: 7px; }
.f95-ai__tag { display: inline-flex; align-items: center; gap: 6px; font: var(--fw-semibold) var(--fs-micro)/1 var(--font-sans); letter-spacing: var(--ls-caps); text-transform: uppercase; color: var(--ai-ink); }
.f95-ai__spark { width: 13px; height: 13px; border-radius: 3px; background: var(--ai-ink); flex: none; }
.f95-ai__prov { margin-left: auto; }
.f95-ai__body { font: var(--fw-medium) var(--fs-body)/1.45 var(--font-sans); color: var(--iris-700); margin-top: 9px; }
.f95-ai__delta { display: inline-flex; align-items: center; gap: 9px; margin-top: 10px; padding: 7px 12px; background: var(--white); border: 1px solid var(--ai-border); border-radius: var(--radius-sm); }
.f95-ai__from { font: var(--fw-medium) var(--fs-small)/1 var(--font-mono); color: var(--text-muted); text-decoration: line-through; }
.f95-ai__arrow { color: var(--ai-ink); }
.f95-ai__to { font: var(--fw-bold) var(--fs-small)/1 var(--font-mono); color: var(--iris-700); }
.f95-ai__acts { display: flex; align-items: center; gap: 8px; margin-top: var(--space-4); }
.f95-ai__resolved { display: flex; align-items: center; gap: 8px; margin-top: var(--space-3); font: var(--text-label); }
.f95-ai__resolved--ok { color: var(--sage-700); }
.f95-ai__resolved--no { color: var(--text-muted); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-ai-css")) {
  const el = document.createElement("style");
  el.id = "f95-ai-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * AISuggestion — "AI proposes, the human disposes," made visible. A provisional
 * copilot proposal with provenance and explicit approve / edit / dismiss. Never
 * silently applied.
 */
export function AISuggestion({ children, source, from, to, onApprove, onEdit, onDismiss, className = "", ...rest }) {
  const [resolved, setResolved] = React.useState(null); // null | "approved" | "dismissed"

  if (resolved === "approved") {
    return (
      <div className={["f95-ai", className].filter(Boolean).join(" ")} {...rest}>
        <div className="f95-ai__resolved f95-ai__resolved--ok">Approved — applied to the record.</div>
      </div>
    );
  }
  if (resolved === "dismissed") {
    return (
      <div className={["f95-ai", className].filter(Boolean).join(" ")} {...rest}>
        <div className="f95-ai__resolved f95-ai__resolved--no">Dismissed — kept as you had it.</div>
      </div>
    );
  }

  return (
    <div className={["f95-ai", className].filter(Boolean).join(" ")} {...rest}>
      <div className="f95-ai__top">
        <span className="f95-ai__tag"><span className="f95-ai__spark" /> Copilot suggests</span>
        {source ? <span className="f95-ai__prov"><SourceTag source={source} /></span> : null}
      </div>
      <div className="f95-ai__body">{children}</div>
      {from != null && to != null ? (
        <div className="f95-ai__delta">
          <span className="f95-ai__from">{from}</span>
          <span className="f95-ai__arrow">→</span>
          <span className="f95-ai__to">{to}</span>
        </div>
      ) : null}
      <div className="f95-ai__acts">
        <Button size="sm" variant="primary" onClick={(e) => { onApprove && onApprove(e); setResolved("approved"); }}>Approve</Button>
        <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={(e) => { onDismiss && onDismiss(e); setResolved("dismissed"); }}>Dismiss</Button>
      </div>
    </div>
  );
}

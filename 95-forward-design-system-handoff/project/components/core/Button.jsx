import React from "react";

/* Self-inject component CSS once (references design-system tokens). */
const CSS = `
.f95-btn {
  --_h: var(--control-md);
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: var(--_h); padding: 0 16px; box-sizing: border-box;
  font: var(--fw-semibold) var(--fs-body)/1 var(--font-sans);
  letter-spacing: var(--ls-snug);
  border-radius: var(--radius-md); border: 1px solid transparent;
  cursor: pointer; user-select: none; white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out),
              transform var(--dur-instant) var(--ease-out);
}
.f95-btn:focus-visible { outline: none; box-shadow: var(--ring); }
.f95-btn:active { transform: translateY(0.5px); }
.f95-btn[disabled] { cursor: not-allowed; opacity: 0.45; }
.f95-btn .f95-btn__ic { display: inline-flex; width: 16px; height: 16px; }

/* sizes */
.f95-btn--sm { --_h: var(--control-sm); padding: 0 12px; font-size: var(--fs-small); border-radius: var(--radius-sm); }
.f95-btn--lg { --_h: var(--control-lg); padding: 0 22px; font-size: var(--fs-lg); }

/* primary — horizon blue */
.f95-btn--primary { background: var(--brand-primary); color: var(--text-on-accent); }
.f95-btn--primary:hover:not([disabled]) { background: var(--brand-primary-hover); }
.f95-btn--primary:active:not([disabled]) { background: var(--brand-primary-press); }

/* go — the momentum CTA (dawn gold). Use sparingly: the next right move. */
.f95-btn--go { background: var(--accent-go); color: var(--text-on-accent); }
.f95-btn--go:hover:not([disabled]) { background: var(--gold-500); }
.f95-btn--go:active:not([disabled]) { background: var(--gold-700); }
.f95-btn--go:focus-visible { box-shadow: var(--ring-go); }

/* secondary — calm outline on surface */
.f95-btn--secondary { background: var(--surface-card); color: var(--text-strong); border-color: var(--border-default); }
.f95-btn--secondary:hover:not([disabled]) { background: var(--haze-50); border-color: var(--border-strong); }
.f95-btn--secondary:active:not([disabled]) { background: var(--haze-100); }

/* ghost — quietest */
.f95-btn--ghost { background: transparent; color: var(--text-body); }
.f95-btn--ghost:hover:not([disabled]) { background: var(--haze-100); }
.f95-btn--ghost:active:not([disabled]) { background: var(--haze-200); }

/* danger — destructive, rare */
.f95-btn--danger { background: transparent; color: var(--color-danger); border-color: var(--brick-100); }
.f95-btn--danger:hover:not([disabled]) { background: var(--brick-100); }

.f95-btn--block { display: flex; width: 100%; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-button-css")) {
  const el = document.createElement("style");
  el.id = "f95-button-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Button — the system's primary action control.
 * Variants: primary (horizon blue), go (dawn-gold momentum CTA — use for the
 * single next right move), secondary, ghost, danger.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  iconLeft = null,
  iconRight = null,
  type = "button",
  className = "",
  ...rest
}) {
  const cls = [
    "f95-btn",
    `f95-btn--${variant}`,
    size !== "md" ? `f95-btn--${size}` : "",
    block ? "f95-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {iconLeft ? <span className="f95-btn__ic">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="f95-btn__ic">{iconRight}</span> : null}
    </button>
  );
}

import React from "react";

const CSS = `
.f95-tag {
  display: inline-flex; align-items: center; gap: 6px;
  height: 26px; padding: 0 10px; box-sizing: border-box;
  font: var(--fw-medium) var(--fs-caption)/1 var(--font-sans);
  color: var(--text-body); background: var(--surface-card);
  border: 1px solid var(--border-default); border-radius: var(--radius-sm);
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.f95-tag--interactive { cursor: pointer; }
.f95-tag--interactive:hover { background: var(--haze-50); border-color: var(--border-strong); }
.f95-tag--selected { background: var(--blue-50); border-color: var(--blue-300); color: var(--blue-700); }
.f95-tag__dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.f95-tag__x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 15px; height: 15px; margin-right: -3px; border-radius: 50%;
  color: var(--text-muted); cursor: pointer; font-size: 13px; line-height: 1;
}
.f95-tag__x:hover { background: var(--haze-200); color: var(--text-strong); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-tag-css")) {
  const el = document.createElement("style");
  el.id = "f95-tag-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Tag — a category/filter chip. Distinct from Badge (status): Tag is for
 * filtering and grouping, can carry a color dot, be selectable, or removable.
 */
export function Tag({ children, color, selected = false, onRemove, onClick, className = "", ...rest }) {
  const interactive = !!onClick || selected;
  const cls = [
    "f95-tag",
    interactive ? "f95-tag--interactive" : "",
    selected ? "f95-tag--selected" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} onClick={onClick} {...rest}>
      {color ? <span className="f95-tag__dot" style={{ background: color }} /> : null}
      {children}
      {onRemove ? (
        <span
          className="f95-tag__x"
          role="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
        >
          ×
        </span>
      ) : null}
    </span>
  );
}

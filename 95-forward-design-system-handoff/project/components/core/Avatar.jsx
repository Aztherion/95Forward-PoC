import React from "react";

const CSS = `
.f95-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%; overflow: hidden; flex: none;
  font: var(--fw-semibold) var(--fs-caption)/1 var(--font-sans);
  color: var(--white); background: var(--blue-500);
  box-shadow: inset 0 0 0 1px rgba(22,32,43,0.08); position: relative;
}
.f95-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.f95-avatar--sm { width: 28px; height: 28px; font-size: 11px; }
.f95-avatar--md { width: 36px; height: 36px; font-size: var(--fs-caption); }
.f95-avatar--lg { width: 48px; height: 48px; font-size: var(--fs-body); }
/* org/foundation avatars read as rounded-square, not people */
.f95-avatar--org { border-radius: var(--radius-sm); }
.f95-avatar__ring {
  position: absolute; inset: -3px; border-radius: inherit;
  box-shadow: 0 0 0 2px var(--surface-card), 0 0 0 3.5px var(--role-manager);
  pointer-events: none;
}
`;
if (typeof document !== "undefined" && !document.getElementById("f95-avatar-css")) {
  const el = document.createElement("style");
  el.id = "f95-avatar-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

const TINTS = ["#235C86", "#3B7458", "#C8862A", "#4A4F94", "#2F7E8C"];
function tintFor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/**
 * Avatar — a person, company, or foundation. People are circular; orgs render
 * as rounded-squares (`kind="org"`) so the three prospect types never blur.
 */
export function Avatar({ name = "", src, size = "md", kind = "person", ringColor, className = "", ...rest }) {
  const cls = ["f95-avatar", `f95-avatar--${size}`, kind === "org" ? "f95-avatar--org" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} style={{ background: src ? undefined : tintFor(name) }} title={name} {...rest}>
      {src ? <img src={src} alt={name} /> : initials(name)}
      {ringColor ? <span className="f95-avatar__ring" style={{ boxShadow: `0 0 0 2px var(--surface-card), 0 0 0 3.5px ${ringColor}` }} /> : null}
    </span>
  );
}

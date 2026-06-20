import React from "react";

const CSS = `
.f95-role { display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px 4px 5px; box-sizing: border-box; border-radius: var(--radius-pill); max-width: 100%; }
.f95-role__av { width: 26px; height: 26px; border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center; font: var(--fw-semibold) 11px/1 var(--font-sans); color: #fff; }
.f95-role__txt { display: flex; flex-direction: column; min-width: 0; }
.f95-role__lbl { font: var(--fw-semibold) var(--fs-micro)/1.1 var(--font-sans); letter-spacing: var(--ls-caps); text-transform: uppercase; }
.f95-role__name { font: var(--fw-semibold) var(--fs-small)/1.2 var(--font-sans); color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f95-role__ic { width: 15px; height: 15px; flex: none; }

/* MANAGER — ownership. Solid, anchored, filled tint, blue. */
.f95-role--manager { background: var(--role-manager-tint); box-shadow: inset 0 0 0 1px rgba(35,92,134,0.18); }
.f95-role--manager .f95-role__av { background: var(--role-manager); }
.f95-role--manager .f95-role__lbl { color: var(--role-manager); }

/* PARTNER — leverage / the door. Outlined, lighter, sage, leads with a door-opening glyph. */
.f95-role--partner { background: var(--surface-card); border: 1.5px dashed var(--role-partner); padding-left: 11px; }
.f95-role--partner .f95-role__lbl { color: var(--role-partner); }
.f95-role--partner .f95-role__ic { color: var(--role-partner); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-role-css")) {
  const el = document.createElement("style");
  el.id = "f95-role-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

const DoorIcon = () => (
  <svg className="f95-role__ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14h10" /><path d="M10 14V3.5a.5.5 0 0 0-.6-.49L5 4v10" /><circle cx="6.4" cy="8.6" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * RoleChip — the two roles that must NEVER look alike. `manager` (ownership)
 * is a solid, anchored blue chip with the owner's avatar; `partner` (the warm
 * path / leverage) is a dashed sage chip leading with a door-opening glyph.
 */
export function RoleChip({ role = "manager", name = "", className = "", ...rest }) {
  const isManager = role === "manager";
  const cls = ["f95-role", `f95-role--${role}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} title={name} {...rest}>
      {isManager ? <span className="f95-role__av">{initials(name)}</span> : <DoorIcon />}
      <span className="f95-role__txt">
        <span className="f95-role__lbl">{isManager ? "Relationship Mgr" : "Natural Partner"}</span>
        <span className="f95-role__name">{name}</span>
      </span>
    </span>
  );
}

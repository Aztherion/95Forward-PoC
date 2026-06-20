import React from "react";

const CSS = `
.f95-horizon { display: inline-flex; align-items: center; gap: 7px; height: 24px; padding: 0 10px 0 8px; box-sizing: border-box; border-radius: var(--radius-pill); font: var(--fw-semibold) var(--fs-caption)/1 var(--font-sans); white-space: nowrap; }
.f95-horizon__ic { width: 13px; height: 13px; flex: none; }
.f95-horizon--today    { background: var(--gold-100); color: var(--gold-700); }
.f95-horizon--tomorrow { background: var(--blue-100); color: var(--blue-700); }
.f95-horizon--forever  { background: var(--iris-100); color: var(--iris-700); }
.f95-horizon--solid.f95-horizon--today    { background: var(--horizon-today); color:#fff; }
.f95-horizon--solid.f95-horizon--tomorrow { background: var(--horizon-tomorrow); color:#fff; }
.f95-horizon--solid.f95-horizon--forever  { background: var(--horizon-forever); color:#fff; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-horizon-css")) {
  const el = document.createElement("style");
  el.id = "f95-horizon-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

const LABELS = { today: "Today", tomorrow: "Tomorrow", forever: "Forever" };
// near → far: a filling sun (today), a half horizon (tomorrow), a distant ring (forever)
const ICONS = {
  today: <circle cx="6.5" cy="6.5" r="4" fill="currentColor" stroke="none" />,
  tomorrow: <path d="M2.5 6.5a4 4 0 0 1 8 0" fill="currentColor" stroke="none" />,
  forever: <circle cx="6.5" cy="6.5" r="4" fill="none" />,
};

/**
 * HorizonTag — the three funding horizons, near → far: Today (current need),
 * Tomorrow (multi-year priority), Forever (legacy). Icon goes from a full sun
 * to a distant ring to carry the sense of distance.
 */
export function HorizonTag({ horizon = "today", solid = false, className = "", ...rest }) {
  const cls = ["f95-horizon", `f95-horizon--${horizon}`, solid ? "f95-horizon--solid" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      <svg className="f95-horizon__ic" viewBox="0 0 13 13" stroke="currentColor" strokeWidth="1.4">{ICONS[horizon]}</svg>
      {LABELS[horizon]}
    </span>
  );
}

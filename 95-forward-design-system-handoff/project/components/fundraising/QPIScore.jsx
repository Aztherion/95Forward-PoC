import React from "react";

const CSS = `
.f95-qpi { font-family: var(--font-sans); }
.f95-qpi__head { display: flex; align-items: center; gap: var(--space-5); }
.f95-qpi__numwrap { display: flex; align-items: baseline; gap: 3px; line-height: 1; }
.f95-qpi__num { font-weight: var(--fw-heavy); font-size: var(--fs-score); letter-spacing: var(--ls-tight); font-feature-settings: var(--num-tabular); }
.f95-qpi__of { font-weight: var(--fw-semibold); font-size: var(--fs-lg); color: var(--text-muted); }
.f95-qpi__meta { flex: 1; min-width: 0; }
.f95-qpi__tier { display: inline-flex; align-items: center; gap: 7px; font: var(--fw-semibold) var(--fs-micro)/1 var(--font-sans); letter-spacing: var(--ls-caps); text-transform: uppercase; }
.f95-qpi__seg { display: flex; gap: 2px; margin-top: 10px; height: 8px; border-radius: var(--radius-pill); overflow: hidden; background: var(--haze-100); }
.f95-qpi__seg span { height: 100%; }
.f95-qpi__toggle {
  display: inline-flex; align-items: center; gap: 5px; margin-top: 12px;
  font: var(--fw-semibold) var(--fs-small)/1 var(--font-sans); color: var(--brand-primary);
  background: none; border: none; cursor: pointer; padding: 4px 0;
}
.f95-qpi__toggle:hover { color: var(--brand-primary-hover); }
.f95-qpi__chev { transition: transform var(--dur-base) var(--ease-out); width: 14px; height: 14px; }
.f95-qpi__chev--open { transform: rotate(180deg); }

.f95-qpi__parts { display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--border-hairline); }
.f95-qpi__part { animation: f95-rise var(--dur-base) var(--ease-out) both; }
.f95-qpi__prow { display: flex; align-items: center; gap: 10px; }
.f95-qpi__pdot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
.f95-qpi__plabel { font: var(--text-label); color: var(--text-strong); flex: 1; }
.f95-qpi__pscore { font: var(--fw-bold) var(--fs-small)/1 var(--font-mono); color: var(--text-strong); font-feature-settings: var(--num-tabular); }
.f95-qpi__pmax { color: var(--text-muted); font-weight: var(--fw-regular); }
.f95-qpi__ptrack { height: 5px; border-radius: var(--radius-pill); background: var(--haze-100); margin-top: 7px; overflow: hidden; }
.f95-qpi__pfill { height: 100%; border-radius: var(--radius-pill); transition: width var(--dur-deliberate) var(--ease-emph); }
.f95-qpi__preason { font: var(--fw-regular) var(--fs-small)/1.45 var(--font-sans); color: var(--text-secondary); margin-top: 7px; padding-left: 19px; }
.f95-qpi__psrc { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; margin-left: 19px; }
.f95-qpi__cite { font: var(--fw-medium) var(--fs-micro)/1.3 var(--font-mono); color: var(--ai-ink); background: var(--ai-tint); padding: 2px 6px; border-radius: var(--radius-xs); }
.f95-qpi__unknown { font: var(--fw-medium) var(--fs-micro)/1.3 var(--font-sans); color: var(--unknown-ink); background: var(--unknown-surface); border: 1px dashed var(--unknown-border); padding: 2px 7px; border-radius: var(--radius-xs); }
.f95-qpi__foot { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px dashed var(--border-hairline); }
.f95-qpi__note { font: var(--text-caption); color: var(--text-muted); }
.f95-qpi__adjust { font: var(--fw-semibold) var(--fs-small)/1 var(--font-sans); color: var(--text-secondary); background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: var(--radius-sm); }
.f95-qpi__adjust:hover { background: var(--haze-100); color: var(--text-strong); }
/* compact inline variant */
.f95-qpi--compact .f95-qpi__num { font-size: var(--fs-2xl); }
.f95-qpi--compact .f95-qpi__of { font-size: var(--fs-caption); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-qpi-css")) {
  const el = document.createElement("style");
  el.id = "f95-qpi-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

const PART_META = {
  capacity:     { label: "Capacity",     color: "var(--qpi-capacity)",     max: 25 },
  relationship: { label: "Relationship", color: "var(--qpi-relationship)", max: 25 },
  timing:       { label: "Timing",       color: "var(--qpi-timing)",       max: 20 },
  history:      { label: "Gift History", color: "var(--qpi-history)",       max: 15 },
  philanthropy: { label: "Philanthropy", color: "var(--qpi-philanthropy)",  max: 15 },
};
const ORDER = ["capacity", "relationship", "timing", "history", "philanthropy"];

function tier(v) {
  if (v >= 90) return { key: "go", label: "Go — see them today", color: "var(--qpi-go)" };
  if (v >= 70) return { key: "strong", label: "Strong — worth a visit", color: "var(--qpi-strong)" };
  if (v >= 50) return { key: "build", label: "Building — keep nurturing", color: "var(--qpi-build)" };
  return { key: "early", label: "Early — research & nurture", color: "var(--qpi-early)" };
}

const Chevron = ({ open }) => (
  <svg className={"f95-qpi__chev" + (open ? " f95-qpi__chev--open" : "")} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 5.5 L7 9 L10.5 5.5" />
  </svg>
);

/**
 * QPIScore — THE signature component. A 0–100 number you can see inside:
 * it opens to reveal the five visible parts and the reasoning + source behind
 * each. The thesis made into one component — transparent, human, decisive.
 */
export function QPIScore({ value = 0, parts = {}, compact = false, defaultOpen = false, onAdjust, className = "", ...rest }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const t = tier(value);
  const cls = ["f95-qpi", compact ? "f95-qpi--compact" : "", className].filter(Boolean).join(" ");

  return (
    <div className={cls} {...rest}>
      <div className="f95-qpi__head">
        <div className="f95-qpi__numwrap" style={{ color: t.color }}>
          <span className="f95-qpi__num">{value}</span>
          <span className="f95-qpi__of">/100</span>
        </div>
        <div className="f95-qpi__meta">
          <span className="f95-qpi__tier" style={{ color: t.color }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color, display: "inline-block" }} />
            {t.label}
          </span>
          <div className="f95-qpi__seg" aria-hidden="true">
            {ORDER.map((k) => {
              const p = parts[k];
              const meta = PART_META[k];
              const score = p ? p.score : 0;
              return <span key={k} style={{ flex: score, background: meta.color }} />;
            })}
            <span style={{ flex: Math.max(0, 100 - value), background: "transparent" }} />
          </div>
        </div>
      </div>

      <button className="f95-qpi__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide the math" : "See inside the score"} <Chevron open={open} />
      </button>

      {open ? (
        <div className="f95-qpi__parts">
          {ORDER.map((k, i) => {
            const p = parts[k] || {};
            const meta = PART_META[k];
            const max = p.max ?? meta.max;
            const score = p.score ?? 0;
            const pct = Math.round((score / max) * 100);
            return (
              <div className="f95-qpi__part" key={k} style={{ animationDelay: `${i * 45}ms` }}>
                <div className="f95-qpi__prow">
                  <span className="f95-qpi__pdot" style={{ background: meta.color }} />
                  <span className="f95-qpi__plabel">{meta.label}</span>
                  <span className="f95-qpi__pscore">{score}<span className="f95-qpi__pmax">/{max}</span></span>
                </div>
                <div className="f95-qpi__ptrack">
                  <div className="f95-qpi__pfill" style={{ width: pct + "%", background: meta.color }} />
                </div>
                {p.reason ? <div className="f95-qpi__preason">{p.reason}</div> : null}
                <div className="f95-qpi__psrc">
                  {p.source ? <span className="f95-qpi__cite">{p.source}</span> : <span className="f95-qpi__unknown">Unknown — worth researching</span>}
                </div>
              </div>
            );
          })}
          <div className="f95-qpi__foot">
            <span className="f95-qpi__note">The copilot proposes this score. You decide.</span>
            <button className="f95-qpi__adjust" onClick={onAdjust}>Adjust the score</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

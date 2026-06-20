import React from "react";
import { RoleChip } from "./RoleChip.jsx";
import { HorizonTag } from "./HorizonTag.jsx";
import { Avatar } from "../core/Avatar.jsx";

const CSS = `
.f95-prow { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5); background: var(--surface-card); border: 1px solid var(--border-hairline); border-left: 3px solid var(--_tier, var(--border-default)); border-radius: var(--radius-md); transition: box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.f95-prow--interactive { cursor: pointer; }
.f95-prow--interactive:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.f95-prow__rank { display: flex; align-items: baseline; gap: 1px; width: 44px; flex: none; color: var(--text-strong); }
.f95-prow__rank .h { font: var(--fw-medium) var(--fs-caption)/1 var(--font-sans); color: var(--text-muted); }
.f95-prow__rank .n { font: var(--fw-heavy) var(--fs-2xl)/1 var(--font-sans); letter-spacing: var(--ls-tight); font-feature-settings: var(--num-tabular); }
.f95-prow__id { display: flex; align-items: center; gap: 11px; min-width: 0; flex: 1.4; }
.f95-prow__txt { min-width: 0; }
.f95-prow__name { font: var(--fw-semibold) var(--fs-body)/1.2 var(--font-sans); color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f95-prow__sub { font: var(--text-caption); color: var(--text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f95-prow__roles { display: flex; align-items: center; gap: 8px; flex: 1.5; min-width: 0; flex-wrap: wrap; }
.f95-prow__right { display: flex; align-items: center; gap: var(--space-5); margin-left: auto; flex: none; }
.f95-prow__cad { display: flex; align-items: center; gap: 6px; font: var(--text-caption); color: var(--text-secondary); white-space: nowrap; }
.f95-prow__beat { width: 9px; height: 9px; border-radius: 50%; background: var(--gold-600); flex: none; }
.f95-prow__beat--live { animation: f95-heartbeat var(--beat-period) var(--ease-in-out) infinite; }
.f95-prow__qpi { display: flex; align-items: baseline; gap: 2px; justify-content: flex-end; width: 58px; flex: none; }
.f95-prow__qpi .v { font: var(--fw-heavy) var(--fs-2xl)/1 var(--font-sans); letter-spacing: var(--ls-tight); font-feature-settings: var(--num-tabular); }
.f95-prow__qpi .s { font: var(--fw-semibold) var(--fs-micro)/1 var(--font-sans); color: var(--text-muted); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-prow-css")) {
  const el = document.createElement("style");
  el.id = "f95-prow-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

function tierColor(v) {
  if (v >= 90) return "var(--qpi-go)";
  if (v >= 70) return "var(--qpi-strong)";
  if (v >= 50) return "var(--qpi-build)";
  return "var(--qpi-early)";
}

/**
 * ProspectRow — one line of the Master Prospect List. Individuals, companies
 * and foundations all live on one ranked surface. A left accent in the QPI tier
 * color ties priority to the score; the cadence dot beats when a follow-up is due.
 */
export function ProspectRow({
  rank,
  name,
  kind = "person",
  subtitle,
  qpi = 0,
  horizon,
  manager,
  partner,
  cadence,
  dueSoon = false,
  interactive = true,
  onClick,
  className = "",
  ...rest
}) {
  const cls = ["f95-prow", interactive ? "f95-prow--interactive" : "", className].filter(Boolean).join(" ");
  return (
    <div className={cls} style={{ "--_tier": tierColor(qpi) }} onClick={onClick} {...rest}>
      {rank != null ? (
        <div className="f95-prow__rank"><span className="h">#</span><span className="n">{rank}</span></div>
      ) : null}
      <div className="f95-prow__id">
        <Avatar name={name} kind={kind === "person" ? "person" : "org"} size="md" />
        <div className="f95-prow__txt">
          <div className="f95-prow__name">{name}</div>
          {subtitle ? <div className="f95-prow__sub">{subtitle}</div> : null}
        </div>
      </div>
      <div className="f95-prow__roles">
        {manager ? <RoleChip role="manager" name={manager} /> : null}
        {partner ? <RoleChip role="partner" name={partner} /> : null}
      </div>
      <div className="f95-prow__right">
        {horizon ? <HorizonTag horizon={horizon} /> : null}
        {cadence ? (
          <span className="f95-prow__cad">
            <span className={"f95-prow__beat" + (dueSoon ? " f95-prow__beat--live" : "")} style={dueSoon ? null : { background: "var(--ink-300)" }} />
            {cadence}
          </span>
        ) : null}
        <div className="f95-prow__qpi" title={`QPI ${qpi}`}><span className="v" style={{ color: tierColor(qpi) }}>{qpi}</span><span className="s">QPI</span></div>
      </div>
    </div>
  );
}

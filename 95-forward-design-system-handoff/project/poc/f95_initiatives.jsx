/* 95 Forward — Initiatives (funding priorities; lean: list + detail) and the
   95 Forward settings page (the editable QPI weights — the score is ours). */

const IN = window.Ds95ForwardDesignSystem_31a0c4 || {};

const fmtK = n => n >= 1000000 ? "$" + (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + "M" : "$" + Math.round(n / 1000) + "K";

/* ============================ INITIATIVES LIST ============================ */
function Initiatives({ go }) {
  const D = window.POC_DATA;
  const { Icon, Eyebrow } = window.POC;
  const { Tag, Button, HorizonTag } = IN;
  const [frame, setFrame] = React.useState("all");
  const rows = D.initiatives.filter(i => frame === "all" || i.frame === frame);

  return (
    <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[["all", "All", null], ["today", "Today", "var(--horizon-today)"], ["tomorrow", "Tomorrow", "var(--horizon-tomorrow)"], ["forever", "Forever", "var(--horizon-forever)"]].map(([id, l, c]) => (
          <Tag key={id} color={c} selected={frame === id} onClick={() => setFrame(id)}>{l}</Tag>
        ))}
        <Button variant="secondary" size="sm" style={{ marginLeft: "auto" }} iconLeft={<Icon name="plus" size={14} />}>Add initiative</Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(i => {
          const pct = Math.round(i.raised / i.goal * 100);
          const col = { today: "var(--horizon-today)", tomorrow: "var(--horizon-tomorrow)", forever: "var(--horizon-forever)" }[i.frame];
          return (
            <div key={i.id} onClick={() => go("initiative", { id: i.id })} style={{
              padding: 20, borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
              borderLeft: "3px solid " + col, cursor: "pointer", transition: "box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)", color: "var(--text-strong)" }}>{i.name}</span>
                    <HorizonTag horizon={i.frame} />
                  </div>
                  <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 4 }}>{i.timeline} · {i.openAsks} open asks</div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div className="ks-num" style={{ font: "var(--fw-bold) var(--fs-lg) var(--font-sans)", color: "var(--text-strong)" }}>{fmtK(i.raised)}</div>
                  <div className="ks-num" style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>of {fmtK(i.goal)} goal</div>
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "var(--haze-100)", marginTop: 16, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ INITIATIVE DETAIL ============================ */
function InitiativeDetail({ params, go }) {
  const D = window.POC_DATA;
  const { Icon, Eyebrow } = window.POC;
  const { Card, HorizonTag, Button, Badge } = IN;
  const i = D.initiatives.find(x => x.id === (params && params.id)) || D.initiatives[0];
  const col = { today: "var(--horizon-today)", tomorrow: "var(--horizon-tomorrow)", forever: "var(--horizon-forever)" }[i.frame];
  const pct = Math.round(i.raised / i.goal * 100);
  const cPct = Math.round(i.committed / i.goal * 100);
  const rPct = Math.round(i.roadmap / i.goal * 100);
  const prospects = i.prospects.map(id => D.prospects.find(p => p.id === id));
  const outcomeTone = { Commitment: "success", Roadmap: "info", Decline: "neutral" };

  return (
    <div style={{ padding: "24px 32px 48px", display: "flex", flexDirection: "column", gap: 22, maxWidth: 980 }}>
      <button onClick={() => go("initiatives")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", font: "var(--fw-medium) var(--fs-small) var(--font-sans)", padding: 0, width: "fit-content" }}>
        <Icon name="arrow-left" size={15} /> Initiatives
      </button>

      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ font: "var(--fw-bold) var(--fs-2xl)/1.15 var(--font-sans)", color: "var(--text-strong)", letterSpacing: "var(--ls-snug)" }}>{i.name}</h1>
          <HorizonTag horizon={i.frame} />
        </div>
        <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 6 }}>{i.timeline}</div>
      </div>

      {/* Progress */}
      <Card pad="lg">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-3xl) var(--font-sans)", color: "var(--text-strong)" }}>{fmtK(i.raised)}</span>
          <span style={{ font: "var(--fs-body) var(--font-sans)", color: "var(--text-muted)" }}>raised of {fmtK(i.goal)} goal · {pct}%</span>
        </div>
        <div style={{ position: "relative", height: 12, borderRadius: 99, background: "var(--haze-100)", marginTop: 16, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, width: (pct + cPct + rPct) + "%", background: "var(--haze-200)", borderRadius: 99 }} />
          <div style={{ position: "absolute", inset: 0, width: (pct + cPct) + "%", background: col, opacity: 0.4, borderRadius: 99 }} />
          <div style={{ position: "absolute", inset: 0, width: pct + "%", background: col, borderRadius: 99 }} />
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
          {[["Raised", fmtK(i.raised), col], ["Committed", fmtK(i.committed), col], ["In roadmap", fmtK(i.roadmap), "var(--ink-300)"]].map(([l, v, c], idx) => (
            <div key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c, opacity: idx === 1 ? 0.4 : 1 }} />
              <span style={{ font: "var(--text-caption)", color: "var(--text-secondary)" }}>{l}</span>
              <span className="ks-num" style={{ font: "var(--fw-bold) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* The story */}
      <Card pad="lg">
        <Eyebrow>The story</Eyebrow>
        <p style={{ font: "var(--fw-regular) var(--fs-xl)/1.5 var(--font-serif)", color: "var(--text-strong)", margin: "14px 0 0", letterSpacing: "var(--ls-snug)" }}>{i.story}</p>
        {/* copilot funding rationale */}
        <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: "var(--radius-md)", background: "var(--ai-surface)", border: "1px solid var(--ai-border)", borderLeft: "3px solid var(--ai-ink)", display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ width: 13, height: 13, borderRadius: 3, background: "var(--ai-ink)", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div style={{ font: "var(--fw-semibold) 10px var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--ai-ink)" }}>Copilot · funding rationale</div>
            <div style={{ font: "var(--fs-small) var(--font-sans)", color: "var(--iris-700)", marginTop: 5 }}>{i.widget}</div>
          </div>
        </div>
      </Card>

      {/* Prospects & asks */}
      <Card pad="none">
        <div style={{ padding: "18px 20px 4px" }}><Eyebrow>Prospects &amp; asks on this initiative</Eyebrow></div>
        <table className="ks-table" style={{ "--host-rule": "var(--border-hairline)" }}>
          <thead><tr><th style={{ padding: "8px 20px 10px" }}>Prospect</th><th style={{ textAlign: "right" }}>QPI</th><th>RM</th><th style={{ textAlign: "right" }}>Ask</th><th style={{ paddingRight: 20 }}>Outcome</th></tr></thead>
          <tbody>
            {prospects.map(p => (
              <tr key={p.id} className="is-click" onClick={() => go("prospect", { id: p.id })}>
                <td style={{ padding: "12px 20px", fontWeight: 600, color: "var(--text-strong)" }}>{p.name}</td>
                <td className="ks-num" style={{ textAlign: "right", fontWeight: 700, color: p.qpi >= 90 ? "var(--gold-600)" : p.qpi >= 70 ? "var(--blue-600)" : "var(--sage-600)" }}>{p.qpi}</td>
                <td style={{ color: "var(--text-secondary)" }}>{p.manager}</td>
                <td className="ks-num" style={{ textAlign: "right" }}>{p.id === "p1" ? "$250K" : p.id === "p6" ? "$25K" : "—"}</td>
                <td style={{ paddingRight: 20 }}>{p.id === "p1" ? <Badge tone="info">Roadmap</Badge> : <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>In cultivation</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================ 95 FORWARD SETTINGS ============================ */
function F95Settings({ go }) {
  const D = window.POC_DATA;
  const { Icon, Eyebrow } = window.POC;
  const { Card } = IN;
  const [weights, setWeights] = React.useState(D.qpiWeights.map(w => w.weight));
  const [toggles, setToggles] = React.useState({ research: true, autoscore: true, drafts: true });
  const total = weights.reduce((a, b) => a + b, 0);

  const Toggle = ({ on, onClick }) => (
    <button onClick={onClick} style={{ width: 42, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: on ? "var(--blue-600)" : "var(--ink-200)", position: "relative", transition: "background var(--dur-base)" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: 99, background: "#fff", transition: "left var(--dur-base) var(--ease-out)", boxShadow: "var(--shadow-sm)" }} />
    </button>
  );

  return (
    <div style={{ padding: "24px 32px 48px", display: "flex", flexDirection: "column", gap: 22, maxWidth: 820 }}>
      <button onClick={() => go("settings")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", font: "var(--fw-medium) var(--fs-small) var(--font-sans)", padding: 0, width: "fit-content" }}>
        <Icon name="arrow-left" size={15} /> Settings
      </button>

      <Card pad="lg">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <Eyebrow>QPI weights</Eyebrow>
          <span style={{ font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)", color: total === 20 ? "var(--sage-700)" : "var(--gold-700)" }}>Points sum to {total * 5} / 100</span>
        </div>
        <p style={{ font: "var(--fs-small)/1.5 var(--font-sans)", color: "var(--text-secondary)", margin: "0 0 20px", maxWidth: 580 }}>
          Each prospect is rated 1–5 on five dimensions; the rating is multiplied by the dimension's weight. This is what makes the score ours to tune — and explainable, not a black box.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {D.qpiWeights.map((w, idx) => (
            <div key={w.key} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: idx < 4 ? "1px solid var(--border-hairline)" : "none" }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: w.color, flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--text-strong)" }}>{w.label}</div>
                <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 2 }}>{w.note}</div>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setWeights(ws => ws.map((x, i) => i === idx ? Math.max(1, x - 1) : x))} style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", color: "var(--text-body)", font: "var(--fw-bold) 16px var(--font-sans)" }}>−</button>
                <span className="ks-num" style={{ width: 24, textAlign: "center", font: "var(--fw-bold) var(--fs-body) var(--font-sans)", color: "var(--text-strong)" }}>{weights[idx]}</span>
                <button onClick={() => setWeights(ws => ws.map((x, i) => i === idx ? Math.min(10, x + 1) : x))} style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", color: "var(--text-body)", font: "var(--fw-bold) 16px var(--font-sans)" }}>+</button>
              </div>
              <div style={{ width: 70, textAlign: "right" }}>
                <span className="ks-num" style={{ font: "var(--fw-bold) var(--fs-body) var(--font-sans)", color: w.color }}>max {weights[idx] * 5}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => setWeights(D.qpiWeights.map(w => w.weight))} style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>Reset to defaults</button>
        </div>
      </Card>

      <Card pad="lg">
        <Eyebrow>Copilot behavior</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
          {[["research", "Let the copilot research public sources", "990-PF filings, board rosters, press — always shown with provenance."],
            ["autoscore", "Propose QPI updates automatically", "New evidence proposes a score change. You always approve before it applies."],
            ["drafts", "Draft 24-hour follow-ups after visits", "A ready-to-edit follow-up the moment you log a debrief."]].map(([k, l, d], idx) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 0", borderBottom: idx < 2 ? "1px solid var(--border-hairline)" : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>{l}</div>
                <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 2 }}>{d}</div>
              </div>
              <Toggle on={toggles[k]} onClick={() => setToggles(t => ({ ...t, [k]: !t[k] }))} />
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "14px 18px", borderRadius: "var(--radius-md)", background: "var(--haze-100)", border: "1px solid var(--border-hairline)" }}>
        <Icon name="shield" size={16} color="var(--ink-500)" style={{ marginTop: 1 }} />
        <span style={{ font: "var(--fs-caption)/1.5 var(--font-sans)", color: "var(--text-secondary)" }}>
          The copilot only researches public sources, and every grounded fact carries a citation. Nothing is applied to a record without your approval. Discovery candidates stay off the ranked list until a human and the connector validate them.
        </span>
      </div>
    </div>
  );
}

window.POC = Object.assign(window.POC || {}, { Initiatives, InitiativeDetail, F95Settings });

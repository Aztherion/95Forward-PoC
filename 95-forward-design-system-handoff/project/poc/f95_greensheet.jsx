/* 95 Forward — Green Sheet. Momentum made visible: method-native activity, not
   vanity revenue. Calm, scannable, motivating. */

const GS = window.Ds95ForwardDesignSystem_31a0c4 || {};

function GreenSheet({ go }) {
  const D = window.POC_DATA;
  const { Icon, Eyebrow } = window.POC;
  const { Card, HorizonTag } = GS;
  const g = D.greenSheet;
  const [range, setRange] = React.useState("week");
  const [scope, setScope] = React.useState("me");

  const Pill = ({ value, set, opts }) => (
    <div style={{ display: "inline-flex", padding: 3, background: "var(--haze-100)", borderRadius: "var(--radius-md)" }}>
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => set(k)} style={{ padding: "6px 13px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", background: value === k ? "var(--surface-card)" : "transparent", boxShadow: value === k ? "var(--shadow-sm)" : "none", color: value === k ? "var(--text-strong)" : "var(--text-muted)", font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)" }}>{l}</button>
      ))}
    </div>
  );

  const Metric = ({ label, value, suffix, accent, sub, bar }) => (
    <Card pad="md">
      <div style={{ font: "var(--fw-semibold) 10px/1 var(--font-sans)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 12 }}>
        <span className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-4xl)/0.9 var(--font-sans)", letterSpacing: "var(--ls-tight)", color: accent }}>{value}</span>
        {suffix ? <span style={{ font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)", color: "var(--text-muted)" }}>{suffix}</span> : null}
      </div>
      {bar != null ? <div style={{ height: 7, borderRadius: 99, background: "var(--haze-100)", marginTop: 14, overflow: "hidden" }}><div style={{ height: "100%", width: bar + "%", borderRadius: 99, background: accent }} /></div> : null}
      {sub ? <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 10 }}>{sub}</div> : null}
    </Card>
  );

  const totalAsks = g.asksByOutcome.commitment + g.asksByOutcome.roadmap + g.asksByOutcome.decline;

  return (
    <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 22, maxWidth: 1080 }}>
      {/* controls + streak */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Pill value={range} set={setRange} opts={[["week", "This week"], ["month", "This month"], ["quarter", "Quarter"]]} />
        <Pill value={scope} set={setScope} opts={[["me", "Me"], ["dana", "Dana"], ["priya", "Priya"], ["team", "Team"]]} />
        <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 9, padding: "8px 14px", borderRadius: "var(--radius-pill)", background: "var(--sage-50)", border: "1px solid var(--sage-100)" }}>
          <Icon name="flame" size={16} color="var(--sage-600)" />
          <span style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--sage-700)" }}>{g.streak}-week momentum streak</span>
        </div>
      </div>

      {/* top metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <Metric label="Visits this week" value={g.visits.value} suffix={"/ " + g.visits.goal} accent="var(--blue-600)" bar={g.visits.value / g.visits.goal * 100} sub="One to go — nicely paced." />
        <Metric label="Asks this month" value={g.asks.value} suffix={"/ " + g.asks.goal} accent="var(--gold-600)" bar={g.asks.value / g.asks.goal * 100} sub="Keep the conversations moving." />
        <Metric label="Follow-ups within 24h" value={g.followupPct} suffix="%" accent="var(--sage-600)" bar={g.followupPct} sub="The SLA we care about most." />
      </div>

      {/* coverage + outcomes + referrals */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr 0.8fr", gap: 16, alignItems: "stretch" }}>
        {/* Top 33 coverage */}
        <Card pad="md">
          <Eyebrow>Top 33 coverage</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
            {[["Has an assigned RM", g.coverage.assigned, "var(--blue-600)"], ["Has an active strategy", g.coverage.strategy, "var(--sage-600)"]].map(([l, v, c], i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ font: "var(--fs-small) var(--font-sans)", color: "var(--text-body)" }}>{l}</span>
                  <span className="ks-num" style={{ font: "var(--fw-bold) var(--fs-small) var(--font-sans)", color: c }}>{v}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "var(--haze-100)", overflow: "hidden" }}><div style={{ height: "100%", width: v + "%", background: c, borderRadius: 99 }} /></div>
              </div>
            ))}
            <button onClick={() => go("mpl")} style={{ font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)", color: "var(--blue-600)", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", display: "inline-flex", alignItems: "center", gap: 5 }}>
              4 without a strategy — see them <Icon name="arrow-right" size={13} color="var(--blue-600)" />
            </button>
          </div>
        </Card>

        {/* Asks by outcome */}
        <Card pad="md">
          <Eyebrow>Asks by outcome</Eyebrow>
          <div style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", marginTop: 16, gap: 2 }}>
            <div style={{ flex: g.asksByOutcome.commitment, background: "var(--sage-600)" }} title="Commitment" />
            <div style={{ flex: g.asksByOutcome.roadmap, background: "var(--blue-500)" }} title="Roadmap" />
            <div style={{ flex: g.asksByOutcome.decline, background: "var(--ink-300)" }} title="Decline" />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
            {[["Commitment", g.asksByOutcome.commitment, "var(--sage-600)"], ["Roadmap", g.asksByOutcome.roadmap, "var(--blue-500)"], ["Decline", g.asksByOutcome.decline, "var(--ink-300)"]].map(([l, v, c], i) => (
              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: c }} />
                <span className="ks-num" style={{ font: "var(--fw-bold) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>{v}</span>
                <span style={{ font: "var(--text-caption)", color: "var(--text-secondary)" }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ font: "var(--text-caption)/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 14 }}>“Roadmap” is a good outcome — a clear next step, not a no.</div>
        </Card>

        {/* Referrals per visit */}
        <Card pad="md">
          <Eyebrow>Referrals per visit</Eyebrow>
          <div className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-4xl)/0.9 var(--font-sans)", color: "var(--sage-600)", marginTop: 14, letterSpacing: "var(--ls-tight)" }}>{g.referralsPerVisit}</div>
          <div style={{ font: "var(--text-caption)/1.5 var(--font-sans)", color: "var(--text-secondary)", marginTop: 12 }}>The relationship compounding — every visit opens the next door.</div>
        </Card>
      </div>

      {/* Pipeline by horizon */}
      <Card pad="lg">
        <Eyebrow>Pipeline by horizon</Eyebrow>
        <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 4, marginBottom: 18 }}>Today → Tomorrow → Forever — near to far.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {g.pipelineByHorizon.map((h, i) => {
            const col = { today: "var(--horizon-today)", tomorrow: "var(--horizon-tomorrow)", forever: "var(--horizon-forever)" }[h.horizon];
            return (
              <div key={i} style={{ padding: 18, borderRadius: "var(--radius-md)", border: "1px solid var(--border-hairline)", borderTop: "3px solid " + col }}>
                <div style={{ marginBottom: 12 }}><HorizonTag horizon={h.horizon} /></div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-2xl) var(--font-sans)", color: "var(--text-strong)" }}>{h.count}</span>
                  <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>prospects</span>
                </div>
                <div className="ks-num" style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: col, marginTop: 6 }}>{h.total} in pipeline</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* By RM */}
      <Card pad="none">
        <div style={{ padding: "18px 20px 4px" }}><Eyebrow>By Relationship Manager</Eyebrow></div>
        <table className="ks-table" style={{ "--host-rule": "var(--border-hairline)" }}>
          <thead><tr><th style={{ padding: "8px 20px 10px" }}>RM</th><th style={{ textAlign: "right" }}>Top-33 coverage</th><th style={{ textAlign: "right" }}>Visits</th><th style={{ textAlign: "right" }}>Asks</th><th style={{ textAlign: "right", paddingRight: 20 }}>24h follow-up</th></tr></thead>
          <tbody>
            {g.byRM.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "13px 20px", fontWeight: 600, color: "var(--text-strong)" }}>{r.rm}</td>
                <td className="ks-num" style={{ textAlign: "right" }}>{r.coverage}%</td>
                <td className="ks-num" style={{ textAlign: "right" }}>{r.visits}</td>
                <td className="ks-num" style={{ textAlign: "right" }}>{r.asks}</td>
                <td className="ks-num" style={{ textAlign: "right", paddingRight: 20, fontWeight: 600, color: "var(--sage-700)" }}>{r.followup}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

window.POC = Object.assign(window.POC || {}, { GreenSheet });

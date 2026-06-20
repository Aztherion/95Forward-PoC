/* 95 Forward — Today. The daily focus screen: where attention goes today.
   Action over archive. Warm register. */

const TD = window.Ds95ForwardDesignSystem_31a0c4 || {};

function Today({ go }) {
  const D = window.POC_DATA;
  const { Icon, Eyebrow } = window.POC;
  const { Card, Button, HorizonTag } = TD;
  const t = D.today;
  const [scope, setScope] = React.useState("me");
  const byId = id => D.prospects.find(p => p.id === id);

  const Section = ({ icon, title, count, accent, children }) => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <Icon name={icon} size={17} color={accent || "var(--ink-500)"} />
        <span style={{ font: "var(--fw-semibold) var(--fs-caption)/1 var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-secondary)" }}>{title}</span>
        {count != null ? <span style={{ font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)", color: "var(--text-muted)" }}>· {count}</span> : null}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 30, maxWidth: 1080 }}>
      {/* scope toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: -6 }}>
        <div style={{ display: "inline-flex", padding: 3, background: "var(--haze-100)", borderRadius: "var(--radius-md)" }}>
          {[["me", "Me"], ["team", "Team"]].map(([k, l]) => (
            <button key={k} onClick={() => setScope(k)} style={{
              padding: "6px 16px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
              background: scope === k ? "var(--surface-card)" : "transparent", boxShadow: scope === k ? "var(--shadow-sm)" : "none",
              color: scope === k ? "var(--text-strong)" : "var(--text-muted)", font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
            }}>{l}</button>
          ))}
        </div>
        <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>Tuesday, June 18 · {scope === "me" ? "Your day" : "The team's day"}</span>
      </div>

      {/* Your next right moves */}
      <Section icon="compass" title="Your next right moves" accent="var(--gold-600)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {t.nextMoves.map((m, i) => {
            const p = byId(m.id);
            const go90 = p.qpi >= 90;
            return (
              <Card key={i} tone={go90 ? "go" : "default"} pad="md" interactive onClick={() => go("prospect", { id: p.id })}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 1, color: go90 ? "var(--gold-600)" : p.qpi >= 70 ? "var(--blue-600)" : "var(--sage-600)" }}>
                    <span className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-3xl)/1 var(--font-sans)", letterSpacing: "-0.02em" }}>{p.qpi}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "var(--fw-semibold) var(--fs-body)/1.2 var(--font-sans)", color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 2 }}>{p.subtitle}</div>
                  </div>
                  <HorizonTag horizon={p.horizon} />
                </div>
                <p style={{ font: "var(--fs-small)/1.5 var(--font-sans)", color: "var(--text-body)", margin: "0 0 14px" }}>{m.move}</p>
                <Button variant={go90 ? "go" : "secondary"} size="sm" onClick={(e) => { e.stopPropagation(); go(m.primary ? "visit" : "prospect", { id: p.id }); }} iconLeft={<Icon name={m.action === "Plan the visit" ? "calendar-check" : "message-square"} size={15} />}>{m.action}</Button>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* Follow-ups due — the 24h SLA queue with the heartbeat */}
      <Section icon="clock" title="Follow-ups due" count={t.followups.length} accent="var(--gold-600)">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {t.followups.map((f, i) => {
            const p = byId(f.id);
            return (
              <div key={i} onClick={() => go("prospect", { id: p.id })} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", cursor: "pointer",
                background: "var(--surface-card)", border: "1px solid " + (f.overdue ? "var(--gold-300)" : "var(--border-hairline)"),
                borderRadius: "var(--radius-md)", transition: "box-shadow var(--dur-base) var(--ease-out)",
              }}>
                <span style={{ width: 11, height: 11, borderRadius: 99, background: f.overdue ? "var(--gold-600)" : "var(--gold-600)", animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite", flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "var(--fw-medium) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>{p.name}</div>
                  <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 2 }}>{f.text}</div>
                </div>
                <span style={{ font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)", color: f.overdue ? "var(--gold-700)" : "var(--text-secondary)" }}>{f.left}</span>
                <Button variant="ghost" size="sm" iconRight={<Icon name="arrow-right" size={14} />}>Open the draft</Button>
              </div>
            );
          })}
        </div>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {/* Today's visits */}
        <Section icon="map-pin" title="Today's visits" accent="var(--blue-600)">
          {t.visits.map((v, i) => {
            const p = byId(v.id);
            return (
              <Card key={i} pad="md">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span className="ks-num" style={{ font: "var(--fw-bold) var(--fs-lg) var(--font-sans)", color: "var(--blue-700)" }}>{v.time}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--text-strong)" }}>{v.who}</div>
                    <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 2 }}>Lead with: {v.priority}</div>
                  </div>
                </div>
                <Button variant="go" size="sm" block onClick={() => go("visit")} iconLeft={<Icon name="radio" size={15} />}>Enter visit mode</Button>
              </Card>
            );
          })}
        </Section>

        {/* From your copilot */}
        <Section icon="cpu" title="From your copilot" accent="var(--ai-ink)">
          <Card tone="ai" accent pad="md" interactive onClick={() => go("prospect", { id: "p1" })}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, background: "var(--ai-ink)" }} />
              <span style={{ font: "var(--fw-semibold) var(--fs-caption)/1 var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--ai-ink)" }}>{t.copilotCount} suggestions to review</span>
            </div>
            <p style={{ font: "var(--fs-small)/1.5 var(--font-sans)", color: "var(--iris-700)", margin: 0 }}>
              Capacity bumps, two new Natural Partners, and a fresh discovery batch — across your portfolio. Each proposes; you decide.
            </p>
            <div style={{ marginTop: 12, font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--ai-ink)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              Review them <Icon name="arrow-right" size={14} color="var(--ai-ink)" />
            </div>
          </Card>
        </Section>
      </div>

      {/* Coverage nudge — quiet */}
      <div onClick={() => go("mpl")} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", cursor: "pointer",
        background: "var(--haze-100)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-hairline)",
      }}>
        <Icon name="users-round" size={16} color="var(--ink-500)" />
        <span style={{ flex: 1, font: "var(--fs-small) var(--font-sans)", color: "var(--text-body)" }}>{t.coverage.text} — worth a look.</span>
        <span style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--blue-600)", display: "inline-flex", alignItems: "center", gap: 4 }}>See them <Icon name="arrow-right" size={14} color="var(--blue-600)" /></span>
      </div>
    </div>
  );
}

window.POC = Object.assign(window.POC || {}, { Today });

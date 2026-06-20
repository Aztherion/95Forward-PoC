/* Prospect Profile — the deep view; the QPI signature lives here (Register A). */
const PP = window.Ds95ForwardDesignSystem_31a0c4;

function FactRow({ label, value, source, ai }) {
  const { SourceTag } = PP;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border-hairline)" }}>
      <div style={{ width: 150, flex: "none", font: "var(--text-label)", color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {value ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ font: "var(--fw-semibold) var(--fs-body)/1.3 var(--font-sans)", color: ai ? "var(--iris-700)" : "var(--text-strong)" }}>{value}</span>
            {ai ? <span style={{ font: "var(--fw-semibold) 10px var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--ai-ink)", background: "var(--ai-tint)", padding: "2px 6px", borderRadius: "var(--radius-xs)" }}>Copilot</span> : null}
            <SourceTag source={source} />
          </div>
        ) : (
          <SourceTag onClick={() => {}} />
        )}
      </div>
    </div>
  );
}

function ProspectProfile({ prospect, go }) {
  const D = window.F95_DATA;
  const H = D.hartwell;
  const p = prospect || D.prospects[0];
  const { QPIScore, AISuggestion, RoleChip, HorizonTag, Card, Button, Avatar, Badge } = PP;
  const { Icon, Eyebrow } = window.F95;
  const kindLabel = { person: "Individual", company: "Company", foundation: "Foundation" }[p.kind] || "Prospect";

  return (
    <div style={{ padding: "var(--space-7)", display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: "var(--space-7)", alignItems: "start" }}>
      {/* MAIN COLUMN */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", minWidth: 0 }}>
        <button onClick={() => go("list")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", font: "var(--fw-medium) var(--fs-small) var(--font-sans)", padding: 0, width: "fit-content" }}>
          <Icon name="arrow-left" size={15} /> Back to the list
        </button>

        {/* Header */}
        <div style={{ display: "flex", gap: "var(--space-5)", alignItems: "flex-start" }}>
          <Avatar name={p.name} kind={p.kind === "person" ? "person" : "org"} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ font: "var(--text-h1)", color: "var(--text-strong)", letterSpacing: "var(--ls-snug)" }}>{p.name}</h1>
              <Badge tone="neutral">{kindLabel}</Badge>
              <span style={{ font: "var(--fw-medium) var(--fs-micro)/1.3 var(--font-mono)", color: "var(--text-muted)" }}>#{p.rank} on the list</span>
            </div>
            <div style={{ font: "var(--text-body-r)", color: "var(--text-secondary)", marginTop: 4 }}>{p.subtitle}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              {p.manager ? <RoleChip role="manager" name={p.manager} /> : null}
              {p.partner ? <RoleChip role="partner" name={p.partner} /> : null}
              <HorizonTag horizon={p.horizon} />
            </div>
          </div>
        </div>

        {/* THE SIGNATURE — QPI you can see inside */}
        <Card tone="go" pad="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Eyebrow color="var(--gold-700)">Qualified Prospect Index</Eyebrow>
            <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>Updated 6h ago</span>
          </div>
          <QPIScore value={H.qpi} parts={H.parts} defaultOpen onAdjust={() => {}} />
        </Card>

        {/* Copilot suggestions */}
        <div>
          <Eyebrow color="var(--ai-ink)">From your copilot · {H.suggestions.length} to review</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {H.suggestions.map((s) => (
              <AISuggestion key={s.id} source={s.source} from={s.from} to={s.to} onApprove={() => {}} onEdit={() => {}} onDismiss={() => {}}>
                {s.text}
              </AISuggestion>
            ))}
          </div>
        </div>

        {/* What we know */}
        <Card pad="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Eyebrow>What we know</Eyebrow>
            <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>Gaps are invitations, not errors</span>
          </div>
          {H.facts.map((f, i) => <FactRow key={i} {...f} />)}
        </Card>
      </div>

      {/* RIGHT RAIL */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", position: "sticky", top: "var(--space-7)" }}>
        <Card tone="default" pad="md" elevation="md">
          <Eyebrow color="var(--gold-700)">The next move</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "12px 0 4px" }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--gold-600)", animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite" }} />
            <span style={{ font: "var(--text-title)", color: "var(--text-strong)" }}>Follow up by tomorrow</span>
          </div>
          <p style={{ font: "var(--text-small, var(--fs-small)) ", fontSize: "var(--fs-small)", lineHeight: 1.5, color: "var(--text-secondary)", marginBottom: 14 }}>
            Tom can open the door this week. Fast and good beats slow and perfect.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Button variant="go" block iconLeft={<Icon name="calendar-check" size={16} />}>Plan the visit</Button>
            <Button variant="secondary" block iconLeft={<Icon name="message-square" size={15} />}>Log a touch</Button>
          </div>
        </Card>

        <Card pad="md">
          <Eyebrow>Recent activity</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
            {H.timeline.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--ink-300)", marginTop: 5 }} />
                  {i < H.timeline.length - 1 ? <span style={{ width: 1.5, flex: 1, background: "var(--border-hairline)", marginTop: 3 }} /> : null}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: "var(--text-label)", color: "var(--text-strong)" }}>{t.what}</div>
                  <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 2 }}>{t.when} · {t.who}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

window.F95 = Object.assign(window.F95 || {}, { ProspectProfile });

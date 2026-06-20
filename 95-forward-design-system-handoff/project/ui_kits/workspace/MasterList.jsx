/* Master Prospect List — the ranked cockpit (Register A). */
const { ProspectRow, Tag, Button: F95Button, Badge: F95Badge } = window.Ds95ForwardDesignSystem_31a0c4;

function MasterList({ go }) {
  const D = window.F95_DATA;
  const { Icon, Eyebrow } = window.F95;
  const [filter, setFilter] = React.useState("all");

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "today", label: "Today", color: "var(--horizon-today)" },
    { id: "tomorrow", label: "Tomorrow", color: "var(--horizon-tomorrow)" },
    { id: "forever", label: "Forever", color: "var(--horizon-forever)" },
  ];
  const rows = D.prospects.filter((p) => filter === "all" || p.horizon === filter);
  const top = D.prospects[0];

  return (
    <div style={{ padding: "var(--space-7)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* The next right move — one focused callout */}
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-5)",
        padding: "var(--space-5) var(--space-6)", borderRadius: "var(--radius-lg)",
        background: "linear-gradient(180deg, var(--gold-50), var(--white))",
        border: "1px solid var(--gold-300)", boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 2, color: "var(--gold-700)" }}>
          <span style={{ font: "var(--fw-heavy) var(--fs-4xl)/0.9 var(--font-sans)", letterSpacing: "var(--ls-tight)", fontFeatureSettings: "var(--num-tabular)" }}>{top.qpi}</span>
          <span style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--gold-600)" }}>/100</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color="var(--gold-700)">Your next right move</Eyebrow>
          <div style={{ font: "var(--text-title)", color: "var(--text-strong)", marginTop: 4 }}>{top.name}</div>
          <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 2 }}>QPI 90+ — go see them today. {top.cadence}.</div>
        </div>
        <F95Button variant="go" iconLeft={<Icon name="calendar-check" size={16} />} onClick={() => go("profile", top)}>Plan the visit</F95Button>
      </div>

      {/* Filters + count */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {FILTERS.map((f) => (
            <Tag key={f.id} color={f.color} selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Tag>
          ))}
        </div>
        <span style={{ marginLeft: "auto", font: "var(--text-caption)", color: "var(--text-muted)" }}>
          {rows.length} on the list · ranked by QPI
        </span>
      </div>

      {/* The one ranked list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((p) => (
          <ProspectRow key={p.id} {...p} onClick={() => go("profile", p)} />
        ))}
      </div>
    </div>
  );
}

window.F95 = Object.assign(window.F95 || {}, { MasterList });

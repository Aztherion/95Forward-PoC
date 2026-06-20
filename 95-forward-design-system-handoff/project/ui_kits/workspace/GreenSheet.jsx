/* Green Sheet — the simple scoreboard. Momentum made visible (Register A). */
const GS = window.Ds95ForwardDesignSystem_31a0c4;

function StatCard({ stat, accent }) {
  const pct = Math.min(100, Math.round((stat.value / stat.goal) * 100));
  const done = stat.value >= stat.goal;
  return (
    <div style={{ flex: 1, background: "var(--surface-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", padding: "var(--space-6)" }}>
      <div style={{ font: "var(--fw-semibold) var(--fs-micro)/1 var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-muted)" }}>{stat.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 12 }}>
        <span style={{ font: "var(--fw-heavy) var(--fs-score)/0.9 var(--font-sans)", letterSpacing: "var(--ls-tight)", fontFeatureSettings: "var(--num-tabular)", color: accent }}>{stat.value}</span>
        <span style={{ font: "var(--fw-semibold) var(--fs-xl) var(--font-sans)", color: "var(--text-muted)" }}>/ {stat.goal}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--haze-100)", marginTop: 16, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", borderRadius: 99, background: accent, transition: "width var(--dur-deliberate) var(--ease-emph)" }} />
      </div>
      <div style={{ font: "var(--text-caption)", color: done ? "var(--sage-700)" : "var(--text-secondary)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
        {done ? "Goal met — nicely done." : `${stat.goal - stat.value} to go this period`}
      </div>
    </div>
  );
}

function GreenSheet({ go }) {
  const D = window.F95_DATA;
  const g = D.greenSheet;
  const { Eyebrow, Icon } = window.F95;
  return (
    <div style={{ padding: "var(--space-7)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-5) var(--space-6)",
        background: "var(--sage-50)", border: "1px solid var(--sage-100)", borderRadius: "var(--radius-lg)",
      }}>
        <span style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 99, background: "var(--white)", alignItems: "center", justifyContent: "center", border: "1px solid var(--sage-100)" }}>
          <Icon name="flame" size={20} color="var(--sage-600)" />
        </span>
        <div>
          <div style={{ font: "var(--text-title)", color: "var(--text-strong)" }}>{g.streak}-week momentum streak</div>
          <div style={{ font: "var(--text-caption)", color: "var(--sage-700)" }}>You've hit your visit goal six weeks running. Keep the cadence.</div>
        </div>
      </div>

      <div>
        <Eyebrow>This period</Eyebrow>
        <div style={{ display: "flex", gap: "var(--space-5)", marginTop: 14 }}>
          <StatCard stat={g.visits} accent="var(--blue-600)" />
          <StatCard stat={g.asks} accent="var(--gold-600)" />
          <StatCard stat={g.followups} accent="var(--sage-600)" />
        </div>
      </div>

      <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
        <Eyebrow>The discipline</Eyebrow>
        <p style={{ font: "var(--fw-regular) var(--fs-lg)/1.5 var(--font-serif)", color: "var(--text-body)", marginTop: 12, maxWidth: 560, letterSpacing: "var(--ls-snug)" }}>
          Three numbers, honestly kept: visits made, asks delivered, and follow-ups sent within 24 hours. Not a vanity dashboard — a scoreboard for the work that moves a mission forward.
        </p>
      </div>
    </div>
  );
}

window.F95 = Object.assign(window.F95 || {}, { GreenSheet });

/* Shell: Icon (Lucide), Sidebar, Topbar, shared bits. Exports to window.F95. */
const DS = window.Ds95ForwardDesignSystem_31a0c4 || {};
const { Avatar, Badge } = DS;

/* Lucide icon wrapper — re-renders the SVG each paint. */
function Icon({ name, size = 18, stroke = 1.8, color = "currentColor", style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = "";
      const i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: { width: size, height: size, "stroke-width": stroke },
      });
    }
  });
  return <span ref={ref} style={{ display: "inline-flex", width: size, height: size, color, ...style }} />;
}

const NAV = [
  { id: "today", label: "Today", icon: "sunrise" },
  { id: "list", label: "Prospects", icon: "list-ordered" },
  { id: "green", label: "Green Sheet", icon: "trending-up" },
];

function Sidebar({ screen, go }) {
  const D = window.F95_DATA;
  return (
    <aside style={{
      width: "var(--sidebar-w)", flex: "none", background: "var(--surface-card)",
      borderRight: "1px solid var(--border-hairline)", display: "flex", flexDirection: "column",
      padding: "var(--space-5) var(--space-4)", gap: "var(--space-6)", minHeight: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px" }}>
        <img src="../../assets/mark.svg" width="30" height="30" alt="" />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ font: "var(--fw-heavy) 15px var(--font-sans)", color: "var(--text-strong)", letterSpacing: "-0.01em" }}>95 Forward</span>
          <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>Major gifts</span>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((n) => {
          const on = screen === n.id;
          return (
            <button key={n.id} onClick={() => go(n.id)} style={{
              display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
              borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", textAlign: "left",
              background: on ? "var(--blue-50)" : "transparent",
              color: on ? "var(--blue-700)" : "var(--text-body)",
              font: `${on ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-body)/1 var(--font-sans)`,
              transition: "background var(--dur-fast) var(--ease-out)",
            }}>
              <Icon name={n.icon} size={18} color={on ? "var(--blue-600)" : "var(--ink-400)"} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 4 }}>
        <button onClick={() => go("visit")} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px",
          borderRadius: "var(--radius-md)", border: "1px solid var(--gold-300)", cursor: "pointer",
          background: "var(--gold-50)", color: "var(--gold-700)",
          font: "var(--fw-semibold) var(--fs-small)/1 var(--font-sans)",
        }}>
          <Icon name="radio" size={17} color="var(--gold-600)" /> Enter visit mode
        </button>
      </div>

      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, padding: "8px", borderTop: "1px solid var(--border-hairline)", paddingTop: "var(--space-4)" }}>
        <Avatar name={D.user.name} size="md" ringColor="var(--role-manager)" />
        <div style={{ minWidth: 0 }}>
          <div style={{ font: "var(--text-label)", color: "var(--text-strong)" }}>{D.user.name}</div>
          <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{D.user.org}</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, subtitle, right }) {
  return (
    <header style={{
      display: "flex", alignItems: "center", gap: "var(--space-4)",
      padding: "var(--space-5) var(--space-7)", borderBottom: "1px solid var(--border-hairline)",
      background: "var(--surface-card)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ font: "var(--text-h2)", color: "var(--text-strong)", letterSpacing: "var(--ls-snug)" }}>{title}</h1>
        {subtitle ? <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 3 }}>{subtitle}</div> : null}
      </div>
      <label style={{
        display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 38,
        background: "var(--haze-100)", borderRadius: "var(--radius-md)", width: 240,
        color: "var(--text-muted)",
      }}>
        <Icon name="search" size={16} color="var(--ink-400)" />
        <input placeholder="Search prospects" style={{
          border: "none", background: "transparent", outline: "none", width: "100%",
          font: "var(--text-body-r)", color: "var(--text-strong)",
        }} />
      </label>
      {right}
    </header>
  );
}

/* Small eyebrow label */
function Eyebrow({ children, color = "var(--text-muted)" }) {
  return <div style={{ font: "var(--fw-semibold) var(--fs-micro)/1 var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color }}>{children}</div>;
}

window.F95 = Object.assign(window.F95 || {}, { Icon, Sidebar, Topbar, Eyebrow });

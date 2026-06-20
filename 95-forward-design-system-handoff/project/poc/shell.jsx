/* Shell — Icon, the dual-register sidebar (host CRM + the 95 Forward add-on),
   the context-aware topbar, and shared helpers. Exports to window.POC. */

const DS_SHELL = window.Ds95ForwardDesignSystem_31a0c4 || {};

/* Lucide icon wrapper — re-renders the SVG each paint. */
function Icon({ name, size = 18, stroke = 1.8, color = "currentColor", style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = "";
      const i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      ref.current.appendChild(i);
      window.lucide.createIcons({ attrs: { width: size, height: size, "stroke-width": stroke } });
    }
  });
  return <span ref={ref} style={{ display: "inline-flex", width: size, height: size, color, flex: "none", ...style }} />;
}

/* Which routes belong to the warm 95 Forward register. */
const F95_ROUTES = ["today", "mpl", "candidates", "prospect", "greensheet", "visit", "initiatives", "initiative", "settings95"];
function isF95(route) { return F95_ROUTES.indexOf(route) !== -1; }

/* ---- Sidebar -------------------------------------------------------- */
function NavRow({ icon, label, active, muted, onClick, indent, accent, trailing }) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? (accent === "gold" ? "var(--gold-50)" : accent === "blue" ? "var(--blue-50)" : "var(--host-fill-2, #E2E8EC)")
                     : hover ? "rgba(120,135,148,0.10)" : "transparent";
  const col = active ? (accent === "gold" ? "var(--gold-700)" : accent === "blue" ? "var(--blue-700)" : "var(--host-ink-strong, #2A3640)")
                     : "var(--host-ink, #46545F)";
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
        padding: indent ? "8px 10px 8px 34px" : "9px 11px", borderRadius: "var(--radius-md)",
        border: "none", cursor: "pointer", background: bg, color: col,
        font: `${active ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-small)/1.1 var(--font-sans)`,
        position: "relative",
      }}>
      {icon ? <Icon name={icon} size={17} color={active && accent === "blue" ? "var(--blue-600)" : active && accent === "gold" ? "var(--gold-600)" : "var(--host-muted, #71808B)"} /> : null}
      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {trailing}
    </button>
  );
}

function GroupLabel({ children }) {
  return <div style={{ font: "var(--fw-semibold) 10px/1 var(--font-sans)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--host-muted, #8896A0)", padding: "0 11px", marginBottom: 7 }}>{children}</div>;
}

function Sidebar({ route, params, go }) {
  const D = window.POC_DATA;
  const [open95, setOpen95] = React.useState(isF95(route));
  const [openMG, setOpenMG] = React.useState(route === "majorgiving");
  React.useEffect(() => { if (isF95(route)) setOpen95(true); if (route === "majorgiving") setOpenMG(true); }, [route]);

  const Chevron = ({ open }) => (
    <Icon name="chevron-down" size={15} color="currentColor" style={{ transition: "transform var(--dur-base) var(--ease-out)", transform: open ? "none" : "rotate(-90deg)" }} />
  );

  return (
    <aside style={{
      width: 256, flex: "none", background: "#F1F4F6", borderRight: "1px solid var(--host-rule, #D5DCE1)",
      display: "flex", flexDirection: "column", minHeight: "100%", maxHeight: "100vh", position: "sticky", top: 0,
    }}>
      {/* Host brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 16px 14px" }}>
        <span style={{ width: 28, height: 28, borderRadius: 7, background: "#54636E", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="hexagon" size={17} color="#fff" stroke={2} />
        </span>
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ font: "var(--fw-bold) 15px var(--font-sans)", color: "var(--host-ink-strong, #2A3640)", letterSpacing: "-0.01em" }}>{D.hostBrand}</div>
          <div style={{ font: "var(--fw-medium) 10px var(--font-sans)", color: "var(--host-muted, #8896A0)", letterSpacing: "0.02em" }}>{D.org}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Host core */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavRow icon="layout-dashboard" label="Home" active={route === "home"} onClick={() => go("home")} />
          <NavRow icon="users" label="Constituents" active={route === "constituents" || route === "constituent"} onClick={() => go("constituents")} />
          <NavRow icon="hand-coins" label="Revenue" active={route === "revenue"} onClick={() => go("revenue")} />
          <NavRow icon="target" label="Major Giving" active={route === "majorgiving"} onClick={() => { setOpenMG(o => !o); go("majorgiving", { tab: "opportunities" }); }}
            trailing={<Chevron open={openMG} />} />
          {openMG ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
              {[["opportunities", "Opportunities"], ["proposals", "Proposals"], ["portfolio", "Portfolio"]].map(([t, l]) => (
                <NavRow key={t} indent label={l} active={route === "majorgiving" && (params.tab || "opportunities") === t} onClick={() => go("majorgiving", { tab: t })} />
              ))}
            </div>
          ) : null}
          <NavRow icon="filter" label="Lists" active={route === "lists"} onClick={() => go("lists")} />
        </div>

        {/* ADD-ONS — the plugin */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <GroupLabel>Add-ons</GroupLabel>
          {/* 95 Forward branded parent */}
          <button onClick={() => { setOpen95(o => !o); go("today"); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
              padding: "9px 11px", borderRadius: "var(--radius-md)", border: "1px solid",
              borderColor: open95 ? "var(--blue-100)" : "transparent",
              cursor: "pointer", position: "relative",
              background: open95 ? "linear-gradient(180deg, var(--blue-50), rgba(238,245,250,0.4))" : "transparent",
            }}>
            <img src="assets/mark.svg" width="22" height="22" alt="" style={{ borderRadius: 6 }} />
            <span style={{ flex: 1, font: "var(--fw-bold) var(--fs-small)/1.1 var(--font-sans)", color: "var(--blue-700)", letterSpacing: "-0.01em" }}>95&nbsp;Forward</span>
            <Chevron open={open95} />
          </button>
          {open95 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2, marginLeft: 2, paddingLeft: 10, borderLeft: "2px solid var(--blue-100)" }}>
              <NavRow indent icon="sunrise" label="Today" accent="gold" active={route === "today"} onClick={() => go("today")} />
              <NavRow indent icon="list-ordered" label="Prospects" accent="blue" active={route === "mpl" || route === "candidates" || route === "prospect"} onClick={() => go("mpl")} />
              <NavRow indent icon="trending-up" label="Green Sheet" accent="blue" active={route === "greensheet"} onClick={() => go("greensheet")} />
              <NavRow indent icon="flag" label="Initiatives" accent="blue" active={route === "initiatives" || route === "initiative"} onClick={() => go("initiatives")} />
              {/* Enter visit mode — a distinct CTA, not a nav row */}
              <button onClick={() => go("visit")} style={{
                display: "flex", alignItems: "center", gap: 9, margin: "7px 0 2px", padding: "9px 12px",
                borderRadius: "var(--radius-md)", border: "1px solid var(--gold-300)", cursor: "pointer",
                background: "var(--gold-50)", color: "var(--gold-700)", width: "100%",
                font: "var(--fw-semibold) var(--fs-small)/1 var(--font-sans)",
              }}>
                <Icon name="radio" size={16} color="var(--gold-600)" /> Enter visit mode
              </button>
            </div>
          ) : null}
        </div>

        {/* Host more */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavRow icon="megaphone" label="Marketing" active={route === "marketing"} onClick={() => go("marketing")} />
          <NavRow icon="calendar" label="Events" active={route === "events"} onClick={() => go("events")} />
          <NavRow icon="heart-handshake" label="Volunteers" active={route === "volunteers"} onClick={() => go("volunteers")} />
          <NavRow icon="id-card" label="Memberships" active={route === "memberships"} onClick={() => go("memberships")} />
          <NavRow icon="bar-chart-3" label="Analysis" active={route === "analysis"} onClick={() => go("analysis")} />
        </div>
      </div>

      {/* Bottom: settings + user */}
      <div style={{ borderTop: "1px solid var(--host-rule, #D5DCE1)", padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        <NavRow icon="settings" label="Settings" active={route === "settings" || route === "settings95"} onClick={() => go("settings")} />
        <button onClick={() => go("settings")} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
          padding: "8px 10px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", background: "transparent", marginTop: 2,
        }}>
          {DS_SHELL.Avatar ? <DS_SHELL.Avatar name={D.user.name} size="md" ringColor="var(--role-manager)" /> : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ font: "var(--fw-semibold) var(--fs-small)/1.2 var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>{D.user.name}</div>
            <div style={{ font: "10px var(--font-sans)", color: "var(--host-muted, #8896A0)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{D.user.role}</div>
          </div>
          <Icon name="chevron-up" size={14} color="var(--host-muted, #8896A0)" style={{ marginLeft: "auto" }} />
        </button>
      </div>
    </aside>
  );
}

/* ---- Topbar --------------------------------------------------------- */
function Topbar({ title, subtitle, register, addLabel, onAdd, copilotCount, go }) {
  const f95 = register === "f95";
  return (
    <header style={{
      display: "flex", alignItems: "center", gap: "var(--space-4)", flex: "none",
      padding: "14px 28px", borderBottom: "1px solid " + (f95 ? "var(--border-hairline)" : "var(--host-rule, #D5DCE1)"),
      background: f95 ? "var(--surface-card)" : "rgba(255,255,255,0.6)", backdropFilter: "blur(2px)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ font: "var(--fw-semibold) var(--fs-xl)/1.15 var(--font-sans)", color: f95 ? "var(--text-strong)" : "var(--host-ink-strong, #2A3640)", letterSpacing: "var(--ls-snug)" }}>{title}</h1>
        {subtitle ? <div style={{ font: "var(--text-caption)", color: f95 ? "var(--text-secondary)" : "var(--host-muted, #71808B)", marginTop: 3 }}>{subtitle}</div> : null}
      </div>

      <label style={{
        display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 36, width: 240,
        background: f95 ? "var(--haze-100)" : "var(--host-fill, #EDF1F3)", borderRadius: "var(--radius-md)",
        border: "1px solid " + (f95 ? "transparent" : "var(--host-rule, #D5DCE1)"),
      }}>
        <Icon name="search" size={15} color="var(--ink-400)" />
        <input placeholder={f95 ? "Search prospects" : "Search constituents, gifts…"} style={{
          border: "none", background: "transparent", outline: "none", width: "100%", font: "var(--text-small, var(--fs-small)) var(--font-sans)", fontSize: "var(--fs-small)", color: "var(--text-strong)",
        }} />
      </label>

      {f95 && copilotCount ? (
        <button onClick={() => go && go("today")} title="Copilot suggestions" style={{
          display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 12px", borderRadius: "var(--radius-md)",
          border: "1px solid var(--ai-border)", background: "var(--ai-surface)", color: "var(--ai-ink)", cursor: "pointer",
          font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
        }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--ai-ink)" }} /> {copilotCount}
        </button>
      ) : null}

      <button title="Notifications" style={{
        width: 36, height: 36, borderRadius: "var(--radius-md)", border: "1px solid " + (f95 ? "var(--border-default)" : "var(--host-rule, #D5DCE1)"),
        background: f95 ? "var(--surface-card)" : "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <Icon name="bell" size={16} color="var(--ink-500)" />
        <span style={{ position: "absolute", top: 8, right: 9, width: 6, height: 6, borderRadius: 99, background: "var(--gold-600)" }} />
      </button>

      {addLabel ? (
        f95 ? (
          DS_SHELL.Button ? <DS_SHELL.Button variant="primary" size="sm" onClick={onAdd} iconLeft={<Icon name="plus" size={15} />}>{addLabel}</DS_SHELL.Button> : null
        ) : (
          <button onClick={onAdd} style={{
            display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 14px", borderRadius: "var(--radius-md)",
            border: "none", background: "#4A5965", color: "#fff", cursor: "pointer", font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
          }}>
            <Icon name="plus" size={15} color="#fff" /> {addLabel}
          </button>
        )
      ) : null}
    </header>
  );
}

/* ---- Shared bits ---------------------------------------------------- */
function Eyebrow({ children, color = "var(--text-muted)" }) {
  return <div style={{ font: "var(--fw-semibold) var(--fs-micro)/1 var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color }}>{children}</div>;
}

/* A flat host card (denser, cooler, low elevation). */
function HostCard({ children, style, ...rest }) {
  return <div style={{ background: "var(--surface-card)", border: "1px solid var(--host-rule, #D5DCE1)", borderRadius: "var(--radius-md)", ...style }} {...rest}>{children}</div>;
}

/* Neutral host action button — minimal brand color. */
function HostBtn({ children, icon, primary, onClick, style }) {
  const [h, setH] = React.useState(false);
  const base = primary
    ? { background: h ? "#3E4C57" : "#4A5965", color: "#fff", border: "1px solid transparent" }
    : { background: h ? "var(--host-fill, #EDF1F3)" : "var(--surface-card)", color: "var(--host-ink-strong, #2A3640)", border: "1px solid var(--host-rule, #D5DCE1)" };
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 14px", borderRadius: "var(--radius-md)",
      cursor: "pointer", font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", whiteSpace: "nowrap", ...base, ...style,
    }}>
      {icon ? <Icon name={icon} size={15} color={primary ? "#fff" : "var(--ink-500)"} /> : null}{children}
    </button>
  );
}

function StubNote({ children }) {
  const D = window.POC;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 13px", borderRadius: "var(--radius-pill)", background: "var(--host-fill, #EDF1F3)", border: "1px dashed var(--host-rule, #CCD4DA)", color: "var(--host-muted, #71808B)", font: "var(--fw-medium) var(--fs-caption) var(--font-sans)" }}>
      <Icon name="info" size={14} color="var(--host-muted, #8896A0)" />
      {children || "Static in this PoC"}
    </div>
  );
}

/* A simple host-side stub page. */
function StubPage({ icon, title, lead, children }) {
  return (
    <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: "var(--host-fill-2, #E2E8EC)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={19} color="var(--host-muted, #71808B)" />
          </span>
          <div style={{ font: "var(--fw-regular) var(--fs-body) var(--font-sans)", color: "var(--host-muted, #71808B)", maxWidth: 520 }}>{lead}</div>
        </div>
        <StubNote />
      </div>
      {children}
    </div>
  );
}

window.POC = Object.assign(window.POC || {}, { Icon, isF95, Sidebar, Topbar, Eyebrow, HostCard, HostBtn, StubNote, StubPage });

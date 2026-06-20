/* Host CRM — the "grey room". Home · Constituents (list + record) · Revenue ·
   Major Giving (the deliberate black-box foil). Calm, dense, minimal color. */

const HC = window.Ds95ForwardDesignSystem_31a0c4 || {};

/* Generic, deliberately-opaque host "AI" mark — NOT iris (that's reserved for
   the 95 Forward copilot). A flat grey number with no story. */
function BlackBoxBadge({ small }) {
  const { Icon } = window.POC;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: small ? "1px 7px" : "3px 9px", borderRadius: "var(--radius-pill)", background: "#E4E8EB", color: "#6B7882", font: "var(--fw-semibold) " + (small ? "9px" : "10px") + " var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
      <Icon name="cpu" size={small ? 10 : 12} color="#8895A0" /> AI
    </span>
  );
}

/* -------------------------------------------------- HOME */
function HostHome({ go }) {
  const D = window.POC_DATA;
  const { Icon, HostCard, Eyebrow } = window.POC;
  const h = D.home;
  const maxBar = 100;

  const Tile = ({ children, style }) => <HostCard style={{ padding: 18, ...style }}>{children}</HostCard>;
  const TileHead = ({ children, action }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ font: "var(--fw-semibold) 10px/1 var(--font-sans)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--host-muted, #71808B)", whiteSpace: "nowrap" }}>{children}</div>
      {action}
    </div>
  );

  return (
    <div style={{ padding: 28, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 18, alignItems: "start" }}>
      {/* Recent gifts */}
      <Tile style={{ gridColumn: "span 5" }}>
        <TileHead>Recent gifts</TileHead>
        <table className="ks-table" style={{ "--host-rule": "#E7ECEF" }}>
          <tbody>
            {h.recentGifts.map((g, i) => (
              <tr key={i}>
                <td style={{ padding: "9px 4px" }}>{g.name}</td>
                <td style={{ padding: "9px 4px", color: "var(--host-muted, #71808B)" }}>{g.type}</td>
                <td className="ks-num" style={{ padding: "9px 4px", textAlign: "right", fontWeight: 600, color: "var(--host-ink-strong, #2A3640)" }}>{g.amount}</td>
                <td className="ks-num" style={{ padding: "9px 4px", textAlign: "right", color: "var(--host-muted, #8896A0)", width: 56 }}>{g.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tile>

      {/* YoY fundraising */}
      <Tile style={{ gridColumn: "span 4" }}>
        <TileHead>Year-over-year fundraising</TileHead>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 132, padding: "0 4px" }}>
          {h.yoy.map((q, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110, width: "100%", justifyContent: "center" }}>
                <div style={{ width: 12, height: (q.a / maxBar * 100) + "%", background: "#B9C4CC", borderRadius: "3px 3px 0 0" }} />
                {q.b ? <div style={{ width: 12, height: (q.b / maxBar * 100) + "%", background: "#4A5965", borderRadius: "3px 3px 0 0" }} /> : <div style={{ width: 12, height: 4, background: "#E2E8EC", borderRadius: 2 }} />}
              </div>
              <span style={{ font: "10px var(--font-sans)", color: "var(--host-muted, #8896A0)" }}>{q.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, font: "10px var(--font-sans)", color: "var(--host-muted, #8896A0)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, background: "#B9C4CC", borderRadius: 2 }} /> Last year</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, background: "#4A5965", borderRadius: 2 }} /> This year</span>
        </div>
      </Tile>

      {/* Active donor growth */}
      <Tile style={{ gridColumn: "span 3" }}>
        <TileHead>Active donor growth</TileHead>
        <div className="ks-num" style={{ font: "var(--fw-heavy) 40px/1 var(--font-sans)", color: "var(--host-ink-strong, #2A3640)", letterSpacing: "-0.02em" }}>{h.growth.value}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, color: "var(--sage-600)", font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)" }}>
          <Icon name="trending-up" size={14} color="var(--sage-600)" /> {h.growth.delta}
        </div>
        <div style={{ font: "var(--fs-caption) var(--font-sans)", color: "var(--host-muted, #8896A0)", marginTop: 6 }}>{h.growth.note}</div>
      </Tile>

      {/* Major gift likelihood — the BLACK BOX */}
      <Tile style={{ gridColumn: "span 5" }}>
        <TileHead action={<BlackBoxBadge small />}>Major gift likelihood</TileHead>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="ks-num" style={{ font: "var(--fw-heavy) 40px/1 var(--font-sans)", color: "var(--host-ink-strong, #2A3640)", letterSpacing: "-0.02em" }}>12</div>
          <div style={{ font: "var(--fs-small)/1.45 var(--font-sans)", color: "var(--host-muted, #71808B)" }}>donors trending toward a major gift</div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E7ECEF", font: "var(--fs-caption) var(--font-sans)", color: "var(--host-muted, #8896A0)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="lock" size={12} color="#A4AFB7" /> Model output · no breakdown available
        </div>
      </Tile>

      {/* Tasks due */}
      <Tile style={{ gridColumn: "span 4" }}>
        <TileHead action={<span style={{ font: "var(--fs-caption) var(--font-sans)", color: "var(--host-muted, #8896A0)" }}>{h.tasks.length} due</span>}>Tasks &amp; actions</TileHead>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {h.tasks.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid #B9C4CC", flex: "none" }} />
              <span style={{ flex: 1, font: "var(--fs-small) var(--font-sans)", color: "var(--ink-700)" }}>{t.what}</span>
              <span style={{ font: "10px var(--font-sans)", color: t.due === "Today" ? "var(--gold-700)" : "var(--host-muted, #8896A0)", fontWeight: t.due === "Today" ? 600 : 400 }}>{t.due}</span>
            </div>
          ))}
        </div>
      </Tile>

      {/* 95 Forward promo — color enters the grey room */}
      <Tile style={{ gridColumn: "span 3", background: "linear-gradient(160deg, var(--blue-50), var(--white))", border: "1px solid var(--blue-100)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          <img src="assets/mark.svg" width="26" height="26" alt="" style={{ borderRadius: 6 }} />
          <span style={{ font: "var(--fw-bold) var(--fs-small) var(--font-sans)", color: "var(--blue-700)" }}>95 Forward</span>
        </div>
        <div style={{ font: "var(--fw-semibold) var(--fs-body)/1.35 var(--font-sans)", color: "var(--text-strong)" }}>Your major-gifts workspace</div>
        <div style={{ font: "var(--fs-caption)/1.45 var(--font-sans)", color: "var(--text-secondary)", marginTop: 6, marginBottom: 14 }}>The whole picture — and the next right move.</div>
        {HC.Button ? <HC.Button variant="primary" size="sm" block onClick={() => go("today")} iconRight={<Icon name="arrow-right" size={15} />}>Open</HC.Button> : null}
      </Tile>
    </div>
  );
}

/* -------------------------------------------------- CONSTITUENTS LIST */
function HostConstituents({ go }) {
  const D = window.POC_DATA;
  const { Icon, HostBtn } = window.POC;
  const [f, setF] = React.useState("all");
  const FILTERS = [["all", "All"], ["Prospect", "Prospects"], ["Active", "Active"], ["Lapsed", "Lapsed"]];
  const rows = D.constituents.filter(c => f === "all" || c.status === f);

  const StatusPill = ({ s }) => {
    const map = { Prospect: ["#E7EEF4", "#2C5B7E"], Active: ["#E6EFEA", "#3B7458"], Lapsed: ["#EFE9E6", "#A8765A"] };
    const [bg, col] = map[s] || ["#E7ECEF", "#71808B"];
    return <span style={{ font: "var(--fw-semibold) 10px var(--font-sans)", padding: "2px 8px", borderRadius: 99, background: bg, color: col }}>{s}</span>;
  };

  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {FILTERS.map(([id, l]) => (
            <button key={id} onClick={() => setF(id)} style={{
              height: 32, padding: "0 13px", borderRadius: "var(--radius-sm)", cursor: "pointer",
              border: "1px solid " + (f === id ? "#9FB0BC" : "var(--host-rule, #D5DCE1)"),
              background: f === id ? "#4A5965" : "var(--surface-card)", color: f === id ? "#fff" : "var(--ink-700)",
              font: "var(--fw-medium) var(--fs-caption) var(--font-sans)",
            }}>{l}</button>
          ))}
        </div>
        <HostBtn icon="sliders-horizontal" style={{ height: 32 }}>Filters</HostBtn>
        <span style={{ marginLeft: "auto", font: "var(--fs-caption) var(--font-sans)", color: "var(--host-muted, #8896A0)" }}>{rows.length} constituents · AND logic</span>
      </div>

      <div style={{ background: "var(--surface-card)", border: "1px solid var(--host-rule, #D5DCE1)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <table className="ks-table">
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th style={{ textAlign: "right" }}>Lifetime</th><th>Last gift</th><th>Last contact</th><th>Status</th><th>Assigned</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className="is-click" onClick={() => go("constituent", { id: c.id })}>
                <td style={{ fontWeight: 600, color: "var(--host-ink-strong, #2A3640)" }}>{c.name}</td>
                <td style={{ color: "var(--host-muted, #71808B)" }}>{c.type}</td>
                <td className="ks-num" style={{ textAlign: "right" }}>{c.lifetime}</td>
                <td className="ks-num" style={{ color: "var(--host-muted, #71808B)" }}>{c.lastGift}</td>
                <td style={{ color: "var(--host-muted, #8896A0)" }}>{c.lastContact}</td>
                <td><StatusPill s={c.status} /></td>
                <td style={{ color: "var(--host-muted, #71808B)" }}>{c.owner}</td>
                <td style={{ textAlign: "right", width: 30 }}><Icon name="chevron-right" size={15} color="#A4AFB7" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------- CONSTITUENT RECORD */
function HostConstituent({ params, go }) {
  const D = window.POC_DATA;
  const { Icon, HostCard, HostBtn } = window.POC;
  const c = D.constituents.find(x => x.id === (params && params.id)) || D.constituents[0];
  const [tab, setTab] = React.useState("Profile");
  const TABS = ["Profile", "Giving history", "Relationships", "Actions", "Tags", "Volunteer"];
  const initials = c.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
      <button onClick={() => go("constituents")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--host-muted, #71808B)", font: "var(--fw-medium) var(--fs-small) var(--font-sans)", padding: 0, width: "fit-content" }}>
        <Icon name="arrow-left" size={15} /> Constituents
      </button>

      {/* Header */}
      <HostCard style={{ padding: 22, display: "flex", alignItems: "flex-start", gap: 18 }}>
        <span style={{ width: 56, height: 56, borderRadius: c.type === "Individual" ? "50%" : 10, background: "#4A5965", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)", flex: "none" }}>{initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ font: "var(--fw-bold) var(--fs-2xl)/1.1 var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>{c.name}</h1>
            <span style={{ font: "var(--fw-medium) var(--fs-caption) var(--font-sans)", color: "var(--host-muted, #71808B)", padding: "2px 9px", borderRadius: 99, background: "var(--host-fill, #EDF1F3)" }}>{c.type}</span>
            {c.status === "Prospect" ? <span style={{ font: "var(--fw-semibold) 10px var(--font-sans)", padding: "2px 8px", borderRadius: 99, background: "#E7EEF4", color: "#2C5B7E" }}>Prospect</span> : null}
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 16 }}>
            <div><div style={{ font: "10px var(--font-sans)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--host-muted, #8896A0)" }}>Lifetime giving</div><div className="ks-num" style={{ font: "var(--fw-bold) var(--fs-xl) var(--font-sans)", color: "var(--host-ink-strong, #2A3640)", marginTop: 4 }}>{c.lifetime}</div></div>
            <div><div style={{ font: "10px var(--font-sans)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--host-muted, #8896A0)" }}>Last gift</div><div className="ks-num" style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--ink-700)", marginTop: 6 }}>{c.lastGift}</div></div>
            <div><div style={{ font: "10px var(--font-sans)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--host-muted, #8896A0)" }}>Region</div><div style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--ink-700)", marginTop: 6 }}>{c.region}</div></div>
          </div>
        </div>
        {c.prospect ? (
          <button onClick={() => go("prospect", { id: c.prospectId })} style={{
            display: "inline-flex", alignItems: "center", gap: 8, height: 38, padding: "0 14px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--blue-100)", background: "linear-gradient(160deg, var(--blue-50), var(--white))", cursor: "pointer",
            font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--blue-700)", flex: "none",
          }}>
            <img src="assets/mark.svg" width="18" height="18" alt="" style={{ borderRadius: 5 }} /> Open in 95 Forward
          </button>
        ) : null}
      </HostCard>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--host-rule, #D5DCE1)" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 14px", border: "none", background: "none", cursor: "pointer",
            font: (tab === t ? "var(--fw-semibold)" : "var(--fw-medium)") + " var(--fs-small) var(--font-sans)",
            color: tab === t ? "var(--host-ink-strong, #2A3640)" : "var(--host-muted, #8896A0)",
            borderBottom: "2px solid " + (tab === t ? "#4A5965" : "transparent"), marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {tab === "Giving history" ? (
        <HostCard style={{ overflow: "hidden" }}>
          <table className="ks-table">
            <thead><tr><th>Date</th><th>Fund</th><th>Campaign</th><th>Type</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
            <tbody>
              {D.revenue.gifts.filter(g => g.name === c.name).concat([
                { date: "Mar 2024", fund: "Youth Center", campaign: "Capital", type: "Grant", amount: "$60,000" },
                { date: "Feb 2023", fund: "Youth Center", campaign: "Capital", type: "Grant", amount: "$40,000" },
                { date: "Jan 2022", fund: "Annual Fund", campaign: "FY22", type: "Cash", amount: "$25,000" },
              ]).slice(0, 5).map((g, i) => (
                <tr key={i}><td className="ks-num" style={{ color: "var(--host-muted, #71808B)" }}>{g.date}</td><td>{g.fund}</td><td style={{ color: "var(--host-muted, #71808B)" }}>{g.campaign}</td><td style={{ color: "var(--host-muted, #71808B)" }}>{g.type}</td><td className="ks-num" style={{ textAlign: "right", fontWeight: 600, color: "var(--host-ink-strong, #2A3640)" }}>{g.amount}</td></tr>
              ))}
            </tbody>
          </table>
        </HostCard>
      ) : (
        <HostCard style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>{tab}</div>
            <window.POC.StubNote>Static in this PoC</window.POC.StubNote>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px", maxWidth: 640 }}>
            {[["Primary contact", c.type === "Individual" ? c.name : "Eleanor Hartwell"], ["Email", "—"], ["Phone", "—"], ["Address", c.region], ["Constituent since", "2019"], ["Assigned to", c.owner]].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #E7ECEF" }}>
                <span style={{ font: "var(--fs-small) var(--font-sans)", color: "var(--host-muted, #8896A0)" }}>{k}</span>
                <span style={{ font: "var(--fw-medium) var(--fs-small) var(--font-sans)", color: "var(--ink-700)" }}>{v}</span>
              </div>
            ))}
          </div>
        </HostCard>
      )}
    </div>
  );
}

/* -------------------------------------------------- REVENUE */
function HostRevenue() {
  const D = window.POC_DATA;
  const { HostBtn } = window.POC;
  const r = D.revenue;
  const Stat = ({ label, value }) => (
    <div style={{ flex: 1 }}>
      <div style={{ font: "10px var(--font-sans)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--host-muted, #8896A0)" }}>{label}</div>
      <div className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-2xl)/1 var(--font-sans)", color: "var(--host-ink-strong, #2A3640)", marginTop: 8, letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  );
  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 0, padding: "18px 22px", background: "var(--surface-card)", border: "1px solid var(--host-rule, #D5DCE1)", borderRadius: "var(--radius-md)" }}>
        <Stat label="Total raised · FY24" value={r.summary.total} />
        <div style={{ width: 1, background: "var(--host-rule, #E7ECEF)", margin: "0 8px" }} />
        <Stat label="Gifts" value={r.summary.count} />
        <div style={{ width: 1, background: "var(--host-rule, #E7ECEF)", margin: "0 8px" }} />
        <Stat label="Average gift" value={r.summary.avg} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <HostBtn icon="sliders-horizontal" style={{ height: 32 }}>Filters</HostBtn>
        <HostBtn icon="download" style={{ height: 32 }}>Export</HostBtn>
        <span style={{ marginLeft: "auto", font: "var(--fs-caption) var(--font-sans)", color: "var(--host-muted, #8896A0)" }}>Showing recent gifts</span>
      </div>

      <div style={{ background: "var(--surface-card)", border: "1px solid var(--host-rule, #D5DCE1)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <table className="ks-table">
          <thead><tr><th>Constituent</th><th>Date</th><th>Fund</th><th>Campaign</th><th>Appeal</th><th>Type</th><th>Receipt</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
          <tbody>
            {r.gifts.map((g, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, color: "var(--host-ink-strong, #2A3640)" }}>{g.name}</td>
                <td className="ks-num" style={{ color: "var(--host-muted, #71808B)" }}>{g.date}</td>
                <td>{g.fund}</td><td style={{ color: "var(--host-muted, #71808B)" }}>{g.campaign}</td><td style={{ color: "var(--host-muted, #71808B)" }}>{g.appeal}</td><td style={{ color: "var(--host-muted, #71808B)" }}>{g.type}</td>
                <td><span style={{ font: "var(--fw-medium) 10px var(--font-sans)", color: g.receipt === "Sent" ? "var(--sage-600)" : "var(--gold-700)" }}>{g.receipt}</span></td>
                <td className="ks-num" style={{ textAlign: "right", fontWeight: 600, color: "var(--host-ink-strong, #2A3640)" }}>{g.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------- MAJOR GIVING — THE FOIL */
function HostMajorGiving({ params }) {
  const D = window.POC_DATA;
  const { Icon, HostCard } = window.POC;
  const mg = D.majorGiving;
  const tab = (params && params.tab) || "opportunities";

  const StageDot = ({ stage }) => {
    const order = ["Identification", "Cultivation", "Solicitation", "Stewardship"];
    const idx = order.indexOf(stage);
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <span style={{ display: "inline-flex", gap: 2 }}>{order.map((_, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 99, background: i <= idx ? "#4A5965" : "#D5DCE1" }} />)}</span>
        <span style={{ font: "var(--fs-small) var(--font-sans)", color: "var(--ink-700)" }}>{stage}</span>
      </span>
    );
  };

  const Likelihood = ({ v }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span className="ks-num" style={{ font: "var(--fw-bold) var(--fs-body) var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>{v}%</span>
      <BlackBoxBadge small />
    </span>
  );

  return (
    <div style={{ padding: 28, display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 18, alignItems: "start" }}>
      <div style={{ minWidth: 0 }}>
        {tab === "opportunities" ? (
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--host-rule, #D5DCE1)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <table className="ks-table">
              <thead><tr><th>Constituent</th><th>Stage</th><th style={{ textAlign: "right" }}>Ask</th><th style={{ textAlign: "right" }}>Expected</th><th>Close</th><th>Likelihood</th><th>Owner</th></tr></thead>
              <tbody>
                {mg.opportunities.map((o, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: "var(--host-ink-strong, #2A3640)" }}>{o.name}</td>
                    <td><StageDot stage={o.stage} /></td>
                    <td className="ks-num" style={{ textAlign: "right" }}>{o.ask}</td>
                    <td className="ks-num" style={{ textAlign: "right", color: "var(--host-muted, #71808B)" }}>{o.expected}</td>
                    <td className="ks-num" style={{ color: "var(--host-muted, #71808B)" }}>{o.close}</td>
                    <td><Likelihood v={o.likelihood} /></td>
                    <td style={{ color: "var(--host-muted, #71808B)" }}>{o.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "proposals" ? (
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--host-rule, #D5DCE1)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <table className="ks-table">
              <thead><tr><th>Constituent</th><th>Purpose</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th><th>Deadline</th></tr></thead>
              <tbody>
                {mg.proposals.map((p, i) => (
                  <tr key={i}><td style={{ fontWeight: 600, color: "var(--host-ink-strong, #2A3640)" }}>{p.name}</td><td style={{ color: "var(--ink-700)" }}>{p.purpose}</td><td className="ks-num" style={{ textAlign: "right" }}>{p.amount}</td><td style={{ color: "var(--host-muted, #71808B)" }}>{p.status}</td><td className="ks-num" style={{ color: "var(--host-muted, #71808B)" }}>{p.deadline}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {mg.portfolio.map((p, i) => (
              <HostCard key={i} style={{ padding: 16 }}>
                <div style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>{p.name}</div>
                <div className="ks-num" style={{ font: "var(--fs-caption) var(--font-sans)", color: "var(--host-muted, #8896A0)", marginTop: 8 }}>{p.lifetime} lifetime</div>
                <div style={{ font: "var(--fs-caption) var(--font-sans)", color: "var(--host-muted, #71808B)", marginTop: 4 }}>{p.stage}</div>
              </HostCard>
            ))}
          </div>
        )}
      </div>

      {/* "Insights" panel that asserts without showing why */}
      <HostCard style={{ padding: 18, position: "sticky", top: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ font: "var(--fw-semibold) 10px var(--font-sans)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--host-muted, #71808B)" }}>Insights</div>
          <BlackBoxBadge small />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            "Hartwell Family Foundation is your highest-likelihood opportunity this quarter.",
            "3 opportunities are at risk of slipping their close date.",
            "Cultivation stage is converting below your historical average.",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 9, padding: "11px 12px", background: "var(--host-fill, #EDF1F3)", borderRadius: "var(--radius-sm)" }}>
              <Icon name="sparkles" size={14} color="#8895A0" style={{ marginTop: 2 }} />
              <span style={{ font: "var(--fs-small)/1.45 var(--font-sans)", color: "var(--ink-700)" }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E7ECEF", font: "var(--fs-caption)/1.4 var(--font-sans)", color: "var(--host-muted, #8896A0)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="lock" size={12} color="#A4AFB7" /> Conclusions only · the model does not explain its reasoning.
        </div>
      </HostCard>
    </div>
  );
}

window.POC = Object.assign(window.POC || {}, { HostHome, HostConstituents, HostConstituent, HostRevenue, HostMajorGiving });

/* Host CRM — Lists, Analysis (Medium) · Marketing/Events/Volunteers/Memberships
   (Stub) · Settings (Stub, with the link into the 95 Forward settings page). */

function HostLists() {
  const D = window.POC_DATA;
  const { Icon, HostCard, HostBtn } = window.POC;
  const [cat, setCat] = React.useState("Constituents");
  const CATS = ["Actions", "Constituents", "Gifts", "Opportunities"];
  return (
    <div style={{ padding: 28, display: "grid", gridTemplateColumns: "200px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
      {/* Category rail + filter builder */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <HostCard style={{ padding: 8 }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", padding: "9px 11px",
              borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
              background: cat === c ? "var(--host-fill-2, #E2E8EC)" : "transparent",
              color: cat === c ? "var(--host-ink-strong, #2A3640)" : "var(--host-ink, #46545F)",
              font: (cat === c ? "var(--fw-semibold)" : "var(--fw-medium)") + " var(--fs-small) var(--font-sans)",
            }}>{c}</button>
          ))}
        </HostCard>
        <HostCard style={{ padding: 16 }}>
          <div style={{ font: "var(--fw-semibold) 10px var(--font-sans)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--host-muted, #71808B)", marginBottom: 12 }}>Filter builder</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["Lifetime giving ≥ $50,000", "Status is Prospect", "Region is Riverside"].map((f, i) => (
              <div key={i}>
                {i > 0 ? <div style={{ font: "var(--fw-semibold) 9px var(--font-sans)", letterSpacing: "0.1em", color: "var(--host-muted, #9AA7B0)", margin: "2px 0 6px" }}>AND</div> : null}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "var(--host-fill, #EDF1F3)", borderRadius: "var(--radius-sm)", font: "var(--fs-caption) var(--font-sans)", color: "var(--ink-700)" }}>
                  <Icon name="filter" size={12} color="#8895A0" />{f}
                </div>
              </div>
            ))}
            <HostBtn icon="plus" style={{ height: 30, marginTop: 4 }}>Add condition</HostBtn>
          </div>
        </HostCard>
      </div>

      {/* Built list */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>Major prospects · {cat}</div>
          <window.POC.StubNote>Representative built list</window.POC.StubNote>
          <HostBtn icon="columns-3" style={{ height: 30, marginLeft: "auto" }}>Columns</HostBtn>
        </div>
        <HostCard style={{ overflow: "hidden" }}>
          <table className="ks-table">
            <thead><tr><th>Name</th><th style={{ textAlign: "right" }}>First gift</th><th style={{ textAlign: "right" }}>Greatest gift</th><th style={{ textAlign: "right" }}>Lifetime</th><th>Status</th></tr></thead>
            <tbody>
              {D.constituents.filter(c => c.prospect).map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: "var(--host-ink-strong, #2A3640)" }}>{c.name}</td>
                  <td className="ks-num" style={{ textAlign: "right", color: "var(--host-muted, #71808B)" }}>$5,000</td>
                  <td className="ks-num" style={{ textAlign: "right", color: "var(--host-muted, #71808B)" }}>{c.lastGift.split(" · ")[0]}</td>
                  <td className="ks-num" style={{ textAlign: "right", fontWeight: 600 }}>{c.lifetime}</td>
                  <td style={{ color: "var(--host-muted, #71808B)" }}>{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </HostCard>
      </div>
    </div>
  );
}

function HostAnalysis() {
  const { Icon, HostCard } = window.POC;
  const reports = [
    { name: "Fundraising performance", icon: "bar-chart-3" },
    { name: "Donor retention", icon: "repeat" },
    { name: "Campaign progress", icon: "target" },
    { name: "Appeal analysis", icon: "mail" },
  ];
  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {reports.map((r, i) => (
          <HostCard key={i} style={{ padding: 16, display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--host-fill-2, #E2E8EC)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={r.icon} size={17} color="var(--host-muted, #71808B)" /></span>
            <span style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>{r.name}</span>
          </HostCard>
        ))}
      </div>

      <HostCard style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>Fundraising performance · FY24</div>
          <window.POC.StubNote />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, paddingBottom: 8, borderBottom: "1px solid #E7ECEF" }}>
              {[42, 58, 50, 71, 64, 80, 76, 92, 70, 88, 95, 84].map((v, i) => (
                <div key={i} style={{ flex: 1, height: v + "%", background: "linear-gradient(180deg, #6E7C86, #4A5965)", borderRadius: "3px 3px 0 0" }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, font: "9px var(--font-sans)", color: "var(--host-muted, #9AA7B0)" }}>
              {["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"].map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
            {[["Total raised", "$1.28M"], ["vs. goal", "94%"], ["New donors", "312"], ["Avg gift", "$3,118"]].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 12, borderBottom: "1px solid #E7ECEF" }}>
                <span style={{ font: "var(--fs-small) var(--font-sans)", color: "var(--host-muted, #71808B)" }}>{k}</span>
                <span className="ks-num" style={{ font: "var(--fw-bold) var(--fs-lg) var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </HostCard>
    </div>
  );
}

/* ---- Stubs ---- */
function HostStub({ route }) {
  const { HostCard, StubPage } = window.POC;
  const CFG = {
    marketing: { icon: "megaphone", lead: "Email campaigns, appeals, and audience segments — your outbound program lives here.",
      cols: ["Appeal", "Channel", "Sent", "Open rate", "Gifts"], rows: [["Spring mail 2024", "Direct mail", "8,400", "—", "212"], ["FY24 sustainer", "Email", "12,100", "38%", "96"], ["Year-end push", "Email", "11,800", "41%", "184"], ["Match drive", "Email", "6,200", "44%", "73"]] },
    events: { icon: "calendar", lead: "Galas, tours, and cultivation events — registration, attendance, and follow-up.",
      cols: ["Event", "Date", "Registered", "Attended", "Raised"], rows: [["Youth Center tour", "Jul 18", "24", "—", "—"], ["Annual gala", "Oct 5", "310", "—", "—"], ["Donor breakfast", "May 9", "62", "58", "$48,000"], ["Volunteer thank-you", "Apr 2", "120", "104", "—"]] },
    volunteers: { icon: "heart-handshake", lead: "Your volunteer roster — hours, roles, and the donors among them.",
      cols: ["Name", "Role", "Hours YTD", "Since", "Also a donor"], rows: [["Theodore Brennan", "Mentor", "84", "2021", "Yes"], ["Helen Vasquez", "Event lead", "42", "2022", "Yes"], ["Marcus Webb", "Board liaison", "30", "2019", "—"], ["Sofia Lin", "Tutor", "112", "2020", "Yes"]] },
    memberships: { icon: "id-card", lead: "Membership tiers and renewals — the recurring base under the major-gifts program.",
      cols: ["Tier", "Members", "Annual", "Renewal rate", "Revenue"], rows: [["Friend", "640", "$50", "71%", "$32,000"], ["Advocate", "210", "$150", "78%", "$31,500"], ["Champion", "88", "$500", "84%", "$44,000"], ["Founder's Circle", "24", "$2,500", "92%", "$60,000"]] },
  };
  const c = CFG[route] || CFG.marketing;
  return (
    <StubPage icon={c.icon} title="" lead={c.lead}>
      <HostCard style={{ overflow: "hidden" }}>
        <table className="ks-table">
          <thead><tr>{c.cols.map((h, i) => <th key={i} style={i >= 2 ? { textAlign: "right" } : null}>{h}</th>)}</tr></thead>
          <tbody>
            {c.rows.map((r, i) => (
              <tr key={i}>{r.map((cell, j) => <td key={j} className={j >= 2 ? "ks-num" : ""} style={{ textAlign: j >= 2 ? "right" : "left", fontWeight: j === 0 ? 600 : 400, color: j === 0 ? "var(--host-ink-strong, #2A3640)" : "var(--host-muted, #71808B)" }}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </HostCard>
    </StubPage>
  );
}

/* ---- Host Settings (stub) + link into 95 Forward settings ---- */
function HostSettings({ go }) {
  const { Icon, HostCard } = window.POC;
  const groups = [
    { label: "Users & roles", icon: "users", note: "12 users · 3 roles" },
    { label: "Campaigns", icon: "target", note: "FY24 Annual, Capital" },
    { label: "Funds", icon: "wallet", note: "8 funds" },
    { label: "Appeals", icon: "mail", note: "14 appeals" },
    { label: "Integrations", icon: "plug", note: "Email, payments" },
    { label: "Data & privacy", icon: "shield", note: "Retention, exports" },
  ];
  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* The one settings page that matters — 95 Forward */}
      <div onClick={() => go("settings95")} style={{
        display: "flex", alignItems: "center", gap: 16, padding: 20, cursor: "pointer",
        borderRadius: "var(--radius-lg)", border: "1px solid var(--blue-100)",
        background: "linear-gradient(160deg, var(--blue-50), var(--white))",
      }}>
        <img src="assets/mark.svg" width="34" height="34" alt="" style={{ borderRadius: 8 }} />
        <div style={{ flex: 1 }}>
          <div style={{ font: "var(--fw-bold) var(--fs-body) var(--font-sans)", color: "var(--blue-700)" }}>95 Forward settings</div>
          <div style={{ font: "var(--fs-caption) var(--font-sans)", color: "var(--text-secondary)", marginTop: 3 }}>Tune the QPI weights and copilot behavior — the score is yours to configure.</div>
        </div>
        <Icon name="arrow-right" size={18} color="var(--blue-600)" />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ font: "var(--fw-semibold) 10px var(--font-sans)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--host-muted, #71808B)" }}>Keystone configuration</div>
          <window.POC.StubNote />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {groups.map((g, i) => (
            <HostCard key={i} style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--host-fill-2, #E2E8EC)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={g.icon} size={16} color="var(--host-muted, #71808B)" /></span>
              <div>
                <div style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--host-ink-strong, #2A3640)" }}>{g.label}</div>
                <div style={{ font: "10px var(--font-sans)", color: "var(--host-muted, #8896A0)", marginTop: 3 }}>{g.note}</div>
              </div>
            </HostCard>
          ))}
        </div>
      </div>
    </div>
  );
}

window.POC = Object.assign(window.POC || {}, { HostLists, HostAnalysis, HostStub, HostSettings });

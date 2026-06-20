/* 95 Forward — Prospects. Two views under one tab:
   · Master Prospect List (the one ranked list — sacred ranking)
   · Candidates (connector-discovery batches, firmly OFF the ranked list) */

const PR = window.Ds95ForwardDesignSystem_31a0c4 || {};

/* ============================ MASTER PROSPECT LIST ============================ */
function MasterList({ go }) {
  const D = window.POC_DATA;
  const { Icon, Eyebrow } = window.POC;
  const { ProspectRow, Tag, Button, Badge } = PR;
  const [horizon, setHorizon] = React.useState("all");
  const [rm, setRm] = React.useState("all");
  const [entity, setEntity] = React.useState("all");
  const [band, setBand] = React.useState("all");
  const [top33, setTop33] = React.useState(false);

  const top = D.prospects[0];
  let rows = D.prospects.filter(p => {
    if (horizon !== "all" && p.horizon !== horizon) return false;
    if (rm === "mine" && p.manager !== D.user.name) return false;
    if (entity !== "all" && p.kind !== entity) return false;
    if (band === "90" && p.qpi < 90) return false;
    if (band === "70" && (p.qpi < 70 || p.qpi >= 90)) return false;
    if (band === "50" && (p.qpi < 50 || p.qpi >= 70)) return false;
    if (band === "u50" && p.qpi >= 50) return false;
    if (top33 && p.rank > 6) return false;
    return true;
  });

  const HPILL = [["all", "All", null], ["today", "Today", "var(--horizon-today)"], ["tomorrow", "Tomorrow", "var(--horizon-tomorrow)"], ["forever", "Forever", "var(--horizon-forever)"]];
  const Select = ({ value, onChange, options, label }) => (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 30, padding: "0 11px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: "var(--surface-card)", font: "var(--fw-medium) var(--fs-caption) var(--font-sans)", color: "var(--text-body)", cursor: "pointer" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ border: "none", background: "transparent", outline: "none", font: "inherit", color: "var(--text-strong)", cursor: "pointer" }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );

  return (
    <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* The next right move banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "18px 24px", borderRadius: "var(--radius-lg)", background: "linear-gradient(180deg, var(--gold-50), var(--white))", border: "1px solid var(--gold-300)", boxShadow: "var(--ring-go)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 2, color: "var(--gold-700)", flex: "none" }}>
          <span className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-4xl)/0.9 var(--font-sans)", letterSpacing: "var(--ls-tight)" }}>{top.qpi}</span>
          <span style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--gold-600)" }}>/100</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color="var(--gold-700)">Your next right move</Eyebrow>
          <div style={{ font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)", color: "var(--text-strong)", marginTop: 5 }}>{top.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--gold-600)", animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite" }} />
            <span style={{ font: "var(--text-caption)", color: "var(--text-secondary)" }}>QPI 90+ — go see them today. Follow up in 18h.</span>
          </div>
        </div>
        <Button variant="go" onClick={() => go("prospect", { id: top.id })} iconLeft={<Icon name="calendar-check" size={16} />}>Plan the visit</Button>
      </div>

      {/* Horizon pills + meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {HPILL.map(([id, l, c]) => <Tag key={id} color={c} selected={horizon === id} onClick={() => setHorizon(id)}>{l}</Tag>)}
        <span style={{ marginLeft: "auto", font: "var(--text-caption)", color: "var(--text-muted)" }}>{rows.length} on the list · ranked by QPI</span>
      </div>

      {/* Secondary filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: -8 }}>
        <Select label="RM" value={rm} onChange={setRm} options={[["all", "Anyone"], ["mine", "Mine"], ["Dana Reese", "Dana Reese"], ["Priya Nair", "Priya Nair"]]} />
        <Select label="QPI" value={band} onChange={setBand} options={[["all", "All bands"], ["90", "90+ · Go today"], ["70", "70–89"], ["50", "50–69"], ["u50", "Under 50"]]} />
        <Select label="Type" value={entity} onChange={setEntity} options={[["all", "All types"], ["person", "Individual"], ["company", "Company"], ["foundation", "Foundation"]]} />
        <button onClick={() => setTop33(t => !t)} style={{ height: 30, padding: "0 12px", borderRadius: "var(--radius-sm)", cursor: "pointer", border: "1px solid " + (top33 ? "var(--blue-300)" : "var(--border-default)"), background: top33 ? "var(--blue-50)" : "var(--surface-card)", color: top33 ? "var(--blue-700)" : "var(--text-body)", font: "var(--fw-medium) var(--fs-caption) var(--font-sans)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="star" size={13} color={top33 ? "var(--blue-600)" : "var(--ink-400)"} /> Top 33
        </button>
        <button style={{ height: 30, padding: "0 12px", borderRadius: "var(--radius-sm)", cursor: "pointer", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-body)", font: "var(--fw-medium) var(--fs-caption) var(--font-sans)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="sliders-horizontal" size={13} color="var(--ink-400)" /> More filters
        </button>
      </div>

      {/* The one ranked list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(p => <ProspectRow key={p.id} rank={p.rank} name={p.name} kind={p.kind} subtitle={p.subtitle} qpi={p.qpi} horizon={p.horizon} manager={p.manager} partner={p.partner} cadence={p.cadence} dueSoon={p.dueSoon} onClick={() => go("prospect", { id: p.id })} />)}
        {rows.length === 0 ? <div style={{ padding: 40, textAlign: "center", font: "var(--fs-small) var(--font-sans)", color: "var(--text-muted)" }}>No prospects match these filters.</div> : null}
      </div>
    </div>
  );
}

/* ============================ CANDIDATES ============================ */
function ConfidencePip({ level }) {
  const map = { high: ["var(--sage-600)", 3, "High"], medium: ["var(--gold-600)", 2, "Medium"], low: ["var(--ink-400)", 1, "Low"] };
  const [color, n, label] = map[level] || map.low;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-flex", gap: 2 }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: 99, background: i < n ? color : "var(--haze-200)" }} />)}</span>
      <span style={{ font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)", color }}>{label} confidence</span>
    </span>
  );
}

function CandidateCard({ c }) {
  const { Icon } = window.POC;
  const { Button, SourceTag } = PR;
  const [status, setStatus] = React.useState(c.status);

  const Evidence = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ font: "var(--fw-semibold) 10px/1 var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span>
      {value ? <span style={{ font: "var(--fw-medium) var(--fs-micro)/1.4 var(--font-mono)", color: "var(--ai-ink)", background: "var(--ai-tint)", padding: "4px 8px", borderRadius: "var(--radius-xs)", width: "fit-content" }}>{value}</span>
             : <SourceTag />}
    </div>
  );

  if (status === "endorsed") {
    return (
      <div style={{ padding: "16px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--sage-300)", background: "var(--sage-50)", display: "flex", alignItems: "center", gap: 12 }}>
        <Icon name="check-circle-2" size={18} color="var(--sage-600)" />
        <div style={{ flex: 1 }}>
          <div style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--sage-700)" }}>{c.name} — endorsed for intro</div>
          <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 2 }}>Intro requested. On a successful intro, promotes to the MPL with Sandra Kim as Natural Partner.</div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setStatus(c.status)}>Undo</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, borderRadius: "var(--radius-md)", border: "1px solid var(--border-hairline)", background: "var(--surface-card)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ width: 36, height: 36, borderRadius: 99, background: "var(--haze-200)", color: "var(--ink-600)", display: "inline-flex", alignItems: "center", justifyContent: "center", font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", flex: "none" }}>{c.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</span>
        <div style={{ flex: 1 }}>
          <div style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--text-strong)" }}>{c.name}</div>
          <div style={{ marginTop: 3 }}><ConfidencePip level={c.confidence} /></div>
        </div>
        <span style={{ font: "var(--fw-medium) 10px var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)", border: "1px dashed var(--border-default)", padding: "3px 8px", borderRadius: 99 }}>Hypothesis</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Evidence label="Evidence — connection" value={c.connection} />
        <Evidence label="Evidence — affinity" value={c.affinity} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 14, borderTop: "1px solid var(--border-hairline)" }}>
        <Button variant="primary" size="sm" onClick={() => setStatus("endorsed")} iconLeft={<Icon name="check" size={14} />}>Endorse for intro</Button>
        <Button variant="ghost" size="sm">Keep researching</Button>
        <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }}>Dismiss</Button>
      </div>
    </div>
  );
}

function DiscoveryBatch({ batch, defaultOpen }) {
  const D = window.POC_DATA;
  const { Icon } = window.POC;
  const [open, setOpen] = React.useState(!!defaultOpen);
  const researching = batch.status === "researching";

  return (
    <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid " + (researching ? "var(--ai-border)" : "var(--border-hairline)"), background: researching ? "var(--ai-surface)" : "var(--surface-card)", overflow: "hidden" }}>
      <button onClick={() => !researching && setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", padding: "16px 20px", border: "none", background: "transparent", cursor: researching ? "default" : "pointer" }}>
        <span style={{ width: 38, height: 38, borderRadius: 99, background: researching ? "var(--ai-tint)" : "var(--haze-100)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name={researching ? "loader" : "users-round"} size={18} color={researching ? "var(--ai-ink)" : "var(--ink-500)"} style={researching ? { animation: "f95-heartbeat 1.6s var(--ease-in-out) infinite" } : null} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--text-strong)" }}>
            Introductions via {batch.connector}
          </div>
          <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 3 }}>
            for the {batch.initiative.split(" — ")[0]} · {researching ? "requested " + batch.requested : batch.count + " candidates"}
          </div>
        </div>
        {researching ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)", color: "var(--ai-ink)", background: "var(--ai-tint)", padding: "5px 11px", borderRadius: 99 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--ai-ink)", animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite" }} /> Researching…
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)", color: "var(--sage-700)", background: "var(--sage-100)", padding: "5px 11px", borderRadius: 99 }}>
            <Icon name="check" size={13} color="var(--sage-600)" /> Ready
          </span>
        )}
        {!researching ? <Icon name="chevron-down" size={18} color="var(--ink-400)" style={{ transition: "transform var(--dur-base)", transform: open ? "none" : "rotate(-90deg)" }} /> : null}
      </button>

      {researching ? (
        <div style={{ padding: "0 20px 18px 72px", font: "var(--fs-small)/1.5 var(--font-sans)", color: "var(--text-secondary)" }}>
          The copilot is searching public sources for people {batch.connector} could plausibly introduce, matched to this initiative. This runs for a few minutes — you'll get a "ready to review" note on Today when the batch lands.
        </div>
      ) : open ? (
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ font: "var(--fs-caption)/1.5 var(--font-sans)", color: "var(--text-muted)", padding: "0 0 4px" }}>
            Showing 3 of {batch.count}. Each is a hypothesis for {batch.connector} to react to — not a verified prospect. They stay off the ranked list until a human and the connector validate them.
          </div>
          {batch.candidates.map((c, i) => <CandidateCard key={i} c={c} />)}
        </div>
      ) : null}
    </div>
  );
}

function Candidates({ go }) {
  const D = window.POC_DATA;
  const { Icon, Eyebrow } = window.POC;
  const { Button } = PR;
  return (
    <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 20px", borderRadius: "var(--radius-lg)", background: "var(--haze-100)", border: "1px solid var(--border-hairline)" }}>
        <Icon name="git-branch" size={18} color="var(--ink-500)" style={{ marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--text-strong)" }}>The front of the referral funnel</div>
          <p style={{ font: "var(--fs-small)/1.5 var(--font-sans)", color: "var(--text-secondary)", margin: "4px 0 0", maxWidth: 620 }}>
            Pick a connector and an initiative; the copilot researches who they could plausibly introduce. Candidates live here — never on the Master Prospect List — until validated. "No public connection found" is a fine, honest answer.
          </p>
        </div>
        <Button variant="secondary" size="sm" iconLeft={<Icon name="search" size={14} />}>New introduction search</Button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Eyebrow>Discovery batches · by connector × initiative</Eyebrow>
        <span style={{ marginLeft: "auto", font: "var(--text-caption)", color: "var(--text-muted)" }}>2 tasks</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {D.discovery.map((b, i) => <DiscoveryBatch key={b.id} batch={b} defaultOpen={i === 0} />)}
      </div>
    </div>
  );
}

/* ============================ WRAPPER ============================ */
function Prospects({ route, go }) {
  const { Icon } = window.POC;
  const view = route === "candidates" ? "candidates" : "mpl";
  const Toggle = () => (
    <div style={{ display: "flex", gap: 4, padding: "0 32px", borderBottom: "1px solid var(--border-hairline)", background: "var(--surface-card)" }}>
      {[["mpl", "Master Prospect List", "list-ordered"], ["candidates", "Candidates", "git-branch"]].map(([k, l, ic]) => (
        <button key={k} onClick={() => go(k)} style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 14px", border: "none", background: "none", cursor: "pointer",
          font: (view === k ? "var(--fw-semibold)" : "var(--fw-medium)") + " var(--fs-small) var(--font-sans)",
          color: view === k ? "var(--text-strong)" : "var(--text-muted)", borderBottom: "2px solid " + (view === k ? "var(--blue-600)" : "transparent"), marginBottom: -1,
        }}>
          <Icon name={ic} size={15} color={view === k ? "var(--blue-600)" : "var(--ink-400)"} />{l}
          {k === "candidates" ? <span style={{ font: "10px var(--font-sans)", background: "var(--ai-tint)", color: "var(--ai-ink)", padding: "1px 6px", borderRadius: 99 }}>2</span> : null}
        </button>
      ))}
    </div>
  );
  return (
    <div>
      <Toggle />
      {view === "candidates" ? <Candidates go={go} /> : <MasterList go={go} />}
    </div>
  );
}

window.POC = Object.assign(window.POC || {}, { Prospects });

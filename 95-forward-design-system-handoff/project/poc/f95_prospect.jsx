/* 95 Forward — Prospect detail. "The whole picture — and the next right move."
   Overview (the QPI signature) · Knowledge Base · Strategy · Visits & Asks. */

const PD = window.Ds95ForwardDesignSystem_31a0c4 || {};

/* ---- shared rail used on Overview ---- */
function NextMoveRail({ p, go }) {
  const { Icon, Eyebrow } = window.POC;
  const { Card, Button } = PD;
  const D = window.POC_DATA;
  const H = D.hartwell;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 24 }}>
      <Card tone="default" pad="md" elevation="md">
        <Eyebrow color="var(--gold-700)">The next move</Eyebrow>
        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "13px 0 6px" }}>
          {p.dueSoon ? <span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--gold-600)", animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite", flex: "none" }} /> : null}
          <span style={{ font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)", color: "var(--text-strong)" }}>{p.dueSoon ? "Follow up by tomorrow" : p.cadence}</span>
        </div>
        <p style={{ font: "var(--fs-small)/1.5 var(--font-sans)", color: "var(--text-secondary)", margin: "0 0 16px" }}>
          {p.id === "p1" ? "Tom can open the door this week. Fast and good beats slow and perfect." : "Keep the relationship warm — the next conversation is what moves this forward."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button variant="go" block onClick={() => go("visit")} iconLeft={<Icon name="calendar-check" size={16} />}>Plan the visit</Button>
          <Button variant="secondary" block iconLeft={<Icon name="message-square" size={15} />}>Log a touch</Button>
        </div>
      </Card>

      <Card pad="md">
        <Eyebrow>Recent activity</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
          {(p.id === "p1" ? H.timeline : [
            { when: "Last week", what: "Added to the " + p.initiative.split(" — ")[0] + " initiative.", who: "Dana R." },
            { when: "2 weeks ago", what: "Qualified and scored — entered the ranked list.", who: "Copilot" },
          ]).map((t, i, arr) => (
            <div key={i} style={{ display: "flex", gap: 11, paddingBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--ink-300)", marginTop: 5, flex: "none" }} />
                {i < arr.length - 1 ? <span style={{ width: 1.5, flex: 1, background: "var(--border-hairline)", marginTop: 3 }} /> : null}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ font: "var(--fw-medium) var(--fs-small)/1.4 var(--font-sans)", color: "var(--text-strong)" }}>{t.what}</div>
                <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 2 }}>{t.when} · {t.who}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---- What we know fact row ---- */
function FactRow({ label, value, source, ai }) {
  const { SourceTag } = PD;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--border-hairline)" }}>
      <div style={{ width: 160, flex: "none", font: "var(--text-label)", color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {value ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ font: "var(--fw-semibold) var(--fs-body)/1.3 var(--font-sans)", color: ai ? "var(--iris-700)" : "var(--text-strong)" }}>{value}</span>
            {ai ? <span style={{ font: "var(--fw-semibold) 10px var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--ai-ink)", background: "var(--ai-tint)", padding: "2px 6px", borderRadius: "var(--radius-xs)" }}>Copilot</span> : null}
            {source ? <SourceTag source={source} /> : null}
          </div>
        ) : <SourceTag onClick={() => {}} />}
      </div>
    </div>
  );
}

/* ============================ OVERVIEW ============================ */
function OverviewTab({ p, go }) {
  const D = window.POC_DATA;
  const { Eyebrow } = window.POC;
  const { Card, QPIScore, AISuggestion } = PD;
  const H = D.hartwell;
  const parts = D.qpiParts[p.id];
  const isHart = p.id === "p1";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: 28, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
        {/* THE SIGNATURE */}
        <Card tone="go" pad="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Eyebrow color="var(--gold-700)">Qualified Prospect Index</Eyebrow>
            <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>Updated 6h ago</span>
          </div>
          <QPIScore value={p.qpi} parts={parts} defaultOpen={isHart} onAdjust={() => {}} />
        </Card>

        {/* From your copilot */}
        {isHart ? (
          <div>
            <Eyebrow color="var(--ai-ink)">From your copilot · {H.suggestions.length} to review</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {H.suggestions.map(s => (
                <AISuggestion key={s.id} source={s.source} from={s.from} to={s.to} onApprove={() => {}} onEdit={() => {}} onDismiss={() => {}}>{s.text}</AISuggestion>
              ))}
            </div>
          </div>
        ) : (
          <Card pad="md">
            <Eyebrow color="var(--ai-ink)">From your copilot</Eyebrow>
            <p style={{ font: "var(--fs-small)/1.5 var(--font-sans)", color: "var(--text-secondary)", margin: "10px 0 0" }}>
              No open suggestions right now. The copilot is watching public sources and will propose updates as it finds them — you'll always approve before anything changes.
            </p>
          </Card>
        )}

        {/* What we know */}
        <Card pad="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Eyebrow>What we know</Eyebrow>
            <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>Gaps are invitations, not errors</span>
          </div>
          {(isHart ? H.facts : [
            { label: "Estimated capacity", value: parts.capacity.source ? "Being confirmed" : null, source: parts.capacity.source },
            { label: "Giving focus", value: p.subtitle.split(" · ")[0], source: "Logged · " + p.manager.split(" ")[0] + "." },
            { label: "Last gift", value: D.constituents.find(c => c.prospectId === p.id) ? D.constituents.find(c => c.prospectId === p.id).lastGift : "—", source: "Gift records" },
            { label: "Wealth screen", value: null, source: null },
          ]).map((f, i) => <FactRow key={i} {...f} />)}
        </Card>
      </div>

      <NextMoveRail p={p} go={go} />
    </div>
  );
}

/* ============================ KNOWLEDGE BASE ============================ */
function KBTab({ p }) {
  const D = window.POC_DATA;
  const { Eyebrow, Icon } = window.POC;
  const { Card, SourceTag, RoleChip } = PD;
  const isOrg = p.kind !== "person";
  const isHart = p.id === "p1";
  const kb = D.hartwell.kb;

  const Row = ({ label, value, source, last }) => (
    <div style={{ padding: "13px 0", borderBottom: last ? "none" : "1px solid var(--border-hairline)" }}>
      <div style={{ font: "var(--fw-semibold) 10px/1 var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 7 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ font: "var(--fs-body)/1.4 var(--font-sans)", color: "var(--text-strong)" }}>{value}</span>
        {source ? <SourceTag source={source} /> : null}
      </div>
    </div>
  );

  if (!isHart) {
    return (
      <Card pad="lg">
        <Eyebrow>Knowledge base</Eyebrow>
        <p style={{ font: "var(--fs-body)/1.6 var(--font-sans)", color: "var(--text-secondary)", margin: "14px 0 18px", maxWidth: 520 }}>
          No research worksheet yet for {p.name}. This is where the case-readiness picture comes together — capacity, the relationship, connectors, and the gaps worth filling.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--ai-border)", background: "var(--ai-surface)", color: "var(--ai-ink)", cursor: "pointer", font: "var(--fw-semibold) var(--fs-small) var(--font-sans)" }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--ai-ink)" }} /> Ask the copilot to research
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: isOrg ? "minmax(0,1fr) 320px" : "minmax(0, 720px)", gap: 28, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card pad="lg">
          <Eyebrow>The research worksheet</Eyebrow>
          <div style={{ marginTop: 10 }}>
            <Row label="Capacity & source" value={kb.capacity.value} source={kb.capacity.source} />
            <Row label="Fit to the case" value={kb.caseFit.value} source={kb.caseFit.source} />
            <Row label="Gift history" value={`Last ${kb.gifts.last} · Largest ${kb.gifts.largest} · ${kb.gifts.total}`} source="Gift records" />
            <Row label="Other philanthropy" value={kb.otherPhil.value} source={kb.otherPhil.source} />
            <Row label="Timing" value={kb.timing.value} source={kb.timing.source} last />
          </div>
        </Card>

        <Card pad="lg">
          <Eyebrow>Connectors</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {kb.connectors.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--haze-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-hairline)" }}>
                <RoleChip role="partner" name={c.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "var(--fw-medium) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>{c.role}</div>
                  <div style={{ font: "var(--text-caption)", color: "var(--sage-700)", marginTop: 2 }}>{c.path}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Research gaps — calm invitations */}
        <Card pad="lg" tone="default" style={{ background: "var(--haze-50)" }}>
          <Eyebrow>Research gaps</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {kb.gaps.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", background: "var(--surface-card)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-default)" }}>
                <Icon name="search" size={15} color="var(--ink-400)" />
                <span style={{ flex: 1, font: "var(--fs-small) var(--font-sans)", color: "var(--text-body)" }}>{g}</span>
                <span style={{ font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)", color: "var(--ai-ink)", cursor: "pointer" }}>Ask the copilot</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {isOrg ? (
        <Card pad="lg" style={{ position: "sticky", top: 24 }}>
          <Eyebrow>Relationship map</Eyebrow>
          <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", margin: "6px 0 14px" }}>Who decides — and the warm path to each.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {kb.relationshipMap.decisionMakers.map((d, i) => (
              <div key={i} style={{ padding: "12px 14px", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)" }}>
                <div style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>{d.name}</div>
                <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 3 }}>{d.role}</div>
                <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 6 }}>{d.power}</div>
                <div style={{ marginTop: 8 }}>
                  {d.path.startsWith("Unknown") ? <span style={{ font: "var(--fw-medium) var(--fs-micro) var(--font-sans)", color: "var(--unknown-ink)", background: "var(--unknown-surface)", border: "1px dashed var(--unknown-border)", padding: "2px 7px", borderRadius: "var(--radius-xs)" }}>{d.path}</span>
                            : <span style={{ font: "var(--fw-medium) var(--fs-caption) var(--font-sans)", color: "var(--sage-700)" }}>↳ {d.path}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* ============================ STRATEGY ============================ */
function StrategyTab({ p }) {
  const D = window.POC_DATA;
  const { Eyebrow, Icon } = window.POC;
  const { Card } = PD;
  const isHart = p.id === "p1";
  const s = D.hartwell.strategy;
  if (!isHart) {
    return (
      <Card pad="lg">
        <Eyebrow>Strategy</Eyebrow>
        <p style={{ font: "var(--fs-body)/1.6 var(--font-sans)", color: "var(--text-secondary)", margin: "14px 0 0", maxWidth: 520 }}>
          No strategy drafted yet for {p.name}. Relationship goals, hooks, likely objections, and the plan to warm the path will live here — the copilot can draft a first pass for you to shape.
        </p>
      </Card>
    );
  }
  const Block = ({ title, children }) => (
    <Card pad="lg">
      <Eyebrow>{title}</Eyebrow>
      <div style={{ marginTop: 12 }}>{children}</div>
    </Card>
  );
  const Chips = ({ items, color }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((h, i) => <span key={i} style={{ font: "var(--fw-medium) var(--fs-small) var(--font-sans)", color: color || "var(--text-body)", background: "var(--haze-100)", padding: "6px 12px", borderRadius: "var(--radius-pill)" }}>{h}</span>)}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
      <Block title="Relationship goal"><p style={{ font: "var(--fs-body)/1.5 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>{s.goals}</p></Block>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Block title="Hooks & interests"><Chips items={s.hooks} color="var(--blue-700)" /></Block>
        <Block title="Likely objections">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {s.objections.map((o, i) => <div key={i} style={{ display: "flex", gap: 9, font: "var(--fs-small)/1.45 var(--font-sans)", color: "var(--text-body)" }}><Icon name="message-circle-warning" size={15} color="var(--gold-600)" style={{ marginTop: 2, flexShrink: 0 }} />{o}</div>)}
          </div>
        </Block>
      </div>
      <Block title="Predisposition plan"><p style={{ font: "var(--fs-body)/1.5 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>{s.predisposition}</p></Block>
      <Block title="Presentation — what to lead with"><p style={{ font: "var(--fs-body)/1.5 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>{s.presentation}</p></Block>
      <Block title="Action plan / next steps">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {s.nextSteps.map((n, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--blue-50)", color: "var(--blue-700)", display: "inline-flex", alignItems: "center", justifyContent: "center", font: "var(--fw-bold) var(--fs-caption) var(--font-sans)", flex: "none" }}>{i + 1}</span>
              <span style={{ font: "var(--fs-small) var(--font-sans)", color: "var(--text-body)" }}>{n}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

/* ============================ VISITS & ASKS ============================ */
function VisitsAsksTab({ p, go }) {
  const D = window.POC_DATA;
  const { Eyebrow, Icon } = window.POC;
  const { Card, Button, HorizonTag, Badge } = PD;
  const isHart = p.id === "p1";
  const H = D.hartwell;
  if (!isHart) {
    return (
      <Card pad="lg">
        <Eyebrow>Visits &amp; asks</Eyebrow>
        <p style={{ font: "var(--fs-body)/1.6 var(--font-sans)", color: "var(--text-secondary)", margin: "14px 0 18px", maxWidth: 520 }}>
          No visits logged yet for {p.name}. Plan the first conversation and the history — goals, debriefs, asks, and referrals — will build here.
        </p>
        <Button variant="go" onClick={() => go("visit")} iconLeft={<Icon name="calendar-check" size={16} />}>Plan a visit</Button>
      </Card>
    );
  }
  const outcomeTone = { Commitment: "success", Roadmap: "info", Decline: "neutral" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 820 }}>
      {/* Visits */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Eyebrow>Visits</Eyebrow>
          <Button variant="secondary" size="sm" onClick={() => go("visit")} iconLeft={<Icon name="calendar-check" size={14} />}>Plan a visit</Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {H.visits.map((v, i) => (
            <Card key={i} pad="md" tone={v.status === "planned" ? "default" : "default"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {v.status === "planned" ? <Badge tone="attention" dot>Planned</Badge> : <Badge tone="neutral">{v.when}</Badge>}
                <span style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>{v.goal}</span>
              </div>
              <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)" }}>Present: {v.present} · Priority: {v.priority}</div>
              {v.debrief ? <p style={{ font: "var(--fs-small)/1.5 var(--font-sans)", color: "var(--text-body)", margin: "10px 0 0", padding: "10px 12px", background: "var(--haze-50)", borderRadius: "var(--radius-sm)" }}>{v.debrief}</p> : null}
              {v.outcome ? <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}><Badge tone={outcomeTone[v.outcome]}>{v.outcome}</Badge><span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>Next: {v.next}</span></div> : null}
            </Card>
          ))}
        </div>
      </div>

      {/* Asks */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Eyebrow>Asks</Eyebrow>
          <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={14} />}>Log an ask</Button>
        </div>
        {H.asks.map((a, i) => (
          <Card key={i} pad="md">
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-2xl) var(--font-sans)", color: "var(--text-strong)" }}>{a.amount}</span>
              <HorizonTag horizon={a.frame} />
              <Badge tone="info">{a.outcome}</Badge>
              <span style={{ marginLeft: "auto", font: "var(--text-caption)", color: "var(--sage-700)" }}>{a.numbers}</span>
            </div>
            <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 8 }}>{a.type} · funds <strong style={{ color: "var(--text-body)" }}>{a.initiative}</strong></div>
            <p style={{ font: "var(--fs-small)/1.5 var(--font-sans)", color: "var(--text-body)", margin: "10px 0 0" }}>{a.detail}</p>
          </Card>
        ))}
      </div>

      {/* Referrals */}
      <div>
        <Eyebrow>Referrals captured</Eyebrow>
        <div style={{ marginTop: 12 }}>
          {H.referrals.map((r, i) => (
            <Card key={i} pad="md">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="git-branch" size={16} color="var(--sage-600)" />
                <span style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>{r.name}</span>
                <span style={{ marginLeft: "auto", font: "var(--text-caption)", color: "var(--text-muted)" }}>from {r.from}</span>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 10, font: "var(--text-caption)", color: "var(--text-secondary)" }}>
                <span>Use your name? <strong style={{ color: "var(--sage-700)" }}>{r.useName}</strong></span>
                <span>{r.willNote}</span>
                <span>{r.rel}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ DETAIL SHELL ============================ */
function ProspectDetail({ params, go }) {
  const D = window.POC_DATA;
  const { Icon } = window.POC;
  const { RoleChip, HorizonTag, Badge, Avatar } = PD;
  const p = D.prospects.find(x => x.id === (params && params.id)) || D.prospects[0];
  const [tab, setTab] = React.useState("overview");
  React.useEffect(() => { setTab("overview"); }, [params && params.id]);
  const kindLabel = { person: "Individual", company: "Company", foundation: "Foundation" }[p.kind];
  const TABS = [["overview", "Overview"], ["kb", "Knowledge base"], ["strategy", "Strategy"], ["visits", "Visits & asks"]];

  return (
    <div style={{ padding: "24px 32px 48px", display: "flex", flexDirection: "column", gap: 22 }}>
      <button onClick={() => go("mpl")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", font: "var(--fw-medium) var(--fs-small) var(--font-sans)", padding: 0, width: "fit-content" }}>
        <Icon name="arrow-left" size={15} /> Back to the list
      </button>

      {/* Header */}
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        <Avatar name={p.name} kind={p.kind === "person" ? "person" : "org"} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ font: "var(--fw-bold) var(--fs-3xl)/1.1 var(--font-sans)", color: "var(--text-strong)", letterSpacing: "var(--ls-snug)" }}>{p.name}</h1>
            <Badge tone="neutral">{kindLabel}</Badge>
            <span style={{ font: "var(--fw-medium) var(--fs-micro) var(--font-mono)", color: "var(--text-muted)" }}>#{p.rank} on the list</span>
          </div>
          <div style={{ font: "var(--fs-body) var(--font-sans)", color: "var(--text-secondary)", marginTop: 5 }}>{p.subtitle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {p.manager ? <RoleChip role="manager" name={p.manager} /> : null}
            {p.partner ? <RoleChip role="partner" name={p.partner} /> : null}
            <HorizonTag horizon={p.horizon} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-hairline)" }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: "11px 16px", border: "none", background: "none", cursor: "pointer",
            font: (tab === k ? "var(--fw-semibold)" : "var(--fw-medium)") + " var(--fs-small) var(--font-sans)",
            color: tab === k ? "var(--text-strong)" : "var(--text-muted)", borderBottom: "2px solid " + (tab === k ? "var(--blue-600)" : "transparent"), marginBottom: -1,
          }}>{l}</button>
        ))}
      </div>

      <div key={tab} className="f95-rise">
        {tab === "overview" ? <OverviewTab p={p} go={go} /> :
         tab === "kb" ? <KBTab p={p} /> :
         tab === "strategy" ? <StrategyTab p={p} /> :
         <VisitsAsksTab p={p} go={go} />}
      </div>
    </div>
  );
}

window.POC = Object.assign(window.POC || {}, { ProspectDetail });

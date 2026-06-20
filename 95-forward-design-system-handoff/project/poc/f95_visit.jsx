/* 95 Forward — Visit mode (Register B). Full-screen, calm, large type, low
   chrome. Three phases: Before · During · After (debrief). The ask is serif. */

const VM = window.Ds95ForwardDesignSystem_31a0c4 || {};

const DISCOVERY = [
  "What first drew you to this work?",
  "What would you most want to see change for kids in this city in five years?",
  "When you picture the new youth center full of children, what does that mean to you?",
  "What would make a gift like this feel right for your family's foundation?",
];

function VisitTop({ phase, onExit }) {
  const { Icon } = window.POC;
  const labels = { before: "Before — prepare", during: "During — at their side", after: "After — debrief" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: "1px solid var(--border-hairline)", flex: "none" }}>
      <button onClick={onExit} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", font: "var(--fw-medium) var(--fs-small) var(--font-sans)" }}>
        <Icon name="x" size={18} /> Exit
      </button>
      <div style={{ margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--gold-600)", animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite" }} />
          With the Hartwell Family Foundation
        </div>
        <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 2 }}>{labels[phase]} · Tom Bradley made the intro</div>
      </div>
      <span style={{ width: 44 }} />
    </div>
  );
}

function VisitMode({ go }) {
  const D = window.POC_DATA;
  const { Icon, Eyebrow } = window.POC;
  const { Button, Badge, HorizonTag } = VM;
  const [phase, setPhase] = React.useState("before");
  const [qi, setQi] = React.useState(0);
  const [showAsk, setShowAsk] = React.useState(false);
  const [outcome, setOutcome] = React.useState(null);

  const shell = { position: "absolute", inset: 0, background: "var(--haze-50)", display: "flex", flexDirection: "column", zIndex: 20, overflow: "hidden" };

  /* ---------------- BEFORE ---------------- */
  if (phase === "before") {
    const facts = [["Estimated capacity", "$250,000"], ["Last gift", "$60,000 · Mar 2024"], ["Giving focus", "Youth & education"], ["Window", "Committee meets Q3"]];
    return (
      <div style={shell}>
        <VisitTop phase="before" onExit={() => go("prospect", { id: "p1" })} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px 56px", display: "flex", flexDirection: "column", gap: 32 }}>
            <div>
              <Eyebrow color="var(--gold-700)">The goal of this visit</Eyebrow>
              <p style={{ font: "var(--fw-regular) var(--fs-2xl)/1.3 var(--font-serif)", color: "var(--text-strong)", margin: "12px 0 0", letterSpacing: "var(--ls-snug)" }}>
                Secure the naming-gift conversation — and a date for Eleanor to see the program herself.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRadius: "var(--radius-lg)", background: "var(--blue-50)", border: "1px solid var(--blue-100)" }}>
              <Icon name="flag" size={18} color="var(--blue-600)" />
              <div>
                <div style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--blue-700)" }}>Lead with</div>
                <div style={{ font: "var(--fs-body) var(--font-sans)", color: "var(--text-strong)", marginTop: 2 }}>The youth-center capital priority and the naming opportunity.</div>
              </div>
            </div>

            <div>
              <Eyebrow>Discovery & power questions</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                {DISCOVERY.map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "14px 18px", background: "var(--surface-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)" }}>
                    <span style={{ font: "var(--fw-bold) var(--fs-small) var(--font-mono)", color: "var(--text-muted)", flex: "none" }}>{i + 1}</span>
                    <span style={{ font: "var(--fs-body)/1.4 var(--font-sans)", color: "var(--text-body)" }}>{q}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ padding: 20, borderRadius: "var(--radius-lg)", background: "var(--gold-50)", border: "1px solid var(--gold-300)" }}>
                <Eyebrow color="var(--gold-700)">The planned ask</Eyebrow>
                <div className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-3xl) var(--font-sans)", color: "var(--gold-700)", margin: "10px 0 8px" }}>$250,000</div>
                <HorizonTag horizon="tomorrow" />
                <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 10 }}>Names the new youth wing · funds the capital campaign.</div>
              </div>
              <div style={{ padding: 20, borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: "1px solid var(--border-hairline)" }}>
                <Eyebrow>Who opens the door</Eyebrow>
                <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "12px 0 10px" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 99, border: "1.5px dashed var(--sage-600)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="door-open" size={15} color="var(--sage-600)" /></span>
                  <span style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: "var(--text-strong)" }}>Tom Bradley</span>
                </div>
                <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)" }}>Board member on the giving committee — made the warm intro.</div>
              </div>
            </div>

            <div>
              <Eyebrow>What we know</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginTop: 12 }}>
                {facts.map(([k, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border-hairline)" }}>
                    <span style={{ font: "var(--fs-small) var(--font-sans)", color: "var(--text-secondary)" }}>{k}</span>
                    <span style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--text-strong)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: "none", padding: "18px 32px", borderTop: "1px solid var(--border-hairline)", display: "flex", justifyContent: "center", background: "var(--surface-card)" }}>
          <div style={{ width: "100%", maxWidth: 720 }}>
            <Button variant="go" size="lg" block onClick={() => { setPhase("during"); setQi(0); }} iconRight={<Icon name="arrow-right" size={18} />}>Start the visit</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- DURING ---------------- */
  if (phase === "during") {
    return (
      <div style={shell}>
        <VisitTop phase="during" onExit={() => go("prospect", { id: "p1" })} />
        {/* progress */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "20px" }}>
          {DISCOVERY.map((_, i) => <span key={i} style={{ width: i === qi ? 30 : 8, height: 8, borderRadius: 99, background: i <= qi ? "var(--blue-600)" : "var(--ink-200)", transition: "all var(--dur-base) var(--ease-out)" }} />)}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 32px", textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
          {showAsk ? (
            <>
              <Eyebrow color="var(--gold-700)">The ask — clear and dignified</Eyebrow>
              <p key="ask" className="f95-rise" style={{ font: "var(--fw-regular) var(--fs-4xl)/1.25 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "var(--ls-snug)", margin: "22px 0 0", textWrap: "balance" }}>
                “Would you consider a gift of $250,000 to name the new youth wing?”
              </p>
              <p style={{ font: "var(--fs-lg)/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 20 }}>Say the number. Then stop talking, and listen.</p>
              <div style={{ marginTop: 22 }}><Badge tone="ai">Copilot drafted this from their $250K capacity</Badge></div>
            </>
          ) : (
            <>
              <Eyebrow color="var(--blue-600)">Question {qi + 1} of {DISCOVERY.length}</Eyebrow>
              <p key={qi} className="f95-rise" style={{ font: "var(--fw-regular) var(--fs-3xl)/1.3 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "var(--ls-snug)", margin: "22px 0 0", textWrap: "balance" }}>
                {DISCOVERY[qi]}
              </p>
              <p style={{ font: "var(--fs-lg)/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 20 }}>A question, then space. Resist filling the silence.</p>
            </>
          )}
        </div>

        {/* quick-capture chips */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "12px 32px" }}>
          {[["Note", "pencil"], ["Capture a referral", "git-branch"], ["Log an objection", "message-circle-warning"]].map(([l, ic]) => (
            <button key={l} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", font: "var(--fw-medium) var(--fs-small) var(--font-sans)", color: "var(--text-body)", minHeight: 44 }}>
              <Icon name={ic} size={15} color="var(--ink-500)" />{l}
            </button>
          ))}
        </div>

        {/* nav */}
        <div style={{ flex: "none", padding: "16px 32px 28px", borderTop: "1px solid var(--border-hairline)", display: "flex", gap: 12, justifyContent: "center", background: "var(--surface-card)" }}>
          <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 720 }}>
            {showAsk ? (
              <>
                <Button variant="ghost" size="lg" onClick={() => setShowAsk(false)}>Back</Button>
                <Button variant="go" size="lg" block onClick={() => setPhase("after")} iconRight={<Icon name="arrow-right" size={18} />}>Capture the outcome</Button>
              </>
            ) : qi < DISCOVERY.length - 1 ? (
              <>
                {qi > 0 ? <Button variant="ghost" size="lg" onClick={() => setQi(qi - 1)}>Back</Button> : null}
                <Button variant="primary" size="lg" block onClick={() => setQi(qi + 1)} iconRight={<Icon name="arrow-right" size={18} />}>Next question</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="lg" onClick={() => setQi(qi - 1)}>Back</Button>
                <Button variant="go" size="lg" block onClick={() => setShowAsk(true)} iconLeft={<Icon name="hand-coins" size={18} />}>Make the ask</Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- AFTER (debrief) ---------------- */
  const OUTCOMES = [["Commitment", "check-circle-2", "var(--sage-600)"], ["Roadmap", "route", "var(--blue-600)"], ["Decline", "circle-slash", "var(--ink-400)"]];
  return (
    <div style={shell}>
      <VisitTop phase="after" onExit={() => go("prospect", { id: "p1" })} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 32px 56px", display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <Eyebrow>The outcome</Eyebrow>
            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              {OUTCOMES.map(([l, ic, c]) => (
                <button key={l} onClick={() => setOutcome(l)} style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: "20px 12px", cursor: "pointer",
                  borderRadius: "var(--radius-lg)", background: outcome === l ? "var(--surface-card)" : "var(--surface-card)",
                  border: "2px solid " + (outcome === l ? c : "var(--border-hairline)"), boxShadow: outcome === l ? "var(--shadow-md)" : "none",
                }}>
                  <Icon name={ic} size={24} color={c} />
                  <span style={{ font: "var(--fw-semibold) var(--fs-body) var(--font-sans)", color: outcome === l ? "var(--text-strong)" : "var(--text-secondary)" }}>{l}</span>
                </button>
              ))}
            </div>
            {outcome === "Roadmap" ? <div style={{ font: "var(--text-caption)/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 10, textAlign: "center" }}>A clear next step is a win — not a no.</div> : null}
          </div>

          {outcome ? (
            <div className="f95-rise" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Eyebrow>Numbers on the table</Eyebrow>
                  <div className="ks-num" style={{ font: "var(--fw-heavy) var(--fs-2xl) var(--font-sans)", color: "var(--text-strong)", marginTop: 10 }}>$250,000</div>
                  <div style={{ font: "var(--text-caption)", color: "var(--text-secondary)", marginTop: 4 }}>Named, not yet committed.</div>
                </div>
                <div>
                  <Eyebrow>The next step</Eyebrow>
                  <div style={{ font: "var(--fs-body)/1.4 var(--font-sans)", color: "var(--text-strong)", marginTop: 10 }}>Site visit with Eleanor before the Q3 committee.</div>
                </div>
              </div>

              {/* copilot-drafted 24h follow-up */}
              <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--ai-border)", borderLeft: "3px solid var(--ai-ink)", background: "var(--ai-surface)", padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 13, height: 13, borderRadius: 3, background: "var(--ai-ink)" }} />
                  <span style={{ font: "var(--fw-semibold) var(--fs-micro)/1 var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--ai-ink)" }}>Copilot drafted your 24-hour follow-up</span>
                </div>
                <p style={{ font: "var(--fs-body)/1.6 var(--font-serif)", color: "var(--iris-700)", margin: 0 }}>
                  “Eleanor — thank you for the time today. I'll send the program outcomes you asked about and propose two dates for a site visit before your committee meets. It was a real pleasure.”
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Button variant="primary" size="sm" iconLeft={<Icon name="check" size={14} />}>Approve &amp; schedule</Button>
                  <Button variant="secondary" size="sm">Edit</Button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 18px", borderRadius: "var(--radius-pill)", background: "var(--gold-50)", border: "1px solid var(--gold-300)", alignSelf: "flex-start" }}>
                <span style={{ width: 11, height: 11, borderRadius: 99, background: "var(--gold-600)", animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite" }} />
                <span style={{ font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--gold-700)" }}>The 24-hour clock starts now — follow up by tomorrow</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ flex: "none", padding: "16px 32px", borderTop: "1px solid var(--border-hairline)", display: "flex", justifyContent: "center", background: "var(--surface-card)" }}>
        <div style={{ width: "100%", maxWidth: 680 }}>
          <Button variant="go" size="lg" block disabled={!outcome} onClick={() => go("today")} iconRight={<Icon name="arrow-right" size={18} />}>Finish — back to Today</Button>
        </div>
      </div>
    </div>
  );
}

window.POC = Object.assign(window.POC || {}, { VisitMode });

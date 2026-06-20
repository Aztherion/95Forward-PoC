/* Visit Companion — Register B. In the moment: large, quiet, low-chrome. */
const VC = window.Ds95ForwardDesignSystem_31a0c4;

const STAGES = [
  { key: "open", eyebrow: "Open — warm, unhurried",
    prompt: "Start with thanks. What first drew them to this work?",
    help: "Let them talk. You're here to listen first." },
  { key: "listen", eyebrow: "Listen — ask, listen, ask",
    prompt: "What would they most want to see change in the next five years?",
    help: "A question, then space. Resist filling the silence." },
  { key: "ask", eyebrow: "The ask — clear and dignified", isAsk: true,
    prompt: "Would you consider a gift of $250,000 to name the new youth wing?",
    help: "Say the number. Then stop talking, and listen." },
  { key: "close", eyebrow: "Close — agree the next step",
    prompt: "Thank them. What's the one thing you'll each do next?",
    help: "Confirm a concrete next step before you leave." },
];

function VisitCompanion({ go }) {
  const D = window.F95_DATA;
  const { Button, Badge } = VC;
  const { Icon } = window.F95;
  const [i, setI] = React.useState(0);
  const [logged, setLogged] = React.useState(false);
  const s = STAGES[i];
  const last = i === STAGES.length - 1;

  if (logged) {
    return (
      <div style={shellStyle}>
        <CompanionTop go={go} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "var(--space-7)", gap: "var(--space-6)" }}>
          <span style={{ display: "inline-flex", width: 64, height: 64, borderRadius: 99, background: "var(--sage-100)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={32} color="var(--sage-600)" stroke={2.2} />
          </span>
          <div>
            <div style={{ font: "var(--fw-regular) var(--fs-3xl)/1.2 var(--font-serif)", color: "var(--text-strong)", letterSpacing: "var(--ls-snug)" }}>Ask logged.</div>
            <div style={{ font: "var(--fs-lg)", color: "var(--text-secondary)", marginTop: 10, maxWidth: 420 }}>$250,000 to name the youth wing, with the Hartwell Foundation.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 18px", borderRadius: "var(--radius-pill)", background: "var(--gold-50)", border: "1px solid var(--gold-300)" }}>
            <span style={{ width: 11, height: 11, borderRadius: 99, background: "var(--gold-600)", animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite" }} />
            <span style={{ font: "var(--text-label)", color: "var(--gold-700)" }}>Follow up by tomorrow — we'll remind you</span>
          </div>
          <Button variant="primary" size="lg" onClick={() => go("profile", D.prospects[0])}>Back to their profile</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <CompanionTop go={go} />

      {/* progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "var(--space-5)" }}>
        {STAGES.map((st, idx) => (
          <span key={st.key} style={{ width: idx === i ? 28 : 8, height: 8, borderRadius: 99, background: idx <= i ? "var(--blue-600)" : "var(--ink-200)", transition: "all var(--dur-base) var(--ease-out)" }} />
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-7)", textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ font: "var(--fw-semibold) var(--fs-caption)/1 var(--font-sans)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: s.isAsk ? "var(--gold-700)" : "var(--blue-600)" }}>{s.eyebrow}</div>

        <p key={s.key} style={{
          font: `var(--fw-regular) ${s.isAsk ? "var(--fs-4xl)" : "var(--fs-3xl)"}/1.25 var(--font-serif)`,
          color: "var(--text-strong)", letterSpacing: "var(--ls-snug)", margin: "22px 0 0", textWrap: "balance",
          animation: "f95-rise var(--dur-slow) var(--ease-out) both",
        }}>
          {s.isAsk ? <>“{s.prompt}”</> : s.prompt}
        </p>

        <p style={{ font: "var(--fs-lg)/1.5", color: "var(--text-muted)", marginTop: 18, maxWidth: 460 }}>{s.help}</p>

        {s.isAsk ? (
          <div style={{ marginTop: 22 }}>
            <Badge tone="ai">Copilot drafted this ask from their $250K capacity</Badge>
          </div>
        ) : null}
      </div>

      {/* big, calm controls */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "var(--space-6) var(--space-7) var(--space-8)", maxWidth: 680, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {i > 0 ? <Button variant="ghost" size="lg" onClick={() => setI(i - 1)}>Back</Button> : null}
        {s.isAsk ? (
          <Button variant="go" size="lg" block onClick={() => setLogged(true)} iconLeft={<window.F95.Icon name="check" size={18} />}>Log the ask</Button>
        ) : last ? (
          <Button variant="primary" size="lg" block onClick={() => setLogged(true)}>Finish visit</Button>
        ) : (
          <Button variant="primary" size="lg" block onClick={() => setI(i + 1)} iconRight={<window.F95.Icon name="arrow-right" size={18} />}>Next</Button>
        )}
      </div>
    </div>
  );
}

const shellStyle = { position: "absolute", inset: 0, background: "var(--haze-50)", display: "flex", flexDirection: "column", zIndex: 5 };

function CompanionTop({ go }) {
  const { Icon } = window.F95;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "var(--space-5) var(--space-6)", borderBottom: "1px solid var(--border-hairline)" }}>
      <button onClick={() => go("profile", window.F95_DATA.prospects[0])} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", font: "var(--fw-medium) var(--fs-small) var(--font-sans)" }}>
        <Icon name="x" size={18} /> Exit
      </button>
      <div style={{ margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "var(--text-label)", color: "var(--text-strong)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--gold-600)", animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite" }} />
          With the Hartwell Family Foundation
        </div>
        <div style={{ font: "var(--text-caption)", color: "var(--text-muted)", marginTop: 2 }}>Visit mode · Tom Bradley made the intro</div>
      </div>
      <span style={{ width: 44 }} />
    </div>
  );
}

window.F95 = Object.assign(window.F95 || {}, { VisitCompanion });

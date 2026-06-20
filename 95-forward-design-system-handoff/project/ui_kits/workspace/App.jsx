/* App — top-level state + screen routing for the workspace kit. */
function App() {
  const { Sidebar, Topbar, MasterList, ProspectProfile, GreenSheet, VisitCompanion, Icon } = window.F95;
  const [state, setState] = React.useState({ screen: "list", prospect: null });
  const go = (screen, prospect = null) => setState({ screen, prospect });

  // Register B — full-bleed, no shell.
  if (state.screen === "visit") {
    return <VisitCompanion go={go} />;
  }

  let title = "Master Prospect List", subtitle = "One ranked list — people, companies, and foundations together.", body = null;
  if (state.screen === "list" || state.screen === "today") {
    body = <MasterList go={go} />;
  } else if (state.screen === "profile") {
    title = "Prospect"; subtitle = "The whole picture — and the next right move.";
    body = <ProspectProfile prospect={state.prospect} go={go} />;
  } else if (state.screen === "green") {
    title = "Green Sheet"; subtitle = "Momentum, honestly kept.";
    body = <GreenSheet go={go} />;
  }

  const navScreen = state.screen === "profile" ? "list" : state.screen;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-app)" }}>
      <Sidebar screen={navScreen} go={go} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar title={title} subtitle={subtitle} right={
          <button style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", font: "var(--fw-semibold) var(--fs-small) var(--font-sans)", color: "var(--text-body)" }}>
            <Icon name="plus" size={16} color="var(--ink-500)" /> Add prospect
          </button>
        } />
        <div style={{ flex: 1, overflow: "auto" }}>{body}</div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

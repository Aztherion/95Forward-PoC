/* App — top-level routing for the Keystone CRM + 95 Forward PoC.
   Host routes render in the cool-grey register; 95 Forward routes render warm.
   Visit mode is full-bleed (Register B), outside the shell. */

function App() {
  const D = window.POC_DATA;
  const P = window.POC;
  const { Sidebar, Topbar, isF95 } = P;
  const [state, setState] = React.useState({ route: "home", params: {} });
  const go = (route, params = {}) => { setState({ route, params }); const el = document.getElementById("poc-scroll"); if (el) el.scrollTop = 0; };
  const { route, params } = state;

  // Visit mode — full screen, no shell.
  if (route === "visit") return <P.VisitMode go={go} />;

  const f95 = isF95(route);

  // Per-route meta + body.
  let title = "", subtitle = "", addLabel = null, body = null;
  switch (route) {
    case "home": title = "Home"; subtitle = "Tuesday, June 18 · Riverside Children's Fund"; addLabel = "Add constituent"; body = <P.HostHome go={go} />; break;
    case "constituents": title = "Constituents"; subtitle = "The records backbone"; addLabel = "Add constituent"; body = <P.HostConstituents go={go} />; break;
    case "constituent": { const c = D.constituents.find(x => x.id === params.id); title = c ? c.name : "Constituent"; subtitle = "Constituent record"; addLabel = "Add gift"; body = <P.HostConstituent params={params} go={go} />; break; }
    case "revenue": title = "Revenue"; subtitle = "Gifts, pledges, and receipts"; addLabel = "Add gift"; body = <P.HostRevenue />; break;
    case "majorgiving": title = "Major Giving"; subtitle = "Pipeline, proposals, and portfolio"; addLabel = "Add opportunity"; body = <P.HostMajorGiving params={params} />; break;
    case "lists": title = "Lists"; subtitle = "Build and save segments"; addLabel = "New list"; body = <P.HostLists />; break;
    case "analysis": title = "Analysis"; subtitle = "Reports & dashboards"; body = <P.HostAnalysis />; break;
    case "marketing": title = "Marketing"; subtitle = "Email, appeals, and audiences"; body = <P.HostStub route="marketing" />; break;
    case "events": title = "Events"; subtitle = "Galas, tours, and cultivation"; body = <P.HostStub route="events" />; break;
    case "volunteers": title = "Volunteers"; subtitle = "Roster, hours, and roles"; body = <P.HostStub route="volunteers" />; break;
    case "memberships": title = "Memberships"; subtitle = "Tiers and renewals"; body = <P.HostStub route="memberships" />; break;
    case "settings": title = "Settings"; subtitle = "Configuration"; body = <P.HostSettings go={go} />; break;

    case "today": title = "Today"; subtitle = "Where your attention goes today"; addLabel = "Add prospect"; body = <P.Today go={go} />; break;
    case "mpl": title = "Master Prospect List"; subtitle = "One ranked list — people, companies, and foundations together"; addLabel = "Add prospect"; body = <P.Prospects route={route} go={go} />; break;
    case "candidates": title = "Prospects"; subtitle = "Off-list candidates from connector research"; addLabel = "Add prospect"; body = <P.Prospects route={route} go={go} />; break;
    case "prospect": { const p = D.prospects.find(x => x.id === params.id) || D.prospects[0]; title = p.name; subtitle = "The whole picture — and the next right move"; body = <P.ProspectDetail params={params} go={go} />; break; }
    case "greensheet": title = "Green Sheet"; subtitle = "Momentum, honestly kept"; body = <P.GreenSheet go={go} />; break;
    case "initiatives": title = "Initiatives"; subtitle = "Funding priorities — Today, Tomorrow, Forever"; addLabel = "Add initiative"; body = <P.Initiatives go={go} />; break;
    case "initiative": { const i = D.initiatives.find(x => x.id === params.id) || D.initiatives[0]; title = i.name; subtitle = "Funding priority"; body = <P.InitiativeDetail params={params} go={go} />; break; }
    case "settings95": title = "95 Forward settings"; subtitle = "Tune the score and the copilot"; body = <P.F95Settings go={go} />; break;
    default: title = "Home"; body = <P.HostHome go={go} />;
  }

  return (
    <div className="reg-host" style={{ display: "flex", minHeight: "100vh", background: f95 ? "var(--haze-50)" : "var(--bg-app)" }}>
      <Sidebar route={route} params={params} go={go} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh", background: f95 ? "var(--haze-50)" : "var(--bg-app)" }}>
        <Topbar title={title} subtitle={subtitle} register={f95 ? "f95" : "host"} addLabel={addLabel} onAdd={() => {}} copilotCount={f95 ? D.today.copilotCount : 0} go={go} />
        <div id="poc-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{body}</div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

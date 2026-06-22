import { Badge, Card, HorizonTag, Tabs } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import {
  getGreenSheetMetrics,
  type GreenSheetMetrics,
  type RmMetricsRow,
} from "@/server/data/green-sheet";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card pad="lg">
      <div className="f95-stat">
        <span className="f95-stat__label">{label}</span>
        <span className="f95-stat__value">{value}</span>
        {sub ? <span className="f95-stat__sub">{sub}</span> : null}
      </div>
    </Card>
  );
}

function OutcomeBars({ metrics }: { metrics: GreenSheetMetrics }) {
  const o = metrics.asksByOutcome;
  const max = Math.max(1, o.commitment, o.roadmap, o.decline);
  const bars = [
    { key: "commitment", label: "Commitment", count: o.commitment, tone: "success" as const },
    { key: "roadmap", label: "Roadmap", count: o.roadmap, tone: "info" as const },
    { key: "decline", label: "Decline", count: o.decline, tone: "neutral" as const },
  ];
  return (
    <Card>
      <div className="f95-stack f95-stack--sm" data-testid="asks-by-outcome">
        <h2 className="f95-section-title">Asks by outcome</h2>
        <span className="f95-deflist__desc--empty">
          A roadmap is a good outcome, not a failure.
        </span>
        <div className="f95-bars" role="img" aria-label="Asks by outcome">
          {bars.map((b) => (
            <div key={b.key} className="f95-bars__col">
              <div className="f95-bars__track">
                <div
                  className="f95-bars__fill"
                  style={{ height: `${Math.round((b.count / max) * 100)}%` }}
                />
              </div>
              <span className="f95-bars__amount">{b.count}</span>
              <Badge tone={b.tone}>{b.label}</Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function PipelineByHorizon({ metrics }: { metrics: GreenSheetMetrics }) {
  const p = metrics.pipelineByHorizon;
  const rows = [
    { horizon: "today" as const, count: p.today },
    { horizon: "tomorrow" as const, count: p.tomorrow },
    { horizon: "forever" as const, count: p.forever },
  ];
  return (
    <Card>
      <div className="f95-stack f95-stack--sm" data-testid="pipeline-by-horizon">
        <h2 className="f95-section-title">Pipeline by horizon</h2>
        <div className="f95-stack f95-stack--sm">
          {rows.map((r) => (
            <div key={r.horizon} className="f95-itemrow">
              <div className="f95-itemrow__body f95-cluster">
                <HorizonTag horizon={r.horizon} />
              </div>
              <span className="f95-stat__value">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ByRmTable({ rows }: { rows: RmMetricsRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <div className="f95-stack f95-stack--sm" data-testid="by-rm">
        <h2 className="f95-section-title">By relationship manager</h2>
        <div className="f95-table-wrap">
          <table className="f95-table">
            <thead>
              <tr>
                <th>Manager</th>
                <th className="f95-table__num">Top-33</th>
                <th className="f95-table__num">Visits / wk</th>
                <th className="f95-table__num">Asks / mo</th>
                <th className="f95-table__num">24h %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId}>
                  <td>{r.name}</td>
                  <td className="f95-table__num">{r.top33Coverage}</td>
                  <td className="f95-table__num">{r.visits}</td>
                  <td className="f95-table__num">{r.asks}</td>
                  <td className="f95-table__num">{r.followUpPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

export default async function GreenSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { scope: scopeParam } = await searchParams;
  const requested = scopeParam === "team" ? "team" : "me";
  const metrics = await getGreenSheetMetrics(
    { id: user.id, tenantId: user.tenantId, role: user.role },
    requested,
  );

  return (
    <>
      <Topbar title="Green Sheet" subtitle="95 Forward" />
      <div className="f95-page" data-testid="green-sheet">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward</div>
            <h1 className="f95-page__title">Green Sheet</h1>
            <p className="f95-page__count">
              Momentum made visible — activity and the 24-hour follow-up SLA.
            </p>
          </div>
          {metrics.canViewTeam ? (
            <div className="f95-page__actions">
              <Tabs
                label="Scope"
                active={metrics.scope}
                items={[
                  { id: "me", label: "Me", href: "/95-forward/green-sheet?scope=me" },
                  { id: "team", label: "Team", href: "/95-forward/green-sheet?scope=team" },
                ]}
              />
            </div>
          ) : null}
        </div>

        <div className="f95-statgrid" data-testid="green-sheet-stats">
          <Stat label="Visits this week" value={String(metrics.visitsThisWeek)} />
          <Stat label="Asks this month" value={String(metrics.asksThisMonth)} />
          <Stat
            label="24h follow-up"
            value={`${metrics.followUpCompliancePct}%`}
            sub="On-time completion"
          />
          <Stat
            label="Top-33 coverage"
            value={`${metrics.top33WithRmPct}%`}
            sub={`${metrics.top33WithStrategyPct}% with a strategy`}
          />
        </div>

        <OutcomeBars metrics={metrics} />
        <PipelineByHorizon metrics={metrics} />
        <ByRmTable rows={metrics.byRm} />
      </div>
    </>
  );
}

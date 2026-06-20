import { Badge, Card } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getCampaignProgress, type GoalRow } from "@/server/data/analysis";
import { progressBarWidthPercent } from "@/lib/analysis-metrics";
import { formatCurrencyFromCents } from "@/lib/format";
import { AnalysisNav } from "../AnalysisNav";

export const dynamic = "force-dynamic";

function GoalCard({ row }: { row: GoalRow }) {
  const { progress } = row;
  return (
    <Card pad="lg">
      <div className="f95-stack f95-stack--sm">
        <div className="f95-cluster">
          <h3 className="f95-section-title">{row.name}</h3>
          {progress.metGoal ? <Badge tone="success">Goal met</Badge> : null}
        </div>
        <div className="f95-progress f95-progress--lg">
          <div
            className="f95-progress__fill"
            style={{ width: `${progressBarWidthPercent(progress.percentToGoal)}%` }}
          />
        </div>
        <div className="f95-goalmeta">
          <span className="f95-goalmeta__pct">{progress.percentToGoal}% to goal</span>
          <span className="f95-stat__sub">
            {formatCurrencyFromCents(progress.raisedCents)} of{" "}
            {formatCurrencyFromCents(progress.goalCents)}
          </span>
        </div>
        <div className="f95-stat__sub">
          {progress.metGoal
            ? "Goal reached"
            : `${formatCurrencyFromCents(progress.remainingCents)} remaining`}
        </div>
      </div>
    </Card>
  );
}

export default async function CampaignProgressPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getCampaignProgress(user.tenantId);

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Analysis</div>
          <h1 className="f95-page__title">Campaign &amp; appeal progress</h1>
          <div className="f95-page__count">Goal versus raised across active efforts</div>
        </div>
      </div>

      <AnalysisNav active="campaign-progress" />

      <Card pad="lg">
        <h2 className="f95-section-title">Campaigns</h2>
        <span className="f95-stat__sub">Multi-year fundraising efforts</span>
        <div className="f95-tilegrid f95-tilegrid--wide" style={{ marginTop: "var(--space-3)" }}>
          {data.campaigns.length === 0 ? (
            <p className="f95-table__muted">No campaigns with a goal set.</p>
          ) : (
            data.campaigns.map((row) => <GoalCard key={row.id} row={row} />)
          )}
        </div>
      </Card>

      <Card pad="lg">
        <h2 className="f95-section-title">Appeals</h2>
        <span className="f95-stat__sub">Time-boxed solicitations</span>
        <div className="f95-tilegrid f95-tilegrid--wide" style={{ marginTop: "var(--space-3)" }}>
          {data.appeals.length === 0 ? (
            <p className="f95-table__muted">No appeals with a goal set.</p>
          ) : (
            data.appeals.map((row) => <GoalCard key={row.id} row={row} />)
          )}
        </div>
      </Card>
    </div>
  );
}

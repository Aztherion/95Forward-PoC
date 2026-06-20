import { Card } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getDonorRetention } from "@/server/data/analysis";
import { barHeightPercent } from "@/lib/dashboard-metrics";
import { AnalysisNav } from "../AnalysisNav";

export const dynamic = "force-dynamic";

export default async function DonorRetentionPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const data = await getDonorRetention(user.tenantId, now);

  const segments = [
    { key: "new", label: "New", count: data.newCount, sub: `First gift in ${data.currentYear}` },
    {
      key: "returning",
      label: "Returning",
      count: data.returningCount,
      sub: `Gave in ${data.currentYear} and earlier`,
    },
    {
      key: "lapsed",
      label: "Lapsed",
      count: data.lapsedCount,
      sub: `Gave before, not in ${data.currentYear}`,
    },
  ] as const;

  const maxCount = Math.max(data.newCount, data.returningCount, data.lapsedCount, 0);

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Analysis</div>
          <h1 className="f95-page__title">Donor retention</h1>
          <div className="f95-page__count">
            New, returning, and lapsed donors for {data.currentYear}
          </div>
        </div>
      </div>

      <AnalysisNav active="donor-retention" />

      <div className="f95-tilegrid">
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Active donors ({data.currentYear})</span>
            <span className="f95-stat__value">{data.activeDonors.toLocaleString("en-US")}</span>
            <span className="f95-stat__sub">New plus returning</span>
          </div>
        </Card>
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Total donors</span>
            <span className="f95-stat__value">{data.totalDonors.toLocaleString("en-US")}</span>
            <span className="f95-stat__sub">All donors with any gift</span>
          </div>
        </Card>
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Retention rate</span>
            <span className="f95-stat__value">{data.retentionRatePercent}%</span>
            <span className="f95-stat__sub">Prior donors who gave again</span>
          </div>
        </Card>
      </div>

      <Card pad="lg">
        <h2 className="f95-section-title">Donor segments</h2>
        <span className="f95-stat__sub">Counts by retention status</span>
        <div className="f95-bars" role="img" aria-label="Donor counts by retention segment">
          {segments.map((segment) => (
            <div key={segment.key} className="f95-bars__col">
              <div className="f95-bars__track">
                <div
                  className="f95-bars__fill"
                  style={{ height: `${barHeightPercent(segment.count, maxCount)}%` }}
                />
              </div>
              <span className="f95-bars__amount">{segment.count.toLocaleString("en-US")}</span>
              <span className="f95-bars__label">{segment.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card pad="lg">
        <h2 className="f95-section-title">Segment detail</h2>
        <div style={{ marginTop: "var(--space-2)" }}>
          {segments.map((segment) => (
            <div key={segment.key} className="f95-itemrow">
              <div className="f95-itemrow__body">
                <span className="f95-itemrow__title">{segment.label}</span>
                <div className="f95-itemrow__meta">
                  <span>{segment.sub}</span>
                </div>
              </div>
              <div className="f95-itemrow__actions">
                <span className="f95-stat__value" style={{ fontSize: "var(--fs-body)" }}>
                  {segment.count.toLocaleString("en-US")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

import { Card } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getFundraisingPerformance, type RankedTotal } from "@/server/data/analysis";
import { barHeightPercent, maxMonthlyTotal } from "@/lib/dashboard-metrics";
import { maxAmount } from "@/lib/analysis-metrics";
import { formatCurrencyFromCents } from "@/lib/format";
import { AnalysisNav } from "../AnalysisNav";

export const dynamic = "force-dynamic";

function RankedList({ items, empty }: { items: RankedTotal[]; empty: string }) {
  const max = maxAmount(items);
  if (items.length === 0) {
    return <p className="f95-table__muted">{empty}</p>;
  }
  return (
    <div className="f95-rankbars">
      {items.map((item) => (
        <div key={item.id} className="f95-rankbar">
          <div className="f95-rankbar__head">
            <span className="f95-rankbar__name">{item.name}</span>
            <span className="f95-rankbar__amount">{formatCurrencyFromCents(item.amountCents)}</span>
          </div>
          <div className="f95-progress">
            <div
              className="f95-progress__fill"
              style={{ width: `${barHeightPercent(item.amountCents, max)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function FundraisingPerformancePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const year = now.getUTCFullYear();
  const data = await getFundraisingPerformance(user.tenantId, now);
  const maxMonth = maxMonthlyTotal(data.monthlyTotals);

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Analysis</div>
          <h1 className="f95-page__title">Fundraising performance</h1>
          <div className="f95-page__count">Giving trends across all funds and campaigns</div>
        </div>
      </div>

      <AnalysisNav active="fundraising-performance" />

      <div className="f95-tilegrid">
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Total raised</span>
            <span className="f95-stat__value">
              {formatCurrencyFromCents(data.totalRaisedCents)}
            </span>
            <span className="f95-stat__sub">All recorded gifts</span>
          </div>
        </Card>
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Raised ({year})</span>
            <span className="f95-stat__value">{formatCurrencyFromCents(data.yearToDateCents)}</span>
            <span className="f95-stat__sub">Year to date</span>
          </div>
        </Card>
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Gifts</span>
            <span className="f95-stat__value">{data.giftCount.toLocaleString("en-US")}</span>
            <span className="f95-stat__sub">All recorded gifts</span>
          </div>
        </Card>
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Average gift</span>
            <span className="f95-stat__value">
              {formatCurrencyFromCents(data.averageGiftCents)}
            </span>
            <span className="f95-stat__sub">Across all gifts</span>
          </div>
        </Card>
      </div>

      <Card pad="lg">
        <h2 className="f95-section-title">Gifts by month</h2>
        <span className="f95-stat__sub">Last twelve months</span>
        <div className="f95-bars" role="img" aria-label="Gift totals for the last twelve months">
          {data.monthlyTotals.map((month) => (
            <div key={month.key} className="f95-bars__col">
              <div className="f95-bars__track">
                <div
                  className="f95-bars__fill"
                  style={{ height: `${barHeightPercent(month.amountCents, maxMonth)}%` }}
                />
              </div>
              <span className="f95-bars__label">{month.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="f95-tilegrid f95-tilegrid--wide">
        <Card pad="lg">
          <h2 className="f95-section-title">Top funds</h2>
          <span className="f95-stat__sub">By total raised</span>
          <div style={{ marginTop: "var(--space-3)" }}>
            <RankedList items={data.topFunds} empty="No fund-designated gifts yet." />
          </div>
        </Card>
        <Card pad="lg">
          <h2 className="f95-section-title">Top campaigns</h2>
          <span className="f95-stat__sub">By total raised</span>
          <div style={{ marginTop: "var(--space-3)" }}>
            <RankedList items={data.topCampaigns} empty="No campaign-attributed gifts yet." />
          </div>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge, Button, Card, Mark } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/server/data/dashboard";
import { barHeightPercent, maxMonthlyTotal } from "@/lib/dashboard-metrics";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const data = await getDashboardData(user.tenantId, now);
  const maxMonth = maxMonthlyTotal(data.monthlyTotals);
  const year = now.getUTCFullYear();

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">Home</h1>
          <div className="f95-page__count">Water For People · {year} overview</div>
        </div>
      </div>

      <div className="f95-tilegrid">
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Total raised ({year})</span>
            <span className="f95-stat__value">
              {formatCurrencyFromCents(data.stats.totalRaisedCents)}
            </span>
            <span className="f95-stat__sub">Across all funds and campaigns</span>
          </div>
        </Card>
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Gifts ({year})</span>
            <span className="f95-stat__value">{data.stats.giftCount.toLocaleString("en-US")}</span>
            <span className="f95-stat__sub">Recorded this year</span>
          </div>
        </Card>
        <Card pad="lg">
          <div className="f95-stat">
            <span className="f95-stat__label">Donors ({year})</span>
            <span className="f95-stat__value">{data.stats.donorCount.toLocaleString("en-US")}</span>
            <span className="f95-stat__sub">Distinct constituents giving</span>
          </div>
        </Card>

        <Card pad="lg" aria-label="Major-gift likelihood">
          <div className="f95-foil">
            <span className="f95-foil__mark" aria-hidden="true">
              <Sparkles size={20} strokeWidth={1.8} />
            </span>
            <div className="f95-foil__body">
              <span className="f95-foil__label">
                Major-gift likelihood
                <Badge tone="neutral" style={{ marginLeft: "var(--space-2)" }}>
                  AI
                </Badge>
              </span>
              {data.majorGiftLikelihoodCount > 0 ? (
                <>
                  <span className="f95-foil__value">{data.majorGiftLikelihoodCount}</span>
                  <span className="f95-stat__sub">donors trending toward a major gift</span>
                </>
              ) : (
                <span className="f95-foil__value--empty">No signals right now</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="f95-tilegrid f95-tilegrid--wide">
        <Card pad="lg">
          <h2 className="f95-section-title">Recent gifts</h2>
          <div style={{ marginTop: "var(--space-2)" }}>
            {data.recentGifts.length === 0 ? (
              <p className="f95-table__muted">No gifts recorded yet.</p>
            ) : (
              data.recentGifts.map((gift) => (
                <div key={gift.id} className="f95-itemrow">
                  <div className="f95-itemrow__body">
                    <Link
                      href={`/constituents/${gift.constituentId}`}
                      className="f95-itemrow__title f95-table__cell-link"
                    >
                      {gift.donorName}
                    </Link>
                    <div className="f95-itemrow__meta">
                      <span>{titleCaseFromSnake(gift.giftType)}</span>
                      <span>·</span>
                      <span>{formatDate(gift.giftDate)}</span>
                    </div>
                  </div>
                  <div className="f95-itemrow__actions">
                    <span className="f95-stat__value" style={{ fontSize: "var(--fs-body)" }}>
                      {formatCurrencyFromCents(gift.amountCents)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card pad="lg">
          <h2 className="f95-section-title">Recent activity</h2>
          <div style={{ marginTop: "var(--space-2)" }}>
            {data.recentActivity.length === 0 ? (
              <p className="f95-table__muted">No actions logged yet.</p>
            ) : (
              data.recentActivity.map((activity) => (
                <div key={activity.id} className="f95-itemrow">
                  <div className="f95-itemrow__body">
                    <Link
                      href={`/constituents/${activity.constituentId}`}
                      className="f95-itemrow__title f95-table__cell-link"
                    >
                      {activity.constituentName}
                    </Link>
                    <div className="f95-itemrow__meta">
                      <span>{titleCaseFromSnake(activity.type)}</span>
                      <span>·</span>
                      <span>{formatDate(activity.occurredAt)}</span>
                      <span>·</span>
                      <span>{activity.ownerName ?? "Unassigned"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="f95-tilegrid f95-tilegrid--wide">
        <Card pad="lg">
          <h2 className="f95-section-title">Gifts by month</h2>
          <span className="f95-stat__sub">Last six months</span>
          <div className="f95-bars" role="img" aria-label="Gift totals for the last six months">
            {data.monthlyTotals.map((month) => (
              <div key={month.key} className="f95-bars__col">
                <div className="f95-bars__track">
                  <div
                    className="f95-bars__fill"
                    style={{ height: `${barHeightPercent(month.amountCents, maxMonth)}%` }}
                  />
                </div>
                <span className="f95-bars__amount">
                  {formatCurrencyFromCents(month.amountCents)}
                </span>
                <span className="f95-bars__label">{month.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card pad="lg" tone="sunk">
          <div className="f95-promo">
            <span className="f95-promo__mark" aria-hidden="true">
              <Mark size={36} />
            </span>
            <div className="f95-stack f95-stack--sm">
              <h2 className="f95-section-title">95 Forward</h2>
              <p className="f95-stat__sub">
                Your major-gifts workspace. Focused prospects, scored and explained.
              </p>
              <div>
                <Link href="/95-forward/today">
                  <Button
                    variant="secondary"
                    size="sm"
                    iconRight={<ArrowUpRight size={15} strokeWidth={1.8} />}
                  >
                    Open
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

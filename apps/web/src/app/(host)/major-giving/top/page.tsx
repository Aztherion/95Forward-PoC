import Link from "next/link";
import { Target } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getTopOpportunities } from "@/server/data/opportunities";
import { formatCurrencyFromCents, titleCaseFromSnake } from "@/lib/format";
import { MajorGivingNav } from "../MajorGivingNav";
import { LikelihoodFoil } from "../LikelihoodFoil";

export const dynamic = "force-dynamic";

const TOP_LIMIT = 20;

export default async function TopOpportunitiesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await getTopOpportunities(user.tenantId, TOP_LIMIT);

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">Top 20</h1>
          <div className="f95-page__count">
            The largest potential gifts by ask — stage and likelihood at a glance
          </div>
        </div>
      </div>

      <MajorGivingNav active="top" />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Target size={20} strokeWidth={1.8} />}
          title="No opportunities yet"
          line="Open your first opportunity to start the major-giving pipeline."
        />
      ) : (
        <div>
          {rows.map((row, index) => (
            <div className="f95-itemrow" key={row.id}>
              <div className="f95-itemrow__body">
                <span className="f95-itemrow__title">
                  <span className="f95-table__muted">{index + 1}. </span>
                  <Link
                    href={`/constituents/${row.constituentId}`}
                    className="f95-table__cell-link"
                  >
                    {row.constituentName}
                  </Link>
                </span>
                <span className="f95-itemrow__meta">
                  <span>{titleCaseFromSnake(row.stage)}</span>
                  <span>· Ask {formatCurrencyFromCents(row.askAmountCents)}</span>
                  <span>· </span>
                  <LikelihoodFoil likelihoodPct={row.likelihoodPct} />
                </span>
              </div>
              <div className="f95-itemrow__actions">
                <Link
                  href={`/major-giving/opportunities/${row.id}`}
                  className="f95-table__cell-link"
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

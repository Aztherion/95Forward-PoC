import Link from "next/link";
import { Briefcase } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getPortfolioOpportunities } from "@/server/data/portfolio";
import { listUsers } from "@/server/data/reference";
import { computePortfolioStats, type OpportunityStage } from "@/lib/opportunity-params";
import type { RawSearchParams } from "@/lib/list-params";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";
import { MajorGivingNav } from "../MajorGivingNav";
import { PortfolioOfficerPicker } from "../PortfolioOfficerPicker";
import { LikelihoodFoil } from "../LikelihoodFoil";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const owners = await listUsers(user.tenantId);

  const requestedOwner = first(raw.owner);
  const selectedId =
    requestedOwner && owners.some((o) => o.id === requestedOwner) ? requestedOwner : user.id;
  const selectedName = owners.find((o) => o.id === selectedId)?.name ?? "This officer";

  const rows = await getPortfolioOpportunities(user.tenantId, selectedId);
  const stats = computePortfolioStats(
    rows.map((row) => ({
      stage: row.stage as OpportunityStage,
      askAmountCents: row.askAmountCents,
    })),
  );

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">Portfolio</h1>
          <div className="f95-page__count">
            {selectedName} ·{" "}
            {stats.totalCount === 1 ? "1 opportunity" : `${stats.totalCount} opportunities`}
          </div>
        </div>
      </div>

      <MajorGivingNav active="portfolio" />

      <PortfolioOfficerPicker owners={owners} selectedId={selectedId} />

      <div className="f95-statgrid">
        <div className="f95-stat">
          <span className="f95-stat__label">Total ask</span>
          <span className="f95-stat__value">{formatCurrencyFromCents(stats.totalAskCents)}</span>
          <span className="f95-stat__sub">Across all stages</span>
        </div>
        {stats.byStage.map((entry) => (
          <div className="f95-stat" key={entry.stage}>
            <span className="f95-stat__label">{titleCaseFromSnake(entry.stage)}</span>
            <span className="f95-stat__value">{entry.count}</span>
            <span className="f95-stat__sub">
              {formatCurrencyFromCents(entry.totalAskCents)} ask
            </span>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={20} strokeWidth={1.8} />}
          title="No assigned opportunities"
          line={`${selectedName} has no opportunities in their book of business yet.`}
        />
      ) : (
        <div>
          {rows.map((row) => (
            <div className="f95-itemrow" key={row.id}>
              <div className="f95-itemrow__body">
                <span className="f95-itemrow__title">
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
                  <span>· Expected {formatCurrencyFromCents(row.expectedAmountCents)}</span>
                  <span>· Close {formatDate(row.expectedCloseDate)}</span>
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

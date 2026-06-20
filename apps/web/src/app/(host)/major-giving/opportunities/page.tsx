import Link from "next/link";
import { Plus, Target } from "lucide-react";
import { Button, EmptyState } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunitiesList } from "@/server/data/opportunities";
import { listUsers } from "@/server/data/reference";
import {
  computeStageSummaries,
  hasActiveOpportunityFilters,
  parseOpportunityListParams,
  type OpportunityStage,
} from "@/lib/opportunity-params";
import { OPPORTUNITY_STAGES } from "@95forward/shared";
import type { RawSearchParams } from "@/lib/list-params";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";
import { MajorGivingNav } from "../MajorGivingNav";
import { OpportunityFilterBar } from "../OpportunityFilterBar";
import { LikelihoodFoil } from "../LikelihoodFoil";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const params = parseOpportunityListParams(raw);

  const [rows, owners] = await Promise.all([
    getOpportunitiesList(user.tenantId, params),
    listUsers(user.tenantId),
  ]);

  const summaries = computeStageSummaries(
    rows.map((row) => ({
      stage: row.stage as OpportunityStage,
      askAmountCents: row.askAmountCents,
    })),
  );
  const summaryByStage = new Map(summaries.map((s) => [s.stage, s]));

  const visibleStages: readonly OpportunityStage[] = params.stage
    ? [params.stage]
    : OPPORTUNITY_STAGES;

  const total = rows.length;
  const filtered = hasActiveOpportunityFilters(params);

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">Opportunities</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 opportunity" : `${total} opportunities`}
            {filtered ? " · filtered" : ""}
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href="/major-giving/opportunities/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              New opportunity
            </Button>
          </Link>
        </div>
      </div>

      <MajorGivingNav active="opportunities" />

      <OpportunityFilterBar owners={owners} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Target size={20} strokeWidth={1.8} />}
          title="No opportunities here yet"
          line={
            filtered
              ? "No opportunities match these filters. Clear a filter to widen the pipeline."
              : "Open your first opportunity to start the major-giving pipeline."
          }
          action={
            <Link href="/major-giving/opportunities/new">
              <Button variant="secondary" size="sm">
                New opportunity
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="f95-mg-pipeline">
          {visibleStages.map((stage) => {
            const stageRows = rows.filter((row) => row.stage === stage);
            const summary = summaryByStage.get(stage);
            return (
              <section key={stage} aria-label={titleCaseFromSnake(stage)}>
                <div className="f95-mg-stage__head">
                  <h2 className="f95-mg-stage__title">{titleCaseFromSnake(stage)}</h2>
                  <span className="f95-mg-stage__summary">
                    {summary?.count ?? 0}
                    {(summary?.count ?? 0) === 1 ? " opportunity" : " opportunities"} ·{" "}
                    {formatCurrencyFromCents(summary?.totalAskCents ?? 0)} ask
                  </span>
                </div>
                {stageRows.length === 0 ? (
                  <div className="f95-itemrow">
                    <div className="f95-itemrow__body">
                      <span className="f95-table__muted">No opportunities in this stage.</span>
                    </div>
                  </div>
                ) : (
                  stageRows.map((row) => (
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
                          <span>Ask {formatCurrencyFromCents(row.askAmountCents)}</span>
                          <span>· Expected {formatCurrencyFromCents(row.expectedAmountCents)}</span>
                          <span>· Close {formatDate(row.expectedCloseDate)}</span>
                          <span>· {row.ownerName ?? "Unassigned"}</span>
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
                  ))
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

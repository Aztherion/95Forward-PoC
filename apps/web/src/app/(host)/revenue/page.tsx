import Link from "next/link";
import { Coins, Plus } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, Pagination } from "@/components/ds";
import type { BadgeTone, DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getGiftsList, type GiftListRow } from "@/server/data/gifts";
import { listRevenueRefs } from "@/server/data/revenue-config";
import {
  GIFTS_PAGE_SIZE,
  giftParamsToSearch,
  hasActiveGiftFilters,
  parseGiftListParams,
  type GiftListParams,
} from "@/lib/gift-params";
import type { RawSearchParams } from "@/lib/list-params";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";
import { FilterBar } from "./FilterBar";
import { RevenueNav } from "./RevenueNav";

export const dynamic = "force-dynamic";

function receiptTone(status: string | null): BadgeTone {
  return status === "receipted" ? "success" : "neutral";
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const params = parseGiftListParams(raw);

  const [{ rows, total, summary }, refs] = await Promise.all([
    getGiftsList(user.tenantId, params),
    listRevenueRefs(user.tenantId),
  ]);

  function buildSortHref(field: string, dir: "asc" | "desc"): string {
    const next: GiftListParams = {
      ...params,
      sort: field as GiftListParams["sort"],
      dir,
      page: 1,
    };
    const qs = giftParamsToSearch(next).toString();
    return `/revenue${qs ? `?${qs}` : ""}`;
  }

  function buildPageHref(page: number): string {
    const qs = giftParamsToSearch({ ...params, page }).toString();
    return `/revenue${qs ? `?${qs}` : ""}`;
  }

  const columns: DataTableColumn<GiftListRow>[] = [
    {
      key: "donor",
      header: "Donor",
      sortKey: "donor",
      cell: (row) => (
        <Link href={`/constituents/${row.constituentId}`} className="f95-table__cell-link">
          {row.donorName}
        </Link>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortKey: "amount",
      align: "right",
      cell: (row) => formatCurrencyFromCents(row.amountCents),
    },
    {
      key: "date",
      header: "Date",
      sortKey: "giftDate",
      cell: (row) => formatDate(row.giftDate),
    },
    {
      key: "fund",
      header: "Fund",
      sortKey: "fund",
      cell: (row) => row.fundName ?? <span className="f95-table__muted">—</span>,
    },
    {
      key: "campaign",
      header: "Campaign",
      sortKey: "campaign",
      cell: (row) => row.campaignName ?? <span className="f95-table__muted">—</span>,
    },
    {
      key: "appeal",
      header: "Appeal",
      sortKey: "appeal",
      cell: (row) => row.appealName ?? <span className="f95-table__muted">—</span>,
    },
    {
      key: "giftType",
      header: "Gift type",
      sortKey: "giftType",
      cell: (row) => <Badge tone="neutral">{titleCaseFromSnake(row.giftType)}</Badge>,
    },
    {
      key: "receipt",
      header: "Receipt status",
      sortKey: "receiptStatus",
      cell: (row) => (
        <Badge tone={receiptTone(row.receiptStatus)}>
          {titleCaseFromSnake(row.receiptStatus ?? "unreceipted")}
        </Badge>
      ),
    },
    {
      key: "manage",
      header: "",
      align: "right",
      cell: (row) => (
        <Link href={`/revenue/${row.id}`} className="f95-table__cell-link">
          Open
        </Link>
      ),
    },
  ];

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">Revenue</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 gift" : `${total} gifts`}
            {hasActiveGiftFilters(params) ? " · filtered" : ""}
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href="/revenue/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              Record a gift
            </Button>
          </Link>
        </div>
      </div>

      <RevenueNav active="gifts" />

      <div className="f95-statgrid">
        <div className="f95-stat">
          <span className="f95-stat__label">Total raised</span>
          <span className="f95-stat__value">
            {formatCurrencyFromCents(summary.totalRaisedCents)}
          </span>
          <span className="f95-stat__sub">
            {hasActiveGiftFilters(params) ? "Current filter" : "All gifts"}
          </span>
        </div>
        <div className="f95-stat">
          <span className="f95-stat__label">Gifts</span>
          <span className="f95-stat__value">{summary.giftCount}</span>
          <span className="f95-stat__sub">Records counted</span>
        </div>
        <div className="f95-stat">
          <span className="f95-stat__label">Average gift</span>
          <span className="f95-stat__value">
            {formatCurrencyFromCents(summary.averageGiftCents)}
          </span>
          <span className="f95-stat__sub">Per gift</span>
        </div>
      </div>

      <FilterBar funds={refs.funds} campaigns={refs.campaigns} appeals={refs.appeals} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Coins size={20} strokeWidth={1.8} />}
          title="No gifts here yet"
          line={
            hasActiveGiftFilters(params)
              ? "No gifts match these filters. Try widening the date range or clearing a filter."
              : "Record your first gift to start the revenue register."
          }
          action={
            <Link href="/revenue/new">
              <Button variant="secondary" size="sm">
                Record a gift
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            sort={{ field: params.sort, dir: params.dir, buildHref: buildSortHref }}
          />
          <Pagination
            page={params.page}
            pageSize={GIFTS_PAGE_SIZE}
            total={total}
            buildHref={buildPageHref}
          />
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { Droplets } from "lucide-react";
import { DataTable, EmptyState } from "@/components/ds";
import type { DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getWavemakerSupporters, type WavemakerSupporterRow } from "@/server/data/memberships";
import { formatCurrencyFromCents } from "@/lib/format";
import { formatTenure } from "@/lib/wavemaker";
import { todayIso } from "@/lib/membership-params";
import { MembershipsNav } from "../MembershipsNav";

export const dynamic = "force-dynamic";

const columns: DataTableColumn<WavemakerSupporterRow>[] = [
  {
    key: "constituent",
    header: "Supporter",
    cell: (row) => (
      <Link href={`/constituents/${row.constituentId}`} className="f95-table__cell-link">
        {row.constituentName}
      </Link>
    ),
  },
  {
    key: "monthly",
    header: "Monthly gift",
    align: "right",
    cell: (row) =>
      row.monthlyAmountCents > 0 ? (
        formatCurrencyFromCents(row.monthlyAmountCents)
      ) : (
        <span className="f95-table__muted">—</span>
      ),
  },
  {
    key: "tenure",
    header: "Tenure",
    cell: (row) => formatTenure(row.tenureMonths),
  },
  {
    key: "gifts",
    header: "Recurring gifts",
    align: "right",
    cell: (row) => String(row.recurringGiftCount),
  },
  {
    key: "total",
    header: "Total given",
    align: "right",
    cell: (row) => formatCurrencyFromCents(row.totalGivenCents),
  },
];

export default async function WavemakerPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await getWavemakerSupporters(user.tenantId, todayIso());
  const total = rows.length;

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Memberships</div>
          <h1 className="f95-page__title">Wavemakers</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 monthly supporter" : `${total} monthly supporters`}
          </div>
        </div>
      </div>

      <MembershipsNav active="wavemaker" />

      {total === 0 ? (
        <EmptyState
          icon={<Droplets size={20} strokeWidth={1.8} />}
          title="No recurring supporters yet"
          line="Wavemakers are your monthly, recurring givers. As recurring gifts come in, supporters appear here."
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.constituentId} />
      )}
    </div>
  );
}

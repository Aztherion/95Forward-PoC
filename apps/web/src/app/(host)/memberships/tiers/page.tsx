import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { Button, DataTable, EmptyState } from "@/components/ds";
import type { DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getTiersList, type TierListRow } from "@/server/data/memberships";
import { formatCurrencyFromCents } from "@/lib/format";
import { MembershipsNav } from "../MembershipsNav";

export const dynamic = "force-dynamic";

const columns: DataTableColumn<TierListRow>[] = [
  {
    key: "name",
    header: "Tier",
    cell: (row) => (
      <Link href={`/memberships/tiers/${row.id}/edit`} className="f95-table__cell-link">
        {row.name}
      </Link>
    ),
  },
  {
    key: "level",
    header: "Level",
    align: "right",
    cell: (row) =>
      row.level !== null ? String(row.level) : <span className="f95-table__muted">—</span>,
  },
  {
    key: "dues",
    header: "Annual dues",
    align: "right",
    cell: (row) =>
      row.amountCents !== null ? (
        formatCurrencyFromCents(row.amountCents)
      ) : (
        <span className="f95-table__muted">—</span>
      ),
  },
  {
    key: "members",
    header: "Members",
    align: "right",
    cell: (row) => String(row.memberCount),
  },
  {
    key: "edit",
    header: "",
    align: "right",
    cell: (row) => (
      <Link href={`/memberships/tiers/${row.id}/edit`} className="f95-table__cell-link">
        Edit
      </Link>
    ),
  },
];

export default async function TiersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await getTiersList(user.tenantId);
  const total = rows.length;

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Memberships</div>
          <h1 className="f95-page__title">Tiers</h1>
          <div className="f95-page__count">{total === 1 ? "1 tier" : `${total} tiers`}</div>
        </div>
        <div className="f95-page__actions">
          <Link href="/memberships/tiers/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              New tier
            </Button>
          </Link>
        </div>
      </div>

      <MembershipsNav active="tiers" />

      {total === 0 ? (
        <EmptyState
          icon={<Layers size={20} strokeWidth={1.8} />}
          title="No tiers yet"
          line="Define your membership tiers — name, level, dues, and benefits — to start enrolling members."
          action={
            <Link href="/memberships/tiers/new">
              <Button variant="secondary" size="sm">
                New tier
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
      )}
    </div>
  );
}

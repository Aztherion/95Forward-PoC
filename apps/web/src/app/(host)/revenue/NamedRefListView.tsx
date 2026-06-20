import Link from "next/link";
import { Plus, Tags } from "lucide-react";
import { Button, DataTable, EmptyState } from "@/components/ds";
import type { DataTableColumn } from "@/components/ds";
import { formatDate } from "@/lib/format";
import type { NamedRefRow } from "@/server/data/revenue-config";
import type { EntityMeta } from "./entity-config";
import { RevenueNav } from "./RevenueNav";

export function NamedRefListView({ meta, rows }: { meta: EntityMeta; rows: NamedRefRow[] }) {
  const columns: DataTableColumn<NamedRefRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <Link href={`${meta.basePath}/${row.id}/edit`} className="f95-table__cell-link">
          {row.name}
        </Link>
      ),
    },
    {
      key: "code",
      header: "Code",
      cell: (row) => row.code ?? <span className="f95-table__muted">—</span>,
    },
    {
      key: "start",
      header: "Start",
      cell: (row) =>
        row.startDate ? formatDate(row.startDate) : <span className="f95-table__muted">—</span>,
    },
    {
      key: "end",
      header: "End",
      cell: (row) =>
        row.endDate ? formatDate(row.endDate) : <span className="f95-table__muted">—</span>,
    },
    {
      key: "gifts",
      header: "Gifts",
      align: "right",
      cell: (row) => row.giftCount,
    },
  ];

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">{meta.plural}</h1>
          <div className="f95-page__count">
            {rows.length === 1 ? "1 record" : `${rows.length} records`}
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href={`${meta.basePath}/new`}>
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              New {meta.singular.toLowerCase()}
            </Button>
          </Link>
        </div>
      </div>

      <RevenueNav active={meta.section} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Tags size={20} strokeWidth={1.8} />}
          title={`No ${meta.plural.toLowerCase()} yet`}
          line={`Create your first ${meta.singular.toLowerCase()} to designate gifts against it.`}
          action={
            <Link href={`${meta.basePath}/new`}>
              <Button variant="secondary" size="sm">
                New {meta.singular.toLowerCase()}
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

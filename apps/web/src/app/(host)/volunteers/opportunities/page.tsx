import Link from "next/link";
import { CalendarRange, Plus } from "lucide-react";
import { Button, DataTable, EmptyState } from "@/components/ds";
import type { DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunitiesList, type OpportunityListRow } from "@/server/data/volunteers";
import { formatDate } from "@/lib/format";
import { VolunteersNav } from "../VolunteersNav";

export const dynamic = "force-dynamic";

const columns: DataTableColumn<OpportunityListRow>[] = [
  {
    key: "name",
    header: "Opportunity",
    cell: (row) => (
      <Link href={`/volunteers/opportunities/${row.id}`} className="f95-table__cell-link">
        {row.name}
      </Link>
    ),
  },
  {
    key: "date",
    header: "Date",
    cell: (row) =>
      row.startsAt ? formatDate(row.startsAt) : <span className="f95-table__muted">No date</span>,
  },
  {
    key: "location",
    header: "Location",
    cell: (row) => row.location ?? <span className="f95-table__muted">—</span>,
  },
  {
    key: "capacity",
    header: "Capacity",
    align: "right",
    cell: (row) => row.capacity ?? <span className="f95-table__muted">—</span>,
  },
  {
    key: "totalHours",
    header: "Hours logged",
    align: "right",
    cell: (row) => row.totalHours.toFixed(2),
  },
  {
    key: "open",
    header: "",
    align: "right",
    cell: (row) => (
      <Link href={`/volunteers/opportunities/${row.id}`} className="f95-table__cell-link">
        Open
      </Link>
    ),
  },
];

export default async function OpportunitiesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await getOpportunitiesList(user.tenantId);
  const total = rows.length;

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Volunteers</div>
          <h1 className="f95-page__title">Opportunities</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 opportunity" : `${total} opportunities`}
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href="/volunteers/opportunities/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              New opportunity
            </Button>
          </Link>
        </div>
      </div>

      <VolunteersNav active="opportunities" />

      {total === 0 ? (
        <EmptyState
          icon={<CalendarRange size={20} strokeWidth={1.8} />}
          title="No opportunities yet"
          line="Create a volunteer opportunity to start tracking who shows up and the hours they give."
          action={
            <Link href="/volunteers/opportunities/new">
              <Button variant="secondary" size="sm">
                New opportunity
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

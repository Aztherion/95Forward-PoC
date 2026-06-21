import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { DataTable, EmptyState } from "@/components/ds";
import type { DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getVolunteerRoster, type VolunteerRosterRow } from "@/server/data/volunteers";
import { listConstituentRefs } from "@/server/data/reference";
import { formatDate } from "@/lib/format";
import type { RawSearchParams } from "@/lib/list-params";
import { VolunteersNav } from "../VolunteersNav";
import { MarkVolunteerForm } from "./MarkVolunteerForm";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const columns: DataTableColumn<VolunteerRosterRow>[] = [
  {
    key: "name",
    header: "Volunteer",
    cell: (row) => (
      <Link href={`/constituents/${row.id}`} className="f95-table__cell-link">
        {row.name}
      </Link>
    ),
  },
  {
    key: "totalHours",
    header: "Total hours",
    align: "right",
    cell: (row) => row.totalHours.toFixed(2),
  },
  {
    key: "opportunities",
    header: "Opportunities",
    align: "right",
    cell: (row) => row.opportunityCount,
  },
  {
    key: "lastActivity",
    header: "Last activity",
    cell: (row) =>
      row.lastActivity ? (
        formatDate(row.lastActivity)
      ) : (
        <span className="f95-table__muted">No hours yet</span>
      ),
  },
];

export default async function VolunteerRosterPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const search = first(raw.search).trim();

  const [rows, constituents] = await Promise.all([
    getVolunteerRoster(user.tenantId, search),
    listConstituentRefs(user.tenantId),
  ]);
  const total = rows.length;

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Volunteers</div>
          <h1 className="f95-page__title">Roster</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 volunteer" : `${total} volunteers`}
            {search ? " · filtered" : ""}
          </div>
        </div>
      </div>

      <VolunteersNav active="roster" />

      <MarkVolunteerForm constituents={constituents} />

      {total === 0 ? (
        <EmptyState
          icon={<HeartHandshake size={20} strokeWidth={1.8} />}
          title={search ? "No volunteers match your search" : "No volunteers yet"}
          line={
            search
              ? "Try a different name, or mark a constituent as a volunteer to add them."
              : "Mark a constituent as a volunteer or log their hours to build your roster."
          }
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
      )}
    </div>
  );
}

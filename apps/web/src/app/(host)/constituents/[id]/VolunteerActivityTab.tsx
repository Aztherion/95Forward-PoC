import Link from "next/link";
import { DataTable } from "@/components/ds";
import type { DataTableColumn } from "@/components/ds";
import type { ConstituentVolunteerActivity } from "@/server/data/volunteers";
import { formatDate } from "@/lib/format";

export interface VolunteerActivityTabProps {
  activity: ConstituentVolunteerActivity;
}

type ActivityEntry = ConstituentVolunteerActivity["entries"][number];

const columns: DataTableColumn<ActivityEntry>[] = [
  {
    key: "opportunity",
    header: "Opportunity",
    cell: (row) => (
      <Link
        href={`/volunteers/opportunities/${row.opportunityId}`}
        className="f95-table__cell-link"
      >
        {row.opportunityName}
      </Link>
    ),
  },
  {
    key: "hours",
    header: "Hours",
    align: "right",
    cell: (row) => row.hours.toFixed(2),
  },
  { key: "date", header: "Date", cell: (row) => formatDate(row.loggedDate) },
];

export function VolunteerActivityTab({ activity }: VolunteerActivityTabProps) {
  return (
    <div className="f95-stack">
      <div className="f95-cluster">
        <h2 className="f95-section-title">Volunteer activity</h2>
      </div>

      <div className="f95-statgrid">
        <div className="f95-stat">
          <span className="f95-stat__label">Total hours</span>
          <span className="f95-stat__value">{activity.totalHours.toFixed(2)}</span>
          <span className="f95-stat__sub">Across all opportunities</span>
        </div>
      </div>

      {activity.entries.length === 0 ? (
        <p className="f95-deflist__desc--empty">
          No volunteer hours yet — log time against an opportunity to see it here.
        </p>
      ) : (
        <DataTable columns={columns} rows={activity.entries} rowKey={(row) => row.id} />
      )}
    </div>
  );
}

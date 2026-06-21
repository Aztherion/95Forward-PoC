import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Badge, Button, DataTable, EmptyState } from "@/components/ds";
import type { DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getMembersList, type MembershipListRow } from "@/server/data/memberships";
import { formatDate } from "@/lib/format";
import { membershipStatusLabel, membershipStatusTone } from "@/lib/membership-params";
import { MembershipsNav } from "../MembershipsNav";

export const dynamic = "force-dynamic";

const columns: DataTableColumn<MembershipListRow>[] = [
  {
    key: "constituent",
    header: "Member",
    cell: (row) => (
      <Link href={`/constituents/${row.constituentId}`} className="f95-table__cell-link">
        {row.constituentName}
      </Link>
    ),
  },
  {
    key: "tier",
    header: "Tier",
    cell: (row) => row.tierName,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge tone={membershipStatusTone(row.status)}>{membershipStatusLabel(row.status)}</Badge>
    ),
  },
  { key: "start", header: "Started", cell: (row) => formatDate(row.startDate) },
  { key: "renewal", header: "Renews", cell: (row) => formatDate(row.renewalDate) },
  {
    key: "open",
    header: "",
    align: "right",
    cell: (row) => (
      <Link href={`/memberships/members/${row.id}`} className="f95-table__cell-link">
        Open
      </Link>
    ),
  },
];

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await getMembersList(user.tenantId);
  const total = rows.length;

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Memberships</div>
          <h1 className="f95-page__title">Members</h1>
          <div className="f95-page__count">{total === 1 ? "1 member" : `${total} members`}</div>
        </div>
        <div className="f95-page__actions">
          <Link href="/memberships/members/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              New membership
            </Button>
          </Link>
        </div>
      </div>

      <MembershipsNav active="members" />

      {total === 0 ? (
        <EmptyState
          icon={<Users size={20} strokeWidth={1.8} />}
          title="No members yet"
          line="Enroll your first member by assigning a constituent to a tier."
          action={
            <Link href="/memberships/members/new">
              <Button variant="secondary" size="sm">
                New membership
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

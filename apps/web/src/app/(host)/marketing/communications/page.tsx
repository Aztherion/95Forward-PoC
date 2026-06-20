import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { Badge, Button, DataTable, EmptyState } from "@/components/ds";
import type { BadgeTone, DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { listCommunications, type CommunicationRow } from "@/server/data/communications";
import { formatDate, titleCaseFromSnake } from "@/lib/format";
import { MarketingNav } from "../MarketingNav";

export const dynamic = "force-dynamic";

function statusTone(status: string): BadgeTone {
  switch (status) {
    case "sent":
      return "success";
    case "scheduled":
      return "info";
    default:
      return "neutral";
  }
}

const columns: DataTableColumn<CommunicationRow>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <Link href={`/marketing/communications/${row.id}`} className="f95-table__cell-link">
        {row.name}
      </Link>
    ),
  },
  {
    key: "channel",
    header: "Channel",
    cell: (row) => <Badge tone="neutral">{titleCaseFromSnake(row.channel)}</Badge>,
  },
  {
    key: "segment",
    header: "Segment",
    cell: (row) => row.segmentName ?? <span className="f95-table__muted">No segment</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <Badge tone={statusTone(row.status)}>{titleCaseFromSnake(row.status)}</Badge>,
  },
  {
    key: "when",
    header: "Scheduled / sent",
    cell: (row) =>
      row.status === "sent" ? (
        formatDate(row.sentAt)
      ) : row.status === "scheduled" ? (
        formatDate(row.scheduledAt)
      ) : (
        <span className="f95-table__muted">—</span>
      ),
  },
  {
    key: "manage",
    header: "",
    align: "right",
    cell: (row) => (
      <Link href={`/marketing/communications/${row.id}`} className="f95-table__cell-link">
        Open
      </Link>
    ),
  },
];

export default async function CommunicationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await listCommunications(user.tenantId);
  const total = rows.length;

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Marketing</div>
          <h1 className="f95-page__title">Communications</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 communication" : `${total} communications`}
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href="/marketing/communications/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              New communication
            </Button>
          </Link>
        </div>
      </div>

      <MarketingNav active="communications" />

      {total === 0 ? (
        <EmptyState
          icon={<Megaphone size={20} strokeWidth={1.8} />}
          title="No communications yet"
          line="Draft an email or appeal to a segment, then send it when you&rsquo;re ready."
          action={
            <Link href="/marketing/communications/new">
              <Button variant="secondary" size="sm">
                New communication
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

import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Badge, Button, DataTable, EmptyState } from "@/components/ds";
import type { BadgeTone, DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getProposalsList, type ProposalListRow } from "@/server/data/proposals";
import { hasActiveProposalFilters, parseProposalListParams } from "@/lib/proposal-params";
import type { RawSearchParams } from "@/lib/list-params";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";
import { MajorGivingNav } from "../MajorGivingNav";
import { ProposalFilterBar } from "../ProposalFilterBar";

export const dynamic = "force-dynamic";

function statusTone(status: string | null): BadgeTone {
  switch (status) {
    case "funded":
    case "approved":
      return "success";
    case "declined":
      return "danger";
    case "submitted":
    case "under_review":
      return "info";
    default:
      return "neutral";
  }
}

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const params = parseProposalListParams(raw);

  const rows = await getProposalsList(user.tenantId, params);
  const total = rows.length;
  const filtered = hasActiveProposalFilters(params);

  const columns: DataTableColumn<ProposalListRow>[] = [
    {
      key: "constituent",
      header: "Constituent",
      cell: (row) => (
        <Link href={`/constituents/${row.constituentId}`} className="f95-table__cell-link">
          {row.constituentName}
        </Link>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      cell: (row) => row.purpose ?? <span className="f95-table__muted">—</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => formatCurrencyFromCents(row.amountCents),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge tone={statusTone(row.status)}>{titleCaseFromSnake(row.status ?? "draft")}</Badge>
      ),
    },
    {
      key: "deadline",
      header: "Deadline",
      cell: (row) => formatDate(row.deadline),
    },
    {
      key: "manage",
      header: "",
      align: "right",
      cell: (row) => (
        <Link href={`/major-giving/proposals/${row.id}`} className="f95-table__cell-link">
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
          <h1 className="f95-page__title">Proposals</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 proposal" : `${total} proposals`}
            {filtered ? " · filtered" : ""}
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href="/major-giving/proposals/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              New proposal
            </Button>
          </Link>
        </div>
      </div>

      <MajorGivingNav active="proposals" />

      <ProposalFilterBar />

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} strokeWidth={1.8} />}
          title="No proposals here yet"
          line={
            filtered
              ? "No proposals match this status. Clear the filter to see them all."
              : "Draft your first proposal to track it through review."
          }
          action={
            <Link href="/major-giving/proposals/new">
              <Button variant="secondary" size="sm">
                New proposal
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

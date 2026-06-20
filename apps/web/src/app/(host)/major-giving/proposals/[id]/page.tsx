import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge, Button, Card } from "@/components/ds";
import type { BadgeTone } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getProposalDetail } from "@/server/data/proposals";
import { deleteProposalAction } from "@/server/actions/proposals";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";

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

function DefItem({ term, value }: { term: string; value: string | null }) {
  return (
    <div className="f95-deflist__item">
      <span className="f95-deflist__term">{term}</span>
      {value ? (
        <span className="f95-deflist__desc">{value}</span>
      ) : (
        <span className="f95-deflist__desc--empty">—</span>
      )}
    </div>
  );
}

export default async function ProposalRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const proposal = await getProposalDetail(user.tenantId, id);
  if (!proposal) notFound();

  return (
    <div className="f95-page">
      <Link href="/major-giving/proposals" className="f95-table__cell-link f95-cluster">
        <ArrowLeft size={15} strokeWidth={1.8} /> Proposals
      </Link>

      <div className="f95-record-head">
        <div className="f95-record-head__main">
          <h1 className="f95-record-head__title">{proposal.constituentName}</h1>
          <div className="f95-record-head__meta">
            <Badge tone={statusTone(proposal.status)}>
              {titleCaseFromSnake(proposal.status ?? "draft")}
            </Badge>
            <span>{formatCurrencyFromCents(proposal.amountCents)}</span>
            <span>
              ·{" "}
              <Link
                href={`/constituents/${proposal.constituentId}`}
                className="f95-table__cell-link"
              >
                View constituent
              </Link>
            </span>
          </div>
        </div>
        <div className="f95-record-head__actions">
          <Link href={`/major-giving/proposals/${id}/edit`}>
            <Button variant="secondary" size="sm" iconLeft={<Pencil size={15} strokeWidth={1.8} />}>
              Edit
            </Button>
          </Link>
          <form action={deleteProposalAction}>
            <input type="hidden" name="id" value={id} />
            <Button variant="danger" size="sm" type="submit">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <div className="f95-deflist">
          <DefItem term="Constituent" value={proposal.constituentName} />
          <DefItem term="Purpose" value={proposal.purpose} />
          <DefItem term="Amount" value={formatCurrencyFromCents(proposal.amountCents)} />
          <DefItem term="Status" value={titleCaseFromSnake(proposal.status ?? "draft")} />
          <DefItem term="Deadline" value={formatDate(proposal.deadline)} />
        </div>
      </Card>
    </div>
  );
}

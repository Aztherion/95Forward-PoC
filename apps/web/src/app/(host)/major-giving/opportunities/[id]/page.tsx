import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunityDetail } from "@/server/data/opportunities";
import { deleteOpportunityAction } from "@/server/actions/opportunities";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";

export const dynamic = "force-dynamic";

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

export default async function OpportunityRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const opportunity = await getOpportunityDetail(user.tenantId, id);
  if (!opportunity) notFound();

  return (
    <div className="f95-page">
      <Link href="/major-giving/opportunities" className="f95-table__cell-link f95-cluster">
        <ArrowLeft size={15} strokeWidth={1.8} /> Opportunities
      </Link>

      <div className="f95-record-head">
        <div className="f95-record-head__main">
          <h1 className="f95-record-head__title">{opportunity.constituentName}</h1>
          <div className="f95-record-head__meta">
            <Badge tone="neutral">{titleCaseFromSnake(opportunity.stage)}</Badge>
            <span>Ask {formatCurrencyFromCents(opportunity.askAmountCents)}</span>
            <span>
              ·{" "}
              <Link
                href={`/constituents/${opportunity.constituentId}`}
                className="f95-table__cell-link"
              >
                View constituent
              </Link>
            </span>
          </div>
        </div>
        <div className="f95-record-head__actions">
          <Link href={`/major-giving/opportunities/${id}/edit`}>
            <Button variant="secondary" size="sm" iconLeft={<Pencil size={15} strokeWidth={1.8} />}>
              Edit
            </Button>
          </Link>
          <form action={deleteOpportunityAction}>
            <input type="hidden" name="id" value={id} />
            <Button variant="danger" size="sm" type="submit">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <Card pad="lg" aria-label="Major-gift likelihood">
        <div className="f95-foil">
          <span className="f95-foil__mark" aria-hidden="true">
            <Sparkles size={20} strokeWidth={1.8} />
          </span>
          <div className="f95-foil__body">
            <span className="f95-foil__label">
              Major-gift likelihood
              <Badge tone="neutral" style={{ marginLeft: "var(--space-2)" }}>
                AI
              </Badge>
            </span>
            {opportunity.likelihoodPct === null ? (
              <span className="f95-foil__value--empty">—</span>
            ) : (
              <span className="f95-foil__value">{opportunity.likelihoodPct}%</span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="f95-deflist">
          <DefItem term="Constituent" value={opportunity.constituentName} />
          <DefItem term="Stage" value={titleCaseFromSnake(opportunity.stage)} />
          <DefItem term="Ask amount" value={formatCurrencyFromCents(opportunity.askAmountCents)} />
          <DefItem
            term="Expected amount"
            value={formatCurrencyFromCents(opportunity.expectedAmountCents)}
          />
          <DefItem term="Expected close" value={formatDate(opportunity.expectedCloseDate)} />
          <DefItem term="Owner" value={opportunity.ownerName} />
        </div>
      </Card>
    </div>
  );
}

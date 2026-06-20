import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge, Button, Card } from "@/components/ds";
import type { BadgeTone } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getGiftDetail } from "@/server/data/gifts";
import { getNamedRef } from "@/server/data/revenue-config";
import {
  deleteGiftAction,
  markReceiptedAction,
  markUnreceiptedAction,
} from "@/server/actions/gifts";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";

export const dynamic = "force-dynamic";

function receiptTone(status: string | null): BadgeTone {
  return status === "receipted" ? "success" : "neutral";
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

export default async function GiftRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const gift = await getGiftDetail(user.tenantId, id);
  if (!gift) notFound();

  const [fund, campaign, appeal] = await Promise.all([
    gift.fundId ? getNamedRef(user.tenantId, "fund", gift.fundId) : Promise.resolve(null),
    gift.campaignId
      ? getNamedRef(user.tenantId, "campaign", gift.campaignId)
      : Promise.resolve(null),
    gift.appealId ? getNamedRef(user.tenantId, "appeal", gift.appealId) : Promise.resolve(null),
  ]);

  const isReceipted = gift.receiptStatus === "receipted";

  return (
    <div className="f95-page">
      <Link href="/revenue" className="f95-table__cell-link f95-cluster">
        <ArrowLeft size={15} strokeWidth={1.8} /> Revenue
      </Link>

      <div className="f95-record-head">
        <div className="f95-record-head__main">
          <h1 className="f95-record-head__title">{formatCurrencyFromCents(gift.amountCents)}</h1>
          <div className="f95-record-head__meta">
            <Badge tone="neutral">{titleCaseFromSnake(gift.giftType)}</Badge>
            <Badge tone={receiptTone(gift.receiptStatus)}>
              {titleCaseFromSnake(gift.receiptStatus ?? "unreceipted")}
            </Badge>
            <span>{formatDate(gift.giftDate)}</span>
            <span>
              ·{" "}
              <Link href={`/constituents/${gift.constituentId}`} className="f95-table__cell-link">
                {gift.donorName}
              </Link>
            </span>
          </div>
        </div>
        <div className="f95-record-head__actions">
          <Link href={`/revenue/${id}/edit`}>
            <Button variant="secondary" size="sm" iconLeft={<Pencil size={15} strokeWidth={1.8} />}>
              Edit
            </Button>
          </Link>
          {isReceipted ? (
            <form action={markUnreceiptedAction}>
              <input type="hidden" name="id" value={id} />
              <Button variant="ghost" size="sm" type="submit">
                Mark unreceipted
              </Button>
            </form>
          ) : (
            <form action={markReceiptedAction}>
              <input type="hidden" name="id" value={id} />
              <Button variant="secondary" size="sm" type="submit">
                Mark receipted
              </Button>
            </form>
          )}
          <form action={deleteGiftAction}>
            <input type="hidden" name="id" value={id} />
            <Button variant="danger" size="sm" type="submit">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <div className="f95-deflist">
          <DefItem term="Donor" value={gift.donorName} />
          <DefItem term="Amount" value={formatCurrencyFromCents(gift.amountCents)} />
          <DefItem term="Date" value={formatDate(gift.giftDate)} />
          <DefItem term="Gift type" value={titleCaseFromSnake(gift.giftType)} />
          <DefItem term="Fund" value={fund?.name ?? null} />
          <DefItem term="Campaign" value={campaign?.name ?? null} />
          <DefItem term="Appeal" value={appeal?.name ?? null} />
          <DefItem term="Designation" value={gift.designation} />
          <DefItem
            term="Receipt status"
            value={titleCaseFromSnake(gift.receiptStatus ?? "unreceipted")}
          />
        </div>
      </Card>
    </div>
  );
}

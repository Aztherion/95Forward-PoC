import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listConstituentRefs } from "@/server/data/reference";
import { listRevenueRefs } from "@/server/data/revenue-config";
import { getGiftDetail } from "@/server/data/gifts";
import { updateGiftAction } from "@/server/actions/gifts";
import { centsToDollarsInput } from "@/lib/gift-params";
import { GiftForm } from "../../GiftForm";

export const dynamic = "force-dynamic";

export default async function EditGiftPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const [gift, constituents, refs] = await Promise.all([
    getGiftDetail(user.tenantId, id),
    listConstituentRefs(user.tenantId),
    listRevenueRefs(user.tenantId),
  ]);
  if (!gift) notFound();

  const boundAction = updateGiftAction.bind(null, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href={`/revenue/${id}`} className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Gift
        </Link>
        <h1 className="f95-page__title">Edit gift</h1>
      </div>
      <GiftForm
        action={boundAction}
        constituents={constituents}
        funds={refs.funds}
        campaigns={refs.campaigns}
        appeals={refs.appeals}
        initial={{
          id: gift.id,
          constituentId: gift.constituentId,
          amount: centsToDollarsInput(gift.amountCents),
          giftDate: gift.giftDate,
          giftType: gift.giftType,
          fundId: gift.fundId ?? undefined,
          campaignId: gift.campaignId ?? undefined,
          appealId: gift.appealId ?? undefined,
          designation: gift.designation ?? undefined,
          receiptStatus: gift.receiptStatus ?? "unreceipted",
        }}
        submitLabel="Save changes"
        cancelHref={`/revenue/${id}`}
      />
    </div>
  );
}

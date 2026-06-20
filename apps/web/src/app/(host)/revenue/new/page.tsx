import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listConstituentRefs } from "@/server/data/reference";
import { listRevenueRefs } from "@/server/data/revenue-config";
import { createGiftAction } from "@/server/actions/gifts";
import { GiftForm } from "../GiftForm";

export const dynamic = "force-dynamic";

export default async function NewGiftPage({
  searchParams,
}: {
  searchParams: Promise<{ constituent?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { constituent } = await searchParams;

  const [constituents, refs] = await Promise.all([
    listConstituentRefs(user.tenantId),
    listRevenueRefs(user.tenantId),
  ]);

  const lockConstituent = Boolean(constituent && constituents.some((c) => c.id === constituent));

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/revenue" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Revenue
        </Link>
        <h1 className="f95-page__title">Record a gift</h1>
      </div>
      <GiftForm
        action={createGiftAction}
        constituents={constituents}
        funds={refs.funds}
        campaigns={refs.campaigns}
        appeals={refs.appeals}
        initial={{
          constituentId: lockConstituent ? constituent : undefined,
          giftType: "one_time",
          receiptStatus: "unreceipted",
        }}
        lockConstituent={lockConstituent}
        submitLabel="Record gift"
        cancelHref="/revenue"
      />
    </div>
  );
}

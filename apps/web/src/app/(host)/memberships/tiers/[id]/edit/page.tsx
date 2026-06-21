import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getTierDetail } from "@/server/data/memberships";
import { updateTierAction } from "@/server/actions/memberships";
import { centsToDollarsInput } from "@/lib/gift-params";
import { TierForm } from "../../../TierForm";

export const dynamic = "force-dynamic";

export default async function EditTierPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const tier = await getTierDetail(user.tenantId, id);
  if (!tier) notFound();

  const boundAction = updateTierAction.bind(null, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/memberships/tiers" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Tiers
        </Link>
        <h1 className="f95-page__title">Edit tier</h1>
      </div>
      <TierForm
        action={boundAction}
        initial={{
          name: tier.name,
          level: tier.level !== null ? String(tier.level) : undefined,
          dues: tier.amountCents !== null ? centsToDollarsInput(tier.amountCents) : undefined,
          benefits: tier.benefits ?? undefined,
        }}
        submitLabel="Save changes"
        cancelHref="/memberships/tiers"
      />
    </div>
  );
}

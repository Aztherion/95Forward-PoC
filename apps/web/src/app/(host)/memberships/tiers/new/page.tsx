import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createTierAction } from "@/server/actions/memberships";
import { TierForm } from "../../TierForm";

export const dynamic = "force-dynamic";

export default async function NewTierPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/memberships/tiers" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Tiers
        </Link>
        <h1 className="f95-page__title">New tier</h1>
      </div>
      <TierForm
        action={createTierAction}
        submitLabel="Create tier"
        cancelHref="/memberships/tiers"
      />
    </div>
  );
}

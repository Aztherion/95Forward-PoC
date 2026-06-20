import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listConstituentRefs, listUsers } from "@/server/data/reference";
import { createOpportunityAction } from "@/server/actions/opportunities";
import { OpportunityForm } from "../../OpportunityForm";

export const dynamic = "force-dynamic";

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<{ constituent?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { constituent } = await searchParams;

  const [constituents, owners] = await Promise.all([
    listConstituentRefs(user.tenantId),
    listUsers(user.tenantId),
  ]);

  const lockConstituent = Boolean(constituent && constituents.some((c) => c.id === constituent));

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/major-giving/opportunities" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Opportunities
        </Link>
        <h1 className="f95-page__title">New opportunity</h1>
      </div>
      <OpportunityForm
        action={createOpportunityAction}
        constituents={constituents}
        owners={owners}
        initial={{
          constituentId: lockConstituent ? constituent : undefined,
          stage: "identification",
          ownerUserId: user.id,
        }}
        lockConstituent={lockConstituent}
        submitLabel="Create opportunity"
        cancelHref="/major-giving/opportunities"
      />
    </div>
  );
}

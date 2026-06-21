import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createOpportunityAction } from "@/server/actions/volunteers";
import { OpportunityForm } from "../../OpportunityForm";

export const dynamic = "force-dynamic";

export default async function NewOpportunityPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/volunteers/opportunities" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Opportunities
        </Link>
        <h1 className="f95-page__title">New opportunity</h1>
      </div>
      <OpportunityForm
        action={createOpportunityAction}
        submitLabel="Create opportunity"
        cancelHref="/volunteers/opportunities"
      />
    </div>
  );
}

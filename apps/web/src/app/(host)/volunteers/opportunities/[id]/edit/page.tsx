import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunityDetail } from "@/server/data/volunteers";
import { updateOpportunityAction } from "@/server/actions/volunteers";
import { timestampToDateInput } from "@/lib/event-params";
import { OpportunityForm } from "../../../OpportunityForm";

export const dynamic = "force-dynamic";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const opportunity = await getOpportunityDetail(user.tenantId, id);
  if (!opportunity) notFound();

  const boundAction = updateOpportunityAction.bind(null, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href={`/volunteers/opportunities/${id}`} className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Opportunity
        </Link>
        <h1 className="f95-page__title">Edit opportunity</h1>
      </div>
      <OpportunityForm
        action={boundAction}
        initial={{
          id: opportunity.id,
          name: opportunity.name,
          startsAt: timestampToDateInput(opportunity.startsAt),
          location: opportunity.location ?? undefined,
          capacity: opportunity.capacity !== null ? String(opportunity.capacity) : undefined,
          description: opportunity.description ?? undefined,
        }}
        submitLabel="Save changes"
        cancelHref={`/volunteers/opportunities/${id}`}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listConstituentRefs, listUsers } from "@/server/data/reference";
import { getOpportunityDetail } from "@/server/data/opportunities";
import { updateOpportunityAction } from "@/server/actions/opportunities";
import { centsToDollarsInput } from "@/lib/gift-params";
import { OpportunityForm } from "../../../OpportunityForm";

export const dynamic = "force-dynamic";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const [opportunity, constituents, owners] = await Promise.all([
    getOpportunityDetail(user.tenantId, id),
    listConstituentRefs(user.tenantId),
    listUsers(user.tenantId),
  ]);
  if (!opportunity) notFound();

  const boundAction = updateOpportunityAction.bind(null, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link
          href={`/major-giving/opportunities/${id}`}
          className="f95-table__cell-link f95-cluster"
        >
          <ArrowLeft size={15} strokeWidth={1.8} /> Opportunity
        </Link>
        <h1 className="f95-page__title">Edit opportunity</h1>
      </div>
      <OpportunityForm
        action={boundAction}
        constituents={constituents}
        owners={owners}
        initial={{
          id: opportunity.id,
          constituentId: opportunity.constituentId,
          stage: opportunity.stage,
          askAmount:
            opportunity.askAmountCents === null
              ? undefined
              : centsToDollarsInput(opportunity.askAmountCents),
          expectedAmount:
            opportunity.expectedAmountCents === null
              ? undefined
              : centsToDollarsInput(opportunity.expectedAmountCents),
          expectedCloseDate: opportunity.expectedCloseDate ?? undefined,
          likelihoodPct:
            opportunity.likelihoodPct === null ? undefined : String(opportunity.likelihoodPct),
          ownerUserId: opportunity.ownerUserId ?? undefined,
        }}
        submitLabel="Save changes"
        cancelHref={`/major-giving/opportunities/${id}`}
      />
    </div>
  );
}

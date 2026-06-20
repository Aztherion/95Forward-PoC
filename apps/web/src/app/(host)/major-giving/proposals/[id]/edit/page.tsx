import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listConstituentRefs } from "@/server/data/reference";
import { getProposalDetail } from "@/server/data/proposals";
import { updateProposalAction } from "@/server/actions/proposals";
import { centsToDollarsInput } from "@/lib/gift-params";
import { ProposalForm } from "../../../ProposalForm";

export const dynamic = "force-dynamic";

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const [proposal, constituents] = await Promise.all([
    getProposalDetail(user.tenantId, id),
    listConstituentRefs(user.tenantId),
  ]);
  if (!proposal) notFound();

  const boundAction = updateProposalAction.bind(null, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href={`/major-giving/proposals/${id}`} className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Proposal
        </Link>
        <h1 className="f95-page__title">Edit proposal</h1>
      </div>
      <ProposalForm
        action={boundAction}
        constituents={constituents}
        initial={{
          id: proposal.id,
          constituentId: proposal.constituentId,
          purpose: proposal.purpose ?? undefined,
          amount:
            proposal.amountCents === null ? undefined : centsToDollarsInput(proposal.amountCents),
          status: proposal.status ?? "draft",
          deadline: proposal.deadline ?? undefined,
        }}
        submitLabel="Save changes"
        cancelHref={`/major-giving/proposals/${id}`}
      />
    </div>
  );
}

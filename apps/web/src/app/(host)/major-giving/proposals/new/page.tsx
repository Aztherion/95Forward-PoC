import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listConstituentRefs } from "@/server/data/reference";
import { createProposalAction } from "@/server/actions/proposals";
import { ProposalForm } from "../../ProposalForm";

export const dynamic = "force-dynamic";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ constituent?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { constituent } = await searchParams;

  const constituents = await listConstituentRefs(user.tenantId);
  const lockConstituent = Boolean(constituent && constituents.some((c) => c.id === constituent));

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/major-giving/proposals" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Proposals
        </Link>
        <h1 className="f95-page__title">New proposal</h1>
      </div>
      <ProposalForm
        action={createProposalAction}
        constituents={constituents}
        initial={{
          constituentId: lockConstituent ? constituent : undefined,
          status: "draft",
        }}
        lockConstituent={lockConstituent}
        submitLabel="Create proposal"
        cancelHref="/major-giving/proposals"
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMembershipDetail, getTiersList } from "@/server/data/memberships";
import { listConstituentRefs } from "@/server/data/reference";
import { updateMembershipAction } from "@/server/actions/memberships";
import { MembershipForm } from "../../../MembershipForm";

export const dynamic = "force-dynamic";

export default async function EditMembershipPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const [membership, constituents, tiers] = await Promise.all([
    getMembershipDetail(user.tenantId, id),
    listConstituentRefs(user.tenantId),
    getTiersList(user.tenantId),
  ]);
  if (!membership) notFound();

  const constituentOptions = constituents.map((c) => ({ value: c.id, label: c.name }));
  const tierOptions = tiers.map((t) => ({ value: t.id, label: t.name }));

  const boundAction = updateMembershipAction.bind(null, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href={`/memberships/members/${id}`} className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Membership
        </Link>
        <h1 className="f95-page__title">Edit membership</h1>
      </div>
      <MembershipForm
        action={boundAction}
        constituents={constituentOptions}
        tiers={tierOptions}
        initial={{
          constituentId: membership.constituentId,
          tierId: membership.tierId,
          status: membership.status ?? "active",
          startDate: membership.startDate ?? "",
          renewalDate: membership.renewalDate ?? "",
        }}
        submitLabel="Save changes"
        cancelHref={`/memberships/members/${id}`}
      />
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listConstituentRefs } from "@/server/data/reference";
import { getTiersList } from "@/server/data/memberships";
import { createMembershipAction } from "@/server/actions/memberships";
import { todayIso } from "@/lib/membership-params";
import { MembershipForm } from "../../MembershipForm";

export const dynamic = "force-dynamic";

export default async function NewMembershipPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [constituents, tiers] = await Promise.all([
    listConstituentRefs(user.tenantId),
    getTiersList(user.tenantId),
  ]);

  const constituentOptions = constituents.map((c) => ({ value: c.id, label: c.name }));
  const tierOptions = tiers.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/memberships/members" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Members
        </Link>
        <h1 className="f95-page__title">New membership</h1>
      </div>
      <MembershipForm
        action={createMembershipAction}
        constituents={constituentOptions}
        tiers={tierOptions}
        initial={{ status: "active", startDate: todayIso() }}
        submitLabel="Enroll member"
        cancelHref="/memberships/members"
      />
    </div>
  );
}

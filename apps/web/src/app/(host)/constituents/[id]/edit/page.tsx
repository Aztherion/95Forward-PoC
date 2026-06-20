import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/server/data/reference";
import { getConstituentDetail } from "@/server/data/constituents";
import { updateConstituentAction } from "@/server/actions/constituents";
import { ConstituentForm } from "../../ConstituentForm";

export const dynamic = "force-dynamic";

export default async function EditConstituentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const [record, users] = await Promise.all([
    getConstituentDetail(user.tenantId, id),
    listUsers(user.tenantId),
  ]);
  if (!record) notFound();

  const boundAction = updateConstituentAction.bind(null, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href={`/constituents/${id}`} className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> {record.displayName}
        </Link>
        <h1 className="f95-page__title">Edit constituent</h1>
      </div>
      <ConstituentForm
        action={boundAction}
        users={users}
        submitLabel="Save changes"
        initial={{
          id: record.id,
          type: record.type,
          displayName: record.displayName,
          firstName: record.firstName ?? undefined,
          lastName: record.lastName ?? undefined,
          organizationName: record.organizationName ?? undefined,
          email: record.email ?? undefined,
          phone: record.phone ?? undefined,
          addressLine1: record.addressLine1 ?? undefined,
          addressLine2: record.addressLine2 ?? undefined,
          city: record.city ?? undefined,
          region: record.region ?? undefined,
          postalCode: record.postalCode ?? undefined,
          country: record.country ?? undefined,
          prospectStatus: record.prospectStatus,
          assignedUserId: record.assignedUserId ?? undefined,
          boardMember: record.boardMember,
          volunteer: record.volunteer,
          wavemakerMonthly: record.wavemakerMonthly,
          legacy: record.legacy,
        }}
      />
    </div>
  );
}

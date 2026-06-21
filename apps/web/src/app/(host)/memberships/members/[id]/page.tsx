import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import { Badge, Button, Card } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getMembershipDetail } from "@/server/data/memberships";
import { deleteMembershipAction, renewMembershipAction } from "@/server/actions/memberships";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { membershipStatusLabel, membershipStatusTone } from "@/lib/membership-params";

export const dynamic = "force-dynamic";

export default async function MembershipRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const membership = await getMembershipDetail(user.tenantId, id);
  if (!membership) notFound();

  return (
    <div className="f95-page">
      <Link href="/memberships/members" className="f95-table__cell-link f95-cluster">
        <ArrowLeft size={15} strokeWidth={1.8} /> Members
      </Link>

      <div className="f95-record-head">
        <div className="f95-record-head__main">
          <h1 className="f95-record-head__title">
            <Link
              href={`/constituents/${membership.constituentId}`}
              className="f95-table__cell-link"
            >
              {membership.constituentName}
            </Link>
          </h1>
          <div className="f95-record-head__meta">
            <Badge tone={membershipStatusTone(membership.status)}>
              {membershipStatusLabel(membership.status)}
            </Badge>
            <span>{membership.tierName}</span>
            {membership.tierAmountCents !== null ? (
              <span>· {formatCurrencyFromCents(membership.tierAmountCents)} dues</span>
            ) : null}
          </div>
        </div>
        <div className="f95-record-head__actions">
          <form action={renewMembershipAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="redirectTo" value={`/memberships/members/${id}`} />
            <Button
              variant="primary"
              size="sm"
              type="submit"
              iconLeft={<RefreshCw size={15} strokeWidth={1.8} />}
            >
              Renew
            </Button>
          </form>
          <Link href={`/memberships/members/${id}/edit`}>
            <Button variant="secondary" size="sm" iconLeft={<Pencil size={15} strokeWidth={1.8} />}>
              Edit
            </Button>
          </Link>
          <form action={deleteMembershipAction}>
            <input type="hidden" name="id" value={id} />
            <Button variant="danger" size="sm" type="submit">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <div className="f95-fieldgroup__legend">Membership</div>
        <div className="f95-deflist">
          <div className="f95-deflist__item">
            <span className="f95-deflist__term">Tier</span>
            <span className="f95-deflist__desc">
              {membership.tierName}
              {membership.tierLevel !== null ? ` · Level ${membership.tierLevel}` : ""}
            </span>
          </div>
          <div className="f95-deflist__item">
            <span className="f95-deflist__term">Status</span>
            <span className="f95-deflist__desc">
              <Badge tone={membershipStatusTone(membership.status)}>
                {membershipStatusLabel(membership.status)}
              </Badge>
            </span>
          </div>
          <div className="f95-deflist__item">
            <span className="f95-deflist__term">Started</span>
            <span className="f95-deflist__desc">{formatDate(membership.startDate)}</span>
          </div>
          <div className="f95-deflist__item">
            <span className="f95-deflist__term">Renews</span>
            <span className="f95-deflist__desc">{formatDate(membership.renewalDate)}</span>
          </div>
          <div className="f95-deflist__item">
            <span className="f95-deflist__term">Last renewed</span>
            {membership.lastRenewedOn ? (
              <span className="f95-deflist__desc">{formatDate(membership.lastRenewedOn)}</span>
            ) : (
              <span className="f95-deflist__desc--empty">Not renewed yet</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getRenewals, type RenewalRow } from "@/server/data/memberships";
import { renewMembershipAction } from "@/server/actions/memberships";
import { formatDate } from "@/lib/format";
import { membershipStatusLabel, membershipStatusTone, todayIso } from "@/lib/membership-params";
import { MembershipsNav } from "../MembershipsNav";

export const dynamic = "force-dynamic";

function RenewalList({ rows }: { rows: RenewalRow[] }) {
  return (
    <div>
      {rows.map((row) => (
        <div key={row.id} className="f95-itemrow">
          <div className="f95-itemrow__body">
            <span className="f95-itemrow__title">
              <Link href={`/memberships/members/${row.id}`} className="f95-table__cell-link">
                {row.constituentName}
              </Link>
            </span>
            <span className="f95-itemrow__meta">
              <Badge tone={membershipStatusTone(row.status)}>
                {membershipStatusLabel(row.status)}
              </Badge>
              <span>· {row.tierName}</span>
              <span>· Renews {formatDate(row.renewalDate)}</span>
            </span>
          </div>
          <div className="f95-itemrow__actions">
            <form action={renewMembershipAction}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="redirectTo" value="/memberships/renewals" />
              <Button variant="secondary" size="sm" type="submit">
                Renew
              </Button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function RenewalsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { upcoming, lapsed } = await getRenewals(user.tenantId, todayIso());

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Memberships</div>
          <h1 className="f95-page__title">Renewals</h1>
          <div className="f95-page__count">
            {upcoming.length} upcoming · {lapsed.length} lapsed
          </div>
        </div>
      </div>

      <MembershipsNav active="renewals" />

      <div className="f95-stack">
        <Card>
          <h2 className="f95-section-title">Upcoming · next 60 days</h2>
          {upcoming.length === 0 ? (
            <p className="f95-deflist__desc--empty">
              No renewals coming up — every active member is current.
            </p>
          ) : (
            <RenewalList rows={upcoming} />
          )}
        </Card>

        <Card>
          <h2 className="f95-section-title">Lapsed · worth a nudge</h2>
          {lapsed.length === 0 ? (
            <p className="f95-deflist__desc--empty">
              No lapsed memberships — nice work keeping everyone renewed.
            </p>
          ) : (
            <RenewalList rows={lapsed} />
          )}
        </Card>
      </div>

      {upcoming.length === 0 && lapsed.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={20} strokeWidth={1.8} />}
          title="Nothing to renew right now"
          line="As renewal dates approach or pass, members will show up here ready to renew."
        />
      ) : null}
    </div>
  );
}

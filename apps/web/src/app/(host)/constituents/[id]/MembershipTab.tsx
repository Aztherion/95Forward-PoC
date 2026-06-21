import Link from "next/link";
import { Badge } from "@/components/ds";
import { formatDate } from "@/lib/format";
import { membershipStatusLabel, membershipStatusTone } from "@/lib/membership-params";
import type { ConstituentMembershipRow } from "@/server/data/memberships";

export interface MembershipTabProps {
  memberships: ConstituentMembershipRow[];
}

export function MembershipTab({ memberships }: MembershipTabProps) {
  return (
    <div className="f95-stack">
      <h2 className="f95-section-title">Memberships</h2>

      {memberships.length === 0 ? (
        <p className="f95-deflist__desc--empty">
          No memberships yet — enroll this constituent from Memberships.
        </p>
      ) : (
        <div>
          {memberships.map((membership) => (
            <div key={membership.id} className="f95-itemrow">
              <div className="f95-itemrow__body">
                <span className="f95-itemrow__title">
                  <Link
                    href={`/memberships/members/${membership.id}`}
                    className="f95-table__cell-link"
                  >
                    {membership.tierName}
                  </Link>
                </span>
                <span className="f95-itemrow__meta">
                  <Badge tone={membershipStatusTone(membership.status)}>
                    {membershipStatusLabel(membership.status)}
                  </Badge>
                  <span>· Started {formatDate(membership.startDate)}</span>
                  <span>· Renews {formatDate(membership.renewalDate)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

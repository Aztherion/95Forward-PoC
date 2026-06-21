import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button, Card } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunityDetail, getOpportunityHours } from "@/server/data/volunteers";
import { listConstituentRefs } from "@/server/data/reference";
import { deleteHoursAction, deleteOpportunityAction } from "@/server/actions/volunteers";
import { totalHours } from "@/lib/volunteer-metrics";
import { formatDate } from "@/lib/format";
import { LogHoursForm } from "./LogHoursForm";

export const dynamic = "force-dynamic";

export default async function OpportunityRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const opportunity = await getOpportunityDetail(user.tenantId, id);
  if (!opportunity) notFound();

  const [hours, constituents] = await Promise.all([
    getOpportunityHours(user.tenantId, id),
    listConstituentRefs(user.tenantId),
  ]);

  const total = totalHours(hours);

  return (
    <div className="f95-page">
      <Link href="/volunteers/opportunities" className="f95-table__cell-link f95-cluster">
        <ArrowLeft size={15} strokeWidth={1.8} /> Opportunities
      </Link>

      <div className="f95-record-head">
        <div className="f95-record-head__main">
          <h1 className="f95-record-head__title">{opportunity.name}</h1>
          <div className="f95-record-head__meta">
            <span>{opportunity.startsAt ? formatDate(opportunity.startsAt) : "No date set"}</span>
            {opportunity.location ? <span>· {opportunity.location}</span> : null}
            {opportunity.capacity ? <span>· Capacity {opportunity.capacity}</span> : null}
          </div>
        </div>
        <div className="f95-record-head__actions">
          <Link href={`/volunteers/opportunities/${id}/edit`}>
            <Button variant="secondary" size="sm" iconLeft={<Pencil size={15} strokeWidth={1.8} />}>
              Edit
            </Button>
          </Link>
          <form action={deleteOpportunityAction}>
            <input type="hidden" name="id" value={id} />
            <Button variant="danger" size="sm" type="submit">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="f95-statgrid">
        <div className="f95-stat">
          <span className="f95-stat__label">Total hours</span>
          <span className="f95-stat__value">{total.toFixed(2)}</span>
          <span className="f95-stat__sub">Across all logged entries</span>
        </div>
        <div className="f95-stat">
          <span className="f95-stat__label">Volunteers</span>
          <span className="f95-stat__value">
            {new Set(hours.map((row) => row.constituentId)).size}
          </span>
          <span className="f95-stat__sub">People who gave time</span>
        </div>
        <div className="f95-stat">
          <span className="f95-stat__label">Entries</span>
          <span className="f95-stat__value">{hours.length}</span>
          <span className="f95-stat__sub">Logged-hours records</span>
        </div>
      </div>

      {opportunity.description ? (
        <Card>
          <div className="f95-fieldgroup__legend">About</div>
          <p>{opportunity.description}</p>
        </Card>
      ) : null}

      <Card>
        <LogHoursForm opportunityId={id} constituents={constituents} />

        {hours.length === 0 ? (
          <p className="f95-deflist__desc--empty">No hours logged yet — log the first entry.</p>
        ) : (
          <div>
            {hours.map((row) => (
              <div key={row.id} className="f95-itemrow">
                <div className="f95-itemrow__body">
                  <span className="f95-itemrow__title">
                    <Link
                      href={`/constituents/${row.constituentId}`}
                      className="f95-table__cell-link"
                    >
                      {row.constituentName}
                    </Link>
                  </span>
                  <span className="f95-itemrow__meta">
                    <span>{row.hours.toFixed(2)} hours</span>
                    <span>· {formatDate(row.loggedDate)}</span>
                  </span>
                </div>
                <div className="f95-itemrow__actions">
                  <form action={deleteHoursAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button variant="ghost" size="sm" type="submit">
                      Remove
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

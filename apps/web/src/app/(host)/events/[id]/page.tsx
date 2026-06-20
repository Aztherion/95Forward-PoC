import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge, Button, Card } from "@/components/ds";
import type { BadgeTone } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getEventDetail, getEventRevenue } from "@/server/data/events";
import { getEventRegistrations } from "@/server/data/registrations";
import { listConstituentRefs } from "@/server/data/reference";
import { deleteEventAction } from "@/server/actions/events";
import { setRegistrationStatusAction, toggleAttendedAction } from "@/server/actions/registrations";
import { computeGoalProgress, progressBarWidthPercent } from "@/lib/analysis-metrics";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";
import { RegistrationForm } from "./RegistrationForm";

export const dynamic = "force-dynamic";

function statusTone(status: string | null): BadgeTone {
  if (status === "waitlisted") return "attention";
  if (status === "cancelled") return "unknown";
  return "neutral";
}

export default async function EventRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const event = await getEventDetail(user.tenantId, id);
  if (!event) notFound();

  const [revenue, registrations, constituents] = await Promise.all([
    getEventRevenue(user.tenantId, id),
    getEventRegistrations(user.tenantId, id),
    listConstituentRefs(user.tenantId),
  ]);

  const goalCents = event.goalAmountCents ?? 0;
  const progress = computeGoalProgress(revenue.totalCents, goalCents);
  const dateRange = event.endsAt
    ? `${formatDate(event.startsAt)} – ${formatDate(event.endsAt)}`
    : formatDate(event.startsAt);

  return (
    <div className="f95-page">
      <Link href="/events" className="f95-table__cell-link f95-cluster">
        <ArrowLeft size={15} strokeWidth={1.8} /> Events
      </Link>

      <div className="f95-record-head">
        <div className="f95-record-head__main">
          <h1 className="f95-record-head__title">{event.name}</h1>
          <div className="f95-record-head__meta">
            {event.eventType ? (
              <Badge tone="neutral">{titleCaseFromSnake(event.eventType)}</Badge>
            ) : null}
            <span>{dateRange}</span>
            {event.location ? <span>· {event.location}</span> : null}
            {event.capacity ? <span>· Capacity {event.capacity}</span> : null}
          </div>
        </div>
        <div className="f95-record-head__actions">
          <Link href={`/events/${id}/edit`}>
            <Button variant="secondary" size="sm" iconLeft={<Pencil size={15} strokeWidth={1.8} />}>
              Edit
            </Button>
          </Link>
          <form action={deleteEventAction}>
            <input type="hidden" name="id" value={id} />
            <Button variant="danger" size="sm" type="submit">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="f95-statgrid">
        <div className="f95-stat">
          <span className="f95-stat__label">Registration fees</span>
          <span className="f95-stat__value">
            {formatCurrencyFromCents(revenue.registrationFeesCents)}
          </span>
          <span className="f95-stat__sub">
            {revenue.registrationCount === 1
              ? "1 registration"
              : `${revenue.registrationCount} registrations`}
          </span>
        </div>
        <div className="f95-stat">
          <span className="f95-stat__label">Linked gifts</span>
          <span className="f95-stat__value">
            {formatCurrencyFromCents(revenue.giftRevenueCents)}
          </span>
          <span className="f95-stat__sub">Gifts tied to this event</span>
        </div>
        <div className="f95-stat">
          <span className="f95-stat__label">Total revenue</span>
          <span className="f95-stat__value">{formatCurrencyFromCents(revenue.totalCents)}</span>
          <span className="f95-stat__sub">Fees and gifts combined</span>
        </div>
      </div>

      {goalCents > 0 ? (
        <Card pad="lg">
          <div className="f95-stack f95-stack--sm">
            <div className="f95-cluster">
              <h2 className="f95-section-title">Toward goal</h2>
              {progress.metGoal ? <Badge tone="success">Goal met</Badge> : null}
            </div>
            <div className="f95-progress f95-progress--lg">
              <div
                className="f95-progress__fill"
                style={{ width: `${progressBarWidthPercent(progress.percentToGoal)}%` }}
              />
            </div>
            <div className="f95-goalmeta">
              <span className="f95-goalmeta__pct">{progress.percentToGoal}% to goal</span>
              <span className="f95-stat__sub">
                {formatCurrencyFromCents(progress.raisedCents)} of{" "}
                {formatCurrencyFromCents(progress.goalCents)}
              </span>
            </div>
            <div className="f95-stat__sub">
              {progress.metGoal
                ? "Goal reached"
                : `${formatCurrencyFromCents(progress.remainingCents)} to go`}
            </div>
          </div>
        </Card>
      ) : null}

      {event.description ? (
        <Card>
          <div className="f95-fieldgroup__legend">About</div>
          <p>{event.description}</p>
        </Card>
      ) : null}

      <Card>
        <RegistrationForm eventId={id} constituents={constituents} />

        {registrations.length === 0 ? (
          <p className="f95-deflist__desc--empty">
            No one registered yet — add the first registration.
          </p>
        ) : (
          <div>
            {registrations.map((registration) => (
              <div key={registration.id} className="f95-itemrow">
                <div className="f95-itemrow__body">
                  <span className="f95-itemrow__title">
                    <Link
                      href={`/constituents/${registration.constituentId}`}
                      className="f95-table__cell-link"
                    >
                      {registration.constituentName}
                    </Link>
                  </span>
                  <span className="f95-itemrow__meta">
                    <Badge tone={statusTone(registration.status)}>
                      {titleCaseFromSnake(registration.status ?? "registered")}
                    </Badge>
                    {registration.guestCount > 0 ? (
                      <span>
                        ·{" "}
                        {registration.guestCount === 1
                          ? "1 guest"
                          : `${registration.guestCount} guests`}
                      </span>
                    ) : null}
                    <span>· Fee {formatCurrencyFromCents(registration.feeAmountCents)}</span>
                    {registration.attended ? <Badge tone="success">Checked in</Badge> : null}
                  </span>
                </div>
                <div className="f95-itemrow__actions">
                  {registration.status !== "cancelled" ? (
                    <form action={toggleAttendedAction}>
                      <input type="hidden" name="id" value={registration.id} />
                      <Button variant="ghost" size="sm" type="submit">
                        {registration.attended ? "Undo check-in" : "Check in"}
                      </Button>
                    </form>
                  ) : null}
                  {registration.status === "cancelled" ? (
                    <form action={setRegistrationStatusAction}>
                      <input type="hidden" name="id" value={registration.id} />
                      <input type="hidden" name="status" value="registered" />
                      <Button variant="ghost" size="sm" type="submit">
                        Reinstate
                      </Button>
                    </form>
                  ) : (
                    <form action={setRegistrationStatusAction}>
                      <input type="hidden" name="id" value={registration.id} />
                      <input type="hidden" name="status" value="cancelled" />
                      <Button variant="ghost" size="sm" type="submit">
                        Cancel
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

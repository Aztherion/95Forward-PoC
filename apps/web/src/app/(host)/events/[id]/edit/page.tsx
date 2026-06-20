import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getEventDetail } from "@/server/data/events";
import { updateEventAction } from "@/server/actions/events";
import { centsToDollarsInput } from "@/lib/gift-params";
import { timestampToDateInput } from "@/lib/event-params";
import { EventForm } from "../../EventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const event = await getEventDetail(user.tenantId, id);
  if (!event) notFound();

  const boundAction = updateEventAction.bind(null, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href={`/events/${id}`} className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Event
        </Link>
        <h1 className="f95-page__title">Edit event</h1>
      </div>
      <EventForm
        action={boundAction}
        initial={{
          id: event.id,
          name: event.name,
          eventType: event.eventType ?? "other",
          startsAt: timestampToDateInput(event.startsAt),
          endsAt: timestampToDateInput(event.endsAt),
          location: event.location ?? undefined,
          capacity: event.capacity !== null ? String(event.capacity) : undefined,
          goalAmount:
            event.goalAmountCents !== null ? centsToDollarsInput(event.goalAmountCents) : undefined,
          description: event.description ?? undefined,
        }}
        submitLabel="Save changes"
        cancelHref={`/events/${id}`}
      />
    </div>
  );
}

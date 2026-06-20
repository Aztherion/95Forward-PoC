import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createEventAction } from "@/server/actions/events";
import { EventForm } from "../EventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/events" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Events
        </Link>
        <h1 className="f95-page__title">New event</h1>
      </div>
      <EventForm
        action={createEventAction}
        initial={{ eventType: "other" }}
        submitLabel="Create event"
        cancelHref="/events"
      />
    </div>
  );
}

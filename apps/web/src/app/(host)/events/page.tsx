import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, Pagination } from "@/components/ds";
import type { DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getEventsList, type EventListRow } from "@/server/data/events";
import {
  EVENTS_PAGE_SIZE,
  eventParamsToSearch,
  hasActiveEventFilters,
  parseEventListParams,
} from "@/lib/event-params";
import type { RawSearchParams } from "@/lib/list-params";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";
import { EventFilterBar } from "./EventFilterBar";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const params = parseEventListParams(raw);

  const { rows, total } = await getEventsList(user.tenantId, params);

  function buildPageHref(page: number): string {
    const qs = eventParamsToSearch({ ...params, page }).toString();
    return `/events${qs ? `?${qs}` : ""}`;
  }

  const columns: DataTableColumn<EventListRow>[] = [
    {
      key: "name",
      header: "Event",
      cell: (row) => (
        <Link href={`/events/${row.id}`} className="f95-table__cell-link">
          {row.name}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) =>
        row.eventType ? (
          <Badge tone="neutral">{titleCaseFromSnake(row.eventType)}</Badge>
        ) : (
          <span className="f95-table__muted">—</span>
        ),
    },
    { key: "date", header: "Date", cell: (row) => formatDate(row.startsAt) },
    {
      key: "location",
      header: "Location",
      cell: (row) => row.location ?? <span className="f95-table__muted">—</span>,
    },
    {
      key: "registrations",
      header: "Registered",
      align: "right",
      cell: (row) =>
        row.capacity ? `${row.registrationCount} / ${row.capacity}` : String(row.registrationCount),
    },
    {
      key: "goal",
      header: "Goal",
      align: "right",
      cell: (row) =>
        row.goalAmountCents ? (
          formatCurrencyFromCents(row.goalAmountCents)
        ) : (
          <span className="f95-table__muted">—</span>
        ),
    },
    {
      key: "open",
      header: "",
      align: "right",
      cell: (row) => (
        <Link href={`/events/${row.id}`} className="f95-table__cell-link">
          Open
        </Link>
      ),
    },
  ];

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">Events</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 event" : `${total} events`}
            {hasActiveEventFilters(params) ? " · filtered" : ""}
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href="/events/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              New event
            </Button>
          </Link>
        </div>
      </div>

      <EventFilterBar />

      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={20} strokeWidth={1.8} />}
          title="No events here yet"
          line={
            hasActiveEventFilters(params)
              ? "No events match these filters. Try a different name or type."
              : "Plan your first event to start tracking registrations and revenue."
          }
          action={
            <Link href="/events/new">
              <Button variant="secondary" size="sm">
                New event
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
          <Pagination
            page={params.page}
            pageSize={EVENTS_PAGE_SIZE}
            total={total}
            buildHref={buildPageHref}
          />
        </>
      )}
    </div>
  );
}

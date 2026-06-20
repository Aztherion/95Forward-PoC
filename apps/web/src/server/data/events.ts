import "server-only";
import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { eventRegistrations, events, gifts, withTenant } from "@95forward/db";
import type { EventInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { escapeLike } from "@/lib/sql";
import { EVENTS_PAGE_SIZE, dateInputToTimestamp, type EventListParams } from "@/lib/event-params";
import { computeEventRevenue, type EventRevenue } from "@/lib/event-revenue";

export interface EventListRow {
  id: string;
  name: string;
  eventType: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  location: string | null;
  capacity: number | null;
  goalAmountCents: number | null;
  registrationCount: number;
}

export interface EventListResult {
  rows: EventListRow[];
  total: number;
}

function buildEventConditions(params: EventListParams): SQL[] {
  const conditions: SQL[] = [];
  if (params.search) {
    const like = ilike(events.name, `%${escapeLike(params.search)}%`);
    if (like) conditions.push(like);
  }
  if (params.eventType) conditions.push(eq(events.eventType, params.eventType));
  return conditions;
}

export async function getEventsList(
  tenantId: string,
  params: EventListParams,
): Promise<EventListResult> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const conditions = buildEventConditions(params);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(whereClause);
    const total = Number(countRows[0]?.count ?? 0);

    const rows = await tx
      .select({
        id: events.id,
        name: events.name,
        eventType: events.eventType,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        location: events.location,
        capacity: events.capacity,
        goalAmountCents: events.goalAmountCents,
        registrationCount: sql<number>`(
          select count(*)::int from ${eventRegistrations}
          where ${eventRegistrations.eventId} = ${events.id}
            and coalesce(${eventRegistrations.status}, '') <> 'cancelled'
        )`,
      })
      .from(events)
      .where(whereClause)
      .orderBy(desc(events.startsAt), asc(events.name))
      .limit(EVENTS_PAGE_SIZE)
      .offset((params.page - 1) * EVENTS_PAGE_SIZE);

    return { rows, total };
  });
}

export interface EventDetail {
  id: string;
  name: string;
  eventType: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  location: string | null;
  capacity: number | null;
  goalAmountCents: number | null;
  description: string | null;
}

export async function getEventDetail(tenantId: string, id: string): Promise<EventDetail | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: events.id,
        name: events.name,
        eventType: events.eventType,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        location: events.location,
        capacity: events.capacity,
        goalAmountCents: events.goalAmountCents,
        description: events.description,
      })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function getEventRevenue(tenantId: string, id: string): Promise<EventRevenue> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const registrationRows = await tx
      .select({
        status: eventRegistrations.status,
        feeAmountCents: eventRegistrations.feeAmountCents,
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, id));

    const giftRows = await tx
      .select({ amountCents: gifts.amountCents })
      .from(gifts)
      .where(eq(gifts.eventId, id));

    return computeEventRevenue(registrationRows, giftRows);
  });
}

function eventValues(input: EventInput) {
  return {
    name: input.name,
    eventType: input.eventType,
    startsAt: dateInputToTimestamp(input.startsAt),
    endsAt: input.endsAt ? dateInputToTimestamp(input.endsAt) : null,
    location: input.location ?? null,
    capacity: input.capacity ?? null,
    goalAmountCents: input.goalAmountCents ?? null,
    description: input.description ?? null,
  };
}

export async function createEvent(tenantId: string, input: EventInput): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(events)
      .values({ tenantId, ...eventValues(input) })
      .returning({ id: events.id });
    const row = rows[0];
    if (!row) throw new Error("createEvent: insert returned no rows");
    return row.id;
  });
}

export async function updateEvent(tenantId: string, id: string, input: EventInput): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.update(events).set(eventValues(input)).where(eq(events.id, id));
  });
}

export async function deleteEvent(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(events).where(eq(events.id, id));
  });
}

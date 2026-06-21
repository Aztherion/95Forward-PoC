import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { constituents, volunteerHours, volunteerOpportunities, withTenant } from "@95forward/db";
import type { VolunteerHoursInput, VolunteerOpportunityInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { escapeLike } from "@/lib/sql";
import { dateInputToTimestamp } from "@/lib/event-params";

export interface VolunteerRosterRow {
  id: string;
  name: string;
  totalHours: number;
  opportunityCount: number;
  lastActivity: string | null;
}

export interface OpportunityListRow {
  id: string;
  name: string;
  startsAt: Date | null;
  location: string | null;
  capacity: number | null;
  totalHours: number;
}

export interface OpportunityDetail {
  id: string;
  name: string;
  description: string | null;
  startsAt: Date | null;
  location: string | null;
  capacity: number | null;
}

export interface OpportunityHoursRow {
  id: string;
  constituentId: string;
  constituentName: string;
  hours: number;
  loggedDate: string;
}

export interface ConstituentVolunteerActivity {
  totalHours: number;
  entries: {
    id: string;
    opportunityId: string;
    opportunityName: string;
    hours: number;
    loggedDate: string;
  }[];
}

export async function getVolunteerRoster(
  tenantId: string,
  search: string,
): Promise<VolunteerRosterRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const conditions: SQL[] = [];
    const isVolunteer = or(
      eq(constituents.volunteer, true),
      sql`exists (
        select 1 from ${volunteerHours}
        where ${volunteerHours.constituentId} = ${constituents.id}
      )`,
    );
    if (isVolunteer) conditions.push(isVolunteer);
    if (search) {
      const like = ilike(constituents.displayName, `%${escapeLike(search)}%`);
      if (like) conditions.push(like);
    }

    return tx
      .select({
        id: constituents.id,
        name: constituents.displayName,
        totalHours: sql<string>`coalesce(sum(${volunteerHours.hours}), 0)`,
        opportunityCount: sql<number>`count(distinct ${volunteerHours.opportunityId})::int`,
        lastActivity: sql<string | null>`max(${volunteerHours.loggedDate})`,
      })
      .from(constituents)
      .leftJoin(volunteerHours, eq(volunteerHours.constituentId, constituents.id))
      .where(and(...conditions))
      .groupBy(constituents.id, constituents.displayName)
      .orderBy(asc(constituents.displayName))
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          totalHours: Number(row.totalHours),
          opportunityCount: row.opportunityCount,
          lastActivity: row.lastActivity,
        })),
      );
  });
}

export async function getOpportunitiesList(tenantId: string): Promise<OpportunityListRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: volunteerOpportunities.id,
        name: volunteerOpportunities.name,
        startsAt: volunteerOpportunities.startsAt,
        location: volunteerOpportunities.location,
        capacity: volunteerOpportunities.capacity,
        totalHours: sql<string>`coalesce(sum(${volunteerHours.hours}), 0)`,
      })
      .from(volunteerOpportunities)
      .leftJoin(volunteerHours, eq(volunteerHours.opportunityId, volunteerOpportunities.id))
      .groupBy(
        volunteerOpportunities.id,
        volunteerOpportunities.name,
        volunteerOpportunities.startsAt,
        volunteerOpportunities.location,
        volunteerOpportunities.capacity,
      )
      .orderBy(desc(volunteerOpportunities.startsAt), asc(volunteerOpportunities.name));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      startsAt: row.startsAt,
      location: row.location,
      capacity: row.capacity,
      totalHours: Number(row.totalHours),
    }));
  });
}

export async function getOpportunityDetail(
  tenantId: string,
  id: string,
): Promise<OpportunityDetail | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: volunteerOpportunities.id,
        name: volunteerOpportunities.name,
        description: volunteerOpportunities.description,
        startsAt: volunteerOpportunities.startsAt,
        location: volunteerOpportunities.location,
        capacity: volunteerOpportunities.capacity,
      })
      .from(volunteerOpportunities)
      .where(eq(volunteerOpportunities.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function getOpportunityHours(
  tenantId: string,
  opportunityId: string,
): Promise<OpportunityHoursRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: volunteerHours.id,
        constituentId: volunteerHours.constituentId,
        constituentName: constituents.displayName,
        hours: volunteerHours.hours,
        loggedDate: volunteerHours.loggedDate,
      })
      .from(volunteerHours)
      .innerJoin(constituents, eq(constituents.id, volunteerHours.constituentId))
      .where(eq(volunteerHours.opportunityId, opportunityId))
      .orderBy(desc(volunteerHours.loggedDate), asc(constituents.displayName));

    return rows.map((row) => ({
      id: row.id,
      constituentId: row.constituentId,
      constituentName: row.constituentName,
      hours: Number(row.hours),
      loggedDate: row.loggedDate,
    }));
  });
}

export async function getConstituentVolunteerActivity(
  tenantId: string,
  constituentId: string,
): Promise<ConstituentVolunteerActivity> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: volunteerHours.id,
        opportunityId: volunteerHours.opportunityId,
        opportunityName: volunteerOpportunities.name,
        hours: volunteerHours.hours,
        loggedDate: volunteerHours.loggedDate,
      })
      .from(volunteerHours)
      .innerJoin(
        volunteerOpportunities,
        eq(volunteerOpportunities.id, volunteerHours.opportunityId),
      )
      .where(eq(volunteerHours.constituentId, constituentId))
      .orderBy(desc(volunteerHours.loggedDate), asc(volunteerOpportunities.name));

    const entries = rows.map((row) => ({
      id: row.id,
      opportunityId: row.opportunityId,
      opportunityName: row.opportunityName,
      hours: Number(row.hours),
      loggedDate: row.loggedDate,
    }));

    return {
      totalHours: entries.reduce((sum, entry) => sum + entry.hours, 0),
      entries,
    };
  });
}

function opportunityValues(input: VolunteerOpportunityInput) {
  return {
    name: input.name,
    startsAt: input.startsAt ? dateInputToTimestamp(input.startsAt) : null,
    location: input.location ?? null,
    capacity: input.capacity ?? null,
    description: input.description ?? null,
  };
}

export async function createOpportunity(
  tenantId: string,
  input: VolunteerOpportunityInput,
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(volunteerOpportunities)
      .values({ tenantId, ...opportunityValues(input) })
      .returning({ id: volunteerOpportunities.id });
    const row = rows[0];
    if (!row) throw new Error("createOpportunity: insert returned no rows");
    return row.id;
  });
}

export async function updateOpportunity(
  tenantId: string,
  id: string,
  input: VolunteerOpportunityInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(volunteerOpportunities)
      .set(opportunityValues(input))
      .where(eq(volunteerOpportunities.id, id));
  });
}

export async function deleteOpportunity(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(volunteerOpportunities).where(eq(volunteerOpportunities.id, id));
  });
}

export async function logHours(tenantId: string, input: VolunteerHoursInput): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.insert(volunteerHours).values({
      tenantId,
      constituentId: input.constituentId,
      opportunityId: input.opportunityId,
      hours: input.hours.toFixed(2),
      loggedDate: input.loggedDate,
    });
  });
}

export async function deleteHours(tenantId: string, id: string): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .delete(volunteerHours)
      .where(eq(volunteerHours.id, id))
      .returning({ opportunityId: volunteerHours.opportunityId });
    return rows[0]?.opportunityId ?? null;
  });
}

export async function markConstituentVolunteer(
  tenantId: string,
  constituentId: string,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(constituents)
      .set({ volunteer: true })
      .where(eq(constituents.id, constituentId));
  });
}

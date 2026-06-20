import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { constituents, eventRegistrations, withTenant } from "@95forward/db";
import { REGISTRATION_STATUSES, type RegistrationInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";

type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export interface RegistrationRow {
  id: string;
  constituentId: string;
  constituentName: string;
  status: string | null;
  attended: boolean;
  guestCount: number;
  feeAmountCents: number | null;
}

export async function getEventRegistrations(
  tenantId: string,
  eventId: string,
): Promise<RegistrationRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    return tx
      .select({
        id: eventRegistrations.id,
        constituentId: eventRegistrations.constituentId,
        constituentName: constituents.displayName,
        status: eventRegistrations.status,
        attended: eventRegistrations.attended,
        guestCount: eventRegistrations.guestCount,
        feeAmountCents: eventRegistrations.feeAmountCents,
      })
      .from(eventRegistrations)
      .innerJoin(constituents, eq(constituents.id, eventRegistrations.constituentId))
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(asc(constituents.displayName));
  });
}

export async function createRegistration(
  tenantId: string,
  input: RegistrationInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.insert(eventRegistrations).values({
      tenantId,
      eventId: input.eventId,
      constituentId: input.constituentId,
      status: input.status,
      guestCount: input.guestCount,
      feeAmountCents: input.feeAmountCents ?? null,
      attended: input.attended,
    });
  });
}

export async function toggleRegistrationAttended(
  tenantId: string,
  registrationId: string,
): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .update(eventRegistrations)
      .set({ attended: sql`not ${eventRegistrations.attended}` })
      .where(eq(eventRegistrations.id, registrationId))
      .returning({ eventId: eventRegistrations.eventId });
    return rows[0]?.eventId ?? null;
  });
}

export async function setRegistrationStatus(
  tenantId: string,
  registrationId: string,
  status: RegistrationStatus,
): Promise<string | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .update(eventRegistrations)
      .set({ status })
      .where(eq(eventRegistrations.id, registrationId))
      .returning({ eventId: eventRegistrations.eventId });
    return rows[0]?.eventId ?? null;
  });
}

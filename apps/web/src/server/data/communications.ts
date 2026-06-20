import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { marketingMessages, segments, withTenant } from "@95forward/db";
import {
  savedListDefinitionSchema,
  type CommunicationInput,
  type SavedListDefinition,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { countList } from "@/server/data/run-list";
import {
  normalizeStatus,
  scheduledDateToTimestamp,
  type MarketingChannel,
  type MarketingStatus,
} from "@/lib/marketing-format";

export interface CommunicationRow {
  id: string;
  name: string;
  channel: MarketingChannel;
  segmentId: string | null;
  segmentName: string | null;
  subject: string | null;
  status: MarketingStatus;
  scheduledAt: Date | null;
  sentAt: Date | null;
}

export interface CommunicationDetail extends CommunicationRow {
  body: string | null;
  recipientCount: number | null;
}

function parseDefinition(value: unknown): SavedListDefinition {
  const result = savedListDefinitionSchema.safeParse(value);
  return result.success ? result.data : { filters: [] };
}

export async function listCommunications(tenantId: string): Promise<CommunicationRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: marketingMessages.id,
        name: marketingMessages.name,
        channel: marketingMessages.channel,
        segmentId: marketingMessages.segmentId,
        segmentName: segments.name,
        subject: marketingMessages.subject,
        status: marketingMessages.status,
        scheduledAt: marketingMessages.scheduledAt,
        sentAt: marketingMessages.sentAt,
      })
      .from(marketingMessages)
      .leftJoin(segments, eq(segments.id, marketingMessages.segmentId))
      .orderBy(desc(marketingMessages.createdAt), asc(marketingMessages.name));
    return rows.map((row) => ({
      ...row,
      status: normalizeStatus(row.status),
    }));
  });
}

export async function getCommunication(
  tenantId: string,
  id: string,
): Promise<CommunicationDetail | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: marketingMessages.id,
        name: marketingMessages.name,
        channel: marketingMessages.channel,
        segmentId: marketingMessages.segmentId,
        segmentName: segments.name,
        subject: marketingMessages.subject,
        body: marketingMessages.body,
        status: marketingMessages.status,
        scheduledAt: marketingMessages.scheduledAt,
        sentAt: marketingMessages.sentAt,
        definition: segments.definition,
      })
      .from(marketingMessages)
      .leftJoin(segments, eq(segments.id, marketingMessages.segmentId))
      .where(eq(marketingMessages.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    const recipientCount = row.segmentId
      ? await countList(tenantId, "constituent", parseDefinition(row.definition))
      : null;

    return {
      id: row.id,
      name: row.name,
      channel: row.channel,
      segmentId: row.segmentId,
      segmentName: row.segmentName,
      subject: row.subject,
      body: row.body,
      status: normalizeStatus(row.status),
      scheduledAt: row.scheduledAt,
      sentAt: row.sentAt,
      recipientCount,
    };
  });
}

function communicationValues(input: CommunicationInput) {
  return {
    name: input.name,
    channel: input.channel,
    segmentId: input.segmentId ?? null,
    subject: input.subject ?? null,
    body: input.body ?? null,
    status: input.status,
    scheduledAt: input.status === "scheduled" ? scheduledDateToTimestamp(input.scheduledAt) : null,
  };
}

export async function createCommunication(
  tenantId: string,
  input: CommunicationInput,
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(marketingMessages)
      .values({ tenantId, ...communicationValues(input) })
      .returning({ id: marketingMessages.id });
    const row = rows[0];
    if (!row) throw new Error("createCommunication: insert returned no rows");
    return row.id;
  });
}

export async function updateCommunication(
  tenantId: string,
  id: string,
  input: CommunicationInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(marketingMessages)
      .set(communicationValues(input))
      .where(eq(marketingMessages.id, id));
  });
}

export async function deleteCommunication(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(marketingMessages).where(eq(marketingMessages.id, id));
  });
}

export async function sendCommunicationNow(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(marketingMessages)
      .set({ status: "sent", sentAt: new Date(), scheduledAt: null })
      .where(eq(marketingMessages.id, id));
  });
}

export async function scheduleCommunication(
  tenantId: string,
  id: string,
  scheduledAt: Date,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(marketingMessages)
      .set({ status: "scheduled", scheduledAt, sentAt: null })
      .where(eq(marketingMessages.id, id));
  });
}

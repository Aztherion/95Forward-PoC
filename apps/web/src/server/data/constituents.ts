import "server-only";
import { escapeLike } from "@/lib/sql";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  constituentTags,
  constituents,
  gifts,
  interactions,
  relationships,
  tags,
  users,
  withTenant,
} from "@95forward/db";
import type { ConstituentInput, InteractionInput, RelationshipInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { CONSTITUENTS_PAGE_SIZE, type ConstituentListParams } from "@/lib/list-params";

export interface ConstituentListRow {
  id: string;
  displayName: string;
  type: "individual" | "organization" | "foundation";
  prospectStatus: string;
  city: string | null;
  region: string | null;
  assignedUserName: string | null;
  archivedAt: Date | null;
  lifetimeGivingCents: number;
  lastGiftCents: number | null;
  lastGiftDate: string | null;
  lastContactAt: Date | null;
}

export interface ConstituentListResult {
  rows: ConstituentListRow[];
  total: number;
}

const lifetimeSql = sql<number>`coalesce(sum(${gifts.amountCents}), 0)`;
const lastGiftDateSql = sql<string | null>`max(${gifts.giftDate})`;
const lastContactSql = sql<Date | null>`max(${interactions.occurredAt})`;

export async function getConstituentsList(
  tenantId: string,
  params: ConstituentListParams,
): Promise<ConstituentListResult> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const conditions: SQL[] = [];

    if (params.showArchived) {
      conditions.push(isNotNull(constituents.archivedAt));
    } else {
      conditions.push(isNull(constituents.archivedAt));
    }

    if (params.search) {
      const term = `%${escapeLike(params.search)}%`;
      const searchCondition = or(
        ilike(constituents.displayName, term),
        ilike(constituents.email, term),
        ilike(constituents.organizationName, term),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (params.type) conditions.push(eq(constituents.type, params.type));
    if (params.status) conditions.push(eq(constituents.prospectStatus, params.status));
    if (params.assignedUserId)
      conditions.push(eq(constituents.assignedUserId, params.assignedUserId));

    if (params.tagId) {
      const tagged = tx
        .select({ id: constituentTags.constituentId })
        .from(constituentTags)
        .where(eq(constituentTags.tagId, params.tagId));
      conditions.push(inArray(constituents.id, tagged));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(constituents)
      .where(whereClause);
    const total = totalRows[0]?.count ?? 0;

    const orderBy = buildOrderBy(params);

    const rows = await tx
      .select({
        id: constituents.id,
        displayName: constituents.displayName,
        type: constituents.type,
        prospectStatus: constituents.prospectStatus,
        city: constituents.city,
        region: constituents.region,
        assignedUserName: users.name,
        archivedAt: constituents.archivedAt,
        lifetimeGivingCents: lifetimeSql,
        lastGiftDate: lastGiftDateSql,
        lastContactAt: lastContactSql,
      })
      .from(constituents)
      .leftJoin(users, eq(users.id, constituents.assignedUserId))
      .leftJoin(gifts, eq(gifts.constituentId, constituents.id))
      .leftJoin(interactions, eq(interactions.constituentId, constituents.id))
      .where(whereClause)
      .groupBy(constituents.id, users.name)
      .orderBy(...orderBy)
      .limit(CONSTITUENTS_PAGE_SIZE)
      .offset((params.page - 1) * CONSTITUENTS_PAGE_SIZE);

    const pageIds = rows.map((row) => row.id);
    const lastGiftAmounts = await loadLastGiftAmounts(tx, pageIds);

    const result: ConstituentListRow[] = rows.map((row) => {
      const last = row.lastGiftDate ? (lastGiftAmounts.get(row.id) ?? null) : null;
      return {
        id: row.id,
        displayName: row.displayName,
        type: row.type,
        prospectStatus: row.prospectStatus,
        city: row.city,
        region: row.region,
        assignedUserName: row.assignedUserName,
        archivedAt: row.archivedAt,
        lifetimeGivingCents: Number(row.lifetimeGivingCents ?? 0),
        lastGiftCents: last?.amountCents ?? null,
        lastGiftDate: row.lastGiftDate,
        lastContactAt: row.lastContactAt,
      };
    });

    return { rows: result, total };
  });
}

type Tx = Parameters<Parameters<typeof withTenant<unknown>>[2]>[0];

async function loadLastGiftAmounts(
  tx: Tx,
  constituentIds: string[],
): Promise<Map<string, { amountCents: number; giftDate: string }>> {
  const map = new Map<string, { amountCents: number; giftDate: string }>();
  if (constituentIds.length === 0) return map;
  const rows = await tx
    .select({
      constituentId: gifts.constituentId,
      amountCents: gifts.amountCents,
      giftDate: gifts.giftDate,
    })
    .from(gifts)
    .where(inArray(gifts.constituentId, constituentIds))
    .orderBy(asc(gifts.constituentId), desc(gifts.giftDate));
  for (const row of rows) {
    if (!map.has(row.constituentId)) {
      map.set(row.constituentId, { amountCents: row.amountCents, giftDate: row.giftDate });
    }
  }
  return map;
}

function buildOrderBy(params: ConstituentListParams): SQL[] {
  const direction = params.dir === "desc" ? desc : asc;
  switch (params.sort) {
    case "type":
      return [direction(constituents.type), asc(constituents.displayName)];
    case "lifetimeGiving":
      return [direction(lifetimeSql), asc(constituents.displayName)];
    case "lastGift":
      return [direction(lastGiftDateSql), asc(constituents.displayName)];
    case "lastContact":
      return [direction(lastContactSql), asc(constituents.displayName)];
    case "prospectStatus":
      return [direction(constituents.prospectStatus), asc(constituents.displayName)];
    case "city":
      return [direction(constituents.city), asc(constituents.displayName)];
    case "assignedTo":
      return [direction(users.name), asc(constituents.displayName)];
    case "displayName":
    default:
      return [direction(constituents.displayName)];
  }
}

export type ConstituentDetail = NonNullable<Awaited<ReturnType<typeof getConstituentDetail>>>;

export async function getConstituentDetail(tenantId: string, id: string) {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const record = await tx.query.constituents.findFirst({
      where: eq(constituents.id, id),
      with: {
        assignedUser: { columns: { id: true, name: true } },
        gifts: {
          orderBy: [desc(gifts.giftDate)],
          with: {
            fund: { columns: { id: true, name: true } },
            campaign: { columns: { id: true, name: true } },
            appeal: { columns: { id: true, name: true } },
          },
        },
        interactions: {
          orderBy: [desc(interactions.occurredAt)],
          with: { owner: { columns: { id: true, name: true } } },
        },
        constituentTags: {
          with: { tag: { columns: { id: true, name: true } } },
        },
        relationshipsFrom: {
          orderBy: [asc(relationships.createdAt)],
          with: { toConstituent: { columns: { id: true, displayName: true, type: true } } },
        },
      },
    });
    return record ?? null;
  });
}

export async function constituentHasGifts(tenantId: string, id: string): Promise<boolean> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({ id: gifts.id })
      .from(gifts)
      .where(eq(gifts.constituentId, id))
      .limit(1);
    return rows.length > 0;
  });
}

export async function searchConstituents(
  tenantId: string,
  term: string,
  excludeId: string,
): Promise<{ id: string; displayName: string }[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const conditions: SQL[] = [];
    const notSelf = sql`${constituents.id} <> ${excludeId}`;
    conditions.push(notSelf);
    conditions.push(isNull(constituents.archivedAt));
    if (term.trim()) {
      const like = ilike(constituents.displayName, `%${escapeLike(term.trim())}%`);
      if (like) conditions.push(like);
    }
    const rows = await tx
      .select({ id: constituents.id, displayName: constituents.displayName })
      .from(constituents)
      .where(and(...conditions))
      .orderBy(asc(constituents.displayName))
      .limit(25);
    return rows;
  });
}

function constituentValues(input: ConstituentInput) {
  return {
    type: input.type,
    displayName: input.displayName,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    organizationName: input.organizationName ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    addressLine1: input.addressLine1 ?? null,
    addressLine2: input.addressLine2 ?? null,
    city: input.city ?? null,
    region: input.region ?? null,
    postalCode: input.postalCode ?? null,
    country: input.country ?? null,
    prospectStatus: input.prospectStatus,
    assignedUserId: input.assignedUserId ?? null,
    boardMember: input.boardMember,
    volunteer: input.volunteer,
    wavemakerMonthly: input.wavemakerMonthly,
    legacy: input.legacy,
  };
}

export async function createConstituent(
  tenantId: string,
  input: ConstituentInput,
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(constituents)
      .values({ tenantId, ...constituentValues(input) })
      .returning({ id: constituents.id });
    const row = rows[0];
    if (!row) throw new Error("createConstituent: insert returned no rows");
    return row.id;
  });
}

export async function updateConstituent(
  tenantId: string,
  id: string,
  input: ConstituentInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.update(constituents).set(constituentValues(input)).where(eq(constituents.id, id));
  });
}

export async function archiveOrDeleteConstituent(
  tenantId: string,
  id: string,
): Promise<"archived" | "deleted"> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const giftRows = await tx
      .select({ id: gifts.id })
      .from(gifts)
      .where(eq(gifts.constituentId, id))
      .limit(1);
    if (giftRows.length > 0) {
      await tx.update(constituents).set({ archivedAt: new Date() }).where(eq(constituents.id, id));
      return "archived";
    }
    await tx.delete(constituents).where(eq(constituents.id, id));
    return "deleted";
  });
}

export async function addInteraction(tenantId: string, input: InteractionInput): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.insert(interactions).values({
      tenantId,
      constituentId: input.constituentId,
      type: input.type,
      occurredAt: new Date(`${input.occurredAt}T12:00:00Z`),
      summary: input.summary ?? null,
      ownerUserId: input.ownerUserId ?? null,
    });
  });
}

export async function updateInteraction(
  tenantId: string,
  interactionId: string,
  input: InteractionInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(interactions)
      .set({
        type: input.type,
        occurredAt: new Date(`${input.occurredAt}T12:00:00Z`),
        summary: input.summary ?? null,
        ownerUserId: input.ownerUserId ?? null,
      })
      .where(eq(interactions.id, interactionId));
  });
}

export async function deleteInteraction(tenantId: string, interactionId: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(interactions).where(eq(interactions.id, interactionId));
  });
}

export async function addRelationship(tenantId: string, input: RelationshipInput): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.insert(relationships).values({
      tenantId,
      fromConstituentId: input.fromConstituentId,
      toConstituentId: input.toConstituentId ?? null,
      externalName: input.externalName ?? null,
      type: input.type,
      note: input.note ?? null,
    });
  });
}

export async function deleteRelationship(tenantId: string, relationshipId: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(relationships).where(eq(relationships.id, relationshipId));
  });
}

export async function addTagToConstituent(
  tenantId: string,
  constituentId: string,
  tagId: string | undefined,
  newTagName: string | undefined,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    let resolvedTagId = tagId;
    if (!resolvedTagId && newTagName) {
      const existing = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.name, newTagName))
        .limit(1);
      if (existing[0]) {
        resolvedTagId = existing[0].id;
      } else {
        const inserted = await tx
          .insert(tags)
          .values({ tenantId, name: newTagName })
          .returning({ id: tags.id });
        resolvedTagId = inserted[0]?.id;
      }
    }
    if (!resolvedTagId) return;
    await tx
      .insert(constituentTags)
      .values({ tenantId, constituentId, tagId: resolvedTagId })
      .onConflictDoNothing({
        target: [constituentTags.tenantId, constituentTags.constituentId, constituentTags.tagId],
      });
  });
}

export async function removeTagFromConstituent(
  tenantId: string,
  constituentId: string,
  tagId: string,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .delete(constituentTags)
      .where(
        and(eq(constituentTags.constituentId, constituentId), eq(constituentTags.tagId, tagId)),
      );
  });
}

import "server-only";
import { escapeLike } from "@/lib/sql";
import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { constituents, interactions, users, withTenant } from "@95forward/db";
import { getAppDb } from "@/server/db";
import { INTERACTIONS_PAGE_SIZE, type InteractionListParams } from "@/lib/interaction-params";

export interface InteractionListRow {
  id: string;
  constituentId: string;
  constituentName: string;
  type: string;
  occurredAt: Date;
  summary: string | null;
  ownerName: string | null;
}

export interface InteractionListResult {
  rows: InteractionListRow[];
  total: number;
}

function buildInteractionConditions(params: InteractionListParams): SQL[] {
  const conditions: SQL[] = [];

  if (params.search) {
    const term = `%${escapeLike(params.search)}%`;
    const like = or(ilike(constituents.displayName, term), ilike(interactions.summary, term));
    if (like) conditions.push(like);
  }
  if (params.type) conditions.push(eq(interactions.type, params.type));
  if (params.ownerUserId) conditions.push(eq(interactions.ownerUserId, params.ownerUserId));
  if (params.constituentId) conditions.push(eq(interactions.constituentId, params.constituentId));
  if (params.from)
    conditions.push(gte(interactions.occurredAt, new Date(`${params.from}T00:00:00Z`)));
  if (params.to) conditions.push(lte(interactions.occurredAt, new Date(`${params.to}T23:59:59Z`)));

  return conditions;
}

function buildInteractionOrderBy(params: InteractionListParams): SQL[] {
  const direction = params.dir === "asc" ? asc : desc;
  switch (params.sort) {
    case "type":
      return [direction(interactions.type), desc(interactions.occurredAt)];
    case "constituent":
      return [direction(constituents.displayName), desc(interactions.occurredAt)];
    case "owner":
      return [direction(users.name), desc(interactions.occurredAt)];
    case "occurredAt":
    default:
      return [direction(interactions.occurredAt), desc(interactions.createdAt)];
  }
}

export async function getInteractionsList(
  tenantId: string,
  params: InteractionListParams,
): Promise<InteractionListResult> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const conditions = buildInteractionConditions(params);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(interactions)
      .innerJoin(constituents, eq(constituents.id, interactions.constituentId))
      .leftJoin(users, eq(users.id, interactions.ownerUserId))
      .where(whereClause);
    const total = totalRows[0]?.count ?? 0;

    const orderBy = buildInteractionOrderBy(params);

    const rows = await tx
      .select({
        id: interactions.id,
        constituentId: interactions.constituentId,
        constituentName: constituents.displayName,
        type: interactions.type,
        occurredAt: interactions.occurredAt,
        summary: interactions.summary,
        ownerName: users.name,
      })
      .from(interactions)
      .innerJoin(constituents, eq(constituents.id, interactions.constituentId))
      .leftJoin(users, eq(users.id, interactions.ownerUserId))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(INTERACTIONS_PAGE_SIZE)
      .offset((params.page - 1) * INTERACTIONS_PAGE_SIZE);

    return { rows, total };
  });
}

import "server-only";
import { asc, isNull } from "drizzle-orm";
import { constituents, tags, users, withTenant } from "@95forward/db";
import { getAppDb } from "@/server/db";

export interface UserRef {
  id: string;
  name: string;
}

export interface TagRef {
  id: string;
  name: string;
}

export interface ConstituentRef {
  id: string;
  name: string;
}

export async function listConstituentRefs(tenantId: string): Promise<ConstituentRef[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({ id: constituents.id, name: constituents.displayName })
      .from(constituents)
      .where(isNull(constituents.archivedAt))
      .orderBy(asc(constituents.displayName));
    return rows;
  });
}

export async function listUsers(tenantId: string): Promise<UserRef[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx.query.users.findMany({
      orderBy: [asc(users.name)],
      columns: { id: true, name: true },
    });
    return rows;
  });
}

export async function listTags(tenantId: string): Promise<TagRef[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx.query.tags.findMany({
      orderBy: [asc(tags.name)],
      columns: { id: true, name: true },
    });
    return rows;
  });
}

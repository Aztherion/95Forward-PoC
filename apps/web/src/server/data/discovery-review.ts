import "server-only";
import { and, eq } from "drizzle-orm";
import { candidates, withTenant } from "@95forward/db";
import { markDiscoveryReviewedIfComplete } from "@95forward/ai";
import { getAppDb } from "@/server/db";

// After a candidate is decided, advance its discovery task ready -> reviewed if the whole batch is
// now resolved. Resolves the candidate's task id, then delegates to the shared AI completion check.
export async function markDiscoveryReviewedForCandidate(
  tenantId: string,
  candidateId: string,
): Promise<void> {
  const db = getAppDb();
  const discoveryTaskId = await withTenant(db, tenantId, async (tx) => {
    const rows = await tx
      .select({ discoveryTaskId: candidates.discoveryTaskId })
      .from(candidates)
      .where(and(eq(candidates.id, candidateId), eq(candidates.tenantId, tenantId)))
      .limit(1);
    return rows[0]?.discoveryTaskId ?? null;
  });
  if (discoveryTaskId === null) return;
  await markDiscoveryReviewedIfComplete(db, tenantId, discoveryTaskId);
}

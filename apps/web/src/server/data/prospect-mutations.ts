import "server-only";
import { eq } from "drizzle-orm";
import { naturalPartners, prospects, qpiAssessments, withTenant } from "@95forward/db";
import type { NaturalPartnerInput, QpiOverrideInput, RmAssignInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";

// A human override of one QPI dimension upserts the assessment row (one per prospect+dimension) and
// stamps the editor; the score recomputes from these stored rows on the next read. An "unknown"
// override clears the rating and flags the gap rather than guessing a value.
export async function overrideQpiAssessment(
  tenantId: string,
  userId: string,
  input: QpiOverrideInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    const values = {
      rating: input.isUnknown ? null : (input.rating ?? null),
      isUnknown: input.isUnknown,
      rationale: input.rationale ?? null,
      source: input.source ?? null,
      updatedByUserId: userId,
    };
    await tx
      .insert(qpiAssessments)
      .values({
        tenantId,
        prospectId: input.prospectId,
        dimension: input.dimension,
        ...values,
      })
      .onConflictDoUpdate({
        target: [qpiAssessments.tenantId, qpiAssessments.prospectId, qpiAssessments.dimension],
        set: values,
      });
  });
}

export async function assignRm(tenantId: string, input: RmAssignInput): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(prospects)
      .set({ rmUserId: input.rmUserId ?? null })
      .where(eq(prospects.id, input.prospectId));
  });
}

export async function addNaturalPartner(
  tenantId: string,
  input: NaturalPartnerInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.insert(naturalPartners).values({
      tenantId,
      prospectId: input.prospectId,
      userId: input.userId ?? null,
      constituentId: input.constituentId ?? null,
      externalName: input.externalName ?? null,
      role: input.role ?? null,
      warmPathNote: input.warmPathNote ?? null,
    });
  });
}

export async function removeNaturalPartner(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(naturalPartners).where(eq(naturalPartners.id, id));
  });
}

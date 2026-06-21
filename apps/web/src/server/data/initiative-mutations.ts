import "server-only";
import { and, eq } from "drizzle-orm";
import { fundingInitiatives, prospectFundingInitiatives, withTenant } from "@95forward/db";
import type { CultivationAssociationInput, FundingInitiativeInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";

export async function createInitiative(
  tenantId: string,
  input: FundingInitiativeInput,
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(fundingInitiatives)
      .values({
        tenantId,
        name: input.name,
        frame: input.frame,
        story: input.story ?? null,
        goalAmountCents: input.goalAmountCents ?? null,
        timelineStart: input.timelineStart ?? null,
        timelineEnd: input.timelineEnd ?? null,
      })
      .returning({ id: fundingInitiatives.id });
    return rows[0]!.id;
  });
}

export async function attachProspectToInitiative(
  tenantId: string,
  input: CultivationAssociationInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .insert(prospectFundingInitiatives)
      .values({
        tenantId,
        prospectId: input.prospectId,
        fundingInitiativeId: input.fundingInitiativeId,
      })
      .onConflictDoNothing({
        target: [
          prospectFundingInitiatives.tenantId,
          prospectFundingInitiatives.prospectId,
          prospectFundingInitiatives.fundingInitiativeId,
        ],
      });
  });
}

export async function detachProspectFromInitiative(
  tenantId: string,
  input: CultivationAssociationInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .delete(prospectFundingInitiatives)
      .where(
        and(
          eq(prospectFundingInitiatives.tenantId, tenantId),
          eq(prospectFundingInitiatives.prospectId, input.prospectId),
          eq(prospectFundingInitiatives.fundingInitiativeId, input.fundingInitiativeId),
        ),
      );
  });
}

import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { constituents, opportunities, withTenant } from "@95forward/db";
import { getAppDb } from "@/server/db";

export interface PortfolioOpportunityRow {
  id: string;
  constituentId: string;
  constituentName: string;
  stage: string;
  askAmountCents: number | null;
  expectedAmountCents: number | null;
  expectedCloseDate: string | null;
  likelihoodPct: number | null;
}

export async function getPortfolioOpportunities(
  tenantId: string,
  ownerUserId: string,
): Promise<PortfolioOpportunityRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    return tx
      .select({
        id: opportunities.id,
        constituentId: opportunities.constituentId,
        constituentName: constituents.displayName,
        stage: opportunities.stage,
        askAmountCents: opportunities.askAmountCents,
        expectedAmountCents: opportunities.expectedAmountCents,
        expectedCloseDate: opportunities.expectedCloseDate,
        likelihoodPct: opportunities.likelihoodPct,
      })
      .from(opportunities)
      .innerJoin(constituents, eq(constituents.id, opportunities.constituentId))
      .where(eq(opportunities.ownerUserId, ownerUserId))
      .orderBy(desc(opportunities.askAmountCents), asc(constituents.displayName));
  });
}

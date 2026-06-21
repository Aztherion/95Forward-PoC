import "server-only";
import { eq } from "drizzle-orm";
import { tenantSettings, withTenant } from "@95forward/db";
import {
  QPI_DEFAULT_TOGGLES,
  QPI_DEFAULT_WEIGHTS,
  type CopilotToggles,
  type QpiWeights,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";

export interface TenantSettings {
  weights: QpiWeights;
  toggles: CopilotToggles;
}

// The QPI engine reads these same weight_* columns live (getTenantWeights in data/prospects.ts);
// fall back to shared defaults when no row exists yet.
export async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        capacity: tenantSettings.weightCapacity,
        relationship: tenantSettings.weightRelationship,
        timing: tenantSettings.weightTiming,
        gift_history: tenantSettings.weightGiftHistory,
        philanthropy: tenantSettings.weightPhilanthropy,
        researchPublicSources: tenantSettings.researchPublicSources,
        proposeQpiUpdatesAutomatically: tenantSettings.proposeQpiUpdatesAutomatically,
        draft24hFollowups: tenantSettings.draft24hFollowups,
      })
      .from(tenantSettings)
      .limit(1);

    const row = rows[0];
    if (!row) {
      return { weights: { ...QPI_DEFAULT_WEIGHTS }, toggles: { ...QPI_DEFAULT_TOGGLES } };
    }

    return {
      weights: {
        capacity: row.capacity,
        relationship: row.relationship,
        timing: row.timing,
        gift_history: row.gift_history,
        philanthropy: row.philanthropy,
      },
      toggles: {
        research_public_sources: row.researchPublicSources,
        propose_qpi_updates_automatically: row.proposeQpiUpdatesAutomatically,
        draft_24h_followups: row.draft24hFollowups,
      },
    };
  });
}

export async function updateTenantWeights(tenantId: string, weights: QpiWeights): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(tenantSettings)
      .set({
        weightCapacity: weights.capacity,
        weightRelationship: weights.relationship,
        weightTiming: weights.timing,
        weightGiftHistory: weights.gift_history,
        weightPhilanthropy: weights.philanthropy,
      })
      .where(eq(tenantSettings.tenantId, tenantId));
  });
}

export async function updateCopilotToggles(
  tenantId: string,
  toggles: CopilotToggles,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(tenantSettings)
      .set({
        researchPublicSources: toggles.research_public_sources,
        proposeQpiUpdatesAutomatically: toggles.propose_qpi_updates_automatically,
        draft24hFollowups: toggles.draft_24h_followups,
      })
      .where(eq(tenantSettings.tenantId, tenantId));
  });
}

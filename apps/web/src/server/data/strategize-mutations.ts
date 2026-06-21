import "server-only";
import { and, eq } from "drizzle-orm";
import {
  constituents,
  knowledgeBase,
  prospects,
  prospectStrategy,
  relationshipMapEntries,
  researchGaps,
  visits,
  withTenant,
} from "@95forward/db";
import type {
  KnowledgeBaseFieldInput,
  ProspectStrategyFieldInput,
  RelationshipMapEntryInput,
  ResearchGapInput,
  ResearchGapResolveInput,
  VisitPlanInput,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";

export async function updateKnowledgeBaseField(
  tenantId: string,
  input: KnowledgeBaseFieldInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .insert(knowledgeBase)
      .values({ tenantId, prospectId: input.prospectId, [input.field]: input.value ?? null })
      .onConflictDoUpdate({
        target: [knowledgeBase.tenantId, knowledgeBase.prospectId],
        set: { [input.field]: input.value ?? null },
      });
  });
}

export async function addResearchGap(tenantId: string, input: ResearchGapInput): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .insert(researchGaps)
      .values({ tenantId, prospectId: input.prospectId, label: input.label, status: "open" });
  });
}

export async function resolveResearchGap(
  tenantId: string,
  input: ResearchGapResolveInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .update(researchGaps)
      .set({ status: input.status })
      .where(and(eq(researchGaps.tenantId, tenantId), eq(researchGaps.id, input.gapId)));
  });
}

export async function updateStrategyField(
  tenantId: string,
  input: ProspectStrategyFieldInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .insert(prospectStrategy)
      .values({ tenantId, prospectId: input.prospectId, [input.field]: input.value ?? null })
      .onConflictDoUpdate({
        target: [prospectStrategy.tenantId, prospectStrategy.prospectId],
        set: { [input.field]: input.value ?? null },
      });
  });
}

export async function createVisitPlan(tenantId: string, input: VisitPlanInput): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.insert(visits).values({
      tenantId,
      prospectId: input.prospectId,
      goal: input.goal,
      discoveryQuestions: input.discoveryQuestions ?? null,
      team: input.team ?? null,
      locationType: input.locationType ?? null,
      engagementToolNote: input.engagementToolNote ?? null,
    });
  });
}

export async function addRelationshipMapEntry(
  tenantId: string,
  input: RelationshipMapEntryInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    const target = await tx
      .select({ type: constituents.type })
      .from(prospects)
      .innerJoin(constituents, eq(prospects.constituentId, constituents.id))
      .where(eq(prospects.id, input.prospectId))
      .limit(1);
    if (target[0]?.type === "individual") {
      throw new Error(
        "Relationship map entries apply to organization and foundation prospects only",
      );
    }
    await tx.insert(relationshipMapEntries).values({
      tenantId,
      prospectId: input.prospectId,
      name: input.name,
      role: input.role ?? null,
      decisionPower: input.decisionPower ?? null,
      warmPathNote: input.warmPathNote ?? null,
      source: input.source ?? null,
    });
  });
}

export async function removeRelationshipMapEntry(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx
      .delete(relationshipMapEntries)
      .where(and(eq(relationshipMapEntries.tenantId, tenantId), eq(relationshipMapEntries.id, id)));
  });
}

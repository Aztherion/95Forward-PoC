import { and, desc, eq } from "drizzle-orm";
import {
  copilotProposals,
  fundingInitiatives,
  knowledgeBase,
  prospectStrategy,
  qpiAssessments,
  relationshipMapEntries,
  visits,
  withTenant,
  type Database,
  type TenantTransaction,
} from "@95forward/db";
import type { CallerContext, ProposalInput, ProposalStatus, ProposalType } from "./types";

export type ProposalRow = typeof copilotProposals.$inferSelect;

export interface ProposalFilter {
  status?: ProposalStatus;
  proposalType?: ProposalType;
  subjectId?: string;
}

export interface ProposalEdits {
  title?: string;
  summary?: string;
  payload?: unknown;
}

export type ApproveResult =
  | { ok: true; proposal: ProposalRow }
  | { ok: false; reason: "already_decided" };

export type DismissResult =
  | { ok: true; proposal: ProposalRow }
  | { ok: false; reason: "already_decided" };

export async function createProposal(
  db: Database,
  caller: CallerContext,
  input: ProposalInput,
): Promise<string> {
  return withTenant(db, caller.tenantId, async (tx) => {
    const rows = await tx
      .insert(copilotProposals)
      .values({
        tenantId: caller.tenantId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        proposalType: input.proposalType,
        status: "pending",
        title: input.title,
        summary: input.summary ?? null,
        payload: input.payload,
        provenance: input.provenance,
        confidence: input.confidence ?? null,
        taskType: input.taskType ?? null,
        origin: "copilot",
        createdByUserId: caller.id,
      })
      .returning({ id: copilotProposals.id });
    const inserted = rows[0];
    if (inserted === undefined) {
      throw new Error("createProposal: insert returned no row");
    }
    return inserted.id;
  });
}

export async function listProposals(
  db: Database,
  caller: CallerContext,
  filter: ProposalFilter = {},
): Promise<ProposalRow[]> {
  return withTenant(db, caller.tenantId, async (tx) => {
    const conditions = [eq(copilotProposals.tenantId, caller.tenantId)];
    if (filter.status !== undefined) {
      conditions.push(eq(copilotProposals.status, filter.status));
    }
    if (filter.proposalType !== undefined) {
      conditions.push(eq(copilotProposals.proposalType, filter.proposalType));
    }
    if (filter.subjectId !== undefined) {
      conditions.push(eq(copilotProposals.subjectId, filter.subjectId));
    }
    return tx
      .select()
      .from(copilotProposals)
      .where(and(...conditions))
      .orderBy(desc(copilotProposals.createdAt));
  });
}

export async function getProposal(
  db: Database,
  caller: CallerContext,
  id: string,
): Promise<ProposalRow | undefined> {
  return withTenant(db, caller.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(copilotProposals)
      .where(eq(copilotProposals.id, id))
      .limit(1);
    return rows[0];
  });
}

async function applyWriteBack(
  tx: TenantTransaction,
  caller: CallerContext,
  proposal: ProposalRow,
): Promise<boolean> {
  if (proposal.proposalType === "qpi_assessment") {
    const payload = proposal.payload as {
      dimension: string;
      rating?: number | null;
      rationale?: string | null;
      source?: string | null;
    };
    await tx
      .insert(qpiAssessments)
      .values({
        tenantId: caller.tenantId,
        prospectId: proposal.subjectId,
        dimension: payload.dimension as (typeof qpiAssessments.$inferInsert)["dimension"],
        rating: payload.rating ?? null,
        isUnknown: false,
        rationale: payload.rationale ?? null,
        source: payload.source ?? null,
        updatedByUserId: caller.id,
      })
      .onConflictDoUpdate({
        target: [qpiAssessments.tenantId, qpiAssessments.prospectId, qpiAssessments.dimension],
        set: {
          rating: payload.rating ?? null,
          isUnknown: false,
          rationale: payload.rationale ?? null,
          source: payload.source ?? null,
          updatedByUserId: caller.id,
        },
      });
    return true;
  } else if (proposal.proposalType === "knowledge_base_update") {
    const payload = proposal.payload as { field: string; value: string | null };
    const writableFields = [
      "capacitySource",
      "relationshipToCause",
      "connectorsNote",
      "giftHistorySummary",
      "otherPhilanthropy",
      "timingNote",
    ] as const;
    type WritableField = (typeof writableFields)[number];
    if (!writableFields.includes(payload.field as WritableField)) {
      throw new Error(`approveProposal: knowledge_base field '${payload.field}' is not writable`);
    }
    const updated = await tx
      .update(knowledgeBase)
      .set({ [payload.field as WritableField]: payload.value })
      .where(eq(knowledgeBase.prospectId, proposal.subjectId))
      .returning();
    return updated.length > 0;
  } else if (proposal.proposalType === "prospect_strategy") {
    const payload = proposal.payload as { field: string; value: string | null };
    const writableFields = [
      "relationshipGoals",
      "hooks",
      "objections",
      "predispositionPlan",
      "presentationDesign",
      "actionPlan",
    ] as const;
    type StrategyField = (typeof writableFields)[number];
    if (!writableFields.includes(payload.field as StrategyField)) {
      throw new Error(`approveProposal: strategy field '${payload.field}' is not writable`);
    }
    await tx
      .insert(prospectStrategy)
      .values({
        tenantId: caller.tenantId,
        prospectId: proposal.subjectId,
        [payload.field as StrategyField]: payload.value,
      })
      .onConflictDoUpdate({
        target: [prospectStrategy.tenantId, prospectStrategy.prospectId],
        set: { [payload.field as StrategyField]: payload.value },
      });
    return true;
  } else if (proposal.proposalType === "visit_plan") {
    const payload = proposal.payload as { goal: string; discoveryQuestions?: string | null };
    await tx.insert(visits).values({
      tenantId: caller.tenantId,
      prospectId: proposal.subjectId,
      goal: payload.goal,
      discoveryQuestions: payload.discoveryQuestions ?? null,
    });
    return true;
  } else if (proposal.proposalType === "relationship_map_entry") {
    const payload = proposal.payload as {
      name: string;
      role?: string | null;
      decisionPower?: string | null;
      warmPathNote?: string | null;
      source?: string | null;
    };
    await tx.insert(relationshipMapEntries).values({
      tenantId: caller.tenantId,
      prospectId: proposal.subjectId,
      name: payload.name,
      role: payload.role ?? null,
      decisionPower: payload.decisionPower ?? null,
      warmPathNote: payload.warmPathNote ?? null,
      source: payload.source ?? null,
    });
    return true;
  } else if (proposal.proposalType === "funding_initiative_rationale") {
    const payload = proposal.payload as { story: string };
    const updated = await tx
      .update(fundingInitiatives)
      .set({ story: payload.story })
      .where(eq(fundingInitiatives.id, proposal.subjectId))
      .returning();
    return updated.length > 0;
  }
  return false;
}

export async function approveProposal(
  db: Database,
  caller: CallerContext,
  id: string,
  edits?: ProposalEdits,
): Promise<ApproveResult> {
  return withTenant(db, caller.tenantId, async (tx) => {
    const nextStatus: ProposalStatus = edits ? "edited" : "approved";
    const claimed = await tx
      .update(copilotProposals)
      .set({
        status: nextStatus,
        decidedByUserId: caller.id,
        decidedAt: new Date(),
        ...(edits?.title !== undefined ? { title: edits.title } : {}),
        ...(edits?.summary !== undefined ? { summary: edits.summary } : {}),
        ...(edits?.payload !== undefined ? { payload: edits.payload } : {}),
      })
      .where(
        and(
          eq(copilotProposals.id, id),
          eq(copilotProposals.tenantId, caller.tenantId),
          eq(copilotProposals.status, "pending"),
        ),
      )
      .returning();

    const proposal = claimed[0];
    if (proposal === undefined) {
      return { ok: false, reason: "already_decided" };
    }

    const didApply = await applyWriteBack(tx, caller, proposal);

    if (didApply) {
      const applied = await tx
        .update(copilotProposals)
        .set({ applied: true, appliedAt: new Date() })
        .where(eq(copilotProposals.id, proposal.id))
        .returning();
      return { ok: true, proposal: applied[0] ?? proposal };
    }
    return { ok: true, proposal };
  });
}

export async function dismissProposal(
  db: Database,
  caller: CallerContext,
  id: string,
): Promise<DismissResult> {
  return withTenant(db, caller.tenantId, async (tx) => {
    const claimed = await tx
      .update(copilotProposals)
      .set({ status: "dismissed", decidedByUserId: caller.id, decidedAt: new Date() })
      .where(
        and(
          eq(copilotProposals.id, id),
          eq(copilotProposals.tenantId, caller.tenantId),
          eq(copilotProposals.status, "pending"),
        ),
      )
      .returning();
    const proposal = claimed[0];
    if (proposal === undefined) {
      return { ok: false, reason: "already_decided" };
    }
    return { ok: true, proposal };
  });
}

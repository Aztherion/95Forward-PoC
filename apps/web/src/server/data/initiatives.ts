import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  asks,
  fundingInitiatives,
  prospectFundingInitiatives,
  withTenant,
  type TenantTransaction,
} from "@95forward/db";
import { computeQpi, type QpiResult, type QpiWeights } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { getTenantWeights } from "@/server/data/prospects";

export type FundingFrame = "today" | "tomorrow" | "forever";

export interface InitiativeProgress {
  goalCents: number | null;
  committedCents: number;
  pct: number;
}

export interface InitiativeListRow {
  id: string;
  name: string;
  frame: FundingFrame;
  goalCents: number | null;
  timelineStart: string | null;
  timelineEnd: string | null;
  progress: InitiativeProgress;
  prospectCount: number;
}

export interface InitiativeProspect {
  id: string;
  name: string;
  type: string;
  rmName: string | null;
  qpi: QpiResult;
}

export interface InitiativeDetail {
  id: string;
  name: string;
  frame: FundingFrame;
  story: string | null;
  goalCents: number | null;
  timelineStart: string | null;
  timelineEnd: string | null;
  progress: InitiativeProgress;
  prospects: InitiativeProspect[];
}

// Progress is the committed/raised amount toward the goal, derived from asks whose outcome is a
// commitment (I10). pct is clamped to 100 so an over-goal initiative reads as full, not >100%.
function deriveProgress(goalCents: number | null, committedCents: number): InitiativeProgress {
  const pct =
    goalCents && goalCents > 0 ? Math.min(100, Math.round((committedCents / goalCents) * 100)) : 0;
  return { goalCents, committedCents, pct };
}

// SUM(commitment) per initiative across all asks with a commitment outcome — the I9 progress slot.
async function committedByInitiative(
  tx: TenantTransaction,
  tenantId: string,
): Promise<Map<string, number>> {
  const rows = await tx
    .select({
      initiativeId: asks.fundingInitiativeId,
      total: sql<number>`coalesce(sum(${asks.commitmentAmountCents}), 0)::bigint`,
    })
    .from(asks)
    .where(and(eq(asks.tenantId, tenantId), eq(asks.outcome, "commitment")))
    .groupBy(asks.fundingInitiativeId);
  return new Map(rows.map((r) => [r.initiativeId, Number(r.total)]));
}

function qpiOf(
  assessments: { dimension: string; rating: number | null; isUnknown: boolean }[],
  weights: QpiWeights,
): QpiResult {
  return computeQpi(
    assessments.map((a) => ({
      dimension: a.dimension as keyof QpiWeights,
      rating: a.rating,
      isUnknown: a.isUnknown,
    })),
    weights,
  );
}

export async function getInitiativesList(tenantId: string): Promise<InitiativeListRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx.query.fundingInitiatives.findMany({
      orderBy: [asc(fundingInitiatives.name)],
      with: { prospectAssociations: { columns: { id: true } } },
    });
    const committed = await committedByInitiative(tx, tenantId);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      frame: row.frame as FundingFrame,
      goalCents: row.goalAmountCents,
      timelineStart: row.timelineStart,
      timelineEnd: row.timelineEnd,
      progress: deriveProgress(row.goalAmountCents, committed.get(row.id) ?? 0),
      prospectCount: row.prospectAssociations.length,
    }));
  });
}

export async function getInitiativeDetail(
  tenantId: string,
  id: string,
): Promise<InitiativeDetail | null> {
  const weights = await getTenantWeights(tenantId);
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const row = await tx.query.fundingInitiatives.findFirst({
      where: eq(fundingInitiatives.id, id),
      with: {
        prospectAssociations: {
          orderBy: [asc(prospectFundingInitiatives.createdAt)],
          with: {
            prospect: {
              with: {
                constituent: { columns: { displayName: true, type: true } },
                rm: { columns: { name: true } },
                qpiAssessments: {
                  columns: { dimension: true, rating: true, isUnknown: true },
                },
              },
            },
          },
        },
      },
    });
    if (!row) return null;

    const committed = await committedByInitiative(tx, tenantId);

    const prospects = row.prospectAssociations.map((assoc) => ({
      id: assoc.prospect.id,
      name: assoc.prospect.constituent.displayName,
      type: assoc.prospect.constituent.type,
      rmName: assoc.prospect.rm?.name ?? null,
      qpi: qpiOf(assoc.prospect.qpiAssessments, weights),
    }));
    prospects.sort((a, b) => b.qpi.total - a.qpi.total);

    return {
      id: row.id,
      name: row.name,
      frame: row.frame as FundingFrame,
      story: row.story,
      goalCents: row.goalAmountCents,
      timelineStart: row.timelineStart,
      timelineEnd: row.timelineEnd,
      progress: deriveProgress(row.goalAmountCents, committed.get(row.id) ?? 0),
      prospects,
    };
  });
}

export async function listInitiativeRefs(
  tenantId: string,
): Promise<{ id: string; name: string }[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({ id: fundingInitiatives.id, name: fundingInitiatives.name })
      .from(fundingInitiatives)
      .orderBy(asc(fundingInitiatives.name));
    return rows;
  });
}

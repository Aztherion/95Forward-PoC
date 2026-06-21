import "server-only";
import { asc, eq } from "drizzle-orm";
import { fundingInitiatives, prospectFundingInitiatives, withTenant } from "@95forward/db";
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

// Progress is the committed/raised amount toward the goal. Commitments come from asks, which arrive
// in I10 — so until then committed is honestly 0 and pct is 0. The shape is ready for I10 to populate.
function deriveProgress(goalCents: number | null): InitiativeProgress {
  const committedCents = 0;
  const pct = goalCents && goalCents > 0 ? Math.round((committedCents / goalCents) * 100) : 0;
  return { goalCents, committedCents, pct };
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
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      frame: row.frame as FundingFrame,
      goalCents: row.goalAmountCents,
      timelineStart: row.timelineStart,
      timelineEnd: row.timelineEnd,
      progress: deriveProgress(row.goalAmountCents),
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
      progress: deriveProgress(row.goalAmountCents),
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

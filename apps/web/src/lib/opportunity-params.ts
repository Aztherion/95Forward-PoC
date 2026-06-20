import { OPPORTUNITY_STAGES } from "@95forward/shared";
import type { RawSearchParams } from "./list-params";

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export interface OpportunityListParams {
  stage: OpportunityStage | null;
  ownerUserId: string | null;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function parseOpportunityListParams(raw: RawSearchParams): OpportunityListParams {
  const stageRaw = first(raw.stage);
  const stage =
    stageRaw && (OPPORTUNITY_STAGES as readonly string[]).includes(stageRaw)
      ? (stageRaw as OpportunityStage)
      : null;

  const ownerRaw = first(raw.owner);
  const ownerUserId = ownerRaw && isUuid(ownerRaw) ? ownerRaw : null;

  return { stage, ownerUserId };
}

export function opportunityParamsToSearch(params: Partial<OpportunityListParams>): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.stage) sp.set("stage", params.stage);
  if (params.ownerUserId) sp.set("owner", params.ownerUserId);
  return sp;
}

export function hasActiveOpportunityFilters(params: OpportunityListParams): boolean {
  return Boolean(params.stage || params.ownerUserId);
}

export interface StageSummary {
  stage: OpportunityStage;
  count: number;
  totalAskCents: number;
}

export interface OpportunityCountable {
  stage: OpportunityStage;
  askAmountCents: number | null;
}

export function computeStageSummaries(rows: readonly OpportunityCountable[]): StageSummary[] {
  const byStage = new Map<OpportunityStage, StageSummary>();
  for (const stage of OPPORTUNITY_STAGES) {
    byStage.set(stage, { stage, count: 0, totalAskCents: 0 });
  }
  for (const row of rows) {
    const entry = byStage.get(row.stage);
    if (!entry) continue;
    entry.count += 1;
    entry.totalAskCents += row.askAmountCents ?? 0;
  }
  return OPPORTUNITY_STAGES.map((stage) => byStage.get(stage)!);
}

export interface PortfolioStats {
  totalCount: number;
  totalAskCents: number;
  byStage: StageSummary[];
}

export function computePortfolioStats(rows: readonly OpportunityCountable[]): PortfolioStats {
  const byStage = computeStageSummaries(rows);
  const totalCount = byStage.reduce((sum, entry) => sum + entry.count, 0);
  const totalAskCents = byStage.reduce((sum, entry) => sum + entry.totalAskCents, 0);
  return { totalCount, totalAskCents, byStage };
}

import { PROPOSAL_STATUSES } from "@95forward/shared";
import type { RawSearchParams } from "./list-params";

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export interface ProposalListParams {
  status: ProposalStatus | null;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseProposalListParams(raw: RawSearchParams): ProposalListParams {
  const statusRaw = first(raw.status);
  const status =
    statusRaw && (PROPOSAL_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as ProposalStatus)
      : null;
  return { status };
}

export function proposalParamsToSearch(params: Partial<ProposalListParams>): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  return sp;
}

export function hasActiveProposalFilters(params: ProposalListParams): boolean {
  return Boolean(params.status);
}

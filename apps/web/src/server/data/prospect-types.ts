import type { QpiResult } from "@95forward/shared";
import type { ProspectStatus } from "@/lib/prospect-cadence";

export type ProspectType = "individual" | "organization" | "foundation";

export type FundingFrame = "today" | "tomorrow" | "forever";

export interface ProspectListRow {
  id: string;
  rank: number;
  name: string;
  type: ProspectType;
  descriptor: string;
  qpi: QpiResult;
  rmName: string | null;
  partnerName: string | null;
  status: ProspectStatus;
  cadence: string;
  top33: boolean;
  openFollowUpDueAt: Date | null;
  visited: boolean;
  hasAsk: boolean;
}

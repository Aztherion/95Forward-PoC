export type QpiDimension = "capacity" | "relationship" | "timing" | "gift_history" | "philanthropy";

export const QPI_DIMENSIONS: QpiDimension[] = [
  "capacity",
  "relationship",
  "timing",
  "gift_history",
  "philanthropy",
];

export const QPI_MAX_RATING = 5;

export const QPI_DEFAULT_WEIGHTS: Record<QpiDimension, number> = {
  capacity: 7,
  relationship: 6,
  timing: 3,
  gift_history: 2,
  philanthropy: 2,
};

export function qpiMaxPoints(dimension: QpiDimension): number {
  return QPI_DEFAULT_WEIGHTS[dimension] * QPI_MAX_RATING;
}

export interface CopilotToggles {
  research_public_sources: boolean;
  propose_qpi_updates_automatically: boolean;
  draft_24h_followups: boolean;
}

export const QPI_DEFAULT_TOGGLES: CopilotToggles = {
  research_public_sources: true,
  propose_qpi_updates_automatically: true,
  draft_24h_followups: true,
};

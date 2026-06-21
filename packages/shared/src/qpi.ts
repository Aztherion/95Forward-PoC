export type QpiDimension = "capacity" | "relationship" | "timing" | "gift_history" | "philanthropy";

export const QPI_DIMENSIONS: QpiDimension[] = [
  "capacity",
  "relationship",
  "timing",
  "gift_history",
  "philanthropy",
];

export const QPI_MAX_RATING = 5;
export const QPI_MIN_RATING = 1;

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

export type QpiWeights = Record<QpiDimension, number>;

export interface QpiDimensionInput {
  dimension: QpiDimension;
  rating: number | null;
  isUnknown?: boolean;
  rationale?: string | null;
  source?: string | null;
}

export interface QpiDimensionResult {
  dimension: QpiDimension;
  weight: number;
  maxPoints: number;
  rating: number | null;
  isUnknown: boolean;
  points: number;
  rationale: string | null;
  source: string | null;
}

export type QpiBand = "go" | "strong" | "build" | "early";

export interface QpiResult {
  total: number;
  maxTotal: number;
  band: QpiBand;
  knownCount: number;
  unknownCount: number;
  dimensions: QpiDimensionResult[];
}

export function qpiBand(total: number): QpiBand {
  if (total >= 90) return "go";
  if (total >= 70) return "strong";
  if (total >= 50) return "build";
  return "early";
}

// The total is Σ(rating × effective weight). A dimension is a "gap" — contributing 0, never a guessed
// rating — when it is explicitly unknown, has no rating, or has no assessment at all; the score is never
// inflated by fabricated ratings.
export function computeQpi(
  assessments: readonly QpiDimensionInput[],
  weights: QpiWeights = QPI_DEFAULT_WEIGHTS,
): QpiResult {
  const byDimension = new Map(assessments.map((a) => [a.dimension, a]));
  const dimensions: QpiDimensionResult[] = QPI_DIMENSIONS.map((dimension) => {
    const weight = weights[dimension];
    const maxPoints = weight * QPI_MAX_RATING;
    const input = byDimension.get(dimension);
    const isGap = input == null || input.isUnknown === true || input.rating == null;
    const rating = isGap
      ? null
      : Math.min(QPI_MAX_RATING, Math.max(QPI_MIN_RATING, input.rating as number));
    const points = rating === null ? 0 : rating * weight;
    return {
      dimension,
      weight,
      maxPoints,
      rating,
      isUnknown: isGap,
      points,
      rationale: input?.rationale ?? null,
      source: input?.source ?? null,
    };
  });
  const total = dimensions.reduce((sum, d) => sum + d.points, 0);
  const knownCount = dimensions.filter((d) => !d.isUnknown).length;
  const maxTotal = QPI_DIMENSIONS.reduce((sum, d) => sum + weights[d] * QPI_MAX_RATING, 0);
  return {
    total,
    maxTotal,
    band: qpiBand(total),
    knownCount,
    unknownCount: dimensions.length - knownCount,
    dimensions,
  };
}

// Settings validation: with the 1–5 scale, the points sum is Σ(weight × 5); a valid weighting sums to 100.
export function weightsPointsTotal(weights: QpiWeights): number {
  return QPI_DIMENSIONS.reduce((sum, d) => sum + weights[d] * QPI_MAX_RATING, 0);
}

export function weightsSumTo100(weights: QpiWeights): boolean {
  return weightsPointsTotal(weights) === 100;
}

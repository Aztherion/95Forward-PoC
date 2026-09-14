import {
  DATE_CONFIDENCES,
  FORWARD_STAGE_META,
  FORWARD_STAGES,
  PROBABILITY_BANDS,
  VISIT_RATINGS,
  type DateConfidence,
  type ForwardStage,
  type GridGroupBy,
  type GroupSubtotal,
  type ProbabilityBand,
  type VisitRating,
} from "@95forward/shared";
import { formatCurrencyFromCents } from "@/lib/format";

/** Sentence case, because these appear in cells and in selects rather than as headings. */
export const PROBABILITY_LABEL: Record<ProbabilityBand, string> = {
  longshot: "Longshot",
  medium: "Medium",
  high: "High",
  bookable: "Bookable",
  lock: "Lock",
};

export const CONFIDENCE_LABEL: Record<DateConfidence, string> = {
  firm: "Firm",
  semi_firm: "Semi-firm",
  loose: "Loose",
};

export const VISIT_LABEL: Record<VisitRating, string> = {
  poor: "Poor",
  mixed: "Mixed",
  good: "Good",
  strong: "Strong",
};

export const STAGE_OPTIONS = FORWARD_STAGES.map((stage) => ({
  value: stage,
  label: FORWARD_STAGE_META[stage].label,
}));
export const PROBABILITY_OPTIONS = PROBABILITY_BANDS.map((band) => ({
  value: band,
  label: PROBABILITY_LABEL[band],
}));
export const CONFIDENCE_OPTIONS = DATE_CONFIDENCES.map((c) => ({
  value: c,
  label: CONFIDENCE_LABEL[c],
}));
export const VISIT_OPTIONS = [
  { value: "", label: "—" },
  ...VISIT_RATINGS.map((r) => ({ value: r, label: VISIT_LABEL[r] })),
];

export const GROUP_BY_LABEL: Record<GridGroupBy, string> = {
  none: "No grouping",
  owner: "Group by rep",
  initiative: "Group by initiative",
  stage: "Group by stage",
};

/** `Jun 30` — short, because the column is 110px and the year is almost always this one. */
export function shortDate(iso: string | null, today: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][m - 1];
  const thisYear = today.slice(0, 4);
  return String(y) === thisYear ? `${month} ${d}` : `${month} ${d}, ${y}`;
}

/** `81d` / `—`. A number nobody has to parse at a glance. */
export function silenceText(days: number | null): string {
  return days === null ? "—" : `${days}d`;
}

/**
 * The two-part group footer.
 *
 * Never one number. A single subtotal over a stage group silently includes unqualified records,
 * so the four pre-close groups would sum to more than "qualified asks on the table" and anybody
 * checking the arithmetic in the Monday meeting finds the tool wrong. Both halves, always, with
 * the qualified one named as the one that counts.
 */
export function subtotalLine(subtotal: GroupSubtotal): string {
  const qualified = formatCurrencyFromCents(subtotal.qualified.cents);
  const preClose = formatCurrencyFromCents(subtotal.preClose.cents);
  if (subtotal.preClose.count === 0) {
    return subtotal.closedWork.count > 0
      ? `${subtotal.closedWork.count} closed-work, nothing on the table`
      : "Nothing on the table";
  }
  if (subtotal.qualified.cents === subtotal.preClose.cents) {
    return `${qualified} qualified · all ${subtotal.preClose.count} of them`;
  }
  return (
    `${qualified} qualified of ${preClose} pre-close · ` +
    `${subtotal.unqualified.count} not a real ask yet`
  );
}

/**
 * The footer that ties the grid to the headline metric.
 *
 * When a filter is on, the shown total is legitimately smaller than the scope's — so it says which
 * it is, rather than appearing to contradict The Board.
 */
export function reconciliationLine(
  shown: GroupSubtotal,
  scopeQualifiedCents: number,
  filtered: boolean,
): string {
  const shownText = formatCurrencyFromCents(shown.qualified.cents);
  const scopeText = formatCurrencyFromCents(scopeQualifiedCents);
  if (!filtered) {
    return `${shownText} qualified asks on the table — the same number The Board and the Forecast Room show.`;
  }
  return `${shownText} qualified in this filter, of ${scopeText} in the whole scope.`;
}

export function groupCountLine(rowCount: number, totalCount: number): string {
  if (rowCount === totalCount) return `${totalCount} opportunities`;
  return `${rowCount} of ${totalCount} opportunities`;
}

/** Rank, or an honest blank. An unranked record is not rank 0 and not last. */
export function rankText(rank: number | null): string {
  return rank === null ? "—" : `#${rank}`;
}

export function stageLabelOf(stage: ForwardStage): string {
  return FORWARD_STAGE_META[stage].label;
}

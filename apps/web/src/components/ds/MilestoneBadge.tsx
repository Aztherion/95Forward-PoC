import type { HTMLAttributes } from "react";

export type MilestoneBadgeKind = "they-said" | "we-said" | "blocking" | "not-asked";

export const MILESTONE_BADGE_TEXT: Record<MilestoneBadgeKind, string> = {
  "they-said": "THEY SAID",
  "we-said": "WE SAID",
  blocking: "BLOCKING",
  "not-asked": "NOT ASKED",
};

export interface MilestoneBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  kind: MilestoneBadgeKind;
  /** Override the wording. The four defaults are the specified copy. */
  label?: string;
}

/** Filled for what the prospect said; hollow for what we said. Same glyph, opposite weight. */
function QuoteGlyph({ filled }: { filled: boolean }) {
  return (
    <svg
      className="f95-msbadge__glyph"
      viewBox="0 0 9 9"
      aria-hidden
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.2}
      strokeLinejoin="round"
    >
      <path d="M1 1h3v3.2L2.4 8H1V4.2h1.6zM5 1h3v3.2L6.4 8H5V4.2h1.6z" />
    </svg>
  );
}

/**
 * `THEY SAID` · `WE SAID` · `BLOCKING` · `NOT ASKED`.
 *
 * The they-said / we-said asymmetry is the most novel idea in the product, so it is carried by
 * SHAPE before colour — solid and filled against an empty dashed outline, plus a filled glyph
 * against a hollow one — the way RoleChip separates manager from partner. Print the page in
 * greyscale and you can still tell which claims came from the prospect.
 *
 * `BLOCKING` is independent of source: `Permission to share publicly` is they-said and does not
 * block. Qualification is all *blocking* milestones confirmed, so a badge that conflated the two
 * would misread the counter the moment the milestone set changes.
 */
export function MilestoneBadge({ kind, label, className = "", ...rest }: MilestoneBadgeProps) {
  const cls = ["f95-msbadge", `f95-msbadge--${kind}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} data-kind={kind} {...rest}>
      {kind === "they-said" || kind === "we-said" ? (
        <QuoteGlyph filled={kind === "they-said"} />
      ) : null}
      {label ?? MILESTONE_BADGE_TEXT[kind]}
    </span>
  );
}

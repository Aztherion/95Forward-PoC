import Link from "next/link";
import type { HTMLAttributes } from "react";

export interface RuleChipProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The catalogue id, e.g. `live-ask-silence`. Never hardcode the text of a rule. */
  ruleId: string;
  /** The rule's own statement of itself, e.g. `> 30d`. Optional — the id alone is valid. */
  statement?: string | null;
  /** `RULE` by default; `CHECK` for the data-integrity findings. */
  kind?: string;
  /** Renders inert. Use when the rule is not one the rules layer can resolve. */
  href?: string | null;
}

/**
 * `RULE · live-ask-silence > 30d`, linking to the rule it names.
 *
 * This is the no-black-box guarantee made clickable: every rank, flag and verdict shows the rule
 * that produced it, and the chip opens that rule, everything it is currently firing on, and the
 * controls to edit or disable it. I22 fixed `/rules/:ruleId` as a contract for exactly this, and
 * all seven ranking rules resolve there.
 *
 * The rule identifier comes from the Rules of Robb layer. A chip whose text was typed into a
 * screen would go stale the first time an org edited the rule, which is the failure the chip
 * exists to prevent.
 */
export function RuleChip({
  ruleId,
  statement,
  kind = "RULE",
  href,
  className = "",
  ...rest
}: RuleChipProps) {
  const cls = ["f95-rulechip", className].filter(Boolean).join(" ");
  const body = (
    <>
      <span className="f95-rulechip__kind">{kind} ·</span>
      {statement ? `${ruleId} ${statement}` : ruleId}
    </>
  );
  if (href === null) {
    return (
      <span className={cls} data-rule-id={ruleId} {...rest}>
        {body}
      </span>
    );
  }
  return (
    <Link className={cls} href={href ?? `/rules/${ruleId}`} data-rule-id={ruleId} {...rest}>
      {body}
    </Link>
  );
}

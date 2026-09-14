"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ds";
import { formatCurrencyFromCents } from "@/lib/format";

export interface NamedOpportunity {
  opportunityId: string;
  prospectName: string;
  amountCents: number;
}

/**
 * "See the names" — and it actually leads to names.
 *
 * Every aggregate on this screen carries `opportunityIds` for exactly this reason: "if there's no
 * names, there's no value in the graphic." Until I29's grid exists, a disclosure listing them with
 * links to each opportunity detail is the right implementation — better than a placeholder, and it
 * honours the rule today rather than promising to later.
 */
export function NamesDisclosure({
  label,
  names,
  testId,
}: {
  label: string;
  names: readonly NamedOpportunity[];
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  if (names.length === 0) return null;

  return (
    <div className="f95-names" data-testid={testId}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid={`${testId}-toggle`}
        iconRight={
          <ChevronDown
            size={13}
            strokeWidth={1.8}
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          />
        }
      >
        {label}
      </Button>
      {open ? (
        <ul className="f95-names__list" data-testid={`${testId}-list`}>
          {names.map((name) => (
            <li className="f95-names__row" key={name.opportunityId}>
              <Link
                className="f95-table__cell-link"
                href={`/95-forward/opportunities/${name.opportunityId}`}
              >
                {name.prospectName}
              </Link>
              <span className="f95-names__amount">{formatCurrencyFromCents(name.amountCents)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

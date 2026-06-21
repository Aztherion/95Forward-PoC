"use client";

import { useState } from "react";
import type { HTMLAttributes } from "react";
import type { QpiBand, QpiResult } from "@95forward/shared";
import { QpiBreakdown } from "./QpiBreakdown";

export interface QpiScoreProps extends HTMLAttributes<HTMLDivElement> {
  result: QpiResult;
  updatedAt?: string;
  expandable?: boolean;
  compact?: boolean;
}

const BAND_META: Record<QpiBand, { label: string; varName: string }> = {
  go: { label: "Go — see them today", varName: "--qpi-go" },
  strong: { label: "Strong", varName: "--qpi-strong" },
  build: { label: "Building", varName: "--qpi-build" },
  early: { label: "Early", varName: "--qpi-early" },
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`f95-qpi__chev${open ? " f95-qpi__chev--open" : ""}`}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 5.5 L7 9 L10.5 5.5" />
    </svg>
  );
}

export function QpiScore({
  result,
  updatedAt,
  expandable = true,
  compact = false,
  className = "",
  ...rest
}: QpiScoreProps) {
  const [open, setOpen] = useState(false);
  const band = BAND_META[result.band];
  const color = `var(${band.varName})`;
  const cls = ["f95-qpi", compact ? "f95-qpi--compact" : "", className].filter(Boolean).join(" ");

  return (
    <div className={cls} {...rest}>
      <div className="f95-qpi__head">
        <div className="f95-qpi__numwrap" style={{ color }}>
          <span className="f95-qpi__num">{result.total}</span>
          <span className="f95-qpi__of">/100</span>
        </div>
        <div className="f95-qpi__meta">
          <span className="f95-qpi__tier" style={{ color }}>
            <span className="f95-qpi__tierdot" style={{ background: color }} />
            {band.label}
          </span>
          {updatedAt ? <span className="f95-qpi__updated">Updated {updatedAt}</span> : null}
        </div>
      </div>

      {expandable ? (
        <button
          type="button"
          className="f95-qpi__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "Hide the math" : "See inside the score"} <Chevron open={open} />
        </button>
      ) : null}

      {expandable && open ? <QpiBreakdown result={result} /> : null}
    </div>
  );
}

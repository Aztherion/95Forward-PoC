import type { QpiDimension, QpiResult } from "@95forward/shared";
import { SourceTag } from "./SourceTag";

export interface QpiBreakdownProps {
  result: QpiResult;
}

const DIMENSION_META: Record<QpiDimension, { label: string; varName: string }> = {
  capacity: { label: "Capacity", varName: "--qpi-capacity" },
  relationship: { label: "Relationship", varName: "--qpi-relationship" },
  timing: { label: "Timing", varName: "--qpi-timing" },
  gift_history: { label: "Gift history", varName: "--qpi-history" },
  philanthropy: { label: "Philanthropy", varName: "--qpi-philanthropy" },
};

export function QpiBreakdown({ result }: QpiBreakdownProps) {
  return (
    <div className="f95-qpi__parts">
      {result.dimensions.map((dim) => {
        const meta = DIMENSION_META[dim.dimension];
        const color = `var(${meta.varName})`;
        const pct = dim.maxPoints > 0 ? Math.round((dim.points / dim.maxPoints) * 100) : 0;
        return (
          <div className="f95-qpi__part" key={dim.dimension}>
            <div className="f95-qpi__prow">
              <span className="f95-qpi__pdot" style={{ background: color }} />
              <span className="f95-qpi__plabel">{meta.label}</span>
              {dim.isUnknown ? (
                <span className="f95-qpi__pscore f95-qpi__pscore--gap">Unknown</span>
              ) : (
                <span className="f95-qpi__pscore">
                  {dim.points}
                  <span className="f95-qpi__pmax">/{dim.maxPoints}</span>
                </span>
              )}
            </div>
            {dim.isUnknown ? null : (
              <div className="f95-qpi__ptrack">
                <div className="f95-qpi__pfill" style={{ width: `${pct}%`, background: color }} />
              </div>
            )}
            {dim.isUnknown ? null : <div className="f95-qpi__prating">rating {dim.rating}</div>}
            {dim.rationale ? <div className="f95-qpi__preason">{dim.rationale}</div> : null}
            <div className="f95-qpi__psrc">
              {dim.isUnknown ? <SourceTag /> : <SourceTag source={dim.source ?? undefined} />}
            </div>
          </div>
        );
      })}
      <div className="f95-qpi__foot">
        <span className="f95-qpi__note">The copilot proposes this score. You decide.</span>
      </div>
    </div>
  );
}

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ds";

export function LikelihoodFoil({ likelihoodPct }: { likelihoodPct: number | null }) {
  return (
    <span className="f95-mg-likelihood" aria-label="Major-gift likelihood">
      <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
      {likelihoodPct === null ? (
        <span className="f95-mg-likelihood__empty">—</span>
      ) : (
        <span className="f95-mg-likelihood__value">{likelihoodPct}%</span>
      )}
      <Badge tone="neutral">AI</Badge>
    </span>
  );
}

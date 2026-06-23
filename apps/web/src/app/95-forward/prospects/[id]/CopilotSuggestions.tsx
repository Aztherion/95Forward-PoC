import { Sparkle } from "lucide-react";
import type { ProposalRow } from "@95forward/ai";
import type { QpiResult } from "@95forward/shared";
import {
  Button,
  EmptyState,
  ProvisionalSuggestion,
  type ProvisionalSuggestionState,
} from "@/components/ds";
import { CopilotTrigger } from "@/components/copilot/CopilotTrigger";
import { approveProposalAction, dismissProposalAction } from "@/server/actions/copilot";
import { runProspectQpiAction } from "@/server/actions/prospect-copilot";

type Provenance = { source?: string }[];

const DIMENSION_LABELS: Record<string, string> = {
  capacity: "Capacity",
  relationship: "Relationship",
  timing: "Timing",
  gift_history: "Gift history",
  philanthropy: "Philanthropy",
};

const STATES: ReadonlySet<ProvisionalSuggestionState> = new Set([
  "pending",
  "approved",
  "edited",
  "dismissed",
]);

function toState(status: string): ProvisionalSuggestionState {
  return STATES.has(status as ProvisionalSuggestionState)
    ? (status as ProvisionalSuggestionState)
    : "pending";
}

function firstSource(proposal: ProposalRow): string | undefined {
  const provenance = proposal.provenance as Provenance | null;
  if (!Array.isArray(provenance)) return undefined;
  return provenance.find((entry) => typeof entry?.source === "string")?.source;
}

function currentRating(result: QpiResult, dimension: string): string {
  const dim = result.dimensions.find((d) => d.dimension === dimension);
  if (!dim || dim.isUnknown || dim.rating == null) return "Unknown";
  return String(dim.rating);
}

function qpiDelta(proposal: ProposalRow, result: QpiResult): { from: string; to: string } | null {
  const payload = proposal.payload as { dimension?: string; rating?: number | null } | null;
  if (!payload || typeof payload.rating !== "number" || typeof payload.dimension !== "string") {
    return null;
  }
  return { from: currentRating(result, payload.dimension), to: String(payload.rating) };
}

function dimensionLabel(proposal: ProposalRow): string | null {
  const payload = proposal.payload as { dimension?: string } | null;
  if (!payload || typeof payload.dimension !== "string") return null;
  return DIMENSION_LABELS[payload.dimension] ?? payload.dimension;
}

function Actions({ id, prospectId }: { id: string; prospectId: string }) {
  return (
    <div className="f95-prov__acts">
      <form action={approveProposalAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="prospectId" value={prospectId} />
        <Button type="submit" variant="primary" size="sm">
          Approve
        </Button>
      </form>
      <form action={dismissProposalAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="prospectId" value={prospectId} />
        <Button type="submit" variant="ghost" size="sm">
          Dismiss
        </Button>
      </form>
    </div>
  );
}

export function CopilotSuggestions({
  prospectId,
  result,
  proposals,
}: {
  prospectId: string;
  result: QpiResult;
  proposals: ProposalRow[];
}) {
  const pending = proposals.filter((proposal) => proposal.status === "pending");

  return (
    <section className="f95-stack f95-stack--sm" data-testid="prospect-copilot">
      <div className="f95-cluster">
        <h2 className="f95-section-title">
          From your copilot
          {pending.length > 0 ? <span> · {pending.length} to review</span> : null}
        </h2>
        <span className="f95-recordbar__spacer" />
        <CopilotTrigger
          action={runProspectQpiAction}
          subjectId={prospectId}
          label="Ask the copilot"
        />
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          icon={<Sparkle size={20} strokeWidth={1.8} />}
          title="No suggestions yet"
          line="Ask the copilot to look for a sharper capacity read — it proposes, you decide."
        />
      ) : (
        <div className="f95-stack f95-stack--sm">
          {proposals.map((proposal) => {
            const state = toState(proposal.status);
            const delta = qpiDelta(proposal, result);
            const label = dimensionLabel(proposal);
            return (
              <ProvisionalSuggestion
                key={proposal.id}
                title={label ? `Copilot suggests · ${label}` : "Copilot suggests"}
                source={firstSource(proposal)}
                state={state}
                {...(delta ?? {})}
                {...(state === "pending"
                  ? { actionsSlot: <Actions id={proposal.id} prospectId={prospectId} /> }
                  : {})}
              >
                {proposal.summary ?? "Copilot proposal pending your review."}
              </ProvisionalSuggestion>
            );
          })}
        </div>
      )}
    </section>
  );
}

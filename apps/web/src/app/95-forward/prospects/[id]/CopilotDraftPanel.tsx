import { Sparkle } from "lucide-react";
import type { ProposalRow } from "@95forward/ai";
import {
  Button,
  EmptyState,
  ProvisionalSuggestion,
  type ProvisionalSuggestionState,
} from "@/components/ds";
import { approveProposalAction, dismissProposalAction } from "@/server/actions/copilot";

type Provenance = { source?: string }[];

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

function Actions({
  id,
  subjectIdName,
  subjectId,
}: {
  id: string;
  subjectIdName: string;
  subjectId: string;
}) {
  return (
    <div className="f95-prov__acts">
      <form action={approveProposalAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name={subjectIdName} value={subjectId} />
        <Button type="submit" variant="primary" size="sm">
          Approve
        </Button>
      </form>
      <form action={dismissProposalAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name={subjectIdName} value={subjectId} />
        <Button type="submit" variant="ghost" size="sm">
          Dismiss
        </Button>
      </form>
    </div>
  );
}

export interface CopilotDraftPanelProps {
  subjectId: string;
  subjectIdName?: string;
  proposals: ProposalRow[];
  runAction: (formData: FormData) => void | Promise<void>;
  askLabel: string;
  emptyLine: string;
  testId: string;
}

export function CopilotDraftPanel({
  subjectId,
  subjectIdName = "prospectId",
  proposals,
  runAction,
  askLabel,
  emptyLine,
  testId,
}: CopilotDraftPanelProps) {
  const pending = proposals.filter((proposal) => proposal.status === "pending");

  return (
    <section className="f95-stack f95-stack--sm" data-testid={testId}>
      <div className="f95-cluster">
        <h2 className="f95-section-title">
          From your copilot
          {pending.length > 0 ? <span> · {pending.length} to review</span> : null}
        </h2>
        <span className="f95-recordbar__spacer" />
        <form action={runAction}>
          <input type="hidden" name={subjectIdName} value={subjectId} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            iconLeft={<Sparkle size={15} strokeWidth={1.8} />}
          >
            {askLabel}
          </Button>
        </form>
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          icon={<Sparkle size={20} strokeWidth={1.8} />}
          title="No suggestions yet"
          line={emptyLine}
        />
      ) : (
        <div className="f95-stack f95-stack--sm">
          {proposals.map((proposal) => {
            const state = toState(proposal.status);
            return (
              <ProvisionalSuggestion
                key={proposal.id}
                title={proposal.title}
                source={firstSource(proposal)}
                state={state}
                {...(state === "pending"
                  ? {
                      actionsSlot: (
                        <Actions
                          id={proposal.id}
                          subjectIdName={subjectIdName}
                          subjectId={subjectId}
                        />
                      ),
                    }
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

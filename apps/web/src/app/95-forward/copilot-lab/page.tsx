import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import type { ProposalRow } from "@95forward/ai";
import {
  Badge,
  Button,
  EmptyState,
  ProvisionalSuggestion,
  type ProvisionalSuggestionState,
} from "@/components/ds";
import { Topbar } from "@/components/shell";
import { CopilotTrigger } from "@/components/copilot/CopilotTrigger";
import { getCurrentUser } from "@/lib/auth";
import { getDemoSubject, listSubjectProposals } from "@/server/data/copilot";
import {
  approveProposalAction,
  dismissProposalAction,
  runCopilotAction,
} from "@/server/actions/copilot";

export const dynamic = "force-dynamic";

type Provenance = { source?: string }[];

function firstSource(proposal: ProposalRow): string | undefined {
  const provenance = proposal.provenance as Provenance | null;
  if (!Array.isArray(provenance)) return undefined;
  return provenance.find((entry) => typeof entry?.source === "string")?.source;
}

const PROPOSAL_STATES: ReadonlySet<ProvisionalSuggestionState> = new Set([
  "pending",
  "approved",
  "edited",
  "dismissed",
]);

function toState(status: string): ProvisionalSuggestionState {
  return PROPOSAL_STATES.has(status as ProvisionalSuggestionState)
    ? (status as ProvisionalSuggestionState)
    : "pending";
}

function qpiDelta(proposal: ProposalRow): { from: string; to: string } | null {
  if (proposal.proposalType !== "qpi_assessment") return null;
  const payload = proposal.payload as { rating?: number | null } | null;
  const rating = payload?.rating;
  if (typeof rating !== "number") return null;
  return { from: "Unknown", to: String(rating) };
}

function ProposalActions({ proposal }: { proposal: ProposalRow }) {
  return (
    <div className="f95-prov__acts">
      <form action={approveProposalAction}>
        <input type="hidden" name="id" value={proposal.id} />
        <Button type="submit" variant="primary" size="sm">
          Approve
        </Button>
      </form>
      <form action={dismissProposalAction}>
        <input type="hidden" name="id" value={proposal.id} />
        <Button type="submit" variant="ghost" size="sm">
          Dismiss
        </Button>
      </form>
    </div>
  );
}

export default async function CopilotLabPage() {
  if (process.env.APP_ENV === "production") notFound();

  const user = await getCurrentUser();
  if (!user) return null;

  const subject = await getDemoSubject(user.tenantId);
  const proposals = subject
    ? await listSubjectProposals(user.tenantId, [subject.prospectId, subject.constituentId])
    : [];

  return (
    <>
      <Topbar title="Copilot lab" subtitle="Demonstration harness" />
      <div className="f95-page" data-testid="copilot-lab">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward · dev harness</div>
            <h1 className="f95-page__title">Copilot lab — demonstration harness</h1>
            <p className="f95-page__count">
              A lab route, not the product. It runs the full copilot loop on a seeded prospect so
              you can watch grounded proposals appear, then approve or dismiss them. Nothing is
              applied without your approval.
            </p>
          </div>
          <div className="f95-page__actions">
            <Badge tone="ai">Mock provider</Badge>
          </div>
        </div>

        <section className="f95-stack">
          {subject ? (
            <p className="f95-page__count">
              Demo subject: <strong>{subject.constituentName}</strong>{" "}
              <span className="f95-mono">({subject.prospectId})</span>
            </p>
          ) : (
            <EmptyState
              title="No seeded prospect found"
              line="Seed the database to give the copilot a subject to work with."
            />
          )}

          <CopilotTrigger
            action={runCopilotAction}
            subjectId=""
            label="Run copilot"
            icon={<FlaskConical size={16} strokeWidth={1.8} />}
          />

          {proposals.length === 0 ? (
            <EmptyState
              icon={<FlaskConical size={20} strokeWidth={1.8} />}
              title="No proposals yet"
              line="Run copilot to draft an outreach note and propose a QPI assessment."
            />
          ) : (
            <div className="f95-stack f95-stack--sm">
              {proposals.map((proposal) => {
                const delta = qpiDelta(proposal);
                const state = toState(proposal.status);
                return (
                  <ProvisionalSuggestion
                    key={proposal.id}
                    title={proposal.title}
                    source={firstSource(proposal)}
                    state={state}
                    {...(delta ?? {})}
                    {...(state === "pending"
                      ? { actionsSlot: <ProposalActions proposal={proposal} /> }
                      : {})}
                  >
                    {proposal.summary ?? "Copilot proposal pending your review."}
                  </ProvisionalSuggestion>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

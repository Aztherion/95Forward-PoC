"use client";

import Link from "next/link";
import { Badge, Button, Card, SourceTag } from "@/components/ds";
import {
  decideCandidateAction,
  keepResearchingCandidateAction,
  promoteCandidateAction,
} from "@/server/actions/discovery";
import type { CandidateView } from "@/server/data/discovery";

function DecisionForm({
  candidateId,
  decision,
  children,
  variant = "ghost",
  testId,
}: {
  candidateId: string;
  decision: "endorsed" | "intro_requested" | "dismissed";
  children: string;
  variant?: "primary" | "secondary" | "ghost";
  testId?: string;
}) {
  return (
    <form action={decideCandidateAction}>
      <input type="hidden" name="candidateId" value={candidateId} />
      <input type="hidden" name="decision" value={decision} />
      <Button type="submit" variant={variant} size="sm" data-testid={testId}>
        {children}
      </Button>
    </form>
  );
}

function Actions({ candidate }: { candidate: CandidateView }) {
  if (candidate.status === "promoted") {
    return candidate.promotedProspectId ? (
      <Link href={`/95-forward/prospects/${candidate.promotedProspectId}`}>
        <Button variant="ghost" size="sm">
          On the list
        </Button>
      </Link>
    ) : null;
  }
  if (candidate.status === "dismissed") {
    return <span className="f95-prov__resolved f95-prov__resolved--no">Dismissed</span>;
  }
  if (candidate.status === "intro_requested") {
    return (
      <div className="f95-prov__acts">
        <form action={promoteCandidateAction}>
          <input type="hidden" name="candidateId" value={candidate.id} />
          <Button type="submit" variant="primary" size="sm" data-testid="candidate-promote">
            Promote to prospect
          </Button>
        </form>
        <DecisionForm candidateId={candidate.id} decision="dismissed">
          Dismiss
        </DecisionForm>
      </div>
    );
  }
  if (candidate.status === "endorsed") {
    return (
      <div className="f95-prov__acts">
        <DecisionForm candidateId={candidate.id} decision="intro_requested" variant="primary">
          Request intro
        </DecisionForm>
        <DecisionForm candidateId={candidate.id} decision="dismissed">
          Dismiss
        </DecisionForm>
      </div>
    );
  }
  return (
    <div className="f95-prov__acts">
      <DecisionForm
        candidateId={candidate.id}
        decision="endorsed"
        variant="primary"
        testId="candidate-endorse"
      >
        Endorse
      </DecisionForm>
      <form action={keepResearchingCandidateAction}>
        <input type="hidden" name="candidateId" value={candidate.id} />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          data-testid="candidate-keep-researching"
        >
          Keep researching
        </Button>
      </form>
      <DecisionForm candidateId={candidate.id} decision="dismissed" testId="candidate-dismiss">
        Dismiss
      </DecisionForm>
    </div>
  );
}

const CONFIDENCE_LABEL: Record<CandidateView["confidence"], string> = {
  low: "low confidence",
  medium: "medium confidence",
  high: "high confidence",
};

export function CandidateCard({
  candidate,
  connectorName,
}: {
  candidate: CandidateView;
  connectorName: string;
}) {
  return (
    <Card tone="ai" accent data-testid="candidate-card">
      <div className="f95-prov__top">
        <span className="f95-prov__name">{candidate.name}</span>
        <Badge tone="ai">{CONFIDENCE_LABEL[candidate.confidence]}</Badge>
      </div>

      <div className="f95-stack f95-stack--sm">
        <div className="f95-deflist__term">Why {connectorName} can reach them</div>
        <SourceTag source={candidate.evidenceConnection ?? undefined} />

        <div className="f95-deflist__term">Why they&rsquo;d care</div>
        <SourceTag source={candidate.evidenceAffinity ?? undefined} />
      </div>

      <div className="f95-prov__footer">
        <span className="f95-prov__hypothesis">A hypothesis to validate — not yet a prospect.</span>
        <Actions candidate={candidate} />
      </div>
    </Card>
  );
}

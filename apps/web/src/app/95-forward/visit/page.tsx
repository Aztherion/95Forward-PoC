import Link from "next/link";
import { X } from "lucide-react";
import { Button, Card, RoleChip } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getProspectDetail } from "@/server/data/prospects";
import { getDefaultVisitProspectId, getVisitForMode } from "@/server/data/execution-data";
import { listInitiativeRefs } from "@/server/data/initiatives";
import { VisitDebrief } from "./VisitDebrief";

export const dynamic = "force-dynamic";

const PHASES = ["before", "during", "after"] as const;
type Phase = (typeof PHASES)[number];

function resolvePhase(value: string | undefined): Phase {
  return (PHASES as readonly string[]).includes(value ?? "") ? (value as Phase) : "before";
}

const PHASE_LABEL: Record<Phase, string> = {
  before: "Before — the prep",
  during: "During — at your side",
  after: "After — the debrief",
};

function splitQuestions(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n|(?<=\?)\s+/)
    .map((q) => q.trim())
    .filter((q) => q.length > 0);
}

export default async function VisitPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string; prospect?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { phase, prospect } = await searchParams;
  const activePhase = resolvePhase(phase);
  const prospectId = prospect ?? (await getDefaultVisitProspectId(user.tenantId));

  if (!prospectId) {
    return (
      <div
        className="f95-visit"
        data-register="95-forward"
        data-density="b"
        data-testid="visit-mode"
      >
        <div className="f95-visit__top">
          <Link href="/95-forward/today" className="f95-cluster f95-table__cell-link">
            <X size={18} strokeWidth={1.8} /> Exit
          </Link>
          <div className="f95-visit__top-meta">
            <span className="f95-visit__phase">Visit mode</span>
          </div>
        </div>
        <div className="f95-visit__body">
          <p className="f95-visit__prompt">No visit planned yet.</p>
          <Link href="/95-forward/prospects">
            <Button variant="primary">Plan a visit first</Button>
          </Link>
        </div>
      </div>
    );
  }

  const [detail, visit, initiatives] = await Promise.all([
    getProspectDetail(user.tenantId, prospectId),
    getVisitForMode(user.tenantId, prospectId),
    listInitiativeRefs(user.tenantId),
  ]);
  if (!detail) return null;

  const href = (p: Phase) => `/95-forward/visit?prospect=${prospectId}&phase=${p}`;
  const questions = splitQuestions(visit?.discoveryQuestions ?? null);

  return (
    <div className="f95-visit" data-register="95-forward" data-density="b" data-testid="visit-mode">
      <div className="f95-visit__top">
        <Link
          href={`/95-forward/prospects/${prospectId}`}
          className="f95-cluster f95-table__cell-link"
        >
          <X size={18} strokeWidth={1.8} /> Exit
        </Link>
        <div className="f95-visit__top-meta">
          <span className="f95-visit__phase" data-testid="visit-phase">
            {PHASE_LABEL[activePhase]}
          </span>
          <span className="f95-visit__title">{detail.name}</span>
        </div>
      </div>

      <div className="f95-visit__body">
        {activePhase === "before" ? (
          <>
            <div className="f95-visit__section">
              <span className="f95-visit__eyebrow">The goal</span>
              <p className="f95-visit__prompt">{visit?.goal ?? "Open the relationship."}</p>
            </div>
            {detail.strategy?.predispositionPlan ? (
              <div className="f95-visit__section">
                <span className="f95-visit__eyebrow">Lead with</span>
                <p className="f95-deflist__desc">{detail.strategy.predispositionPlan}</p>
              </div>
            ) : null}
            {questions.length > 0 ? (
              <div className="f95-visit__section" data-testid="visit-questions">
                <span className="f95-visit__eyebrow">Discovery questions</span>
                <div className="f95-visit__qlist">
                  {questions.map((q, i) => (
                    <p key={i} className="f95-visit__q">
                      {q}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
            {detail.naturalPartners[0]?.name ? (
              <div className="f95-visit__section">
                <span className="f95-visit__eyebrow">Who opens the door</span>
                <RoleChip role="partner" name={detail.naturalPartners[0].name} />
              </div>
            ) : null}
            <Link href={href("during")}>
              <Button variant="go" size="lg" data-testid="start-the-visit">
                Start the visit
              </Button>
            </Link>
          </>
        ) : null}

        {activePhase === "during" ? (
          <>
            {questions.length > 0 ? (
              <div className="f95-visit__section">
                <span className="f95-visit__eyebrow">Ask · listen · ask · listen</span>
                {questions.map((q, i) => (
                  <p key={i} className="f95-visit__prompt f95-rise">
                    {q}
                  </p>
                ))}
              </div>
            ) : (
              <p className="f95-visit__prompt">Listen more than you talk. 2 : 1.</p>
            )}
            <Card tone="go" accent pad="lg">
              <div className="f95-visit__section" data-testid="visit-ask-moment">
                <span className="f95-visit__eyebrow">Make the ask</span>
                <p className="f95-visit__ask">
                  Would you consider a lead commitment toward {initiatives[0]?.name ?? "this work"}?
                </p>
              </div>
            </Card>
            <Link href={href("after")}>
              <Button variant="go" size="lg" data-testid="capture-the-outcome">
                Capture the outcome
              </Button>
            </Link>
          </>
        ) : null}

        {activePhase === "after" && visit ? (
          <VisitDebrief visitId={visit.visitId} prospectId={prospectId} initiatives={initiatives} />
        ) : null}
      </div>
    </div>
  );
}

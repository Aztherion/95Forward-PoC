import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { Button, Card, EmptyState, HorizonTag, QpiScore } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import {
  getInitiativeDetail,
  type InitiativeDetail,
  type InitiativeProspect,
} from "@/server/data/initiatives";
import { getProspectRefs } from "@/server/data/prospects";
import { listInitiativeProposals } from "@/server/data/funding-copilot";
import { runInitiativeRationaleAction } from "@/server/actions/funding-copilot";
import { detachProspectAction } from "@/server/actions/initiatives";
import { CopilotDraftPanel } from "../../prospects/[id]/CopilotDraftPanel";
import { AttachProspect } from "./AttachProspect";

export const dynamic = "force-dynamic";

function timeline(detail: InitiativeDetail): string {
  if (!detail.timelineStart) return "Timeline to be set";
  const start = formatDate(detail.timelineStart);
  const end = detail.timelineEnd ? formatDate(detail.timelineEnd) : "open-ended";
  return `${start} → ${end}`;
}

function PipelineRow({
  prospect,
  fundingInitiativeId,
}: {
  prospect: InitiativeProspect;
  fundingInitiativeId: string;
}) {
  return (
    <div className="f95-itemrow" data-testid="pipeline-prospect">
      <div className="f95-itemrow__body">
        <Link href={`/95-forward/prospects/${prospect.id}`} className="f95-itemrow__title">
          {prospect.name}
        </Link>
        <span className="f95-itemrow__meta">
          <span>{prospect.rmName ?? "No RM yet"}</span>
        </span>
      </div>
      <div className="f95-itemrow__actions f95-cluster">
        <QpiScore result={prospect.qpi} expandable={false} compact />
        <form action={detachProspectAction}>
          <input type="hidden" name="fundingInitiativeId" value={fundingInitiativeId} />
          <input type="hidden" name="prospectId" value={prospect.id} />
          <Button type="submit" variant="ghost" size="sm">
            Remove
          </Button>
        </form>
      </div>
    </div>
  );
}

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const detail = await getInitiativeDetail(user.tenantId, id);
  if (!detail) notFound();

  const [allProspects, proposals] = await Promise.all([
    getProspectRefs(user.tenantId),
    listInitiativeProposals(user.tenantId, user, id),
  ]);

  const attachedIds = new Set(detail.prospects.map((p) => p.id));
  const attachable = allProspects.filter((p) => !attachedIds.has(p.id));

  return (
    <>
      <Topbar title={detail.name} subtitle="95 Forward · Funding initiative" />
      <div className="f95-page" data-testid="initiative-detail">
        <Link href="/95-forward/initiatives" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Funding initiatives
        </Link>

        <div className="f95-record-head">
          <div className="f95-record-head__main">
            <h1 className="f95-record-head__title">{detail.name}</h1>
            <div className="f95-record-head__meta">
              <HorizonTag horizon={detail.frame} solid />
              <span>· Goal {formatCurrencyFromCents(detail.goalCents)}</span>
              <span>· {timeline(detail)}</span>
            </div>
          </div>
        </div>

        <div className="f95-overview">
          <div className="f95-overview__main">
            <Card>
              <div className="f95-stack f95-stack--sm" data-testid="initiative-story">
                <h2 className="f95-section-title">The story</h2>
                {detail.story ? (
                  <p className="f95-moment">{detail.story}</p>
                ) : (
                  <span className="f95-deflist__desc--empty">
                    No story yet — write the case for support, or ask the copilot to draft one.
                  </span>
                )}
              </div>
            </Card>

            <Card tone="ai">
              <CopilotDraftPanel
                subjectId={detail.id}
                subjectIdName="fundingInitiativeId"
                proposals={proposals}
                runAction={runInitiativeRationaleAction}
                askLabel="Ask the copilot to draft the rationale"
                emptyLine="The copilot drafts a case for support grounded in the frame, goal, and mission — you approve, edit, or dismiss."
                testId="initiative-copilot"
              />
            </Card>

            <Card>
              <div className="f95-stack" data-testid="cultivation-pipeline">
                <div className="f95-cluster">
                  <div className="f95-stack f95-stack--sm">
                    <h2 className="f95-section-title">Cultivation pipeline</h2>
                    <span className="f95-deflist__desc--empty">
                      The prospects you're cultivating toward this initiative.
                    </span>
                  </div>
                  <span className="f95-recordbar__spacer" />
                  <AttachProspect fundingInitiativeId={detail.id} options={attachable} />
                </div>

                {detail.prospects.length === 0 ? (
                  <EmptyState
                    icon={<Users size={20} strokeWidth={1.8} />}
                    title="No prospects yet"
                    line="Cultivate a prospect toward this initiative to start the pipeline."
                  />
                ) : (
                  <div className="f95-stack f95-stack--sm">
                    {detail.prospects.map((prospect) => (
                      <PipelineRow
                        key={prospect.id}
                        prospect={prospect}
                        fundingInitiativeId={detail.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <aside className="f95-overview__rail">
            <Card>
              <div className="f95-stack f95-stack--sm">
                <h2 className="f95-section-title">Progress</h2>
                <div className="f95-goalmeta">
                  <span className="f95-deflist__desc">
                    {formatCurrencyFromCents(detail.progress.committedCents)} committed
                  </span>
                  <span className="f95-goalmeta__pct">{detail.progress.pct}%</span>
                </div>
                <div className="f95-progress f95-progress--lg">
                  <div
                    className="f95-progress__fill"
                    style={{ width: `${detail.progress.pct}%` }}
                  />
                </div>
                <span className="f95-deflist__desc--empty">
                  Goal {formatCurrencyFromCents(detail.goalCents)}. Progress builds from committed
                  asks — logging asks lands in a later initiative.
                </span>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

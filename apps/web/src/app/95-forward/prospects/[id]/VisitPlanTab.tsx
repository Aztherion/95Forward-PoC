import { CalendarCheck, MapPin } from "lucide-react";
import type { ProposalRow } from "@95forward/ai";
import { Badge, Card, EmptyState } from "@/components/ds";
import { runProspectVisitPlanAction } from "@/server/actions/prospect-copilot";
import type { ProspectDetail } from "@/server/data/prospects";
import { CopilotDraftPanel } from "./CopilotDraftPanel";
import { VisitPlanForm } from "./VisitPlanForm";

export function VisitPlanTab({
  detail,
  proposals,
}: {
  detail: ProspectDetail;
  proposals: ProposalRow[];
}) {
  return (
    <div className="f95-stack">
      <Card>
        <div className="f95-stack" data-testid="visit-plans">
          <div className="f95-cluster">
            <div className="f95-stack f95-stack--sm">
              <h2 className="f95-section-title">Visit plan</h2>
              <span className="f95-deflist__desc--empty">
                Plan the conversation before you walk in. Logging the visit itself comes later.
              </span>
            </div>
            <span className="f95-recordbar__spacer" />
            <VisitPlanForm prospectId={detail.id} />
          </div>

          {detail.plannedVisits.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck size={20} strokeWidth={1.8} />}
              title="No visit planned yet"
              line="Set a goal and a few discovery questions — the copilot can draft a starting point."
            />
          ) : (
            <div className="f95-stack f95-stack--sm">
              {detail.plannedVisits.map((visit) => (
                <Card key={visit.id} tone="sunk">
                  <div className="f95-stack f95-stack--sm" data-testid="planned-visit">
                    <div className="f95-cluster">
                      <Badge tone="info">Planned</Badge>
                      {visit.locationType ? (
                        <span className="f95-itemrow__meta f95-cluster">
                          <MapPin size={14} strokeWidth={1.8} /> {visit.locationType}
                        </span>
                      ) : null}
                    </div>
                    <div className="f95-deflist__item">
                      <span className="f95-deflist__term">Goal</span>
                      <span className="f95-deflist__desc">{visit.goal ?? "—"}</span>
                    </div>
                    {visit.discoveryQuestions ? (
                      <div className="f95-deflist__item">
                        <span className="f95-deflist__term">Discovery questions</span>
                        <span className="f95-deflist__desc">{visit.discoveryQuestions}</span>
                      </div>
                    ) : null}
                    {visit.team ? (
                      <div className="f95-deflist__item">
                        <span className="f95-deflist__term">Who's going</span>
                        <span className="f95-deflist__desc">{visit.team}</span>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card tone="ai">
        <CopilotDraftPanel
          subjectId={detail.id}
          proposals={proposals}
          runAction={runProspectVisitPlanAction}
          askLabel="Ask the copilot to draft a plan"
          emptyLine="The copilot drafts a visit goal and discovery questions; approving creates a planned visit."
          testId="visit-copilot"
        />
      </Card>
    </div>
  );
}

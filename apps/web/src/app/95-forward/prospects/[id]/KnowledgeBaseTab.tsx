import { Compass } from "lucide-react";
import type { ProposalRow } from "@95forward/ai";
import { Button, Card, EmptyState, SourceTag } from "@/components/ds";
import { runProspectKnowledgeAction } from "@/server/actions/prospect-copilot";
import { resolveResearchGapAction } from "@/server/actions/strategize";
import { enqueueResearchJobAction } from "@/server/actions/research";
import type { ProspectDetail } from "@/server/data/prospects";
import { CopilotDraftPanel } from "./CopilotDraftPanel";
import { KnowledgeFieldEditor, AddResearchGap } from "./KnowledgeBaseEditor";

const KNOWLEDGE_FIELDS = [
  { field: "capacitySource", label: "Capacity & its source" },
  { field: "relationshipToCause", label: "Relationship to the cause" },
  { field: "connectorsNote", label: "Connectors" },
  { field: "giftHistorySummary", label: "Gift history" },
  { field: "otherPhilanthropy", label: "Other philanthropy" },
  { field: "timingNote", label: "Timing" },
] as const;

type KnowledgeField = (typeof KNOWLEDGE_FIELDS)[number]["field"];

export function KnowledgeBaseTab({
  detail,
  proposals,
}: {
  detail: ProspectDetail;
  proposals: ProposalRow[];
}) {
  const knowledge = detail.knowledge;
  const openGaps = detail.researchGaps.filter((gap) => gap.status !== "resolved");
  const resolvedGaps = detail.researchGaps.filter((gap) => gap.status === "resolved");

  return (
    <div className="f95-stack">
      <Card>
        <div className="f95-stack">
          <div className="f95-stack f95-stack--sm">
            <h2 className="f95-section-title">What we know</h2>
            <span className="f95-deflist__desc--empty">
              The evidence behind the score. Gaps are invitations, not errors.
            </span>
          </div>
          <div className="f95-deflist">
            {KNOWLEDGE_FIELDS.map(({ field, label }) => {
              const value = knowledge?.[field as KnowledgeField] ?? null;
              return (
                <div key={field} className="f95-deflist__item" data-testid={`kb-${field}`}>
                  <span className="f95-deflist__term">{label}</span>
                  {value ? (
                    <span className="f95-deflist__desc">{value}</span>
                  ) : (
                    <span className="f95-deflist__desc--empty">Unknown — worth researching</span>
                  )}
                  <KnowledgeFieldEditor
                    prospectId={detail.id}
                    field={field}
                    label={label}
                    value={value}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <div className="f95-stack" data-testid="research-gaps">
          <div className="f95-stack f95-stack--sm">
            <h2 className="f95-section-title">Worth researching</h2>
            <span className="f95-deflist__desc--empty">
              Honest invitations to learn more — never a mark against the prospect.
            </span>
          </div>

          {openGaps.length === 0 ? (
            <EmptyState
              icon={<Compass size={20} strokeWidth={1.8} />}
              title="Nothing open right now"
              line="When a question comes up, add it here so the team can chase it down."
            />
          ) : (
            <div className="f95-stack f95-stack--sm">
              {openGaps.map((gap) => (
                <div key={gap.id} className="f95-itemrow" data-testid="research-gap">
                  <div className="f95-itemrow__body">
                    <span className="f95-itemrow__title">
                      <SourceTag label={gap.label} />
                    </span>
                  </div>
                  <div className="f95-itemrow__actions">
                    <form action={enqueueResearchJobAction}>
                      <input type="hidden" name="prospectId" value={detail.id} />
                      <input type="hidden" name="researchGapId" value={gap.id} />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        data-testid="research-this"
                      >
                        Research this
                      </Button>
                    </form>
                    <form action={resolveResearchGapAction}>
                      <input type="hidden" name="gapId" value={gap.id} />
                      <input type="hidden" name="prospectId" value={detail.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <Button type="submit" variant="ghost" size="sm">
                        Mark researched
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          <AddResearchGap prospectId={detail.id} />

          {resolvedGaps.length > 0 ? (
            <span className="f95-deflist__desc--empty">
              {resolvedGaps.length} researched and put to rest.
            </span>
          ) : null}
        </div>
      </Card>

      <Card tone="ai">
        <CopilotDraftPanel
          subjectId={detail.id}
          proposals={proposals}
          runAction={runProspectKnowledgeAction}
          askLabel="Ask the copilot to fill a gap"
          emptyLine="The copilot drafts from what's already known — provenance attached. Deeper research lands in a later initiative."
          testId="kb-copilot"
        />
      </Card>
    </div>
  );
}

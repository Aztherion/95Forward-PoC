import type { ProposalRow } from "@95forward/ai";
import { Card } from "@/components/ds";
import { runProspectStrategyAction } from "@/server/actions/prospect-copilot";
import type { ProspectDetail } from "@/server/data/prospects";
import { CopilotDraftPanel } from "./CopilotDraftPanel";
import { StrategyFieldEditor } from "./StrategyEditor";

const STRATEGY_FIELDS = [
  { field: "relationshipGoals", label: "Relationship goals" },
  { field: "hooks", label: "Hooks & areas of interest" },
  { field: "objections", label: "Likely objections" },
  { field: "predispositionPlan", label: "Predisposition plan" },
  { field: "presentationDesign", label: "Presentation design" },
  { field: "actionPlan", label: "Action plan" },
] as const;

type StrategyField = (typeof STRATEGY_FIELDS)[number]["field"];

export function StrategyTab({
  detail,
  proposals,
}: {
  detail: ProspectDetail;
  proposals: ProposalRow[];
}) {
  const strategy = detail.strategy;

  return (
    <div className="f95-stack">
      <Card>
        <div className="f95-stack">
          <div className="f95-stack f95-stack--sm">
            <h2 className="f95-section-title">Strategy</h2>
            <span className="f95-deflist__desc--empty">
              How you'll earn the gift — drafted by you or your copilot, always yours to edit.
            </span>
          </div>
          <div className="f95-stack">
            {STRATEGY_FIELDS.map(({ field, label }) => (
              <StrategyFieldEditor
                key={field}
                prospectId={detail.id}
                field={field}
                label={label}
                value={strategy?.[field as StrategyField] ?? null}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card tone="ai">
        <CopilotDraftPanel
          subjectId={detail.id}
          proposals={proposals}
          runAction={runProspectStrategyAction}
          askLabel="Ask the copilot to draft strategy"
          emptyLine="The copilot reasons over the knowledge base and QPI to draft a starting point — you approve, edit, or dismiss."
          testId="strategy-copilot"
        />
      </Card>
    </div>
  );
}

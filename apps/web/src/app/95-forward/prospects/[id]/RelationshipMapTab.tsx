import { Network } from "lucide-react";
import type { ProposalRow } from "@95forward/ai";
import { Button, Card, EmptyState, SourceTag } from "@/components/ds";
import { runProspectRelationshipMapAction } from "@/server/actions/prospect-copilot";
import { removeRelationshipMapEntryAction } from "@/server/actions/strategize";
import type { ProspectDetail } from "@/server/data/prospects";
import { CopilotDraftPanel } from "./CopilotDraftPanel";
import { RelationshipMapForm } from "./RelationshipMapForm";

export function RelationshipMapTab({
  detail,
  proposals,
}: {
  detail: ProspectDetail;
  proposals: ProposalRow[];
}) {
  return (
    <div className="f95-stack">
      <Card>
        <div className="f95-stack" data-testid="relationship-map">
          <div className="f95-cluster">
            <div className="f95-stack f95-stack--sm">
              <h2 className="f95-section-title">Relationship map</h2>
              <span className="f95-deflist__desc--empty">
                Who actually decides — and the warm path to each of them.
              </span>
            </div>
            <span className="f95-recordbar__spacer" />
            <RelationshipMapForm prospectId={detail.id} />
          </div>

          {detail.relationshipMap.length === 0 ? (
            <EmptyState
              icon={<Network size={20} strokeWidth={1.8} />}
              title="No decision-makers mapped yet"
              line="Add the board chair, program officer, or giving-committee members — the copilot can propose a starting point."
            />
          ) : (
            <div className="f95-table-wrap">
              <table className="f95-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Decision power</th>
                    <th>Warm path</th>
                    <th>Source</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {detail.relationshipMap.map((entry) => (
                    <tr key={entry.id} data-testid="kdm-row">
                      <td>{entry.name}</td>
                      <td className="f95-table__muted">{entry.role ?? "—"}</td>
                      <td className="f95-table__muted">{entry.decisionPower ?? "—"}</td>
                      <td className="f95-table__muted">{entry.warmPathNote ?? "—"}</td>
                      <td>{entry.source ? <SourceTag source={entry.source} /> : "—"}</td>
                      <td>
                        <form action={removeRelationshipMapEntryAction}>
                          <input type="hidden" name="entryId" value={entry.id} />
                          <input type="hidden" name="prospectId" value={detail.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Remove
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card tone="ai">
        <CopilotDraftPanel
          subjectId={detail.id}
          proposals={proposals}
          runAction={runProspectRelationshipMapAction}
          askLabel="Ask the copilot for decision-makers"
          emptyLine="The copilot proposes KDMs from the records — live-research-backed discovery lands in a later initiative."
          testId="relationship-copilot"
        />
      </Card>
    </div>
  );
}

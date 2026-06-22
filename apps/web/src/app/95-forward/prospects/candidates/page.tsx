import { Compass } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { getCandidateBatches, getConnectorOptions } from "@/server/data/discovery";
import { listInitiativeRefs } from "@/server/data/initiatives";
import { CandidateCard } from "./CandidateCard";
import { FindIntroductions } from "./FindIntroductions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  queued: "queued",
  researching: "researching…",
  ready: "ready",
  reviewed: "reviewed",
};

export default async function CandidatesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [batches, connectors, initiatives] = await Promise.all([
    getCandidateBatches(user.tenantId),
    getConnectorOptions(user.tenantId),
    listInitiativeRefs(user.tenantId),
  ]);

  return (
    <>
      <Topbar title="Candidates" subtitle="95 Forward" />
      <div className="f95-page" data-testid="candidates-view">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward</div>
            <h1 className="f95-page__title">Candidates</h1>
            <p className="f95-page__count">
              People your copilot surfaced through a connector — hypotheses to validate, held off
              the ranked list until you promote one.
            </p>
          </div>
          <div className="f95-page__actions">
            <FindIntroductions
              connectors={connectors}
              initiatives={initiatives}
              label="New introduction search"
            />
          </div>
        </div>

        {batches.length === 0 ? (
          <EmptyState
            icon={<Compass size={20} strokeWidth={1.8} />}
            title="No introduction searches yet"
            line="Pick a connector and an initiative, and your copilot will surface people they could introduce you to."
          />
        ) : (
          batches.map((batch) => (
            <section key={batch.taskId} className="f95-stack" data-testid="candidate-batch">
              <div className="f95-cluster">
                <h2 className="f95-section-title">
                  Introductions via {batch.connectorName} · for {batch.initiativeName} ·{" "}
                  {batch.candidates.length}{" "}
                  {batch.candidates.length === 1 ? "candidate" : "candidates"}
                </h2>
                <Badge tone="ai">{STATUS_LABEL[batch.status] ?? batch.status}</Badge>
              </div>

              {batch.status === "queued" || batch.status === "researching" ? (
                <Card tone="ai" accent>
                  <span className="f95-prov__hypothesis">
                    Researching {batch.connectorName}&rsquo;s network — candidates will appear here
                    when the copilot is done.
                  </span>
                </Card>
              ) : batch.candidates.length === 0 ? (
                <EmptyState
                  icon={<Compass size={20} strokeWidth={1.8} />}
                  title="No candidates surfaced"
                  line="The copilot couldn't find public connections for this pairing — not every connector reaches this cause."
                />
              ) : (
                <div className="f95-tilegrid f95-tilegrid--wide">
                  {batch.candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      connectorName={batch.connectorName}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </>
  );
}

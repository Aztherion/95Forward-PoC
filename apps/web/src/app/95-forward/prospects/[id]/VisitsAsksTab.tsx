import Link from "next/link";
import { CalendarCheck, MapPin, Radio } from "lucide-react";
import type { ProposalRow } from "@95forward/ai";
import { Badge, Button, Card, EmptyState, Heartbeat, HorizonTag } from "@/components/ds";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { followUpLabel } from "@/lib/follow-up";
import type { ProspectDetail } from "@/server/data/prospects";
import type { AskRow, ExecutionSummary, VisitRow } from "@/server/data/execution-data";
import { markFollowUpDoneAction, promoteReferralAction } from "@/server/actions/execution";
import { LogAskForm } from "./LogAskForm";
import { ReferralForm } from "./ReferralForm";
import { CopilotDrafts } from "./CopilotDrafts";
import { VisitPlanForm } from "./VisitPlanForm";

const OUTCOME_TONE = {
  commitment: "success",
  roadmap: "info",
  decline: "neutral",
} as const;

function outcomeLabel(o: AskRow["outcome"]): string {
  if (o === "commitment") return "Commitment";
  if (o === "roadmap") return "Roadmap";
  if (o === "decline") return "Decline";
  return "Open";
}

function askAmount(a: AskRow): string {
  if (a.outcome === "commitment" && a.commitmentAmountCents != null) {
    return `${formatCurrencyFromCents(a.commitmentAmountCents)} committed`;
  }
  if (
    a.amountMinCents != null &&
    a.amountMaxCents != null &&
    a.amountMaxCents !== a.amountMinCents
  ) {
    return `${formatCurrencyFromCents(a.amountMinCents)}–${formatCurrencyFromCents(a.amountMaxCents)}`;
  }
  if (a.amountMinCents != null) return formatCurrencyFromCents(a.amountMinCents);
  return "Amount to be set";
}

function VisitCard({ visit }: { visit: VisitRow }) {
  return (
    <Card tone="sunk">
      <div
        className="f95-stack f95-stack--sm"
        data-testid={visit.planned ? "planned-visit" : "executed-visit"}
      >
        <div className="f95-cluster">
          <Badge tone={visit.planned ? "info" : "success"}>
            {visit.planned ? "Planned" : "Visited"}
          </Badge>
          {visit.occurredAt ? (
            <span className="f95-itemrow__meta">{formatDate(visit.occurredAt)}</span>
          ) : null}
          {visit.locationType ? (
            <span className="f95-itemrow__meta f95-cluster">
              <MapPin size={14} strokeWidth={1.8} /> {visit.locationType}
            </span>
          ) : null}
        </div>
        {visit.goal ? (
          <div className="f95-deflist__item">
            <span className="f95-deflist__term">Goal</span>
            <span className="f95-deflist__desc">{visit.goal}</span>
          </div>
        ) : null}
        {visit.outcome ? (
          <div className="f95-deflist__item">
            <span className="f95-deflist__term">Outcome</span>
            <span className="f95-deflist__desc">{outcomeLabel(visit.outcome)}</span>
          </div>
        ) : null}
        {visit.callMemo ? (
          <div className="f95-deflist__item">
            <span className="f95-deflist__term">Call memo</span>
            <span className="f95-deflist__desc">{visit.callMemo}</span>
          </div>
        ) : null}
        {visit.nextStep ? (
          <div className="f95-deflist__item">
            <span className="f95-deflist__term">Next step</span>
            <span className="f95-deflist__desc">{visit.nextStep}</span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function VisitsAsksTab({
  detail,
  execution,
  initiatives,
  drafts,
}: {
  detail: ProspectDetail;
  execution: ExecutionSummary;
  initiatives: { id: string; name: string }[];
  drafts: ProposalRow[];
}) {
  const openFollowUp = execution.openFollowUps[0] ?? null;
  const lastExecutedVisit = execution.visits.find((v) => !v.planned) ?? null;

  return (
    <div className="f95-stack">
      <Card>
        <div className="f95-cluster">
          <div className="f95-stack f95-stack--sm">
            <h2 className="f95-section-title">Execution</h2>
            <span className="f95-deflist__desc--empty">
              Plan, visit, ask, and the 24-hour follow-up that keeps momentum.
            </span>
          </div>
          <span className="f95-recordbar__spacer" />
          <VisitPlanForm prospectId={detail.id} />
          <Link href={`/95-forward/visit?prospect=${detail.id}&phase=before`}>
            <Button variant="go" size="sm" iconLeft={<Radio size={15} strokeWidth={1.8} />}>
              Enter visit mode
            </Button>
          </Link>
        </div>
      </Card>

      {openFollowUp ? (
        <Card>
          <div className="f95-cluster" data-testid="follow-up-heartbeat">
            <Heartbeat
              status={openFollowUp.heartbeat}
              label={`24-hour follow-up · ${followUpLabel(openFollowUp.dueAt)}`}
            />
            <span className="f95-recordbar__spacer" />
            <form action={markFollowUpDoneAction}>
              <input type="hidden" name="followUpTaskId" value={openFollowUp.id} />
              <input type="hidden" name="prospectId" value={detail.id} />
              <Button type="submit" variant="secondary" size="sm">
                Mark done
              </Button>
            </form>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="f95-stack" data-testid="visits-list">
          <h2 className="f95-section-title">Visits</h2>
          {execution.visits.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck size={20} strokeWidth={1.8} />}
              title="No visits yet"
              line="Plan a visit, then enter visit mode to run it."
            />
          ) : (
            <div className="f95-stack f95-stack--sm">
              {execution.visits.map((v) => (
                <VisitCard key={v.id} visit={v} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="f95-stack" data-testid="asks-list">
          <div className="f95-cluster">
            <h2 className="f95-section-title">Asks</h2>
            <span className="f95-recordbar__spacer" />
            <LogAskForm prospectId={detail.id} initiatives={initiatives} />
          </div>
          {execution.asks.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck size={20} strokeWidth={1.8} />}
              title="No asks logged yet"
              line="Log an ask when numbers are on the table."
            />
          ) : (
            <div className="f95-stack f95-stack--sm">
              {execution.asks.map((a) => (
                <div key={a.id} className="f95-itemrow" data-testid="ask-row">
                  <div className="f95-itemrow__body">
                    <span className="f95-itemrow__title">{a.initiativeName}</span>
                    <span className="f95-itemrow__meta f95-cluster">
                      <HorizonTag horizon={a.frame} /> {askAmount(a)}
                    </span>
                    {a.roadmapNextSteps ? (
                      <span className="f95-itemrow__meta">{a.roadmapNextSteps}</span>
                    ) : null}
                  </div>
                  <div className="f95-itemrow__actions">
                    <Badge tone={a.outcome ? OUTCOME_TONE[a.outcome] : "neutral"}>
                      {outcomeLabel(a.outcome)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="f95-stack" data-testid="referrals-list">
          <div className="f95-cluster">
            <h2 className="f95-section-title">Referrals</h2>
            <span className="f95-recordbar__spacer" />
            <ReferralForm prospectId={detail.id} />
          </div>
          {execution.referrals.length === 0 ? (
            <span className="f95-deflist__desc--empty">No referrals captured yet.</span>
          ) : (
            <div className="f95-stack f95-stack--sm">
              {execution.referrals.map((r) => (
                <div key={r.id} className="f95-itemrow" data-testid="referral-row">
                  <div className="f95-itemrow__body">
                    <span className="f95-itemrow__title">{r.referredName}</span>
                    <span className="f95-itemrow__meta">
                      {r.mayUseName ? "May use name" : "Name not for use"}
                      {r.willSendNote ? " · will send a note" : ""}
                    </span>
                  </div>
                  <div className="f95-itemrow__actions">
                    {r.promotedProspectId ? (
                      <Link href={`/95-forward/prospects/${r.promotedProspectId}`}>
                        <Button variant="ghost" size="sm">
                          On the list
                        </Button>
                      </Link>
                    ) : (
                      <form action={promoteReferralAction}>
                        <input type="hidden" name="referralId" value={r.id} />
                        <input type="hidden" name="sourceProspectId" value={detail.id} />
                        <input type="hidden" name="displayName" value={r.referredName} />
                        <input type="hidden" name="type" value="individual" />
                        <Button type="submit" variant="secondary" size="sm">
                          Promote to prospect
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <CopilotDrafts
        prospectId={detail.id}
        visitId={lastExecutedVisit?.id ?? null}
        followUpTaskId={openFollowUp?.id ?? null}
        drafts={drafts}
      />
    </div>
  );
}

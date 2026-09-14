import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import {
  Button,
  Card,
  HealthDot,
  InitiativeChip,
  MonoCaption,
  OpenInKeystone,
  ProgressBar,
  RuleChip,
  StatusLabel,
} from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { getOpportunityDetail } from "@/server/data/opportunity-detail";
import { prospectTypeLabel, stageLabel } from "../../board/board-copy";
import {
  actorLine,
  counterLine,
  countsAsClosing,
  countsAsRows,
  coverageSentence,
  milestoneFooter,
  missingLine,
  shareSentence,
  slippageChain,
  slippageHeadline,
  slippageVerdict,
  timelineHealth,
  unconfirmedNotes,
  timelineSentence,
  verdictHeadline,
} from "./detail-copy";
import { MilestoneList } from "./MilestoneList";
import { ChangeAmount, LogWhatHappened, MoveCloseDate } from "./RecordActions";

export const dynamic = "force-dynamic";

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="f95-deflist__item">
      <dt className="f95-deflist__term">{term}</dt>
      <dd className="f95-deflist__desc">{children}</dd>
    </div>
  );
}

/**
 * Opportunity Detail — where a rep prepares and records reality.
 *
 * Form-shaped, and it must not feel like a form: it opens with a VERDICT, and the milestones under
 * it are a scoreboard of whether the deal is real rather than fields to fill in. The whole screen
 * exists to make one argument undeniable — that a $250,000 ask a rep entered, approved and recorded
 * is worth nothing until the prospect confirmed a date and put it in writing.
 */
export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const detail = await getOpportunityDetail(user.tenantId, id, user.id);
  if (!detail) notFound();

  const {
    opportunity,
    facts,
    milestones,
    qualification,
    queuePosition,
    ranked,
    fallbackAction,
    share,
    coverageIfLost,
    coverageIfQualified,
    membership,
    partners,
    closeDateChain,
    timeline,
  } = detail;

  const qualified = qualification.qualified;
  const action = ranked?.nextAction ?? fallbackAction;
  const milestoneLabels = Object.fromEntries(milestones.map((m) => [m.key, m.label]));
  const naturalPartner = partners[0] ?? null;
  const coverage = coverageSentence(
    facts.initiativeName,
    qualified,
    coverageIfLost,
    coverageIfQualified,
  );

  return (
    <>
      <Topbar title={facts.prospectName} subtitle="95 Forward · Opportunity" heading={false} />
      <div className="f95-page f95-opp" data-testid="opportunity-detail" data-qualified={qualified}>
        {/* The breadcrumb keeps the queue position, so a rep knows where they came from. No
            position is invented for a record that is not in today's queue. */}
        <nav className="f95-cluster f95-opp__crumbs" aria-label="Breadcrumb">
          <Link href="/95-forward/board" className="f95-cluster f95-table__cell-link">
            <ArrowLeft size={14} strokeWidth={1.8} /> The Board
          </Link>
          {queuePosition ? (
            <span className="f95-muted" data-testid="queue-position">
              · #{queuePosition.rank} of {queuePosition.total} ·
            </span>
          ) : (
            <span className="f95-muted">·</span>
          )}
          <span className="f95-muted">Opportunity</span>
        </nav>

        <div className="f95-page__header f95-opp__head">
          <div className="f95-page__heading">
            <h1 className="f95-record-head__title">{facts.prospectName}</h1>
            <div className="f95-cluster f95-opp__headmeta">
              <span className="f95-opp__amount">
                {formatCurrencyFromCents(opportunity.amountCents)}
              </span>
              {facts.amountNote ? <span className="f95-muted">{facts.amountNote}</span> : null}
              <InitiativeChip colourKey={facts.initiativeColourKey}>
                {facts.initiativeName}
              </InitiativeChip>
              <span className="f95-opp__stage">
                {ranked ? <HealthDot health={ranked.health} /> : null}
                {stageLabel(opportunity.stage)}
              </span>
              <span className="f95-muted">
                {opportunity.closeDate
                  ? `Close date ${formatDate(opportunity.closeDate)}`
                  : "No close date set with them"}
              </span>
              {ranked ? <StatusLabel status={ranked.statusLabel} /> : null}
            </div>
          </div>
          <div className="f95-page__actions f95-cluster">
            <LogWhatHappened opportunityId={opportunity.id} />
            <Button
              href={`/95-forward/visit?prospect=${facts.prospectId}`}
              variant="secondary"
              size="sm"
              iconLeft={<Radio size={14} strokeWidth={1.8} />}
            >
              Enter visit mode
            </Button>
          </div>
        </div>

        {/* THE VERDICT ROW. It opens with a judgement, not with fields — which is why it is first,
            why it is three panels wide, and why it must clear the fold at 1280x800. */}
        <div className="f95-opp__verdict" data-testid="verdict-row">
          <Card pad="md" className="f95-verdict" accent health={qualified ? "moving" : "stuck"}>
            <div className="f95-eyebrow">Qualification state</div>
            <p className="f95-verdict__headline" data-testid="verdict-headline">
              {verdictHeadline(qualification)}
            </p>
            <MonoCaption tone="strong" data-testid="counter">
              {counterLine(qualification)}
            </MonoCaption>
            <ProgressBar
              label={`${qualification.blockingConfirmed} of ${qualification.blockingTotal} blocking milestones confirmed`}
              value={qualification.blockingConfirmed}
              max={qualification.blockingTotal}
              tone={qualified ? "moving" : "stuck"}
            />
            <p className="f95-verdict__line">{missingLine(qualification)}</p>
          </Card>

          <Card pad="md" className="f95-verdict">
            <div className="f95-eyebrow">What this ask counts as</div>
            <dl className="f95-countsas" data-testid="counts-as">
              {countsAsRows(opportunity.amountCents, qualified, membership).map((row) => (
                <div className="f95-countsas__row" key={row.label} data-counted={row.counted}>
                  <dt>{row.label}</dt>
                  <dd className={row.counted ? "" : "f95-muted"}>{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="f95-verdict__line">{countsAsClosing(qualified)}</p>
          </Card>

          <Card pad="md" className="f95-verdict">
            <div className="f95-eyebrow">Next action</div>
            <p className="f95-verdict__headline f95-verdict__headline--sm">{action.label}</p>
            <p className="f95-verdict__line">
              {ranked?.rationale ??
                `Nothing is firing on this one. The stage says what happens next: ${action.label.toLowerCase()}.`}
            </p>
            <div className="f95-cluster">
              <Button href="/95-forward/board" variant="go" size="sm">
                {action.label}
              </Button>
              {ranked ? <RuleChip ruleId={ranked.primaryRuleId} /> : null}
            </div>
          </Card>
        </div>

        <MilestoneList
          opportunityId={opportunity.id}
          milestones={milestones}
          unconfirmedNotes={unconfirmedNotes({
            closeDateMoves: closeDateChain.count,
            anyProspectSourced: closeDateChain.anyProspectSourced,
            silenceDays: detail.silenceDays,
            amountAgreed: milestones.some((m) => m.key === "amount_agreed" && m.confirmed),
          })}
          footer={milestoneFooter(qualification, opportunity.amountCents)}
          blockingCount={qualification.missingBlocking.length}
        />

        <div className="f95-opp__lower">
          <section className="f95-stack f95-stack--sm" data-testid="movement">
            <h2 className="f95-section-title">Movement</h2>
            <p className="f95-muted">What changed, when, and who moved it.</p>

            {closeDateChain.count > 0 ? (
              <Card
                pad="md"
                accent
                health={closeDateChain.anyProspectSourced ? "slowing" : "stuck"}
                data-testid="slippage"
              >
                <div className="f95-stack f95-stack--sm">
                  <strong className="f95-opp__slip-head">
                    {slippageHeadline(closeDateChain.count, closeDateChain.totalDaysMoved)}
                  </strong>
                  <MonoCaption tone="strong">
                    {slippageChain(
                      closeDateChain.chain,
                      closeDateChain.count,
                      closeDateChain.anyProspectSourced,
                      formatDate,
                    )}
                  </MonoCaption>
                  <p className="f95-opp__slip-verdict">
                    {slippageVerdict(facts.prospectName, closeDateChain.anyProspectSourced)}
                  </p>
                  <div className="f95-cluster">
                    <MoveCloseDate
                      opportunityId={opportunity.id}
                      closeDate={opportunity.closeDate}
                    />
                  </div>
                </div>
              </Card>
            ) : null}

            <ol className="f95-timeline" data-testid="timeline">
              {timeline.map((event, index) => (
                <li
                  className="f95-timeline__row"
                  key={`${event.occurredAt.toISOString()}-${index}`}
                >
                  <span className="f95-timeline__when">
                    {formatDate(event.occurredAt.toISOString().slice(0, 10))}
                  </span>
                  <HealthDot health={timelineHealth(event.prospectSourced)} />
                  <span className="f95-timeline__what">
                    {timelineSentence(event, formatDate, milestoneLabels)}
                    <span className="f95-timeline__who f95-muted">
                      {actorLine(event.actorName ?? null, event.prospectSourced)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="f95-muted" data-testid="change-count">
              {timeline.length} {timeline.length === 1 ? "change" : "changes"} on the record.
            </p>
          </section>

          <aside className="f95-stack f95-stack--sm f95-opp__rail">
            <Card pad="md" data-testid="the-facts">
              <div className="f95-eyebrow">The facts</div>
              <dl className="f95-deflist">
                <Fact term="Prospect">
                  {facts.prospectName}{" "}
                  <span className="f95-muted">· {prospectTypeLabel(facts.prospectType)}</span>
                </Fact>
                {/* The initiative's name, deliberately WITHOUT its colour dot. --initiative-1
                    resolves to blue-600, which also backs --role-manager, and the relationship
                    manager is three rows below: the same blue would mean two different things a
                    centimetre apart. The dot lives in the header, far from the role chip. */}
                <Fact term="Initiative">{facts.initiativeName}</Fact>
                <Fact term="Ask amount">
                  {formatCurrencyFromCents(opportunity.amountCents)}
                  {facts.amountNote ? ` ${facts.amountNote}` : ""}
                </Fact>
                <Fact term="Close date">
                  {opportunity.closeDate ? (
                    <>
                      {formatDate(opportunity.closeDate)}
                      <span className="f95-muted">
                        {closeDateChain.count === 0
                          ? " · never moved"
                          : closeDateChain.anyProspectSourced
                            ? " · moved with them"
                            : " · set by us"}
                      </span>
                    </>
                  ) : (
                    <span className="f95-muted">never set with them</span>
                  )}
                </Fact>
                <Fact term="Stage">{stageLabel(opportunity.stage)}</Fact>
                <Fact term="Relationship mgr">
                  {facts.relationshipManager ?? <span className="f95-muted">Unassigned</span>}
                </Fact>
                <Fact term="Natural partner">
                  {naturalPartner ? (
                    <>
                      {naturalPartner.name}
                      {naturalPartner.role ? (
                        <span className="f95-muted"> · {naturalPartner.role}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="f95-muted">Nobody identified</span>
                  )}
                </Fact>
                <Fact term="Last contact">
                  {detail.lastContactAt ? (
                    formatDate(detail.lastContactAt.toISOString().slice(0, 10))
                  ) : (
                    <span className="f95-muted">Never logged</span>
                  )}
                </Fact>
              </dl>
              <div className="f95-cluster f95-opp__factactions">
                <ChangeAmount
                  opportunityId={opportunity.id}
                  amountCents={opportunity.amountCents}
                  amountNote={facts.amountNote}
                />
                <MoveCloseDate opportunityId={opportunity.id} closeDate={opportunity.closeDate} />
              </div>
              <OpenInKeystone href={`/constituents`}>full giving history</OpenInKeystone>
            </Card>

            <Card pad="md" data-testid="initiative-share">
              <div className="f95-eyebrow">Where this sits in {facts.initiativeName}</div>
              <p className="f95-opp__sharepct">
                {share?.counted ? `${Math.round((share.share ?? 0) * 100)}%` : "Not yet counted"}
              </p>
              <p className="f95-verdict__line" data-testid="share-line">
                {shareSentence(share)}
              </p>
              {share?.counted ? (
                <ProgressBar
                  label="Share of the initiative's qualified asks"
                  value={Math.round((share.share ?? 0) * 100)}
                  tone="accent"
                />
              ) : null}
              {coverage ? (
                <p className="f95-opp__coverage" data-testid="coverage-line">
                  {coverage}
                </p>
              ) : null}
              <Link className="f95-table__cell-link" href="/95-forward/forecast">
                See {facts.initiativeName} forecast
              </Link>
            </Card>

            <Card pad="md" data-testid="silence">
              <div className="f95-eyebrow">Silence</div>
              <p className="f95-opp__silence">
                {detail.silenceDays === null ? "No contact ever" : `${detail.silenceDays} days`}
              </p>
              <p className="f95-verdict__line">
                {detail.lastContactAt
                  ? `Last contact ${formatDate(detail.lastContactAt.toISOString().slice(0, 10))}.`
                  : "Nobody has logged a conversation with them on this opportunity."}
              </p>
              <MonoCaption
                tone={
                  detail.silenceDays !== null && detail.silenceDays > detail.cadenceDays
                    ? "alert"
                    : "muted"
                }
                data-testid="cadence"
              >
                CADENCE FOR THIS STAGE · EVERY {detail.cadenceDays} DAYS
              </MonoCaption>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { Card, Metric, MonoCaption, TabNav } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrencyFromCents } from "@/lib/format";
import { getBoardData } from "@/server/data/board";
import { belowCutSentence, boardSubtitle } from "./board-copy";
import { Dismissed } from "./Dismissed";
import { FixFirst } from "./FixFirst";
import { QueueCard } from "./QueueCard";

export const dynamic = "force-dynamic";

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;
const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

/** `95 FORWARD · SATURDAY 12 SEPTEMBER` — from the injected clock, in UTC like every other date. */
function eyebrowDate(now: Date): string {
  return `${WEEKDAYS[now.getUTCDay()]} ${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]}`;
}

function ratio(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)}×`;
}

/**
 * The Board — what to do next, by name, ranked.
 *
 * Not a dashboard. The measure of this screen is whether a user can act on item #1 within seconds
 * of landing and understand why it is #1 without asking, which is why names and dollar amounts are
 * the largest things on every card and the verbs are deliberately smaller. A well-designed task
 * list would be a failure here, and a subtle one.
 *
 * Every number comes from a service. Nothing is recomputed in the browser, and nothing is composed
 * by a model: I23 returns facts, this screen arranges them.
 */
export default async function BoardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const board = await getBoardData(user.tenantId, user.id);
  const { dayWork, metrics, labels, coverageMultiple, ruleStatements } = board;
  const { fixFirst, queue, belowCut, summary } = dayWork;

  const fixFirstLabels = Object.fromEntries(
    fixFirst.map((finding) => {
      const label = labels.get(finding.opportunityId);
      return [
        finding.opportunityId,
        {
          prospectName: label?.prospectName ?? "Unknown prospect",
          initiativeName: label?.initiativeName ?? "—",
        },
      ];
    }),
  );

  return (
    <>
      <Topbar title="The Board" subtitle="95 Forward" />
      <div className="f95-page f95-board" data-testid="board">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward · {eyebrowDate(board.asOf)}</div>
            <h1 className="f95-page__title">The Board</h1>
            <p className="f95-page__count" data-testid="board-subtitle">
              {boardSubtitle(summary)}
            </p>
          </div>
          <div className="f95-page__actions">
            {/* Team is undesigned. Shipping it disabled is honest; improvising a leader view would
                be inventing a screen nobody specified. */}
            <TabNav
              label="Scope"
              active="me"
              items={[
                { id: "me", label: "My board", href: "/95-forward/board" },
                { id: "team", label: "Team", href: "/95-forward/board", disabled: true },
              ]}
            />
          </div>
        </div>

        {/* The metric block runs HORIZONTAL — one dominant figure on the left, the three
            subordinate ones stacked beside it — which is both what the design shows and what the
            vertical budget can afford: stacking them cost 60px that item #1 needs at 1280x800.
            One Card wraps the block; the tiles sit bare inside it. See docs/design-system.md §5.4. */}
        <Card pad="md" data-testid="board-metrics">
          <div className="f95-metricblock">
            <div className="f95-metricblock__primary">
              <Metric
                dominant
                label="Qualified asks on the table"
                value={formatCurrencyFromCents(metrics.qualifiedAsks.cents)}
              >
                <div className="f95-cluster f95-metricblock__benchmark">
                  {/* A bare ratio invites complacency; the chip makes it a verdict. The multiple is
                      the org's, read from the rules catalogue — never a literal. */}
                  <MonoCaption tone="alert" data-testid="coverage-chip">
                    {ratio(metrics.coverageRatio)} COVERAGE · {coverageMultiple}× IS THE RULE
                  </MonoCaption>
                  <Link className="f95-table__cell-link" href="/95-forward/opportunities">
                    Show the {metrics.qualifiedAsks.opportunityIds.length}{" "}
                    {metrics.qualifiedAsks.opportunityIds.length === 1
                      ? "opportunity"
                      : "opportunities"}{" "}
                    behind it
                  </Link>
                </div>
              </Metric>
            </div>

            <div className="f95-metricblock__side">
              {/* The denominator, in words, beside the ratio it belongs to. Coverage is measured
                  against goal MINUS won, and the goal is a number the reader can see — so without
                  the basis stated, anyone checking 0.38× against $2,700,000 gets a different answer
                  and concludes the tool is broken. SCREENS.md puts the fuller monospace arithmetic
                  on the Forecast Room, not here. */}
              <Metric
                className="f95-metric--row"
                label={`Needed at ${coverageMultiple}× coverage`}
                value={formatCurrencyFromCents(metrics.neededAtCoverageCents)}
                sub={
                  metrics.basisCents === null
                    ? "no goal defined for this view"
                    : `${coverageMultiple}× the ${formatCurrencyFromCents(metrics.basisCents)} still to raise`
                }
              />
              <Metric
                className="f95-metric--row"
                alert={(metrics.coverageGapCents ?? 0) < 0}
                label="Coverage gap"
                value={formatCurrencyFromCents(metrics.coverageGapCents)}
                sub={
                  (metrics.coverageGapCents ?? 0) < 0
                    ? `of qualified asks missing to reach ${coverageMultiple}×`
                    : `at or above ${coverageMultiple}×`
                }
              />
              <Metric
                className="f95-metric--row"
                label="New asks to qualify"
                value={formatCurrencyFromCents(metrics.newAsksNeeded?.perWeek ?? null)}
                sub={
                  metrics.newAsksNeeded
                    ? `${formatCurrencyFromCents(metrics.newAsksNeeded.perDay)} a day · ${metrics.weeksLeft} weeks left`
                    : "no goal defined for this view"
                }
              />
            </div>
          </div>
        </Card>

        <FixFirst findings={fixFirst} labels={fixFirstLabels} />

        <section className="f95-stack f95-stack--sm" data-testid="queue">
          <div className="f95-board__sectionhead">
            <div>
              <h2 className="f95-section-title">Then the money</h2>
              <p className="f95-muted f95-board__sectionsub">
                Ranked by what a move today does to qualified asks on the table.
              </p>
            </div>
            <Dismissed entries={board.dismissed} />
          </div>

          {queue.map((item) => {
            const label = labels.get(item.opportunityId);
            return (
              <QueueCard
                key={item.opportunityId}
                item={item}
                prospectName={label?.prospectName ?? "Unknown prospect"}
                prospectType={label?.prospectType ?? "organization"}
                initiativeName={label?.initiativeName ?? "—"}
                initiativeColourKey={label?.initiativeColourKey ?? null}
                ruleStatements={ruleStatements}
              />
            );
          })}

          {belowCut.count > 0 ? (
            <div className="f95-board__belowcut" data-testid="below-cut">
              <span className="f95-muted">{belowCutSentence(belowCut)}</span>
              <Link className="f95-table__cell-link" href="/95-forward/opportunities">
                See the full portfolio
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}

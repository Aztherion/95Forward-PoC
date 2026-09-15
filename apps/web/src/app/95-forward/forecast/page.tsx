import Link from "next/link";
import {
  Card,
  HealthDot,
  InitiativeDot,
  Metric,
  MonoCaption,
  ScenarioBadge,
  TabNav,
} from "@/components/ds";
import { ForecastChart, type ForecastPoint } from "@/components/forecast";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { getForecastData } from "@/server/data/forecast";
import { stageLabel } from "../board/board-copy";
import {
  basisLine,
  chipStaleness,
  closedWorkLine,
  coverageSubline,
  forecastSubtitle,
  forecastVerdict,
  ledgerFooter,
  neededLine,
  simulationSubtitle,
  slipBeyondLine,
  stageReconciliation,
} from "./forecast-copy";
import { NamesDisclosure } from "./NamesDisclosure";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
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
];

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The grid, in what-if mode, scoped to this tab. Pending changes never travel in a URL — only
 *  the invitation to start does. */
function whatIfHref(initiative: string, preset?: string): string {
  const params = new URLSearchParams({ whatif: "1" });
  if (initiative !== "all") params.set("initiative", initiative);
  if (preset) params.set("preset", preset);
  return `/95-forward/opportunities?${params.toString()}`;
}

/**
 * The Monday-meeting screen.
 *
 * Two things make or break it. It must SURVIVE ARITHMETIC — someone in the room will check the
 * numbers, so every ratio shows its own denominator and the stage board states both of its totals.
 * And it must END IN A NAME: the chart sits beside a ledger of every opportunity, the stage board
 * is named chips, and both movement panels flag deals by name. No aggregate stands alone.
 */
export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const raw = await searchParams;

  const data = await getForecastData(
    user.tenantId,
    user.id,
    user.name,
    first(raw.initiative) ?? "all",
  );
  const {
    metrics,
    simulation,
    stage,
    ledger,
    tabs,
    activeTab,
    coverageMultiple,
    untouched,
    slipping,
    untouchedTotal,
    slippingTotal,
    labels,
    asOf,
  } = data;

  const goalDefined = metrics.goalDefined && metrics.goalCents !== null;
  const points: ForecastPoint[] = simulation.months.map((month) => ({
    date: `${month.month}-01`,
    actualCents: month.actualCents ?? null,
    mostLikelyCents: month.mostLikelyCents,
    bestCents: month.bestCents,
    worstCents: month.worstCents,
  }));

  const namesFor = (ids: readonly string[]) =>
    ids.map((id) => ({
      opportunityId: id,
      prospectName: labels.get(id)?.prospectName ?? "Unknown prospect",
      amountCents:
        ledger.find((row) => row.opportunityId === id)?.amountCents ??
        stage.columns.flatMap((c) => c.chips).find((c) => c.opportunityId === id)?.amountCents ??
        0,
    }));

  const verdict = forecastVerdict(metrics, simulation);
  const slipBeyond = slipBeyondLine(simulation);
  const bestOnlyIds = ledger.filter((r) => r.badge === "BEST_ONLY" && !r.qualified);

  return (
    <>
      <Topbar title="The Forecast Room" subtitle="95 Forward" heading={false} />
      <div
        className="f95-page f95-fc"
        data-testid="forecast-room"
        data-scope={activeTab.initiative}
      >
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">
              95 Forward · {WEEKDAYS[asOf.getUTCDay()]} {asOf.getUTCDate()}{" "}
              {MONTHS[asOf.getUTCMonth()]} · Week {metrics.weekOfPeriod} of {metrics.weeksInPeriod}
            </div>
            <h1 className="f95-page__title">The Forecast Room</h1>
            <p className="f95-page__count" data-testid="forecast-subtitle">
              {forecastSubtitle(activeTab.label, metrics, simulation)}
            </p>
          </div>
          <div className="f95-page__actions">
            {/* All reps is undesigned. Disabled is honest. */}
            <TabNav
              label="Scope"
              active="me"
              items={[
                { id: "me", label: "My portfolio", href: "/95-forward/forecast" },
                { id: "all", label: "All reps", href: "/95-forward/forecast", disabled: true },
              ]}
            />
          </div>
        </div>

        {/* Selecting a tab re-scopes the ENTIRE view — metrics, simulation, ledger, stage board and
            both movement panels. Scope travels in the URL, so a tab is linkable and each scope's
            simulation caches independently. */}
        <TabNav
          label="Initiatives"
          active={activeTab.id}
          items={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            href:
              tab.initiative === "all"
                ? "/95-forward/forecast"
                : `/95-forward/forecast?initiative=${tab.initiative}`,
            colourKey: tab.colourKey,
          }))}
        />

        <div className="f95-fc__metrics" data-testid="forecast-metrics">
          <Card pad="md">
            <Metric
              label="Won so far"
              value={formatCurrencyFromCents(metrics.won.cents)}
              sub={
                <NamesDisclosure
                  testId="won-names"
                  label={`${metrics.won.count} closed this year · see them`}
                  names={namesFor(metrics.won.opportunityIds)}
                />
              }
            />
          </Card>

          <Card pad="md">
            <Metric
              label="Qualified asks on the table"
              value={formatCurrencyFromCents(metrics.qualifiedAsks.cents)}
              sub={
                <NamesDisclosure
                  testId="qualified-names"
                  label={`${metrics.qualifiedAsks.count} opportunities · see the names`}
                  names={namesFor(metrics.qualifiedAsks.opportunityIds)}
                />
              }
            />
          </Card>

          <Card pad="md">
            <Metric
              // First name, as the design has it — "DANA'S FY26 GOAL". The full name plus a long
              // initiative name runs to three lines in a 190px card.
              label={`${data.repName.split(" ")[0]}'s ${data.scope.period} goal · ${activeTab.initiative === "all" ? "all initiatives" : activeTab.label}`}
              value={goalDefined ? formatCurrencyFromCents(metrics.goalCents) : "—"}
              sub={coverageSubline(metrics)}
              basis={basisLine(metrics) ?? undefined}
            />
          </Card>

          <Card pad="md">
            <Metric
              alert={(metrics.coverageGapCents ?? 0) < 0}
              label="Coverage gap"
              value={goalDefined ? formatCurrencyFromCents(metrics.coverageGapCents) : "—"}
              sub={
                goalDefined ? (
                  <NamesDisclosure
                    testId="gap-names"
                    label="who could close it"
                    names={namesFor(metrics.unqualified.opportunityIds)}
                  />
                ) : (
                  "no goal defined for this view"
                )
              }
              basis={neededLine(metrics, coverageMultiple) ?? undefined}
            />
          </Card>

          <Card pad="md">
            <Metric
              label="New asks needed"
              value={
                metrics.newAsksNeeded ? formatCurrencyFromCents(metrics.newAsksNeeded.perWeek) : "—"
              }
              sub={
                metrics.newAsksNeeded
                  ? `per week · ${formatCurrencyFromCents(metrics.newAsksNeeded.perDay)} a day · ${formatCurrencyFromCents(metrics.newAsksNeeded.perHour)} an hour in the chair`
                  : "no goal defined for this view"
              }
            />
          </Card>
        </div>

        <div className="f95-fc__lower">
          <div className="f95-stack f95-stack--sm">
            <Card pad="lg" data-testid="bmw">
              <div className="f95-stack f95-stack--sm">
                <div>
                  <h2 className="f95-section-title">BMW forecast · {activeTab.label}</h2>
                  {/* The trial count is the setting's, not a literal — and the second sentence
                      answers the half-pregnant objection before anyone raises it. */}
                  <p className="f95-muted f95-fc__lede" data-testid="bmw-subtitle">
                    {simulationSubtitle(simulation)}
                  </p>
                </div>
                <ForecastChart
                  points={points}
                  goalCents={goalDefined ? metrics.goalCents : null}
                  todayIso={asOf.toISOString().slice(0, 10)}
                  ariaLabel={`Cumulative forecast for ${activeTab.label}.`}
                />
                {verdict ? (
                  <p className="f95-fc__verdict" data-testid="bmw-verdict">
                    {verdict}
                  </p>
                ) : (
                  <p className="f95-fc__verdict f95-muted" data-testid="bmw-verdict">
                    No goal defined for this view — there is nothing to land short of.
                  </p>
                )}
                {slipBeyond ? (
                  <MonoCaption data-testid="slip-beyond">{slipBeyond.toUpperCase()}</MonoCaption>
                ) : null}
                {bestOnlyIds.length > 0 ? (
                  <NamesDisclosure
                    testId="best-only-names"
                    label="Qualify the best-case asks"
                    names={bestOnlyIds.map((r) => ({
                      opportunityId: r.opportunityId,
                      prospectName: r.prospectName,
                      amountCents: r.amountCents,
                    }))}
                  />
                ) : null}

                {/* The door to I31's sandbox.
                    This is where the question arises and the grid is where it gets answered:
                    a what-if needs editing — many rows, eight fields, validation, the close-date
                    guard — and that exists only on the grid. Building a second editing surface
                    here would duplicate I29 for no gain. The link carries the selected tab, so
                    "what if we did this to Kamuli" opens already scoped to Kamuli.
                    `Qualify the best-case asks` above is one instance of this, with a preset. */}
                <div className="f95-fc__whatif">
                  <Link
                    href={whatIfHref(activeTab.initiative)}
                    className="f95-fc__whatiflink"
                    data-testid="forecast-whatif"
                  >
                    Explore a what-if for {activeTab.label} →
                  </Link>
                  {bestOnlyIds.length > 0 ? (
                    <Link
                      href={whatIfHref(activeTab.initiative, "qualify-best-only")}
                      className="f95-fc__whatiflink f95-fc__whatiflink--preset"
                      data-testid="forecast-whatif-qualify"
                    >
                      …or try qualifying those {bestOnlyIds.length} now
                    </Link>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card pad="lg" data-testid="stage-board">
              <div className="f95-stack f95-stack--sm">
                <div className="f95-fc__stagehead">
                  <div>
                    <h2 className="f95-section-title">Stage board · {activeTab.label}</h2>
                    <p className="f95-muted f95-fc__lede">
                      Every open opportunity, one chip, coloured by health. Left is work; right is
                      money.
                    </p>
                  </div>
                  <div className="f95-cluster f95-fc__legend">
                    {(["moving", "slowing", "stuck"] as const).map((health) => (
                      <span className="f95-fc__key" key={health}>
                        <HealthDot health={health} />
                        {health[0]!.toUpperCase() + health.slice(1)}
                      </span>
                    ))}
                    {/* Amendment 1's visual answer: a pre-close column holds qualified AND
                        unqualified chips, so the two are told apart by FILL. Without it the column
                        total appears to contradict the headline metric. */}
                    <span className="f95-fc__key">
                      <span className="f95-chip f95-chip--legend" aria-hidden />
                      Qualified
                    </span>
                    <span className="f95-fc__key">
                      <span
                        className="f95-chip f95-chip--unqualified f95-chip--legend"
                        aria-hidden
                      />
                      Not yet qualified
                    </span>
                  </div>
                </div>

                <div className="f95-stageboard">
                  {stage.columns.map((column, index) => (
                    <div
                      className={`f95-stagecol${column.preClose ? "" : " f95-stagecol--closed"}${
                        index === 4 ? " f95-stagecol--divider" : ""
                      }`}
                      key={column.stage}
                      data-stage={column.stage}
                    >
                      <div className="f95-stagecol__head">
                        <span className="f95-stagecol__name">{stageLabel(column.stage)}</span>
                        <span className="f95-stagecol__count">
                          {column.count} · {formatCurrencyFromCents(column.totalCents)}
                        </span>
                        <MonoCaption tone={column.preClose ? "muted" : "quiet"}>
                          {column.preClose ? "COUNTS AS QUALIFIED ASKS" : "OUTSIDE THE HEADLINE"}
                        </MonoCaption>
                      </div>
                      <ul className="f95-stagecol__chips">
                        {column.chips.map((chip) => {
                          const label = labels.get(chip.opportunityId);
                          const health =
                            chip.closeDateMoves >= 2 || (chip.silenceDays ?? 0) >= 60
                              ? "stuck"
                              : (chip.silenceDays ?? 0) >= 30
                                ? "slowing"
                                : "moving";
                          return (
                            <li key={chip.opportunityId}>
                              <Link
                                href={`/95-forward/opportunities/${chip.opportunityId}`}
                                className={`f95-chip f95-chip--${health}${chip.qualified ? "" : " f95-chip--unqualified"}`}
                                data-qualified={chip.qualified}
                                data-testid="stage-chip"
                              >
                                <span className="f95-chip__name">
                                  {label?.prospectName ?? "Unknown"}
                                </span>
                                <span className="f95-chip__amount">
                                  {formatCurrencyFromCents(chip.amountCents)}
                                </span>
                                <span className="f95-chip__meta">{chipStaleness(chip)}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="f95-fc__reconcile">
                  <p className="f95-fc__reconcile-left" data-testid="stage-reconciliation">
                    {stageReconciliation(stage)}
                  </p>
                  <MonoCaption tone="quiet" data-testid="closed-work">
                    {closedWorkLine(stage)}
                  </MonoCaption>
                </div>
              </div>
            </Card>
          </div>

          <aside className="f95-stack f95-stack--sm f95-fc__rail">
            <Card pad="md" data-testid="ledger">
              <div className="f95-eyebrow">What the simulation stands on</div>
              <p className="f95-muted f95-fc__lede">
                Every opportunity, and which scenario it lands in.
              </p>
              <ul className="f95-ledger">
                {ledger.map((row) => (
                  <li
                    className="f95-ledger__row"
                    key={row.opportunityId}
                    // The badge and the amount, machine-readable. Invariant 3 decomposes BMW
                    // against this ledger, and it cannot do that by parsing a badge's prose out
                    // of a row that also contains a name and a currency.
                    data-testid="ledger-row"
                    data-badge={row.badge}
                    data-qualified={row.qualified}
                    data-amount-cents={row.amountCents}
                  >
                    <Link
                      className="f95-ledger__name f95-table__cell-link"
                      href={`/95-forward/opportunities/${row.opportunityId}`}
                    >
                      <InitiativeDot colourKey={row.initiativeColourKey} />
                      {row.prospectName}
                    </Link>
                    <ScenarioBadge badge={row.badge} />
                    <span className="f95-ledger__amount">
                      {formatCurrencyFromCents(row.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
              {ledgerFooter(simulation, ledger.length) ? (
                <p className="f95-fc__ledgerfoot" data-testid="ledger-footer">
                  {ledgerFooter(simulation, ledger.length)}
                </p>
              ) : null}
            </Card>

            <Card pad="md" data-testid="untouched">
              <div className="f95-eyebrow">Untouched {data.untouchedDays}+ days</div>
              <p className="f95-fc__panelcount">
                {untouchedTotal.count}{" "}
                {untouchedTotal.count === 1 ? "opportunity" : "opportunities"} ·{" "}
                {formatCurrencyFromCents(untouchedTotal.cents)} frozen
              </p>
              <ul className="f95-movement">
                {untouched.map((row) => (
                  <li className="f95-movement__row" key={row.opportunityId}>
                    <Link
                      className="f95-table__cell-link"
                      href={`/95-forward/opportunities/${row.opportunityId}`}
                    >
                      {row.prospectName}
                    </Link>
                    <span className="f95-muted">
                      {row.initiativeName} · {stageLabel(row.stage as never)}
                    </span>
                    <MonoCaption tone="alert">
                      {row.silenceDays === null ? "NEVER CONTACTED" : `${row.silenceDays}D SILENT`}
                    </MonoCaption>
                  </li>
                ))}
              </ul>
            </Card>

            <Card pad="md" data-testid="slipping">
              <div className="f95-eyebrow">Close date pushed {data.pushes}× or more</div>
              <p className="f95-fc__panelcount">
                {slippingTotal.count} {slippingTotal.count === 1 ? "opportunity" : "opportunities"}{" "}
                · {formatCurrencyFromCents(slippingTotal.cents)} slipping
              </p>
              <ul className="f95-movement">
                {slipping.map((row) => (
                  <li className="f95-movement__row" key={row.opportunityId}>
                    <Link
                      className="f95-table__cell-link"
                      href={`/95-forward/opportunities/${row.opportunityId}`}
                    >
                      {row.prospectName}
                    </Link>
                    <span className="f95-muted">
                      {row.initiativeName} · {formatCurrencyFromCents(row.amountCents)}
                    </span>
                    <MonoCaption>
                      {row.chain.length > 0
                        ? row.chain.map((d) => formatDate(d).toUpperCase()).join(" → ")
                        : `PUSHED ${row.closeDateMoves}×`}
                    </MonoCaption>
                    {/* Re-date opens I26's flow, which already asks whether the prospect gave us
                        the date — so the flag that produced this panel is captured by the action
                        that resolves it. */}
                    <Link
                      className="f95-table__cell-link"
                      href={`/95-forward/opportunities/${row.opportunityId}#move-close-date`}
                      data-testid="re-date"
                    >
                      Re-date with them
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

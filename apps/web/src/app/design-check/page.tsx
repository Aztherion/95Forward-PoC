import type { ReactNode } from "react";
import {
  ALL_SCOPE,
  computeMetrics,
  DEFAULT_FORWARD_SETTINGS,
  QUEUE_HEALTHS,
  QUEUE_STATUS_LABELS,
  RANKING_RULES,
  simulate,
  type ScenarioBadge as ScenarioBadgeKind,
} from "@95forward/shared";
import { DEMO_TODAY } from "@95forward/db";
import {
  Button,
  Card,
  HealthDot,
  InitiativeChip,
  InitiativeDot,
  Metric,
  MilestoneBadge,
  MonoCaption,
  ProgressBar,
  RuleChip,
  ScenarioBadge,
  StatusLabel,
  TabNav,
} from "@/components/ds";
import { ForecastChart, type ForecastPoint } from "@/components/forecast";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import {
  formatCurrencyAbbreviatedFromCents,
  formatCurrencyFromCents,
  formatCurrencySeriesAbbreviatedFromCents,
} from "@/lib/format";
import { demoClock, loadForwardSnapshot } from "@/server/data/forward-context";

export const dynamic = "force-dynamic";

function Group({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <section className="f95-stack" data-group={label}>
      <div>
        <div className="f95-page__eyebrow">{label}</div>
        {note ? <p className="f95-deflist__desc--empty">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="f95-cluster">{children}</div>;
}

const SCENARIOS: ScenarioBadgeKind[] = [
  "IN_ALL_THREE",
  "MOST_LIKELY_PLUS",
  "BEST_ONLY",
  "OUTSIDE_BEST",
];

const INITIATIVES = [
  { colourKey: "initiative-1", name: "Everyone in Kamuli — Uganda 2026" },
  { colourKey: "initiative-2", name: "Everyone Forever: Bolivia Scale-Up" },
  { colourKey: "initiative-3", name: "The Forever Promise" },
  { colourKey: "initiative-4", name: "Unrestricted" },
  { colourKey: "initiative-5", name: "(spare slot)" },
  { colourKey: null, name: "(no colour key)" },
];

/** Representative amounts: the seed's goal, a headline, a shortfall, and the awkward boundaries. */
const MONEY = [
  1_915_000_00, 2_700_000_00, 469_200_00, 945_000_00, 845_000_00, 225_000_00, 17_500_00, 999_500_00,
  -5_249_400_00, 0,
];

/**
 * The verification gallery (I17b) — every new token and primitive, in the real shell.
 *
 * Unlinked and dev-only, like `/styleguide`, which it deliberately does not extend: that gallery
 * renders bare, and the questions this one has to answer are about context. Does the amber read as
 * amber against a card on this background? Is an 11px uppercase mono chip legible? Does a 52px
 * headline still read as dominant beside Keystone's chrome and a 264px sidebar? None of those can
 * be answered by a test, and I24 found a real shell defect that every passing test had walked past.
 */
export default async function DesignCheckPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // The real simulation over the real seed, not a hand-drawn curve. Feeding the chart invented data
  // would verify the chart against itself; what needs verifying is that it renders the SHAPE I21
  // emits — monthly points whose actuals stop at today and whose band only starts there.
  //
  // DEFAULT_FORWARD_SETTINGS is used directly, and only here. How a request resolves a tenant's
  // settings is I26's decision, and a gallery is not the place to make it.
  const snapshot = await loadForwardSnapshot(user.tenantId);
  const result = simulate({
    snapshot,
    scope: ALL_SCOPE,
    settings: DEFAULT_FORWARD_SETTINGS,
    clock: demoClock(),
  });
  const points: ForecastPoint[] = result.months.map((month) => ({
    date: `${month.month}-01`,
    actualCents: month.actualCents ?? null,
    mostLikelyCents: month.mostLikelyCents,
    bestCents: month.bestCents,
    worstCents: month.worstCents,
  }));
  // The goal comes from the metrics service, which is the one place that resolves which goal
  // applies to a scope. Reading it off the snapshot here would be a second definition.
  const metrics = computeMetrics({
    snapshot,
    scope: ALL_SCOPE,
    settings: DEFAULT_FORWARD_SETTINGS,
    clock: demoClock(),
  });
  const goalCents = metrics.goalCents;

  const series = formatCurrencySeriesAbbreviatedFromCents([
    result.yearEnd.bestCents,
    result.yearEnd.mostLikelyCents,
    result.yearEnd.worstCents,
  ]);

  return (
    <>
      <Topbar title="Design check" subtitle="95 Forward" />
      <div className="f95-page" data-testid="design-check">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward · dev harness</div>
            <h1 className="f95-page__title">Design check</h1>
            <p className="f95-page__count">
              Every token and primitive I17b added, rendered inside the real Keystone shell.
              Unlinked and hidden in production.
            </p>
          </div>
        </div>

        <Group
          label="Status labels — all seven, from the engine's own enum"
          note="Wording is STATUS_LABEL_TEXT and colour is STATUS_HEALTH. Neither is written here."
        >
          <Row>
            {QUEUE_STATUS_LABELS.map((status) => (
              <StatusLabel key={status} status={status} />
            ))}
          </Row>
          <Row>
            {QUEUE_HEALTHS.map((health) => (
              <span key={health} className="f95-cluster">
                <HealthDot health={health} />
                <span className="f95-metric__sub">{health}</span>
              </span>
            ))}
          </Row>
        </Group>

        <Group
          label="Left-border accent"
          note="The same prop that rendered nothing on 5 of its 12 call sites before this initiative."
        >
          <div className="f95-tilegrid">
            {QUEUE_HEALTHS.map((health) => (
              <Card key={health} accent health={health}>
                <div className="f95-stack f95-stack--sm">
                  <StatusLabel
                    status={
                      health === "moving"
                        ? "on_track"
                        : health === "slowing"
                          ? "blocked"
                          : "at_risk"
                    }
                  />
                  <strong>Northwater Capital</strong>
                  <MonoCaption>EXCLUDED FROM THE FORECAST · ~30 SEC</MonoCaption>
                </div>
              </Card>
            ))}
            <Card tone="go" accent>
              <div className="f95-stack f95-stack--sm">
                <strong>tone=&quot;go&quot; accent</strong>
                <span className="f95-metric__sub">Rendered nothing before I17b.</span>
              </div>
            </Card>
            <Card tone="ai" accent>
              <div className="f95-stack f95-stack--sm">
                <strong>tone=&quot;ai&quot; accent</strong>
                <span className="f95-metric__sub">
                  Unchanged — it just arrives by the same route.
                </span>
              </div>
            </Card>
          </div>
        </Group>

        <Group
          label="Rule chips — the no-black-box guarantee, clickable"
          note="Every one links to /rules/:ruleId, the contract I22 fixed. All seven resolve."
        >
          <Row>
            {RANKING_RULES.map((rule) => (
              <RuleChip key={rule.id} ruleId={rule.id} />
            ))}
          </Row>
          <Row>
            <RuleChip ruleId="live-ask-silence" statement="&gt; 30d" />
            <RuleChip ruleId="amount-without-date" kind="CHECK" />
            <RuleChip ruleId="not-in-the-catalogue" href={null} />
          </Row>
        </Group>

        <Group label="Mono captions — consequence, subtitle, arithmetic">
          <div className="f95-stack f95-stack--sm">
            <MonoCaption>EXCLUDED FROM THE FORECAST · ~30 SEC</MonoCaption>
            <MonoCaption tone="alert">DISTORTS BEST/WORST BY $60,000 · ~1 MIN</MonoCaption>
            <MonoCaption tone="strong">
              $2,700,000 GOAL − $469,200 WON = $2,230,800 BASIS
            </MonoCaption>
            <MonoCaption>COUNTS AS QUALIFIED ASKS</MonoCaption>
            <MonoCaption tone="quiet">OUTSIDE THE HEADLINE</MonoCaption>
          </div>
        </Group>

        <Group
          label="Milestone badges — they said / we said"
          note="The asymmetry is carried by shape before colour: solid and filled against empty and dashed."
        >
          <Row>
            <MilestoneBadge kind="they-said" />
            <MilestoneBadge kind="we-said" />
            <MilestoneBadge kind="blocking" />
            <MilestoneBadge kind="not-asked" />
          </Row>
        </Group>

        <Group
          label="Scenario badges — the names ledger"
          note="A confidence ladder, coloured monotonically. See docs/design-system.md for the deviation from SCREENS.md."
        >
          <Row>
            {SCENARIOS.map((badge) => (
              <ScenarioBadge key={badge} badge={badge} />
            ))}
          </Row>
        </Group>

        <Group
          label="Initiative dots — a key is stored, a token is rendered"
          note="An unrecognised key falls back to neutral rather than guessing."
        >
          <Row>
            {INITIATIVES.map((initiative) => (
              <InitiativeChip key={initiative.name} colourKey={initiative.colourKey}>
                {initiative.name}
              </InitiativeChip>
            ))}
          </Row>
          <Row>
            {INITIATIVES.map((initiative) => (
              <InitiativeDot
                key={initiative.name}
                colourKey={initiative.colourKey}
                name={initiative.name}
              />
            ))}
          </Row>
        </Group>

        <Group
          label="The metric block — one dominant figure, three subordinate"
          note="Dominant binds --fs-5xl (52px): above every heading, below the QPI number, and affordable inside The Board's vertical budget."
        >
          <Card pad="lg">
            <div className="f95-stack">
              <Metric
                dominant
                label="Qualified asks on the table"
                value={formatCurrencyFromCents(1_915_000_00)}
                sub="to land the $2,700,000 FY26 goal"
                basis="1.3× COVERAGE · 3× IS THE RULE"
              />
              <div className="f95-statgrid">
                <Metric
                  label="Needed at 3× coverage"
                  value={formatCurrencyFromCents(6_692_400_00)}
                  sub="of qualified asks to reach 3×"
                />
                <Metric
                  alert
                  label="Coverage gap"
                  value={formatCurrencyFromCents(-4_777_400_00)}
                  sub="negative means short"
                />
                <Metric
                  label="New asks to qualify"
                  value={formatCurrencyFromCents(350_000_00)}
                  sub="$70,000 a day · 14 weeks left"
                />
              </div>
            </div>
          </Card>
        </Group>

        <Group label="Progress bars — clamped, named, and toned">
          <div className="f95-stack f95-stack--sm" style={{ maxWidth: 340 }}>
            <MonoCaption>1/4 THEY SAID · 2/2 WE SAID</MonoCaption>
            <ProgressBar label="1 of 4 they-said milestones" value={1} max={4} tone="stuck" />
            <ProgressBar label="58% of the initiative's qualified asks" value={58} tone="accent" />
            <ProgressBar label="Overflowing input, clamped" value={140} size="lg" tone="moving" />
          </div>
        </Group>

        <Group
          label="Navigation tabs with valid ARIA"
          note="aria-current on a link, not the aria-selected the six *Nav copies must set to get styling."
        >
          <TabNav
            label="Initiatives"
            active="kamuli"
            items={[
              { id: "everything", label: "Everything", href: "/design-check" },
              ...INITIATIVES.slice(0, 4).map((initiative, i) => ({
                id: i === 0 ? "kamuli" : `i${i}`,
                label: initiative.name,
                href: "/design-check",
                colourKey: initiative.colourKey,
              })),
              { id: "all-reps", label: "All reps", href: "/design-check", disabled: true },
            ]}
          />
        </Group>

        <Group
          label="Button as link — one anchor, no nested interactive element"
          note="The 70 existing <Link><Button/></Link> sites are a separate cleanup and are untouched."
        >
          <Row>
            <Button href="/rules" variant="primary" size="sm">
              Open opportunity
            </Button>
            <Button href="/rules" variant="secondary" size="sm">
              Why it ranks here
            </Button>
            <Button href="/rules" variant="ghost" size="sm" disabled>
              Team (undesigned)
            </Button>
            <Button variant="go" size="sm">
              Still a button
            </Button>
          </Row>
        </Group>

        <Group
          label="Currency — full and abbreviated"
          note="Full for metric cards and card amounts; abbreviated for chart labels and axis ticks."
        >
          <div className="f95-table-wrap">
            <table className="f95-table">
              <thead>
                <tr>
                  <th>Cents</th>
                  <th className="f95-table__num">Full</th>
                  <th className="f95-table__num">Abbreviated</th>
                </tr>
              </thead>
              <tbody>
                {MONEY.map((cents) => (
                  <tr key={cents}>
                    <td className="f95-table__muted">{cents}</td>
                    <td className="f95-table__num">{formatCurrencyFromCents(cents)}</td>
                    <td className="f95-table__num">{formatCurrencyAbbreviatedFromCents(cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <MonoCaption tone="strong">
            BEST {series[0]} · MOST LIKELY {series[1]} · WORST {series[2]}
          </MonoCaption>
          <p className="f95-deflist__desc--empty">
            Those three are formatted as one series, so two different totals can never render as the
            same string under the line they label.
          </p>
        </Group>

        <Group
          label="The forecast chart — the real simulation over the real seed"
          note={`${result.meta.trialCount.toLocaleString("en-US")} trials, seed ${result.meta.seed}, vintage ${result.meta.vintageDate}.`}
        >
          <Card pad="lg">
            <ForecastChart
              points={points}
              goalCents={goalCents}
              todayIso={DEMO_TODAY.toISOString().slice(0, 10)}
              ariaLabel={`Cumulative forecast. Best ${series[0]}, most likely ${series[1]}, worst ${series[2]}.`}
            />
          </Card>
        </Group>
      </div>
    </>
  );
}

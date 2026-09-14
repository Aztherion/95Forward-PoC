import { renderToStaticMarkup } from "react-dom/server";
import {
  QUEUE_HEALTHS,
  QUEUE_STATUS_LABELS,
  RANKING_RULE_IDS,
  STATUS_HEALTH,
  STATUS_LABEL_TEXT,
} from "@95forward/shared";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { Card } from "./Card";
import { HealthDot } from "./HealthDot";
import { InitiativeChip, InitiativeDot } from "./InitiativeDot";
import { Metric } from "./Metric";
import { MilestoneBadge, MILESTONE_BADGE_TEXT } from "./MilestoneBadge";
import { MonoCaption } from "./MonoCaption";
import { ProgressBar } from "./ProgressBar";
import { RuleChip } from "./RuleChip";
import { ScenarioBadge, SCENARIO_BADGE_TEXT } from "./ScenarioBadge";
import { StatusLabel } from "./StatusLabel";
import { TabNav } from "./TabNav";

// The war-room primitives (I17b) are thin className string-builders with no runtime behaviour, so
// react-dom/server renders them completely and no DOM environment is needed.

const HEALTH_CLASS = { moving: "moving", slowing: "slowing", stuck: "stuck" } as const;

describe("StatusLabel", () => {
  it("renders all seven labels from the engine's own maps", () => {
    for (const status of QUEUE_STATUS_LABELS) {
      const html = renderToStaticMarkup(<StatusLabel status={status} />);
      // The wording is STATUS_LABEL_TEXT's, never the screen's — two sources for one value is how
      // they come to disagree, and the colour vocabulary is only learnable while they agree.
      expect(html, status).toContain(STATUS_LABEL_TEXT[status]);
      expect(html, status).toContain(`f95-status--${STATUS_HEALTH[status]}`);
      expect(html, status).toContain(`data-status="${status}"`);
    }
  });

  it("covers every health the engine can emit", () => {
    const rendered = QUEUE_STATUS_LABELS.map((s) => STATUS_HEALTH[s]);
    // If a future enum change adds a health with no colour, this fails here rather than on screen.
    expect(new Set(rendered)).toEqual(new Set(QUEUE_HEALTHS));
    for (const health of QUEUE_HEALTHS) expect(HEALTH_CLASS[health]).toBeDefined();
  });

  it("drops the dot on request", () => {
    expect(renderToStaticMarkup(<StatusLabel status="cold" />)).toContain("f95-status__dot");
    expect(renderToStaticMarkup(<StatusLabel status="cold" dot={false} />)).not.toContain(
      "f95-status__dot",
    );
  });
});

describe("HealthDot", () => {
  it("renders each health with an accessible name, because colour is its only channel", () => {
    for (const health of QUEUE_HEALTHS) {
      const html = renderToStaticMarkup(<HealthDot health={health} />);
      expect(html, health).toContain(`f95-healthdot--${health}`);
      expect(html, health).toContain('role="img"');
      expect(html, health).toMatch(/aria-label="(Moving|Slowing|Stuck)"/);
    }
  });

  it("takes an override when the row already says it", () => {
    expect(renderToStaticMarkup(<HealthDot health="stuck" label="81 days silent" />)).toContain(
      'aria-label="81 days silent"',
    );
  });
});

describe("RuleChip", () => {
  it("links to /rules/:ruleId for all seven ranking rules", () => {
    for (const ruleId of RANKING_RULE_IDS) {
      const html = renderToStaticMarkup(<RuleChip ruleId={ruleId} />);
      expect(html, ruleId).toContain(`href="/rules/${ruleId}"`);
      expect(html, ruleId).toContain(ruleId);
      expect(html, ruleId).toContain("RULE ·");
    }
  });

  it("carries the rule's own statement when there is one", () => {
    const html = renderToStaticMarkup(<RuleChip ruleId="live-ask-silence" statement="&gt; 30d" />);
    expect(html).toContain("live-ask-silence");
    expect(html).toContain("30d");
  });

  it("renders inert, without an anchor, when the rule cannot be resolved", () => {
    const html = renderToStaticMarkup(<RuleChip ruleId="not-in-the-catalogue" href={null} />);
    expect(html).not.toContain("<a");
    expect(html).toContain("f95-rulechip");
  });

  it("takes a different kind for the data-integrity checks", () => {
    expect(renderToStaticMarkup(<RuleChip ruleId="amount-without-date" kind="CHECK" />)).toContain(
      "CHECK ·",
    );
  });
});

describe("MonoCaption", () => {
  it("renders every tone", () => {
    expect(renderToStaticMarkup(<MonoCaption>A · B</MonoCaption>)).toContain('class="f95-monocap"');
    for (const tone of ["strong", "alert", "quiet"] as const) {
      expect(renderToStaticMarkup(<MonoCaption tone={tone}>x</MonoCaption>), tone).toContain(
        `f95-monocap--${tone}`,
      );
    }
  });
});

describe("MilestoneBadge", () => {
  it("renders all four, with the specified copy", () => {
    for (const kind of ["they-said", "we-said", "blocking", "not-asked"] as const) {
      const html = renderToStaticMarkup(<MilestoneBadge kind={kind} />);
      expect(html, kind).toContain(`f95-msbadge--${kind}`);
      expect(html, kind).toContain(MILESTONE_BADGE_TEXT[kind]);
    }
  });

  it("separates they-said from we-said by shape, not only by colour", () => {
    // The asymmetry is the most novel idea in the product. If it survives only in the hue it is
    // invisible in greyscale, to a colour-blind reader, and in a printed board pack.
    const they = renderToStaticMarkup(<MilestoneBadge kind="they-said" />);
    const we = renderToStaticMarkup(<MilestoneBadge kind="we-said" />);
    expect(they).toContain('fill="currentColor"');
    expect(we).toContain('fill="none"');
    expect(they).toContain("f95-msbadge__glyph");
    expect(we).toContain("f95-msbadge__glyph");
  });
});

describe("ScenarioBadge", () => {
  it("renders all four ledger badges", () => {
    for (const badge of [
      "IN_ALL_THREE",
      "MOST_LIKELY_PLUS",
      "BEST_ONLY",
      "OUTSIDE_BEST",
    ] as const) {
      const html = renderToStaticMarkup(<ScenarioBadge badge={badge} />);
      expect(html, badge).toContain(SCENARIO_BADGE_TEXT[badge]);
      expect(html, badge).toContain(`data-badge="${badge}"`);
    }
  });
});

describe("InitiativeDot", () => {
  it("maps each seeded colour key to its own slot", () => {
    for (const n of [1, 2, 3, 4, 5]) {
      expect(renderToStaticMarkup(<InitiativeDot colourKey={`initiative-${n}`} />)).toContain(
        `f95-initdot--${n}`,
      );
    }
  });

  it("falls back to neutral rather than guessing at an unknown key", () => {
    for (const key of [null, undefined, "", "initiative-9", "kamuli"]) {
      const html = renderToStaticMarkup(<InitiativeDot colourKey={key} />);
      expect(html, String(key)).not.toMatch(/f95-initdot--\d/);
      expect(html, String(key)).toContain("f95-initdot");
    }
  });

  it("is decorative unless it is given a name", () => {
    expect(renderToStaticMarkup(<InitiativeDot colourKey="initiative-1" />)).toContain(
      'aria-hidden="true"',
    );
    expect(
      renderToStaticMarkup(<InitiativeDot colourKey="initiative-1" name="Kamuli 2026" />),
    ).toContain('aria-label="Kamuli 2026"');
  });

  it("composes into a chip", () => {
    const html = renderToStaticMarkup(
      <InitiativeChip colourKey="initiative-2">Bolivia Scale-Up</InitiativeChip>,
    );
    expect(html).toContain("f95-initchip");
    expect(html).toContain("f95-initdot--2");
    expect(html).toContain("Bolivia Scale-Up");
  });
});

describe("Metric", () => {
  it("renders the label, figure, basis and arithmetic", () => {
    const html = renderToStaticMarkup(
      <Metric
        label="QUALIFIED ASKS ON THE TABLE"
        value="$1,915,000"
        sub="to land the $2,700,000 FY26 goal"
        basis="$2,700,000 GOAL − $385,200 WON = $2,314,800 BASIS"
      />,
    );
    expect(html).toContain("QUALIFIED ASKS ON THE TABLE");
    expect(html).toContain("$1,915,000");
    expect(html).toContain("f95-metric__sub");
    expect(html).toContain("f95-metric__basis");
  });

  it("binds the dominant step and the alert treatment only when asked", () => {
    expect(renderToStaticMarkup(<Metric label="A" value="1" />)).not.toContain(
      "f95-metric--dominant",
    );
    expect(renderToStaticMarkup(<Metric label="A" value="1" dominant />)).toContain(
      "f95-metric--dominant",
    );
    expect(renderToStaticMarkup(<Metric label="A" value="-$845K" alert />)).toContain(
      "f95-metric--alert",
    );
  });
});

describe("ProgressBar", () => {
  it("clamps, which two of the five existing .f95-progress sites do not", () => {
    expect(renderToStaticMarkup(<ProgressBar label="Share" value={140} />)).toContain("width:100%");
    expect(renderToStaticMarkup(<ProgressBar label="Share" value={-20} />)).toContain("width:0%");
    expect(renderToStaticMarkup(<ProgressBar label="Share" value={Number.NaN} />)).toContain(
      "width:0%",
    );
    expect(renderToStaticMarkup(<ProgressBar label="Milestones" value={1} max={0} />)).toContain(
      "width:100%",
    );
  });

  it("carries a role and a name, which none of the five do", () => {
    const html = renderToStaticMarkup(<ProgressBar label="1 of 4 they said" value={1} max={4} />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="1 of 4 they said"');
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain('aria-valuemax="4"');
    expect(html).toContain("width:25%");
  });

  it("renders each tone", () => {
    for (const tone of ["accent", "moving", "slowing", "stuck"] as const) {
      expect(renderToStaticMarkup(<ProgressBar label="x" value={1} tone={tone} />), tone).toContain(
        `f95-progress__fill--${tone}`,
      );
    }
  });
});

describe("Card accent — the regression test for the no-op", () => {
  it("renders the accent on a non-AI card", () => {
    // `.f95-card--ai.f95-card--accent` was the only rule, so 5 of the 12 accent call sites drew
    // nothing. The class must be present on its own for the stylesheet to reach it.
    const html = renderToStaticMarkup(
      <Card tone="go" accent>
        x
      </Card>,
    );
    expect(html).toContain("f95-card--accent");
    expect(html).toContain("f95-card--go");
  });

  it("colours the accent by health", () => {
    for (const health of QUEUE_HEALTHS) {
      const html = renderToStaticMarkup(
        <Card accent health={health}>
          x
        </Card>,
      );
      expect(html, health).toContain(`f95-card--health-${health}`);
      expect(html, health).toContain(`data-health="${health}"`);
    }
  });

  it("leaves a plain card alone", () => {
    const html = renderToStaticMarkup(<Card>x</Card>);
    expect(html).not.toContain("f95-card--accent");
    expect(html).not.toContain("data-health");
  });
});

describe("Button with href", () => {
  it("renders a single anchor, with no nested interactive element", () => {
    const html = renderToStaticMarkup(
      <Button href="/95-forward/opportunities/abc" variant="secondary" size="sm">
        Open opportunity
      </Button>,
    );
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).not.toContain("<button");
    expect(html).toContain('href="/95-forward/opportunities/abc"');
    expect(html).toContain("f95-btn--secondary");
    expect(html).toContain("f95-btn--sm");
  });

  it("still renders a button without href, and no stray href attribute", () => {
    const html = renderToStaticMarkup(<Button variant="primary">Save</Button>);
    expect(html).toContain("<button");
    expect(html).not.toContain("href");
    expect(html).toContain('type="button"');
  });

  it("renders an inert link when disabled, since an anchor cannot be", () => {
    const html = renderToStaticMarkup(
      <Button href="/x" disabled>
        Team
      </Button>,
    );
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).not.toContain("<button");
  });

  it("keeps the icon slots on both paths", () => {
    const icon = <svg data-testid="ic" />;
    expect(renderToStaticMarkup(<Button iconLeft={icon}>a</Button>)).toContain("f95-btn__ic");
    expect(
      renderToStaticMarkup(
        <Button href="/x" iconRight={icon}>
          a
        </Button>,
      ),
    ).toContain("f95-btn__ic");
  });
});

describe("TabNav", () => {
  const items = [
    { id: "everything", label: "Everything", href: "/forecast" },
    { id: "kamuli", label: "Kamuli 2026", href: "/forecast?i=kamuli", colourKey: "initiative-1" },
    { id: "team", label: "All reps", href: "#", disabled: true },
  ];

  it("marks the active tab with aria-current, which is valid on a link", () => {
    // The six hand-rolled *Nav components set aria-selected on plain links because
    // .f95-tab[aria-selected="true"] is the only rule that styles an active tab. aria-selected
    // belongs to role="tab" inside a role="tablist"; these are navigation.
    const html = renderToStaticMarkup(<TabNav items={items} active="kamuli" label="Initiatives" />);
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("aria-selected");
    expect(html).not.toContain('role="tab"');
    expect(html).toContain('aria-label="Initiatives"');
    expect(html).toContain("<nav");
  });

  it("carries a colour dot per item and disables the undesigned toggles", () => {
    const html = renderToStaticMarkup(<TabNav items={items} active="everything" label="x" />);
    expect(html).toContain("f95-initdot--1");
    expect(html).toContain('aria-disabled="true"');
    // The disabled item is not a link at all, so it cannot be followed by keyboard or by click.
    expect(html.match(/<a\b/g)).toHaveLength(2);
  });
});

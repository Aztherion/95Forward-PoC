import Link from "next/link";
import { ChevronRight, Scale } from "lucide-react";
import { Badge, Card } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { getRulesPageData } from "@/server/data/rules";
import { GoalsEditor } from "./GoalsEditor";
import { ProposedRules } from "./ProposedRules";
import { ChangeTrail } from "./ChangeTrail";

export const dynamic = "force-dynamic";

function RuleRow({
  entry,
  firingCount,
}: {
  entry: Awaited<ReturnType<typeof getRulesPageData>>["groups"][number]["entries"][number];
  firingCount: number | undefined;
}) {
  const changed =
    entry.statementOverridden || entry.enabledOverridden || entry.changedParameterKeys.length > 0;

  return (
    <Link href={`/rules/${entry.id}`} className="f95-rule" data-testid={`rule-${entry.id}`}>
      <div className="f95-rule__body">
        {/* The statement leads. It is the doctrine — the id below it is the plumbing. */}
        <p className="f95-rule__statement">{entry.statement}</p>
        <div className="f95-rule__meta">
          <code className="f95-rule__id">{entry.id}</code>
          {entry.kind === "rule" ? (
            <span className="f95-rule__firing" data-testid={`rule-firing-${entry.id}`}>
              {entry.enabled
                ? `Firing on ${firingCount ?? 0} ${firingCount === 1 ? "opportunity" : "opportunities"}`
                : "Not running"}
            </span>
          ) : (
            <span className="f95-rule__firing">Read by {entry.readBy?.length ?? 0} numbers</span>
          )}
        </div>
      </div>
      <div className="f95-rule__tags">
        {changed ? (
          <Badge tone="info" data-testid={`rule-changed-${entry.id}`}>
            Changed from default
          </Badge>
        ) : null}
        {entry.enabled ? null : <Badge tone="neutral">Off</Badge>}
        <ChevronRight size={16} strokeWidth={1.8} className="f95-rule__chevron" />
      </div>
    </Link>
  );
}

export default async function RulesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getRulesPageData(user.tenantId);

  return (
    <>
      <Topbar title="The Rules of Robb" subtitle="95 Forward" />
      <div className="f95-page f95-settings" data-testid="rules-page">
        <section className="f95-settings__section">
          <header className="f95-settings__head">
            <div className="f95-page__eyebrow">95 Forward · doctrine</div>
            <h2 className="f95-settings__title">What the system believes</h2>
            <p className="f95-settings__sub">
              Every number on every screen comes from something on this page. You can switch a rule
              off, change what it is set to, and rewrite how it reads &mdash; and the screens change
              with it. What you cannot do here is invent a new kind of rule; that takes code, and
              the box below is where you tell us what you want.
            </p>
          </header>
        </section>

        <GoalsEditor goals={data.goals} />

        {data.groups.map((group) => (
          <section
            className="f95-settings__section"
            key={group.category}
            data-testid={`rules-group-${group.category}`}
          >
            <header className="f95-settings__head">
              <div className="f95-page__eyebrow">
                {group.entries[0]?.kind === "parameter" ? "Parameters" : "Rules"}
              </div>
              <h2 className="f95-settings__title">{group.label}</h2>
            </header>
            <Card pad="none">
              <div className="f95-rules">
                {group.entries.map((entry) => (
                  <RuleRow
                    key={entry.id}
                    entry={entry}
                    firingCount={data.firingCounts[entry.id]}
                  />
                ))}
              </div>
            </Card>
          </section>
        ))}

        <ProposedRules proposals={data.proposals} />

        <section className="f95-settings__section" data-testid="rules-audit">
          <header className="f95-settings__head">
            <div className="f95-page__eyebrow">
              <Scale size={14} strokeWidth={1.8} /> Doctrine version {data.version}
            </div>
            <h2 className="f95-settings__title">What changed, and who changed it</h2>
            <p className="f95-settings__sub">
              Every edit is recorded. This is what makes &ldquo;why does our coverage multiple say
              4?&rdquo; answerable a quarter after somebody changed it.
            </p>
          </header>
          <ChangeTrail changes={data.changes} />
        </section>
      </div>
    </>
  );
}

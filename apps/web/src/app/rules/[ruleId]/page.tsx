import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { getRuleDetail } from "@/server/data/rules";
import { ChangeTrail } from "../ChangeTrail";
import { RuleEditor } from "./RuleEditor";

export const dynamic = "force-dynamic";

function money(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export default async function RuleDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { ruleId } = await params;
  const detail = await getRuleDetail(user.tenantId, ruleId);
  if (!detail) notFound();

  const { entry, firing, changes } = detail;

  return (
    <>
      <Topbar title={entry.label} subtitle="The Rules of Robb" />
      <div className="f95-page f95-settings" data-testid={`rule-detail-${entry.id}`}>
        <section className="f95-settings__section">
          <Link href="/rules" className="f95-rule__back">
            <ArrowLeft size={14} strokeWidth={1.8} /> All rules
          </Link>
          <header className="f95-settings__head">
            <div className="f95-page__eyebrow">
              <code className="f95-rule__id">{entry.id}</code> · {entry.source}
            </div>
            <h2 className="f95-settings__title">{entry.label}</h2>
          </header>
        </section>

        <section className="f95-settings__section">
          <RuleEditor entry={entry} />
        </section>

        <section className="f95-settings__section" data-testid="rule-firing">
          <header className="f95-settings__head">
            <div className="f95-page__eyebrow">95 Forward · right now</div>
            <h2 className="f95-settings__title">
              {firing.kind === "is-read"
                ? "What reads this"
                : `Firing on ${firing.count} ${firing.count === 1 ? "opportunity" : "opportunities"}`}
            </h2>
            {firing.note ? <p className="f95-settings__sub">{firing.note}</p> : null}
          </header>

          {firing.kind === "is-read" ? (
            <Card pad="lg">
              <ul className="f95-readby" data-testid="rule-readby">
                {firing.readBy.map((what) => (
                  <li key={what}>{what}</li>
                ))}
              </ul>
            </Card>
          ) : firing.count === 0 ? (
            <Card pad="lg">
              <EmptyState
                title="Nothing to show"
                line={firing.note ?? "This rule is not catching anything at the moment."}
              />
            </Card>
          ) : (
            <Card pad="none">
              <ul className="f95-firing" data-testid="rule-firing-list">
                {firing.findings.map((finding) => (
                  <li className="f95-firing__row" key={finding.opportunityId}>
                    <Link
                      className="f95-firing__link"
                      href={`/95-forward/prospects/${finding.prospectId}`}
                    >
                      {finding.statement}
                    </Link>
                    <div className="f95-firing__meta">
                      <Badge tone={finding.consequence.provisional ? "neutral" : "attention"}>
                        {finding.consequence.text}
                      </Badge>
                      <span>{money(finding.amountCents)}</span>
                      <span>{Math.round(finding.effortSeconds / 60)} min to clear</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section className="f95-settings__section" data-testid="rule-audit">
          <header className="f95-settings__head">
            <div className="f95-page__eyebrow">95 Forward · history</div>
            <h2 className="f95-settings__title">What changed here</h2>
          </header>
          <ChangeTrail changes={changes} />
        </section>
      </div>
    </>
  );
}

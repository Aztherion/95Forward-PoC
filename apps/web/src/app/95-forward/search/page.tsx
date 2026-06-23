import Link from "next/link";
import { Search, Sparkle } from "lucide-react";
import { filterChipLabel, type QueryInterpretation } from "@95forward/shared";
import { Avatar, Card, EmptyState, QpiScore, SourceTag, Tag } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import {
  searchProspects,
  type ProspectMatch,
  type ProspectSearchResult,
} from "@/server/data/prospects";
import { SearchForm } from "./SearchForm";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const EXAMPLES = [
  "Prospects with QPI higher than 80",
  "Foundations with high capacity",
  "Not contacted in 60 days",
  "Strong relationship to clean water",
];

// "How your query was understood" — the parsed structured filters as chips, plus the semantic term
// and a note when the parse fell back to pure-semantic. Makes the AI's interpretation legible.
function InterpretedQuery({ interpretation }: { interpretation: QueryInterpretation }) {
  const hasFilters = interpretation.filters.length > 0;
  const hasSemantic = interpretation.semanticTerms !== null;
  if (!hasFilters && !hasSemantic && !interpretation.fellBack) return null;
  return (
    <section className="f95-stack f95-stack--sm" data-testid="interpreted-query">
      <div className="f95-cluster">
        <Sparkle size={15} strokeWidth={1.8} aria-hidden />
        <span className="f95-eyebrow">How we read your search</span>
      </div>
      <div className="f95-cluster">
        {interpretation.filters.map((filter, i) => (
          <Tag
            key={`${filter.field}-${i}`}
            color="var(--ai-iris, #4A4F94)"
            data-testid="interpreted-filter"
          >
            {filterChipLabel(filter)}
          </Tag>
        ))}
        {interpretation.semanticTerms ? (
          <Tag color="var(--reg-accent, #235C86)" data-testid="interpreted-semantic">
            Related to “{interpretation.semanticTerms}”
          </Tag>
        ) : null}
        {interpretation.fellBack ? (
          <span className="f95-page__count" data-testid="interpreted-fallback">
            We read this as a free-text search.
          </span>
        ) : null}
      </div>
    </section>
  );
}

function MatchRow({ match }: { match: ProspectMatch }) {
  const kind = match.type === "individual" ? "person" : "org";
  return (
    <Link
      href={`/95-forward/prospects/${match.id}`}
      className="f95-prow f95-prow--interactive"
      data-testid="search-match"
    >
      <div className="f95-prow__rank">
        <span className="h">#</span>
        <span className="n">{match.rank}</span>
      </div>
      <div className="f95-prow__id">
        <Avatar name={match.name} kind={kind} size="md" />
        <div className="f95-prow__txt">
          <div className="f95-prow__name">{match.name}</div>
          <div className="f95-prow__sub">
            {match.type === "individual"
              ? "Individual"
              : match.type === "organization"
                ? "Organization"
                : "Foundation"}
          </div>
        </div>
      </div>
      <div className="f95-prow__right">
        <QpiScore result={match.qpi} expandable={false} compact />
      </div>
    </Link>
  );
}

function Results({ result }: { result: ProspectSearchResult }) {
  return (
    <>
      <InterpretedQuery interpretation={result.interpretation} />
      <section className="f95-stack">
        <h2 className="f95-section-title">Who this is about</h2>
        {result.matches.length === 0 ? (
          <EmptyState
            title="No matched prospects"
            line="The grounded facts below carry their own sources. Refine the question to pull specific people, companies, or foundations."
          />
        ) : (
          <div className="f95-mpl__list">
            {result.matches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>

      <section className="f95-stack">
        <h2 className="f95-section-title">What we found</h2>
        {result.unknown || result.facts.length === 0 ? (
          <Card pad="lg">
            <div className="f95-stack f95-stack--sm">
              <SourceTag label="Unknown — worth researching" />
              <p className="f95-page__count">
                {result.note ??
                  "No grounded answer yet. Try rephrasing, or add what you know on a prospect so your copilot can ground the next answer."}
              </p>
            </div>
          </Card>
        ) : (
          <div className="f95-stack f95-stack--sm">
            {result.facts.map((fact, factIndex) => (
              <Card key={`${factIndex}-${fact.fact.slice(0, 24)}`} pad="lg">
                <div className="f95-itemrow" style={{ borderBottom: "none", paddingBottom: 0 }}>
                  <div className="f95-itemrow__body">
                    <div className="f95-itemrow__title" style={{ fontWeight: 400 }}>
                      {fact.fact}
                    </div>
                    <div className="f95-cluster">
                      {fact.citations.length === 0 ? (
                        <SourceTag label="Unknown — worth researching" />
                      ) : (
                        fact.citations.map((citation, citeIndex) => (
                          <SourceTag
                            key={`${citeIndex}-${citation.source}`}
                            source={citation.source}
                            title={citation.detail ?? citation.sourceType}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const query = (first(raw.q) ?? "").trim();

  const result = query
    ? await searchProspects(
        user.tenantId,
        { id: user.id, tenantId: user.tenantId, role: user.role },
        query,
      )
    : null;

  return (
    <>
      <Topbar title="Search prospects" subtitle="95 Forward" />
      <div className="f95-page" data-testid="prospect-search">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward</div>
            <h1 className="f95-page__title">Search prospects</h1>
            <p className="f95-page__count">
              Ask in plain language. Every answer is grounded — it carries the source it came from,
              and says so when it does not know.
            </p>
          </div>
        </div>

        <SearchForm query={query} examples={EXAMPLES} />

        {result ? (
          <Results result={result} />
        ) : (
          <EmptyState
            icon={<Search size={20} strokeWidth={1.8} />}
            title="Ask your portfolio a question"
            line="Try one of the examples above, or type your own. Results link to the prospect and cite their source."
          />
        )}
      </div>
    </>
  );
}

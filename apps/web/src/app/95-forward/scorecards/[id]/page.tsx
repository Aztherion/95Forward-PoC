import Link from "next/link";
import { notFound } from "next/navigation";
import { isProcessing } from "../scorecards-copy";
import { detailTitle, FALLBACK_NOTE, SOURCE_TEXT } from "../scorecards-copy";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import {
  getLinkedOpportunity,
  getScorecard,
  isManager,
  listMeetingTypes,
  type AuthedUser,
} from "@/server/data/scorecards";
import { ScorecardActions, ScorecardDetailView } from "./ScorecardDetailView";

export const dynamic = "force-dynamic";

export default async function ScorecardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const current = await getCurrentUser();
  if (!current) return null;
  const user: AuthedUser = { id: current.id, tenantId: current.tenantId, name: current.name };

  const { id } = await params;
  const { version } = await searchParams;

  const detail = await getScorecard(user, id, { includeVersions: true });
  // Null is the service saying "not yours, or not there" — and it says the same thing for both on
  // purpose. The app's own not-found state is the right surface for it.
  if (detail === null) notFound();

  const [types, manager, opportunity] = await Promise.all([
    listMeetingTypes(user),
    isManager(user),
    detail.meeting.opportunityId === null
      ? Promise.resolve(null)
      : getLinkedOpportunity(user, detail.meeting.opportunityId),
  ]);

  // A version in the URL renders that version read-only. It must be one of THIS meeting's, which
  // `versions` already guarantees — the service only returns versions the viewer may see.
  const viewing =
    version === undefined
      ? null
      : (detail.versions.find((entry) => entry.scorecard.id === version) ?? null);

  const card = viewing?.scorecard ?? detail.scorecard;
  const snapshot = viewing?.snapshot ?? detail.snapshot;
  const viewerIsReporter = detail.meeting.reportedBy === user.id;
  // The rep who reported it and their manager may both act. The services enforce that; this only
  // decides whether to render the buttons.
  const canAct = viewerIsReporter || manager;
  const processing = isProcessing(card.status) && viewing === null;

  return (
    <>
      {/* The page owns the h1 (I26) — which is why the header lives HERE rather than in the
          client view: the topbar-heading contract reads the file that steps the topbar aside,
          and a title hidden in a child component is a title it cannot see. */}
      <Topbar title="Scorecard" subtitle="95 Forward" heading={false} />
      <div className="f95-page" data-testid="scorecard-detail" data-status={card.status}>
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">
              <Link href="/95-forward/scorecards" className="f95-table__cell-link">
                Scorecards
              </Link>
            </div>
            <h1 className="f95-page__title">
              {detailTitle(detail.subjectName, detail.reportedByName, viewerIsReporter)}
            </h1>
            <p className="f95-page__count" data-testid="scorecard-meta">
              {formatDate(detail.meeting.occurredAt)} ·{" "}
              {snapshotTypeName(viewing ?? detail) ?? "Unclassified"}
              {card.usedFallback ? ` ${FALLBACK_NOTE}` : ""} ·{" "}
              {SOURCE_TEXT[detail.meeting.sourceType]}
              {opportunity ? " · " : ""}
              {opportunity ? (
                <Link
                  href={`/95-forward/opportunities/${opportunity.id}`}
                  className="f95-table__cell-link"
                  data-testid="scorecard-opportunity"
                >
                  {opportunity.initiativeName} · {formatCurrencyFromCents(opportunity.amountCents)}
                </Link>
              ) : null}
            </p>
          </div>
          {canAct && !processing ? (
            <div className="f95-page__actions">
              <ScorecardActions
                scorecardId={id}
                meetingTypes={types.map((type) => ({ id: type.id, name: type.name }))}
              />
            </div>
          ) : null}
        </div>

        <ScorecardDetailView
          scorecardId={id}
          status={card.status}
          failureReason={card.failureReason}
          meeting={{
            sourceType: detail.meeting.sourceType,
            content: detail.meeting.content,
          }}
          card={{
            overallScore: card.overallScoreValue,
            sectionScores: card.sectionScores as Record<string, number | null> | null,
            definitionName: snapshot?.name ?? null,
          }}
          snapshot={snapshot}
          results={(viewing?.results ?? detail.results).map((result) => ({
            criterionId: result.criterionId,
            sectionId: result.sectionId,
            determinable: result.determinable,
            booleanValue: result.booleanValue,
            scoreValue: result.scoreValue,
            optionId: result.optionId,
            rationale: result.rationale,
            evidenceQuote: result.evidenceQuote,
            evidenceVerified: result.evidenceVerified,
          }))}
          versions={detail.versions.map((entry) => ({
            id: entry.scorecard.id,
            supersededAt: entry.scorecard.supersededAt?.toISOString() ?? null,
            supersedeReason: entry.scorecard.supersedeReason,
            meetingTypeName: snapshotTypeName(entry),
            overallScore: entry.scorecard.overallScoreValue,
          }))}
          viewingVersionId={viewing?.scorecard.id ?? null}
        />
      </div>
    </>
  );
}

/** The type the card was scored AS, from its own snapshot — never the live definition. */
function snapshotTypeName(entry: {
  snapshot: { meetingTypeName?: string } | null;
}): string | null {
  return entry.snapshot?.meetingTypeName ?? null;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { scoreBand, formatScorePercent } from "@95forward/shared";
import type { MeetingSourceType, ScorecardStatus } from "@95forward/shared";
import { Button, EmptyState, HealthDot, Select } from "@/components/ds";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import type { MeetingLinkTarget } from "@/server/data/scorecards";
import {
  BAND_HEALTH,
  BAND_TEXT,
  NO_SCORE_TITLE,
  SOURCE_TEXT,
  STATUS_TEXT,
} from "./scorecards-copy";
import { AddScorecardDialog } from "./AddScorecardDialog";

export interface ListRow {
  scorecardId: string;
  meetingId: string;
  /** ISO — Dates do not survive the server/client boundary intact. */
  occurredAt: string;
  reportedByUserId: string;
  reportedByName: string;
  subjectName: string;
  initiativeName: string | null;
  amountCents: number | null;
  opportunityId: string | null;
  meetingTypeId: string | null;
  meetingTypeName: string | null;
  sourceType: MeetingSourceType;
  status: ScorecardStatus;
  usedFallback: boolean;
  overallScore: number | null;
}

interface Props {
  rows: ListRow[];
  meetingTypes: { id: string; name: string }[];
  reps: { id: string; name: string }[];
  linkTargets: MeetingLinkTarget[];
  /** Only a manager sees a rep column — a rep does not need their own name on every row. */
  showRep: boolean;
  activeType: string;
  activeRep: string;
  sort: "date" | "score";
  /** The demo clock's today, not the browser's. See the comment in AddScorecardDialog. */
  today: string;
}

export function ScorecardsListView({
  rows,
  meetingTypes,
  reps,
  linkTargets,
  showRep,
  activeType,
  activeRep,
  sort,
  today,
}: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  // Filters and sort travel in the URL, so a filtered list is linkable and survives a reload.
  const go = (patch: Record<string, string>): void => {
    const next = new URLSearchParams();
    const merged = { type: activeType, rep: activeRep, sort, ...patch };
    if (merged.type) next.set("type", merged.type);
    if (merged.rep) next.set("rep", merged.rep);
    if (merged.sort === "score") next.set("sort", "score");
    const qs = next.toString();
    router.push(qs ? `/95-forward/scorecards?${qs}` : "/95-forward/scorecards");
  };

  return (
    <div className="f95-stack" data-testid="scorecards-list">
      <div className="f95-sc-filters">
        <Select
          label="Meeting type"
          selectSize="sm"
          value={activeType}
          onChange={(event) => {
            go({ type: event.target.value });
          }}
          options={[
            { value: "", label: "All types" },
            ...meetingTypes.map((type) => ({ value: type.id, label: type.name })),
          ]}
          data-testid="filter-type"
        />
        {showRep ? (
          <Select
            label="Rep"
            selectSize="sm"
            value={activeRep}
            onChange={(event) => {
              go({ rep: event.target.value });
            }}
            options={[
              { value: "", label: "All reps" },
              ...reps.map((rep) => ({ value: rep.id, label: rep.name })),
            ]}
            data-testid="filter-rep"
          />
        ) : null}
        <Select
          label="Sort by"
          selectSize="sm"
          value={sort}
          onChange={(event) => {
            go({ sort: event.target.value });
          }}
          options={[
            { value: "date", label: "Meeting date" },
            { value: "score", label: "Overall score" },
          ]}
          data-testid="filter-sort"
        />
        <span className="f95-sc-filters__spacer" />
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Plus size={15} strokeWidth={1.8} />}
          onClick={() => {
            setAdding(true);
          }}
          data-testid="add-scorecard"
        >
          Add Scorecard
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={20} strokeWidth={1.8} />}
          title="No Scorecards yet"
          line="A Scorecard appears here once you add a meeting — paste the notes or the transcript and it is scored against the definition for that kind of meeting."
          action={
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus size={15} strokeWidth={1.8} />}
              onClick={() => {
                setAdding(true);
              }}
              data-testid="add-scorecard-empty"
            >
              Add Scorecard
            </Button>
          }
          data-testid="scorecards-empty"
        />
      ) : (
        <div className="f95-sc-list">
          {rows.map((row) => (
            <Row key={row.scorecardId} row={row} showRep={showRep} />
          ))}
        </div>
      )}

      {adding ? (
        <AddScorecardDialog
          targets={linkTargets}
          today={today}
          onClose={() => {
            setAdding(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Row({ row, showRep }: { row: ListRow; showRep: boolean }) {
  const band = scoreBand(row.overallScore);
  const pending = STATUS_TEXT[row.status];
  const ask =
    row.initiativeName === null
      ? null
      : `${row.initiativeName}${row.amountCents === null ? "" : ` · ${formatCurrencyFromCents(row.amountCents)}`}`;

  return (
    <Link
      href={`/95-forward/scorecards/${row.scorecardId}`}
      className="f95-sc-row"
      data-testid="scorecard-row"
      data-subject={row.subjectName}
    >
      <div className="f95-sc-row__body">
        <span className="f95-sc-row__name">{row.subjectName}</span>
        <span className="f95-sc-row__meta">
          {/* Separated, not just spaced: without a divider five facts read as one run-on line. */}
          {(
            [
              // The ask is what tells two meetings with the same prospect apart.
              { id: "ask", text: ask },
              { id: "rep", text: showRep ? row.reportedByName : null, testId: "row-rep" },
              { id: "date", text: formatDate(row.occurredAt) },
              { id: "type", text: row.meetingTypeName ?? "Unclassified" },
              { id: "source", text: SOURCE_TEXT[row.sourceType] },
            ] as { id: string; text: string | null; testId?: string }[]
          )
            .filter((part) => part.text !== null)
            .map((part, index) => (
              <span key={part.id} data-testid={part.testId}>
                {index > 0 ? <span className="f95-sc-row__sep">·</span> : null}
                {part.text}
              </span>
            ))}
          {/* Short here; the full "no type matched" sentence belongs on the detail, where a
              reader has room to care why. */}
          {row.usedFallback ? (
            <span className="f95-monocap f95-monocap--quiet" data-testid="row-fallback">
              fallback
            </span>
          ) : null}
        </span>
      </div>
      <div className="f95-sc-row__right">
        {pending ? (
          <span className="f95-monocap f95-monocap--quiet" data-testid="row-status">
            {pending}
          </span>
        ) : (
          <>
            {band ? <HealthDot health={BAND_HEALTH[band]} label={BAND_TEXT[band]} /> : null}
            <span
              className={`f95-sc-score f95-sc-row__score f95-sc-score--${band ?? "none"}`}
              title={row.overallScore === null ? NO_SCORE_TITLE : undefined}
              data-testid="row-score"
            >
              {formatScorePercent(row.overallScore)}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

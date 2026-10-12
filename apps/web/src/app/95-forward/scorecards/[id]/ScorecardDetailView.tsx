"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import {
  formatScorePercent,
  scoreBand,
  type MeetingSourceType,
  type ScorecardDefinitionSnapshot,
  type ScorecardStatus,
} from "@95forward/shared";
import { Button, Card, HealthDot, ProgressBar, Select } from "@/components/ds";
import { formatDate } from "@/lib/format";
import {
  overrideMeetingTypeAction,
  rescoreScorecardAction,
  type ScorecardFormState,
} from "@/server/actions/scorecards";
import {
  BAND_HEALTH,
  BAND_TEXT,
  isProcessing,
  NO_SCORE_TITLE,
  NOT_DETERMINABLE_TEXT,
  processingSteps,
  SUPERSEDE_REASON_TEXT,
  UNVERIFIED_QUOTE_NOTE,
} from "../scorecards-copy";

interface ResultView {
  criterionId: string;
  sectionId: string;
  determinable: boolean;
  booleanValue: boolean | null;
  scoreValue: number | null;
  optionId: string | null;
  rationale: string;
  evidenceQuote: string | null;
  evidenceVerified: boolean;
}

interface VersionView {
  id: string;
  supersededAt: string | null;
  supersedeReason: "override" | "rescore" | null;
  meetingTypeName: string | null;
  overallScore: number | null;
}

interface Props {
  scorecardId: string;
  status: ScorecardStatus;
  failureReason: string | null;
  meeting: { sourceType: MeetingSourceType; content: string };
  card: {
    overallScore: number | null;
    sectionScores: Record<string, number | null> | null;
    definitionName: string | null;
  };
  snapshot: ScorecardDefinitionSnapshot | null;
  results: ResultView[];
  versions: VersionView[];
  viewingVersionId: string | null;
}

const POLL_MS = 2000;

export function ScorecardDetailView(props: Props) {
  const { status, snapshot, results, card, meeting } = props;
  const router = useRouter();
  const processing = isProcessing(status) && props.viewingVersionId === null;

  // Poll the status route while the pipeline runs, then refresh the server component in place.
  // Re-rendering rather than reloading is what lets the page resolve without the reader losing
  // their scroll position or the page flashing — the wait is the demo, not a page transition.
  useEffect(() => {
    if (!processing) return;
    let active = true;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/scorecards/${props.scorecardId}/status`, {
            cache: "no-store",
          });
          if (!res.ok || !active) return;
          const data = (await res.json()) as { status: ScorecardStatus };
          if (data.status !== status) router.refresh();
        } catch {
          // Best-effort: a transient failure just retries on the next tick.
        }
      })();
    }, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [processing, props.scorecardId, status, router]);

  const band = scoreBand(card.overallScore);

  return (
    <>
      {props.viewingVersionId !== null ? (
        <Card tone="sunk" accent health="slowing" data-testid="version-banner">
          <div className="f95-cluster">
            <span>You are looking at an earlier version of this Scorecard, not the current one.</span>
            <Link
              href={`/95-forward/scorecards/${props.scorecardId}`}
              className="f95-table__cell-link"
            >
              Show the current one
            </Link>
          </div>
        </Card>
      ) : null}

      {status === "failed" ? (
        <Card accent health="stuck" data-testid="scorecard-failed">
          <div className="f95-stack f95-stack--sm">
            <h2 className="f95-section-title">This meeting could not be scored</h2>
            <p>{props.failureReason ?? "The scoring run did not finish."}</p>
            <RescoreButton
              scorecardId={props.scorecardId}
              onDone={() => {
                router.refresh();
              }}
            />
          </div>
        </Card>
      ) : null}

      {processing ? (
        <Card data-testid="scorecard-processing">
          <div className="f95-sc-steps">
            {processingSteps(status, card.definitionName).map((step) => (
              <div
                key={step.label}
                className={[
                  "f95-sc-step",
                  step.done ? "f95-sc-step--done" : "",
                  step.active ? "f95-sc-step--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="f95-sc-step__mark">
                  {step.done ? <Check size={13} strokeWidth={2.2} /> : null}
                </span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {status === "ready" && snapshot !== null ? (
        <>
          <Card data-testid="scorecard-overall">
            <div className="f95-sc-head">
              <div className="f95-sc-head__scores">
                <div>
                  <div className="f95-metric__label">Overall</div>
                  <div className="f95-cluster">
                    {band ? <HealthDot health={BAND_HEALTH[band]} label={BAND_TEXT[band]} /> : null}
                    <span
                      className={`f95-sc-score f95-sc-score--lead f95-sc-score--${band ?? "none"}`}
                      title={card.overallScore === null ? NO_SCORE_TITLE : undefined}
                      data-testid="overall-score"
                    >
                      {formatScorePercent(card.overallScore)}
                    </span>
                  </div>
                  {card.overallScore === null ? (
                    <span className="f95-deflist__desc--empty">{NO_SCORE_TITLE}</span>
                  ) : null}
                </div>
                <div className="f95-sc-head__sections" data-testid="section-scores">
                  {snapshot.sections.map((section) => {
                    const value = card.sectionScores?.[section.id] ?? null;
                    const sectionBand = scoreBand(value);
                    return (
                      <div key={section.id} className="f95-sc-head__section">
                        <span>{section.title}</span>
                        <span className={`f95-sc-score f95-sc-score--${sectionBand ?? "none"}`}>
                          {formatScorePercent(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {snapshot.sections
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((section) => (
              <Card key={section.id} data-testid="scorecard-section">
                <div className="f95-sc-section">
                  <div className="f95-sc-section__head">
                    <h2 className="f95-section-title">{section.title}</h2>
                    <span
                      className={`f95-sc-score f95-sc-score--${
                        scoreBand(card.sectionScores?.[section.id] ?? null) ?? "none"
                      }`}
                    >
                      {formatScorePercent(card.sectionScores?.[section.id] ?? null)}
                    </span>
                  </div>
                  {section.criteria
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((criterion) => (
                      <Criterion
                        key={criterion.id}
                        criterion={criterion}
                        result={results.find((row) => row.criterionId === criterion.id) ?? null}
                      />
                    ))}
                </div>
              </Card>
            ))}

          <SourcePanel content={meeting.content} />
          {props.versions.length > 0 ? (
            <EarlierVersions
              scorecardId={props.scorecardId}
              versions={props.versions}
              active={props.viewingVersionId}
            />
          ) : null}
        </>
      ) : null}

      {/* The source is worth reading even when the scoring failed — it is how you find out why. */}
      {status !== "ready" ? <SourcePanel content={meeting.content} /> : null}
    </>
  );
}

function Criterion({
  criterion,
  result,
}: {
  criterion: ScorecardDefinitionSnapshot["sections"][number]["criteria"][number];
  result: ResultView | null;
}) {
  const determinable = result?.determinable === true;
  const band = determinable ? scoreBand(result.scoreValue) : null;

  return (
    <div className="f95-sc-criterion" data-testid="criterion">
      <div className="f95-sc-criterion__top">
        <span className="f95-sc-criterion__prompt">{criterion.prompt}</span>
        <span className="f95-sc-criterion__verdict">
          {!determinable ? (
            <span className="f95-sc-verdict f95-sc-verdict--none" data-testid="verdict">
              {NOT_DETERMINABLE_TEXT}
            </span>
          ) : criterion.type === "boolean" ? (
            <span className="f95-sc-verdict" data-testid="verdict">
              {result.booleanValue === true ? "Yes" : "No"}
            </span>
          ) : criterion.type === "score" ? (
            <>
              <span
                className={`f95-sc-verdict f95-sc-score f95-sc-score--${band ?? "none"}`}
                data-testid="verdict"
              >
                {formatScorePercent(result.scoreValue)}
              </span>
              <span className="f95-sc-criterion__bar">
                <ProgressBar
                  value={Math.round((result.scoreValue ?? 0) * 100)}
                  max={100}
                  size="sm"
                  tone={band ? BAND_HEALTH[band] : "accent"}
                  label={criterion.prompt}
                />
              </span>
            </>
          ) : (
            // A classification is a fact, not a grade. No colour, deliberately.
            <span className="f95-sc-verdict f95-sc-verdict--fact" data-testid="verdict">
              {criterion.options.find((option) => option.id === result.optionId)?.label ?? "—"}
            </span>
          )}
        </span>
      </div>

      {result ? <p className="f95-sc-criterion__why">{result.rationale}</p> : null}

      {result?.evidenceQuote ? (
        <blockquote
          className={`f95-sc-quote${result.evidenceVerified ? "" : " f95-sc-quote--unverified"}`}
          data-testid="evidence"
          data-verified={result.evidenceVerified ? "true" : "false"}
        >
          {result.evidenceQuote}
          {result.evidenceVerified ? null : (
            <span className="f95-sc-quote__note">{UNVERIFIED_QUOTE_NOTE}</span>
          )}
        </blockquote>
      ) : null}
    </div>
  );
}

/** The raw artefact, collapsed. This is what a manager opens to check a judgement. */
function SourcePanel({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card data-testid="source-panel">
      <div className="f95-stack f95-stack--sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen((value) => !value);
          }}
          iconLeft={
            open ? (
              <ChevronDown size={15} strokeWidth={1.8} />
            ) : (
              <ChevronRight size={15} strokeWidth={1.8} />
            )
          }
          data-testid="source-toggle"
        >
          {open ? "Hide the source" : "Read the source"}
        </Button>
        {open ? (
          <pre className="f95-sc-source" data-testid="source-content">
            {content}
          </pre>
        ) : null}
      </div>
    </Card>
  );
}

function EarlierVersions({
  scorecardId,
  versions,
  active,
}: {
  scorecardId: string;
  versions: VersionView[];
  active: string | null;
}) {
  const [open, setOpen] = useState(active !== null);
  return (
    <Card data-testid="earlier-versions">
      <div className="f95-stack f95-stack--sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen((value) => !value);
          }}
          iconLeft={
            open ? (
              <ChevronDown size={15} strokeWidth={1.8} />
            ) : (
              <ChevronRight size={15} strokeWidth={1.8} />
            )
          }
          data-testid="versions-toggle"
        >
          Earlier versions ({versions.length})
        </Button>
        {open
          ? versions.map((version) => (
              <div key={version.id} className="f95-sc-version">
                <span>{formatDate(version.supersededAt)}</span>
                <span>
                  {version.supersedeReason
                    ? SUPERSEDE_REASON_TEXT[version.supersedeReason]
                    : "Replaced"}
                </span>
                <span>{version.meetingTypeName ?? "Unclassified"}</span>
                <span className="f95-sc-version__spacer" />
                <span
                  className={`f95-sc-score f95-sc-score--${scoreBand(version.overallScore) ?? "none"}`}
                >
                  {formatScorePercent(version.overallScore)}
                </span>
                <Link
                  href={`/95-forward/scorecards/${scorecardId}?version=${version.id}`}
                  className="f95-table__cell-link"
                >
                  View
                </Link>
              </div>
            ))
          : null}
      </div>
    </Card>
  );
}

const INITIAL: ScorecardFormState = {};

export function ScorecardActions({
  scorecardId,
  meetingTypes,
}: {
  scorecardId: string;
  meetingTypes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const onDone = () => {
    router.refresh();
  };
  const [changing, setChanging] = useState(false);
  return (
    <div className="f95-cluster">
      {changing ? (
        <ChangeTypeForm
          scorecardId={scorecardId}
          meetingTypes={meetingTypes}
          onDone={() => {
            setChanging(false);
            onDone();
          }}
          onCancel={() => {
            setChanging(false);
          }}
        />
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setChanging(true);
          }}
          data-testid="change-type"
        >
          Change meeting type
        </Button>
      )}
      <RescoreButton scorecardId={scorecardId} onDone={onDone} />
    </div>
  );
}

function ChangeTypeForm({
  scorecardId,
  meetingTypes,
  onDone,
  onCancel,
}: {
  scorecardId: string;
  meetingTypes: { id: string; name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(overrideMeetingTypeAction, INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (state.ok !== true || !state.scorecardId) return;
    // The override created a NEW version; its id is what the page must now show.
    router.push(`/95-forward/scorecards/${state.scorecardId}`);
    onDone();
  }, [state, router, onDone]);

  return (
    <form action={formAction} className="f95-cluster" data-testid="change-type-form">
      <input type="hidden" name="scorecardId" value={scorecardId} />
      <Select
        name="meetingTypeId"
        selectSize="sm"
        aria-label="Meeting type"
        options={meetingTypes.map((type) => ({ value: type.id, label: type.name }))}
      />
      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        {pending ? "Re-scoring…" : "Change and re-score"}
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      {state.error ? (
        <span className="f95-field__err" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function RescoreButton({ scorecardId, onDone }: { scorecardId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(rescoreScorecardAction, INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (state.ok !== true || !state.scorecardId) return;
    router.push(`/95-forward/scorecards/${state.scorecardId}`);
    onDone();
  }, [state, router, onDone]);

  return (
    <form action={formAction}>
      <input type="hidden" name="scorecardId" value={scorecardId} />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        iconLeft={<RotateCcw size={15} strokeWidth={1.8} />}
        data-testid="rescore"
      >
        {pending ? "Re-scoring…" : "Re-score"}
      </Button>
    </form>
  );
}

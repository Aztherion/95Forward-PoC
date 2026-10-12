import { TabNav } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import {
  isManager,
  listMeetingLinkTargets,
  listMeetingTypes,
  listScorecardDefinitions,
  listScorecards,
  type AuthedUser,
} from "@/server/data/scorecards";
import { getDefinitionTrees, getMeetingTypeUsage } from "@/server/data/scorecard-admin";
import { demoClock } from "@/server/data/forward-context";
import { ScorecardsListView } from "./ScorecardsListView";
import { DefinitionsView } from "./DefinitionsView";
import { MeetingTypesView } from "./MeetingTypesView";

export const dynamic = "force-dynamic";

const VIEWS = ["scorecards", "definitions", "meeting-types"] as const;
type View = (typeof VIEWS)[number];

const VIEW_LABEL: Record<View, string> = {
  scorecards: "Scorecards",
  definitions: "Definitions",
  "meeting-types": "Meeting Types",
};

const SUBTITLE: Record<View, string> = {
  scorecards: "How the meeting went — every criterion with a reason and a quote from the source.",
  definitions: "What good looks like in the room, in plain language. Edit it; nothing is hidden.",
  "meeting-types": "The kinds of meeting the system sorts a transcript into.",
};

function resolveView(raw: string | undefined): View {
  return (VIEWS as readonly string[]).includes(raw ?? "") ? (raw as View) : "scorecards";
}

/** The view lives in the URL so it is linkable and survives a reload — the house pattern (I27). */
function href(view: View): string {
  return view === "scorecards" ? "/95-forward/scorecards" : `/95-forward/scorecards?view=${view}`;
}

export default async function ScorecardsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; type?: string; rep?: string; sort?: string }>;
}) {
  const current = await getCurrentUser();
  if (!current) return null;
  const user: AuthedUser = { id: current.id, tenantId: current.tenantId, name: current.name };

  const params = await searchParams;
  const view = resolveView(params.view);

  return (
    <>
      {/* The page renders its own title, so the topbar stands aside — one h1 per screen (I26). */}
      <Topbar title="Scorecards" subtitle="95 Forward" heading={false} />
      <div className="f95-page" data-testid="scorecards" data-view={view}>
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward</div>
            <h1 className="f95-page__title">{VIEW_LABEL[view]}</h1>
            <p className="f95-page__count">{SUBTITLE[view]}</p>
          </div>
          <div className="f95-page__actions">
            <TabNav
              label="View"
              active={view}
              items={VIEWS.map((id) => ({ id, label: VIEW_LABEL[id], href: href(id) }))}
            />
          </div>
        </div>

        {view === "scorecards" ? <ScorecardsSection user={user} params={params} /> : null}
        {view === "definitions" ? <DefinitionsSection user={user} /> : null}
        {view === "meeting-types" ? <MeetingTypesSection user={user} /> : null}
      </div>
    </>
  );
}

async function ScorecardsSection({
  user,
  params,
}: {
  user: AuthedUser;
  params: { type?: string; rep?: string; sort?: string };
}) {
  // `manager` decides one thing only: whether the rep column and the rep filter exist. Visibility
  // itself is the service's job — this screen renders what it is handed.
  const [manager, meetingTypes, linkTargets] = await Promise.all([
    isManager(user),
    listMeetingTypes(user),
    listMeetingLinkTargets(user),
  ]);

  const sortByScore = params.sort === "score";
  const rows = await listScorecards(user, {
    sortBy: sortByScore ? "overallScore" : "occurredAt",
    direction: "desc",
    ...(params.type ? { meetingTypeId: params.type } : {}),
    ...(params.rep ? { reportedBy: params.rep } : {}),
  });

  // Only reps the viewer can already see — the filter narrows, it never widens.
  const reps = [...new Map(rows.map((row) => [row.reportedByUserId, row.reportedByName])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ScorecardsListView
      rows={rows.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString() }))}
      meetingTypes={meetingTypes.map((type) => ({ id: type.id, name: type.name }))}
      reps={reps}
      linkTargets={linkTargets}
      showRep={manager}
      activeType={params.type ?? ""}
      activeRep={params.rep ?? ""}
      sort={sortByScore ? "score" : "date"}
      // The demo's today, not the browser's — every other date on this screen is anchored to it.
      today={demoClock().now().toISOString().slice(0, 10)}
    />
  );
}

async function DefinitionsSection({ user }: { user: AuthedUser }) {
  const [definitions, meetingTypes, trees] = await Promise.all([
    listScorecardDefinitions(user),
    listMeetingTypes(user),
    getDefinitionTrees(user),
  ]);
  return (
    <DefinitionsView
      definitions={definitions.map((row) => ({
        id: row.id,
        name: row.name,
        meetingTypeId: row.meetingTypeId,
        isActive: row.isActive,
      }))}
      meetingTypes={meetingTypes.map((type) => ({ id: type.id, name: type.name }))}
      trees={trees}
    />
  );
}

async function MeetingTypesSection({ user }: { user: AuthedUser }) {
  const [types, usage] = await Promise.all([listMeetingTypes(user), getMeetingTypeUsage(user)]);
  return (
    <MeetingTypesView
      types={types.map((type) => ({
        id: type.id,
        name: type.name,
        description: type.description,
        isFallback: type.isFallback,
        scorecardCount: usage[type.id] ?? 0,
      }))}
    />
  );
}

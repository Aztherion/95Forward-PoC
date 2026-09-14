import { Topbar } from "@/components/shell";
import type { GridColumnSpec } from "@/components/grid";
import {
  isGridGroupBy,
  isGridSortField,
  type DateConfidence,
  type ForwardStage,
  type GridFilter,
  type GridGroupBy,
  type GridSortField,
  type ProbabilityBand,
  type QueueHealth,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { getGridView } from "@/server/data/opportunity-grid";
import { groupCountLine, reconciliationLine } from "./grid-copy";
import { GridControls } from "./GridControls";
import { GridWorkspace } from "./GridWorkspace";
import { isPresetId } from "./what-if-copy";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The columns, in order, with their widths.
 *
 * Seventeen columns do not fit in the ~968px a 1280-wide window leaves after the host sidebar, and
 * pretending otherwise produces seventeen unreadable ones. Three decisions make the first screen
 * the useful one.
 *
 * Two columns are folded away rather than dropped. `health` + `statusLabel` live in the prospect
 * cell, because they describe THAT deal rather than being two independent facts about it; the
 * close-date move count lives in the date cell, because it is a fact about that date and is
 * precisely what makes a date suspicious.
 *
 * And the order is by WHAT YOU LOOK AT, not by editable-then-derived. The first ten columns come
 * to 924px, inside the 952px a 1280-wide window leaves, so rank, prospect, amount, stage, close, qualification, the milestone dots, the next
 * action, the contradiction count and the silence are all on screen without scrolling — which is
 * the whole claim that this is a war-room surface and not a table. The five remaining editable
 * fields are what you change sitting beside a rep, not what you read in a Monday meeting, so they
 * are the ones that scroll.
 */
const COLUMNS: readonly GridColumnSpec[] = [
  { key: "rank", label: "#", sortKey: "rank", width: 52 },
  { key: "prospect", label: "Prospect", sortKey: "prospect", width: 176 },
  {
    key: "amount",
    label: "Amount",
    sortKey: "amount",
    width: 92,
    align: "right",
    field: "amountCents",
  },
  { key: "stage", label: "Stage", sortKey: "stage", width: 116, field: "stage" },
  { key: "closeDate", label: "Close", sortKey: "closeDate", width: 100, field: "closeDate" },
  { key: "qualification", label: "Real?", sortKey: "qualification", width: 54 },
  { key: "milestones", label: "Milestones", width: 88 },
  { key: "nextAction", label: "Next action", width: 136 },
  { key: "findings", label: "Flags", sortKey: "findings", width: 52, align: "right" },
  { key: "silence", label: "Silent", sortKey: "silence", width: 58, align: "right" },
  // Everything from here scrolls at 1280. These are the fields you EDIT sitting beside a rep
  // rather than the ones you READ in a Monday meeting, and that is the split the order encodes.
  {
    key: "dateConfidence",
    label: "Conf.",
    sortKey: "dateConfidence",
    width: 90,
    field: "dateConfidence",
  },
  { key: "probability", label: "Prob.", sortKey: "probability", width: 94, field: "probability" },
  { key: "visitRating", label: "Visit", sortKey: "visitRating", width: 80, field: "visitRating" },
  {
    key: "initiativeId",
    label: "Initiative",
    sortKey: "initiative",
    width: 146,
    field: "initiativeId",
  },
  { key: "ownerUserId", label: "Rep", sortKey: "owner", width: 120, field: "ownerUserId" },
  { key: "impact", label: "Impact", sortKey: "impact", width: 94, align: "right" },
  { key: "membership", label: "Scenario", sortKey: "membership", width: 106 },
];

/**
 * The Opportunities grid.
 *
 * Henrik: "If I am sitting down with a particular rep, I don't have to bounce in and out of
 * subpages to make changes, I can make them all here and see the effect on the forecast
 * immediately." That is the feature, and it is also the one most at risk of becoming a rebuild of
 * Excel — so the line is held in code rather than in a design note. Eight typed editable fields,
 * derived columns that are read-only because something else owns them, and no way to create or
 * delete a row from here: "even in the real PoC, this is not the place to delete or create."
 */
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const raw = await searchParams;

  const sortFieldRaw = first(raw.sort) ?? "rank";
  const sortField: GridSortField = isGridSortField(sortFieldRaw) ? sortFieldRaw : "rank";
  const sortDir: "asc" | "desc" = first(raw.dir) === "desc" ? "desc" : "asc";
  const groupRaw = first(raw.group) ?? "none";
  const groupBy: GridGroupBy = isGridGroupBy(groupRaw) ? groupRaw : "none";

  const filter: GridFilter = {
    stage: first(raw.stage) ? [first(raw.stage) as ForwardStage] : undefined,
    probability: first(raw.probability) ? [first(raw.probability) as ProbabilityBand] : undefined,
    dateConfidence: first(raw.confidence) ? [first(raw.confidence) as DateConfidence] : undefined,
    qualification:
      first(raw.qualification) === "qualified"
        ? "qualified"
        : first(raw.qualification) === "unqualified"
          ? "unqualified"
          : undefined,
    hasFindings: first(raw.flags) === "1" ? true : undefined,
    health: first(raw.health) ? [first(raw.health) as QueueHealth] : undefined,
    search: first(raw.q),
  };

  const view = await getGridView(user.tenantId, user.id, user.name, {
    initiative: first(raw.initiative) ?? "all",
    rep: first(raw.rep) ?? user.id,
    groupBy,
    sortField,
    sortDir,
    filter,
  });

  const filtered = view.rowCount !== view.totalCount;
  const today = view.asOf.toISOString().slice(0, 10);

  // Sorting travels in the URL like everything else, so a sorted view is a link.
  const hrefFor = (field: string, dir: "asc" | "desc") => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(raw)) {
      const v = first(value);
      if (v !== undefined && key !== "sort" && key !== "dir") next.set(key, v);
    }
    next.set("sort", field);
    next.set("dir", dir);
    return `/95-forward/opportunities?${next.toString()}`;
  };

  // One href per sortable column, resolved here: a function cannot be handed to a client
  // component, and this keeps the URL contract in one place.
  const sortHrefs: Record<string, string> = {};
  for (const col of COLUMNS) {
    if (!col.sortKey) continue;
    sortHrefs[col.sortKey] = hrefFor(
      col.sortKey,
      view.sort.field === col.sortKey && view.sort.dir === "asc" ? "desc" : "asc",
    );
  }

  const milestoneKeys = view.groups[0]?.rows[0]?.milestones.map((m) => ({
    key: m.key,
    label: m.label,
  }));

  return (
    <>
      <Topbar title="Opportunities" subtitle="95 Forward" heading={false} />
      <div className="f95-page f95-opps" data-testid="opportunities">
        <div className="f95-page__header f95-opps__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward · the portfolio</div>
            <h1 className="f95-page__title">Opportunities</h1>
            <p className="f95-page__count" data-testid="grid-subtitle">
              {groupCountLine(view.rowCount, view.totalCount)} ·{" "}
              {reconciliationLine(view.shown, view.metrics.qualifiedAsks.cents, filtered)}
            </p>
          </div>
        </div>

        <GridControls initiatives={view.initiatives} owners={view.owners} repUserId={user.id} />

        {view.rowCount === 0 ? (
          <p className="f95-opps__empty" data-testid="grid-empty">
            Nothing matches that filter. Clear it to see the portfolio again.
          </p>
        ) : (
          <GridWorkspace
            groups={view.groups}
            columns={COLUMNS}
            initiativeOptions={view.initiatives.map((i) => ({ value: i.value, label: i.label }))}
            ownerOptions={view.owners.map((o) => ({ value: o.value, label: o.label }))}
            milestoneKeys={milestoneKeys ?? []}
            today={today}
            sortHrefs={sortHrefs}
            sort={{ field: view.sort.field, dir: view.sort.dir }}
            grouped={groupBy !== "none"}
            scope={{ rep: view.scope.rep, initiative: view.scope.initiative }}
            // The Forecast Room's door lands here in what-if mode, carrying the tab it came from
            // as scope. The flag is only an ENTRY point — pending changes never live in the URL,
            // which is what keeps the sandbox unable to leak into another route.
            initialWhatIf={first(raw.whatif) === "1"}
            initialPreset={
              first(raw.preset) && isPresetId(first(raw.preset)!)
                ? (first(raw.preset) as never)
                : null
            }
          />
        )}
      </div>
    </>
  );
}

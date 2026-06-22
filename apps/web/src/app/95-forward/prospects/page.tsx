import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Avatar, Button, Card, EmptyState, QpiScore, RoleChip } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { followUpLabel } from "@/lib/follow-up";
import {
  getProspectsList,
  listRmUsers,
  type ProspectListParams,
  type ProspectListRow,
  type ProspectType,
} from "@/server/data/prospects";
import { FilterPills } from "./FilterPills";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const TYPES = new Set<ProspectType>(["individual", "organization", "foundation"]);
const BANDS = new Set<NonNullable<ProspectListParams["band"]>>(["go", "strong", "build", "early"]);
const STATUSES = new Set<NonNullable<ProspectListParams["status"]>>([
  "research",
  "cultivation",
  "solicitation",
  "stewardship",
  "active",
]);

function parseParams(raw: RawSearchParams): ProspectListParams {
  const type = first(raw.type);
  const band = first(raw.band);
  const status = first(raw.status);
  const rm = first(raw.rm);
  return {
    type: type && TYPES.has(type as ProspectType) ? (type as ProspectType) : undefined,
    band:
      band && BANDS.has(band as NonNullable<ProspectListParams["band"]>)
        ? (band as ProspectListParams["band"])
        : undefined,
    status:
      status && STATUSES.has(status as NonNullable<ProspectListParams["status"]>)
        ? (status as ProspectListParams["status"])
        : undefined,
    rm: rm || undefined,
  };
}

function tierVar(band: ProspectListRow["qpi"]["band"]): string {
  if (band === "go") return "var(--qpi-go)";
  if (band === "strong") return "var(--qpi-strong)";
  if (band === "build") return "var(--qpi-build)";
  return "var(--qpi-early)";
}

interface NextMove {
  row: ProspectListRow;
  eyebrow: string;
  why: string;
  cta: string;
}

function hasRecentContact(cadence: string): boolean {
  return cadence === "Last contact today" || cadence === "Last contact 1d ago";
}

// The "next right move" always resolves to one action for a non-empty portfolio — the signature
// guided surface, not a feed. The ladder is now cycle-aware (I10), evaluated against the QPI-ranked
// list, highest rung first: (1) a follow-up due/overdue is the SLA the product cares about most;
// (2) a visited high-QPI prospect with no ask yet is ready to ask; then the I7 rungs — (3) a go-band
// prospect with no contact for a first move; (4) the top-QPI stale/uncontacted prospect to reconnect;
// (5) the top-ranked prospect as a default.
function pickNextMove(rows: readonly ProspectListRow[], now: Date = new Date()): NextMove | null {
  if (rows.length === 0) return null;

  const withFollowUp = rows
    .filter((row) => row.openFollowUpDueAt !== null)
    .sort((a, b) => a.openFollowUpDueAt!.getTime() - b.openFollowUpDueAt!.getTime());
  const followUp = withFollowUp[0];
  if (followUp) {
    return {
      row: followUp,
      eyebrow: "Your next right move",
      why: `Follow up — ${followUpLabel(followUp.openFollowUpDueAt!, now).toLowerCase()}.`,
      cta: "Follow up now",
    };
  }

  const readyToAsk = rows.find(
    (row) => row.visited && !row.hasAsk && (row.qpi.band === "go" || row.qpi.band === "strong"),
  );
  if (readyToAsk) {
    return {
      row: readyToAsk,
      eyebrow: "Your next right move",
      why: `QPI ${readyToAsk.qpi.total} — visited, no ask yet. Time to ask.`,
      cta: "Enter visit mode",
    };
  }

  const firstContact = rows.find(
    (row) => row.qpi.band === "go" && row.cadence === "No contact yet",
  );
  if (firstContact) {
    return {
      row: firstContact,
      eyebrow: "Your next right move",
      why: `QPI ${firstContact.qpi.total} — make first contact today.`,
      cta: "Plan the visit",
    };
  }

  const reconnect = rows.find((row) => !hasRecentContact(row.cadence));
  if (reconnect) {
    return {
      row: reconnect,
      eyebrow: "Your next right move",
      why: `QPI ${reconnect.qpi.total} — your strongest prospect to reconnect with.`,
      cta: "Open the plan",
    };
  }

  return {
    row: rows[0]!,
    eyebrow: "Your next right move",
    why: `QPI ${rows[0]!.qpi.total} — your top-ranked prospect.`,
    cta: "Open the plan",
  };
}

function ProspectRow({ row }: { row: ProspectListRow }) {
  const tier = tierVar(row.qpi.band);
  const kind = row.type === "individual" ? "person" : "org";
  return (
    <Link
      href={`/95-forward/prospects/${row.id}`}
      className="f95-prow f95-prow--interactive"
      style={{ ["--_tier" as string]: tier }}
      data-testid="prospect-row"
    >
      <div className="f95-prow__rank">
        <span className="h">#</span>
        <span className="n">{row.rank}</span>
      </div>
      <div className="f95-prow__id">
        <Avatar name={row.name} kind={kind} size="md" />
        <div className="f95-prow__txt">
          <div className="f95-prow__name">{row.name}</div>
          <div className="f95-prow__sub">{row.descriptor}</div>
        </div>
      </div>
      <div className="f95-prow__roles">
        {row.rmName ? <RoleChip role="manager" name={row.rmName} /> : null}
        {row.partnerName ? <RoleChip role="partner" name={row.partnerName} /> : null}
      </div>
      <div className="f95-prow__right">
        <span className="f95-prow__cad">{row.cadence}</span>
        <div className="f95-prow__qpi" title={`QPI ${row.qpi.total}`}>
          <span className="v" style={{ color: tier }}>
            {row.qpi.total}
          </span>
          <span className="s">QPI</span>
        </div>
      </div>
    </Link>
  );
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const params = parseParams(raw);

  const [rows, rmUsers] = await Promise.all([
    getProspectsList(user.tenantId, { id: user.id }, params),
    listRmUsers(user.tenantId),
  ]);

  const hasFilters = Boolean(params.type || params.band || params.status || params.rm);

  const unfiltered = hasFilters ? await getProspectsList(user.tenantId, { id: user.id }) : rows;
  const hero = pickNextMove(unfiltered);

  return (
    <>
      <Topbar title="Master Prospect List" subtitle="95 Forward" />
      <div className="f95-page" data-testid="prospects-mpl">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward</div>
            <h1 className="f95-page__title">Master Prospect List</h1>
            <p className="f95-page__count">
              One ranked list — people, companies, and foundations together. {unfiltered.length} on
              the list · ranked by QPI
            </p>
          </div>
          <div className="f95-page__actions">
            <Link href="/95-forward/search">
              <Button variant="secondary" iconLeft={<Search size={16} strokeWidth={1.8} />}>
                Search prospects
              </Button>
            </Link>
            <Link href="/95-forward/prospects/new">
              <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
                Add prospect
              </Button>
            </Link>
          </div>
        </div>

        {hero ? (
          <Card tone="go" accent pad="lg">
            <div className="f95-mpl__nextmove" data-testid="next-move">
              <QpiScore result={hero.row.qpi} expandable={false} />
              <div className="f95-mpl__nextmove-body">
                <div className="f95-mpl__nextmove-eyebrow">{hero.eyebrow}</div>
                <div className="f95-mpl__nextmove-name">{hero.row.name}</div>
                <div className="f95-mpl__nextmove-why">{hero.why}</div>
              </div>
              <Link href={`/95-forward/prospects/${hero.row.id}`}>
                <Button variant="go">{hero.cta}</Button>
              </Link>
            </div>
          </Card>
        ) : null}

        <FilterPills rmUsers={rmUsers} />

        {rows.length === 0 ? (
          <EmptyState
            icon={<Users size={20} strokeWidth={1.8} />}
            title={hasFilters ? "No prospects match these filters" : "Not yet scored"}
            line={
              hasFilters
                ? "Try widening your filters to see more of the list."
                : "Not yet scored — add what you know to start ranking your prospects."
            }
          />
        ) : (
          <div className="f95-mpl__list">
            {rows.map((row) => (
              <ProspectRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

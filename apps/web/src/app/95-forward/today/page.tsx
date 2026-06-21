import Link from "next/link";
import { CalendarClock, ClipboardCheck, Compass, Sparkles, Target } from "lucide-react";
import { listProposals } from "@95forward/ai";
import { Badge, Button, Card, EmptyState, Heartbeat, QpiScore, Tabs } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { getAppDb } from "@/server/db";
import { getProspectsList, type ProspectListRow } from "@/server/data/prospects";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// A "next right move" is the highest-priority prospect you have not yet visited: a 90+/"go" score
// with no contact logged. Gold treatment, capped at four so Today stays a focus screen, not a list.
function pickNextMoves(rows: ProspectListRow[]): ProspectListRow[] {
  return rows
    .filter((row) => row.qpi.band === "go" && row.cadence === "No contact yet")
    .slice(0, 4);
}

function NextMoveCard({ row }: { row: ProspectListRow }) {
  return (
    <Card tone="go" accent pad="lg">
      <div className="f95-mpl__nextmove">
        <QpiScore result={row.qpi} expandable={false} compact />
        <div className="f95-mpl__nextmove-body">
          <div className="f95-mpl__nextmove-eyebrow">Go — see them today</div>
          <div className="f95-mpl__nextmove-name">{row.name}</div>
          <div className="f95-mpl__nextmove-why">
            {row.descriptor} · QPI 90+ — go see them today.
          </div>
        </div>
        <Link href={`/95-forward/prospects/${row.id}`}>
          <Button variant="go">Plan the visit</Button>
        </Link>
      </div>
    </Card>
  );
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const scope = first(raw.scope) === "team" ? "team" : "me";

  // "Me" scopes to the caller's own portfolio; "team" shows everyone's. The toggle only changes the
  // rm filter — the foundation does the tenant-scoping and QPI ranking.
  const rows = await getProspectsList(
    user.tenantId,
    { id: user.id },
    scope === "me" ? { rm: "me" } : {},
  );

  const nextMoves = pickNextMoves(rows);
  const top33 = rows.filter((row) => row.top33);

  // The copilot roll-up: how many proposals across the portfolio are still waiting on a human.
  const pendingProposals = await listProposals(
    getAppDb(),
    { id: user.id, tenantId: user.tenantId, role: user.role },
    { status: "pending" },
  );
  const pendingCount = pendingProposals.length;

  const scopeNote = scope === "me" ? "Your prospects" : "Your team's prospects";

  return (
    <>
      <Topbar title="Today" subtitle="95 Forward" />
      <div className="f95-page" data-testid="today">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward</div>
            <h1 className="f95-page__title">Today</h1>
            <p className="f95-page__count">
              Your next right move, lined up. {scopeNote} ·{" "}
              {nextMoves.length === 0
                ? "no go-now prospects right now"
                : `${nextMoves.length} ${nextMoves.length === 1 ? "move" : "moves"} ready`}
            </p>
          </div>
          <div className="f95-page__actions">
            <Tabs
              label="Scope"
              active={scope}
              items={[
                { id: "me", label: "Me", href: "/95-forward/today?scope=me" },
                { id: "team", label: "Team", href: "/95-forward/today?scope=team" },
              ]}
            />
          </div>
        </div>

        <section className="f95-stack">
          <h2 className="f95-section-title">Your next right moves</h2>
          {nextMoves.length === 0 ? (
            <EmptyState
              icon={<Target size={20} strokeWidth={1.8} />}
              title="No go-now moves right now"
              line="Nothing is at 90+ and unvisited yet. Keep building — your highest-scoring prospects surface here when the window opens."
              action={
                <Link href="/95-forward/prospects">
                  <Button variant="secondary">See the full list</Button>
                </Link>
              }
            />
          ) : (
            <div className="f95-tilegrid f95-tilegrid--wide">
              {nextMoves.map((row) => (
                <NextMoveCard key={row.id} row={row} />
              ))}
            </div>
          )}
        </section>

        <section className="f95-stack">
          <h2 className="f95-section-title">Follow-ups due</h2>
          <Card pad="lg">
            <EmptyState
              icon={<Heartbeat />}
              title="No follow-ups due yet"
              line="They appear here after visits, on the 24-hour cadence (Initiative 10)."
            />
          </Card>
        </section>

        <section className="f95-stack">
          <h2 className="f95-section-title">Today&apos;s visits</h2>
          <Card pad="lg">
            <EmptyState
              icon={<CalendarClock size={20} strokeWidth={1.8} />}
              title="No visits scheduled"
              line="Plan a visit from a prospect and it will show up here (Initiative 10)."
            />
          </Card>
        </section>

        <section className="f95-stack">
          <h2 className="f95-section-title">From your copilot</h2>
          <Card tone="ai" accent pad="lg">
            <div className="f95-itemrow" style={{ borderBottom: "none", paddingBottom: 0 }}>
              <span className="f95-empty__icon" style={{ marginTop: 2 }}>
                <Sparkles size={20} strokeWidth={1.8} />
              </span>
              <div className="f95-itemrow__body">
                <div className="f95-itemrow__title">
                  {pendingCount === 0
                    ? "No suggestions waiting"
                    : `${pendingCount} ${pendingCount === 1 ? "suggestion" : "suggestions"} waiting on your review`}
                </div>
                <div className="f95-itemrow__meta">
                  {pendingCount === 0 ? (
                    <span>
                      Your copilot drafts grounded suggestions on each prospect — review them there.
                      Nothing is applied without your approval.
                    </span>
                  ) : (
                    <span>
                      Review them on the prospect. Nothing is applied without your approval.
                    </span>
                  )}
                </div>
              </div>
              <div className="f95-itemrow__actions">
                {pendingCount > 0 ? <Badge tone="ai">{pendingCount} pending</Badge> : null}
                <Link href="/95-forward/prospects">
                  <Button variant="secondary" size="sm">
                    Review on prospects
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>

        <section className="f95-stack">
          <h2 className="f95-section-title">Coverage nudge</h2>
          <Card pad="lg">
            {top33.length === 0 ? (
              <EmptyState
                icon={<Compass size={20} strokeWidth={1.8} />}
                title="Your Top 33 is covered"
                line="No flagged gaps right now — keep the cadence going."
              />
            ) : (
              <div className="f95-itemrow" style={{ borderBottom: "none", paddingBottom: 0 }}>
                <span className="f95-empty__icon" style={{ marginTop: 2 }}>
                  <ClipboardCheck size={20} strokeWidth={1.8} />
                </span>
                <div className="f95-itemrow__body">
                  <div className="f95-itemrow__title">
                    {top33.length} of your Top 33 have no active strategy
                  </div>
                  <div className="f95-itemrow__meta">
                    <span>
                      A strategy turns a high score into a plan. Open one and lay out the path to
                      the ask.
                    </span>
                  </div>
                </div>
                <div className="f95-itemrow__actions">
                  <Link href="/95-forward/prospects">
                    <Button variant="secondary" size="sm">
                      See your Top 33
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}

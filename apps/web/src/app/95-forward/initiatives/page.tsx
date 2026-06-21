import Link from "next/link";
import { Plus, Target } from "lucide-react";
import { Button, Card, EmptyState, HorizonTag } from "@/components/ds";
import type { Horizon } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { getInitiativesList, type InitiativeListRow } from "@/server/data/initiatives";

export const dynamic = "force-dynamic";

const FRAME_ORDER: Horizon[] = ["today", "tomorrow", "forever"];

const FRAME_BLURB: Record<Horizon, string> = {
  today: "Reach everyone in an active district this year.",
  tomorrow: "The multi-year scale-up to full, self-sustaining coverage.",
  forever: "Sustainability and legacy — services that outlast us.",
};

function timeline(row: InitiativeListRow): string {
  if (!row.timelineStart) return "Timeline to be set";
  const start = formatDate(row.timelineStart);
  const end = row.timelineEnd ? formatDate(row.timelineEnd) : "open-ended";
  return `${start} → ${end}`;
}

function InitiativeCard({ row }: { row: InitiativeListRow }) {
  return (
    <Link href={`/95-forward/initiatives/${row.id}`} className="f95-table__cell-link">
      <Card interactive>
        <div className="f95-stack f95-stack--sm" data-testid="initiative-card">
          <div className="f95-cluster">
            <HorizonTag horizon={row.frame} />
            <span className="f95-recordbar__spacer" />
            <span className="f95-itemrow__meta">{row.prospectCount} in cultivation</span>
          </div>
          <h3 className="f95-section-title">{row.name}</h3>
          <div className="f95-goalmeta">
            <span className="f95-deflist__desc">Goal {formatCurrencyFromCents(row.goalCents)}</span>
            <span className="f95-goalmeta__pct">{row.progress.pct}%</span>
          </div>
          <div className="f95-progress">
            <div className="f95-progress__fill" style={{ width: `${row.progress.pct}%` }} />
          </div>
          <span className="f95-deflist__desc--empty">{timeline(row)}</span>
        </div>
      </Card>
    </Link>
  );
}

export default async function InitiativesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const initiatives = await getInitiativesList(user.tenantId);
  const byFrame = (frame: Horizon) => initiatives.filter((i) => i.frame === frame);

  return (
    <>
      <Topbar title="Funding initiatives" subtitle="95 Forward" />
      <div className="f95-page" data-testid="initiatives-list">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward</div>
            <h1 className="f95-page__title">Funding initiatives</h1>
            <p className="f95-page__count">
              One set of initiatives, framed Today · Tomorrow · Forever — what every ask points at.
            </p>
          </div>
          <div className="f95-page__actions">
            <Link href="/95-forward/initiatives/new">
              <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
                Add initiative
              </Button>
            </Link>
          </div>
        </div>

        {initiatives.length === 0 ? (
          <EmptyState
            icon={<Target size={20} strokeWidth={1.8} />}
            title="No initiatives yet"
            line="Add a funding initiative and frame it Today, Tomorrow, or Forever."
          />
        ) : (
          <div className="f95-stack">
            {FRAME_ORDER.map((frame) => {
              const rows = byFrame(frame);
              if (rows.length === 0) return null;
              return (
                <section
                  key={frame}
                  className="f95-stack f95-stack--sm"
                  data-testid={`frame-${frame}`}
                >
                  <div className="f95-cluster">
                    <HorizonTag horizon={frame} solid />
                    <span className="f95-deflist__desc--empty">{FRAME_BLURB[frame]}</span>
                  </div>
                  <div className="f95-tilegrid f95-tilegrid--wide">
                    {rows.map((row) => (
                      <InitiativeCard key={row.id} row={row} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

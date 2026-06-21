import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PhoneCall } from "lucide-react";
import { Badge, Button, Card, QpiScore, RoleChip, SourceTag, Tabs } from "@/components/ds";
import type { TabItem } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import {
  getProspectDetail,
  listRmUsers,
  type ProspectActivity,
  type ProspectDetail,
} from "@/server/data/prospects";
import { listProspectProposals } from "@/server/data/prospect-copilot";
import { AdjustScore } from "./AdjustScore";
import { CopilotSuggestions } from "./CopilotSuggestions";
import { RelationshipTeam } from "./RelationshipTeam";
import { KnowledgeBaseTab } from "./KnowledgeBaseTab";
import { StrategyTab } from "./StrategyTab";
import { VisitPlanTab } from "./VisitPlanTab";
import { RelationshipMapTab } from "./RelationshipMapTab";

export const dynamic = "force-dynamic";

const TAB_IDS = ["overview", "knowledge", "strategy", "relationship", "visits"] as const;
type TabId = (typeof TAB_IDS)[number];

function resolveTab(value: string | undefined): TabId {
  return (TAB_IDS as readonly string[]).includes(value ?? "") ? (value as TabId) : "overview";
}

function isOrg(type: ProspectDetail["type"]): boolean {
  return type === "foundation" || type === "organization";
}

function typeTone(type: ProspectDetail["type"]): "info" | "success" | "neutral" {
  if (type === "foundation") return "info";
  if (type === "organization") return "success";
  return "neutral";
}

function typeLabel(type: ProspectDetail["type"]): string {
  if (type === "foundation") return "Foundation";
  if (type === "organization") return "Organization";
  return "Individual";
}

function relativeDate(value: Date, now: Date = new Date()): string {
  const days = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export default async function ProspectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = resolveTab(tab);

  const detail = await getProspectDetail(user.tenantId, id);
  if (!detail) notFound();

  const proposalTypeByTab = {
    overview: "qpi_assessment",
    knowledge: "knowledge_base_update",
    strategy: "prospect_strategy",
    relationship: "relationship_map_entry",
    visits: "visit_plan",
  } as const;

  const [rmUsers, proposals] = await Promise.all([
    listRmUsers(user.tenantId),
    listProspectProposals(user.tenantId, user, id, proposalTypeByTab[activeTab]),
  ]);

  const tabs: TabItem[] = [
    { id: "overview", label: "Overview", href: `/95-forward/prospects/${id}?tab=overview` },
    { id: "knowledge", label: "Knowledge Base", href: `/95-forward/prospects/${id}?tab=knowledge` },
    { id: "strategy", label: "Strategy", href: `/95-forward/prospects/${id}?tab=strategy` },
    ...(isOrg(detail.type)
      ? [
          {
            id: "relationship",
            label: "Relationship Map",
            href: `/95-forward/prospects/${id}?tab=relationship`,
          },
        ]
      : []),
    { id: "visits", label: "Visits & Asks", href: `/95-forward/prospects/${id}?tab=visits` },
  ];

  return (
    <>
      <Topbar title={detail.name} subtitle="95 Forward · Prospect" />
      <div className="f95-page" data-testid="prospect-detail">
        <Link href="/95-forward/prospects" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Master Prospect List
        </Link>

        <ProspectHeader detail={detail} />

        <Tabs items={tabs} active={activeTab}>
          {activeTab === "overview" ? (
            <OverviewTab detail={detail} rmUsers={rmUsers} proposals={proposals} />
          ) : null}
          {activeTab === "knowledge" ? (
            <KnowledgeBaseTab detail={detail} proposals={proposals} />
          ) : null}
          {activeTab === "strategy" ? <StrategyTab detail={detail} proposals={proposals} /> : null}
          {activeTab === "relationship" && isOrg(detail.type) ? (
            <RelationshipMapTab detail={detail} proposals={proposals} />
          ) : null}
          {activeTab === "visits" ? <VisitPlanTab detail={detail} proposals={proposals} /> : null}
        </Tabs>
      </div>
    </>
  );
}

function ProspectHeader({ detail }: { detail: ProspectDetail }) {
  return (
    <div className="f95-record-head">
      <div className="f95-record-head__main">
        <h1 className="f95-record-head__title">{detail.name}</h1>
        <div className="f95-record-head__meta">
          <Badge tone={typeTone(detail.type)}>{typeLabel(detail.type)}</Badge>
          <span>#{detail.rank} on the list</span>
          <span>· {detail.descriptor}</span>
        </div>
        <div className="f95-cluster">
          {detail.rmName ? <RoleChip role="manager" name={detail.rmName} /> : null}
          {detail.naturalPartners.map((partner) =>
            partner.name ? <RoleChip key={partner.id} role="partner" name={partner.name} /> : null,
          )}
        </div>
      </div>
    </div>
  );
}

function NextMove({ detail }: { detail: ProspectDetail }) {
  return (
    <Card tone="go" accent pad="lg">
      <div className="f95-stack f95-stack--sm">
        <div className="f95-page__eyebrow">The next move</div>
        <h2 className="f95-section-title">{detail.nextMove.headline}</h2>
        <p className="f95-deflist__desc">{detail.nextMove.why}</p>
        <div className="f95-cluster">
          <Link href={`/95-forward/prospects/${detail.id}?tab=visits`}>
            <Button variant="go" size="sm">
              Plan the visit
            </Button>
          </Link>
          <Link href={`/95-forward/prospects/${detail.id}?tab=visits`}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<PhoneCall size={15} strokeWidth={1.8} />}
            >
              Log a touch
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

const KNOWLEDGE_SOURCES: Record<string, string> = {
  "Estimated capacity": "IRS 990-PF",
  "Gift history": "Gift records",
};

function KnowledgeSummary({ detail }: { detail: ProspectDetail }) {
  const knowledge = detail.knowledge;
  const fields: { term: string; value: string | null }[] = [
    { term: "Estimated capacity", value: knowledge?.capacitySource ?? null },
    { term: "Relationship to the cause", value: knowledge?.relationshipToCause ?? null },
    { term: "Connectors", value: knowledge?.connectorsNote ?? null },
    { term: "Gift history", value: knowledge?.giftHistorySummary ?? null },
    { term: "Other philanthropy", value: knowledge?.otherPhilanthropy ?? null },
    { term: "Timing", value: knowledge?.timingNote ?? null },
  ];

  return (
    <Card>
      <div className="f95-stack">
        <div className="f95-cluster">
          <div className="f95-stack f95-stack--sm">
            <h2 className="f95-section-title">What we know so far</h2>
            <span className="f95-deflist__desc--empty">Gaps are invitations, not errors.</span>
          </div>
          <span className="f95-recordbar__spacer" />
          <Link href={`/95-forward/prospects/${detail.id}?tab=knowledge`}>
            <Button variant="ghost" size="sm">
              Open the Knowledge Base
            </Button>
          </Link>
        </div>
        <div className="f95-deflist">
          {fields.map((field) => (
            <div key={field.term} className="f95-deflist__item">
              <span className="f95-deflist__term">{field.term}</span>
              {field.value ? (
                <>
                  <span className="f95-deflist__desc">{field.value}</span>
                  {KNOWLEDGE_SOURCES[field.term] ? (
                    <div>
                      <SourceTag source={KNOWLEDGE_SOURCES[field.term]} />
                    </div>
                  ) : null}
                </>
              ) : (
                <span className="f95-deflist__desc--empty">Unknown — worth researching</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function RecentActivity({ activity }: { activity: ProspectActivity[] }) {
  return (
    <Card>
      <div className="f95-stack">
        <h2 className="f95-section-title">Recent activity</h2>
        {activity.length === 0 ? (
          <span className="f95-deflist__desc--empty">No contact yet — log your first touch.</span>
        ) : (
          <div>
            {activity.map((item) => (
              <div key={item.id} className="f95-itemrow">
                <div className="f95-itemrow__body">
                  <span className="f95-itemrow__title">{item.summary ?? "Logged interaction"}</span>
                  <span className="f95-itemrow__meta">
                    <span>{relativeDate(item.occurredAt)}</span>
                    {item.ownerName ? <span>· {item.ownerName}</span> : null}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function OverviewTab({
  detail,
  rmUsers,
  proposals,
}: {
  detail: ProspectDetail;
  rmUsers: { id: string; name: string }[];
  proposals: Awaited<ReturnType<typeof listProspectProposals>>;
}) {
  return (
    <div className="f95-overview">
      <div className="f95-overview__main">
        <Card tone="go" accent pad="lg">
          <div className="f95-stack" data-testid="prospect-qpi">
            <QpiScore result={detail.qpi} updatedAt="6h ago" expandable />
            <AdjustScore prospectId={detail.id} result={detail.qpi} />
          </div>
        </Card>

        <KnowledgeSummary detail={detail} />

        <Card tone="ai">
          <CopilotSuggestions prospectId={detail.id} result={detail.qpi} proposals={proposals} />
        </Card>

        <RecentActivity activity={detail.activity} />
      </div>

      <aside className="f95-overview__rail">
        <NextMove detail={detail} />
        <Card>
          <RelationshipTeam
            prospectId={detail.id}
            rmUserId={detail.rmUserId}
            rmName={detail.rmName}
            rmUsers={rmUsers}
            partners={detail.naturalPartners}
          />
        </Card>
      </aside>
    </div>
  );
}

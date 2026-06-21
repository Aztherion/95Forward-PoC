import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gauge, Pencil } from "lucide-react";
import { Badge, Button, Card, DataTable, Tabs } from "@/components/ds";
import type { DataTableColumn, TabItem } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import {
  constituentHasGifts,
  getConstituentDetail,
  searchConstituents,
} from "@/server/data/constituents";
import { listTags, listUsers } from "@/server/data/reference";
import { getConstituentVolunteerActivity } from "@/server/data/volunteers";
import { getConstituentMemberships } from "@/server/data/memberships";
import { archiveConstituentAction } from "@/server/actions/constituents";
import {
  formatCurrencyFromCents,
  formatDate,
  lifetimeGivingCents,
  titleCaseFromSnake,
} from "@/lib/format";
import { ActionsTab } from "./ActionsTab";
import { RelationshipsTab } from "./RelationshipsTab";
import { TagsTab } from "./TagsTab";
import { VolunteerActivityTab } from "./VolunteerActivityTab";
import { MembershipTab } from "./MembershipTab";

export const dynamic = "force-dynamic";

const TAB_IDS = [
  "profile",
  "giving",
  "relationships",
  "actions",
  "tags",
  "volunteer",
  "membership",
] as const;
type TabId = (typeof TAB_IDS)[number];

function resolveTab(value: string | undefined): TabId {
  return (TAB_IDS as readonly string[]).includes(value ?? "") ? (value as TabId) : "profile";
}

interface GiftRow {
  id: string;
  amountCents: number;
  giftDate: string;
  giftType: string;
  designation: string | null;
  receiptStatus: string | null;
  fundName: string | null;
  campaignName: string | null;
  appealName: string | null;
}

export default async function ConstituentRecordPage({
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

  const record = await getConstituentDetail(user.tenantId, id);
  if (!record) notFound();

  const [hasGifts, allTags, candidates, users, volunteerActivity, memberships] = await Promise.all([
    constituentHasGifts(user.tenantId, id),
    listTags(user.tenantId),
    searchConstituents(user.tenantId, "", id),
    listUsers(user.tenantId),
    getConstituentVolunteerActivity(user.tenantId, id),
    getConstituentMemberships(user.tenantId, id),
  ]);

  const lifetime = lifetimeGivingCents(record.gifts);
  const isIndividual = record.type === "individual";

  const tabs: TabItem[] = [
    { id: "profile", label: "Profile", href: `/constituents/${id}?tab=profile` },
    { id: "giving", label: "Giving history", href: `/constituents/${id}?tab=giving` },
    { id: "relationships", label: "Relationships", href: `/constituents/${id}?tab=relationships` },
    { id: "actions", label: "Actions", href: `/constituents/${id}?tab=actions` },
    { id: "tags", label: "Tags", href: `/constituents/${id}?tab=tags` },
    { id: "volunteer", label: "Volunteer", href: `/constituents/${id}?tab=volunteer` },
    { id: "membership", label: "Membership", href: `/constituents/${id}?tab=membership` },
  ];

  return (
    <div className="f95-page">
      <Link href="/constituents" className="f95-table__cell-link f95-cluster">
        <ArrowLeft size={15} strokeWidth={1.8} /> Constituents
      </Link>

      <div className="f95-record-head">
        <div className="f95-record-head__main">
          <h1 className="f95-record-head__title">{record.displayName}</h1>
          <div className="f95-record-head__meta">
            <Badge
              tone={
                record.type === "foundation"
                  ? "info"
                  : record.type === "organization"
                    ? "success"
                    : "neutral"
              }
            >
              {titleCaseFromSnake(record.type)}
            </Badge>
            {record.prospectStatus !== "none" ? (
              <Badge tone="neutral">{titleCaseFromSnake(record.prospectStatus)}</Badge>
            ) : null}
            {record.archivedAt ? <Badge tone="unknown">Archived</Badge> : null}
            <span>Lifetime giving {formatCurrencyFromCents(lifetime)}</span>
            {record.city || record.region ? (
              <span>· {[record.city, record.region].filter(Boolean).join(", ")}</span>
            ) : null}
            {record.assignedUser ? <span>· {record.assignedUser.name}</span> : null}
          </div>
        </div>
        <div className="f95-record-head__actions">
          <Link href={`/constituents/${id}/edit`}>
            <Button variant="secondary" size="sm" iconLeft={<Pencil size={15} strokeWidth={1.8} />}>
              Edit
            </Button>
          </Link>
          <form action={archiveConstituentAction}>
            <input type="hidden" name="id" value={id} />
            <Button variant="danger" size="sm" type="submit">
              {hasGifts ? "Archive" : "Delete"}
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <div className="f95-foil">
          <span className="f95-foil__mark" aria-hidden="true">
            <Gauge size={20} strokeWidth={1.8} />
          </span>
          <div className="f95-foil__body">
            <span className="f95-foil__label">Major-gift likelihood · AI</span>
            {record.hostLikelihood === null ? (
              <span className="f95-foil__value--empty">Not scored</span>
            ) : (
              <span className="f95-foil__value">{record.hostLikelihood}</span>
            )}
          </div>
        </div>
      </Card>

      <Tabs items={tabs} active={activeTab}>
        {activeTab === "profile" ? (
          <ProfilePanel record={record} isIndividual={isIndividual} />
        ) : null}

        {activeTab === "giving" ? (
          <GivingPanel
            rows={record.gifts.map((gift) => ({
              id: gift.id,
              amountCents: gift.amountCents,
              giftDate: gift.giftDate,
              giftType: gift.giftType,
              designation: gift.designation,
              receiptStatus: gift.receiptStatus,
              fundName: gift.fund?.name ?? null,
              campaignName: gift.campaign?.name ?? null,
              appealName: gift.appeal?.name ?? null,
            }))}
          />
        ) : null}

        {activeTab === "relationships" ? (
          <RelationshipsTab
            constituentId={id}
            candidates={candidates}
            relationships={record.relationshipsFrom.map((rel) => ({
              id: rel.id,
              type: rel.type,
              note: rel.note,
              toConstituentId: rel.toConstituentId,
              toConstituentName: rel.toConstituent?.displayName ?? null,
              externalName: rel.externalName,
            }))}
          />
        ) : null}

        {activeTab === "actions" ? (
          <ActionsTab
            constituentId={id}
            users={users}
            interactions={record.interactions.map((interaction) => ({
              id: interaction.id,
              type: interaction.type,
              occurredAt:
                interaction.occurredAt instanceof Date
                  ? interaction.occurredAt.toISOString()
                  : String(interaction.occurredAt),
              summary: interaction.summary,
              ownerName: interaction.owner?.name ?? null,
            }))}
          />
        ) : null}

        {activeTab === "tags" ? (
          <TagsTab
            constituentId={id}
            allTags={allTags}
            tags={record.constituentTags.map((ct) => ({ id: ct.tag.id, name: ct.tag.name }))}
          />
        ) : null}

        {activeTab === "volunteer" ? <VolunteerActivityTab activity={volunteerActivity} /> : null}

        {activeTab === "membership" ? <MembershipTab memberships={memberships} /> : null}
      </Tabs>
    </div>
  );
}

function Field({ term, value }: { term: string; value: string | null | undefined }) {
  return (
    <div className="f95-deflist__item">
      <span className="f95-deflist__term">{term}</span>
      {value ? (
        <span className="f95-deflist__desc">{value}</span>
      ) : (
        <span className="f95-deflist__desc--empty">Unknown — worth researching</span>
      )}
    </div>
  );
}

function ProfilePanel({
  record,
  isIndividual,
}: {
  record: Awaited<ReturnType<typeof getConstituentDetail>>;
  isIndividual: boolean;
}) {
  if (!record) return null;
  const address = [
    record.addressLine1,
    record.addressLine2,
    record.city,
    record.region,
    record.postalCode,
    record.country,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="f95-stack">
      <Card>
        <div className="f95-deflist">
          {isIndividual ? (
            <>
              <Field term="First name" value={record.firstName} />
              <Field term="Last name" value={record.lastName} />
            </>
          ) : (
            <Field term="Organization name" value={record.organizationName} />
          )}
          <Field term="Email" value={record.email} />
          <Field term="Phone" value={record.phone} />
          <Field term="Address" value={address || null} />
        </div>
      </Card>
      <Card>
        <div className="f95-fieldgroup__legend">Flags</div>
        <div className="f95-flagboard">
          {record.boardMember ? <Badge tone="info">Board member</Badge> : null}
          {record.volunteer ? <Badge tone="success">Volunteer</Badge> : null}
          {record.wavemakerMonthly ? <Badge tone="attention">Wavemaker</Badge> : null}
          {record.legacy ? <Badge tone="neutral">Legacy</Badge> : null}
          {!record.boardMember &&
          !record.volunteer &&
          !record.wavemakerMonthly &&
          !record.legacy ? (
            <span className="f95-deflist__desc--empty">No flags set yet.</span>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function GivingPanel({ rows }: { rows: GiftRow[] }) {
  const columns: DataTableColumn<GiftRow>[] = [
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => formatCurrencyFromCents(row.amountCents),
    },
    { key: "date", header: "Date", cell: (row) => formatDate(row.giftDate) },
    { key: "fund", header: "Fund", cell: (row) => row.fundName ?? "—" },
    { key: "campaign", header: "Campaign", cell: (row) => row.campaignName ?? "—" },
    { key: "appeal", header: "Appeal", cell: (row) => row.appealName ?? "—" },
    { key: "type", header: "Type", cell: (row) => titleCaseFromSnake(row.giftType) },
    {
      key: "receipt",
      header: "Receipt",
      cell: (row) => (row.receiptStatus ? titleCaseFromSnake(row.receiptStatus) : "—"),
    },
  ];

  if (rows.length === 0) {
    return (
      <div className="f95-stack">
        <h2 className="f95-section-title">Giving history</h2>
        <p className="f95-deflist__desc--empty">No gifts on file yet.</p>
      </div>
    );
  }

  return (
    <div className="f95-stack">
      <h2 className="f95-section-title">Giving history</h2>
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
    </div>
  );
}

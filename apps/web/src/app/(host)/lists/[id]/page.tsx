import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, DataTable, EmptyState } from "@/components/ds";
import type { BadgeTone, DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getSavedList } from "@/server/data/lists";
import { getConstituentsList, type ConstituentListRow } from "@/server/data/constituents";
import { getGiftsList, type GiftListRow } from "@/server/data/gifts";
import { getInteractionsList, type InteractionListRow } from "@/server/data/interactions";
import { definitionToConstituentParams } from "@/lib/list-params";
import { definitionToGiftParams } from "@/lib/gift-params";
import { definitionToInteractionParams } from "@/lib/interaction-params";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";
import { encodeBuilderHref } from "@/lib/list-edit";

export const dynamic = "force-dynamic";

const RECORD_LABELS: Record<"constituent" | "gift" | "interaction", string> = {
  constituent: "Constituents",
  gift: "Gifts",
  interaction: "Actions",
};

const RECORD_TONES: Record<"constituent" | "gift" | "interaction", BadgeTone> = {
  constituent: "neutral",
  gift: "success",
  interaction: "info",
};

const constituentColumns: DataTableColumn<ConstituentListRow>[] = [
  { key: "name", header: "Name", cell: (row) => row.displayName },
  {
    key: "type",
    header: "Type",
    cell: (row) => <Badge tone="neutral">{titleCaseFromSnake(row.type)}</Badge>,
  },
  {
    key: "lifetime",
    header: "Lifetime giving",
    align: "right",
    cell: (row) => formatCurrencyFromCents(row.lifetimeGivingCents),
  },
  {
    key: "lastGift",
    header: "Last gift",
    align: "right",
    cell: (row) =>
      row.lastGiftCents === null ? (
        <span className="f95-table__muted">No gifts</span>
      ) : (
        formatCurrencyFromCents(row.lastGiftCents)
      ),
  },
  {
    key: "status",
    header: "Prospect status",
    cell: (row) =>
      row.prospectStatus === "none" ? (
        <span className="f95-table__muted">—</span>
      ) : (
        titleCaseFromSnake(row.prospectStatus)
      ),
  },
];

const giftColumns: DataTableColumn<GiftListRow>[] = [
  { key: "donor", header: "Donor", cell: (row) => row.donorName },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    cell: (row) => formatCurrencyFromCents(row.amountCents),
  },
  { key: "type", header: "Type", cell: (row) => titleCaseFromSnake(row.giftType) },
  {
    key: "fund",
    header: "Fund",
    cell: (row) => row.fundName ?? <span className="f95-table__muted">—</span>,
  },
  { key: "date", header: "Date", cell: (row) => formatDate(row.giftDate) },
];

const interactionColumns: DataTableColumn<InteractionListRow>[] = [
  { key: "constituent", header: "Constituent", cell: (row) => row.constituentName },
  {
    key: "type",
    header: "Type",
    cell: (row) => <Badge tone="info">{titleCaseFromSnake(row.type)}</Badge>,
  },
  { key: "date", header: "Date", cell: (row) => formatDate(row.occurredAt) },
  {
    key: "owner",
    header: "Owner",
    cell: (row) => row.ownerName ?? <span className="f95-table__muted">Unassigned</span>,
  },
];

export default async function SavedListViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const saved = await getSavedList(user.tenantId, id);
  if (!saved) notFound();

  let total = 0;
  let table: React.ReactNode;

  if (saved.recordType === "gift") {
    const result = await getGiftsList(user.tenantId, definitionToGiftParams(saved.definition));
    total = result.total;
    table =
      result.rows.length === 0 ? null : (
        <DataTable
          columns={giftColumns}
          rows={result.rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/revenue/${row.id}`}
        />
      );
  } else if (saved.recordType === "interaction") {
    const result = await getInteractionsList(
      user.tenantId,
      definitionToInteractionParams(saved.definition),
    );
    total = result.total;
    table =
      result.rows.length === 0 ? null : (
        <DataTable
          columns={interactionColumns}
          rows={result.rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/constituents/${row.constituentId}`}
        />
      );
  } else {
    const result = await getConstituentsList(
      user.tenantId,
      definitionToConstituentParams(saved.definition),
    );
    total = result.total;
    table =
      result.rows.length === 0 ? null : (
        <DataTable
          columns={constituentColumns}
          rows={result.rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/constituents/${row.id}`}
        />
      );
  }

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Lists</div>
          <h1 className="f95-page__title">{saved.name}</h1>
          <div className="f95-page__count">
            <Badge tone={RECORD_TONES[saved.recordType]}>{RECORD_LABELS[saved.recordType]}</Badge> ·{" "}
            {total === 1 ? "1 record" : `${total} records`}
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href={encodeBuilderHref(saved.recordType, saved.definition)}>
            <Button variant="secondary" size="sm">
              Edit list
            </Button>
          </Link>
          <Link href="/lists">
            <Button variant="ghost" size="sm">
              All lists
            </Button>
          </Link>
        </div>
      </div>

      {table ?? (
        <EmptyState
          title="No records match this list"
          line="The saved filters return no records right now."
          action={
            <Link href={encodeBuilderHref(saved.recordType, saved.definition)}>
              <Button variant="secondary" size="sm">
                Edit list
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}

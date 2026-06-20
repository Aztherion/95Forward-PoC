import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, Pagination } from "@/components/ds";
import type { DataTableColumn } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getConstituentsList, type ConstituentListRow } from "@/server/data/constituents";
import { listTags, listUsers } from "@/server/data/reference";
import { listSavedLists } from "@/server/data/lists";
import {
  constituentParamsToDefinition,
  constituentParamsToSearch,
  definitionToConstituentSearch,
  parseConstituentListParams,
  CONSTITUENTS_PAGE_SIZE,
  type ConstituentListParams,
  type RawSearchParams,
} from "@/lib/list-params";
import { formatCurrencyFromCents, formatDate, titleCaseFromSnake } from "@/lib/format";
import { FilterBar } from "./FilterBar";
import { SavedViews } from "./SavedViews";

export const dynamic = "force-dynamic";

function typeTone(type: ConstituentListRow["type"]) {
  if (type === "foundation") return "info" as const;
  if (type === "organization") return "success" as const;
  return "neutral" as const;
}

export default async function ConstituentsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const params = parseConstituentListParams(raw);

  const [{ rows, total }, users, tags, savedViews] = await Promise.all([
    getConstituentsList(user.tenantId, params),
    listUsers(user.tenantId),
    listTags(user.tenantId),
    listSavedLists(user.tenantId, "constituent"),
  ]);

  function buildSortHref(field: string, dir: "asc" | "desc"): string {
    const next: ConstituentListParams = {
      ...params,
      sort: field as ConstituentListParams["sort"],
      dir,
      page: 1,
    };
    const qs = constituentParamsToSearch(next).toString();
    return `/constituents${qs ? `?${qs}` : ""}`;
  }

  function buildPageHref(page: number): string {
    const qs = constituentParamsToSearch({ ...params, page }).toString();
    return `/constituents${qs ? `?${qs}` : ""}`;
  }

  const columns: DataTableColumn<ConstituentListRow>[] = [
    {
      key: "name",
      header: "Name",
      sortKey: "displayName",
      cell: (row) => row.displayName,
    },
    {
      key: "type",
      header: "Type",
      sortKey: "type",
      cell: (row) => <Badge tone={typeTone(row.type)}>{titleCaseFromSnake(row.type)}</Badge>,
    },
    {
      key: "lifetime",
      header: "Lifetime giving",
      sortKey: "lifetimeGiving",
      align: "right",
      cell: (row) => formatCurrencyFromCents(row.lifetimeGivingCents),
    },
    {
      key: "lastGift",
      header: "Last gift",
      sortKey: "lastGift",
      align: "right",
      cell: (row) =>
        row.lastGiftCents === null ? (
          <span className="f95-table__muted">No gifts yet</span>
        ) : (
          <span>
            {formatCurrencyFromCents(row.lastGiftCents)}
            <span className="f95-table__muted"> · {formatDate(row.lastGiftDate)}</span>
          </span>
        ),
    },
    {
      key: "lastContact",
      header: "Last contact",
      sortKey: "lastContact",
      cell: (row) =>
        row.lastContactAt ? (
          formatDate(row.lastContactAt)
        ) : (
          <span className="f95-table__muted">No contact yet</span>
        ),
    },
    {
      key: "status",
      header: "Prospect status",
      sortKey: "prospectStatus",
      cell: (row) =>
        row.prospectStatus === "none" ? (
          <span className="f95-table__muted">—</span>
        ) : (
          titleCaseFromSnake(row.prospectStatus)
        ),
    },
    {
      key: "city",
      header: "City / region",
      sortKey: "city",
      cell: (row) =>
        row.city || row.region ? (
          [row.city, row.region].filter(Boolean).join(", ")
        ) : (
          <span className="f95-table__muted">—</span>
        ),
    },
    {
      key: "assigned",
      header: "Assigned to",
      sortKey: "assignedTo",
      cell: (row) => row.assignedUserName ?? <span className="f95-table__muted">Unassigned</span>,
    },
  ];

  const definition = constituentParamsToDefinition(params);
  const viewItems = savedViews.map((view) => ({
    id: view.id,
    name: view.name,
    search: definitionToConstituentSearch(view.definition).toString(),
  }));

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">Constituents</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 record" : `${total} records`}
            {params.showArchived ? " · archived" : ""}
          </div>
        </div>
        <div className="f95-page__actions">
          <SavedViews views={viewItems} definition={definition} />
          <Link href="/constituents/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              Add constituent
            </Button>
          </Link>
        </div>
      </div>

      <FilterBar users={users} tags={tags} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={20} strokeWidth={1.8} />}
          title="Nothing here yet"
          line={
            params.search || params.type || params.status || params.assignedUserId || params.tagId
              ? "No constituents match these filters. Try widening your search."
              : "Add your first constituent to start building the register."
          }
          action={
            <Link href="/constituents/new">
              <Button variant="secondary" size="sm">
                Add constituent
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            rowHref={(row) => `/constituents/${row.id}`}
            sort={{ field: params.sort, dir: params.dir, buildHref: buildSortHref }}
          />
          <Pagination
            page={params.page}
            pageSize={CONSTITUENTS_PAGE_SIZE}
            total={total}
            buildHref={buildPageHref}
          />
        </>
      )}
    </div>
  );
}

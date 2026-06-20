import Link from "next/link";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ds";
import type { BadgeTone } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { listAllSavedLists, type SavedListSummary } from "@/server/data/lists";
import { deleteSavedListAction } from "@/server/actions/lists";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type RecordType = SavedListSummary["recordType"];

const RECORD_GROUPS: { type: RecordType; label: string; tone: BadgeTone }[] = [
  { type: "constituent", label: "Constituents", tone: "neutral" },
  { type: "gift", label: "Gifts", tone: "success" },
  { type: "interaction", label: "Actions", tone: "info" },
];

function recordTypeLabel(type: RecordType): string {
  return RECORD_GROUPS.find((group) => group.type === type)?.label ?? type;
}

function recordTypeTone(type: RecordType): BadgeTone {
  return RECORD_GROUPS.find((group) => group.type === type)?.tone ?? "neutral";
}

export default async function ListsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const lists = await listAllSavedLists(user.tenantId);
  const total = lists.length;

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">Lists</h1>
          <div className="f95-page__count">
            {total === 1 ? "1 saved list" : `${total} saved lists`}
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href="/lists/new?type=constituent">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              Build a list
            </Button>
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<ListChecks size={20} strokeWidth={1.8} />}
          title="No saved lists yet"
          line="Build a list over constituents, gifts, or actions, then save it to return to it."
          action={
            <Link href="/lists/new?type=constituent">
              <Button variant="secondary" size="sm">
                Build a list
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="f95-stack">
          {RECORD_GROUPS.map((group) => {
            const groupLists = lists.filter((list) => list.recordType === group.type);
            return (
              <Card key={group.type} pad="lg">
                <div className="f95-cluster" style={{ justifyContent: "space-between" }}>
                  <h2 className="f95-section-title">{group.label}</h2>
                  <Link href={`/lists/new?type=${group.type}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={<Plus size={14} strokeWidth={1.8} />}
                    >
                      New {group.label.toLowerCase()} list
                    </Button>
                  </Link>
                </div>
                {groupLists.length === 0 ? (
                  <p className="f95-table__muted" style={{ marginTop: "var(--space-3)" }}>
                    No {group.label.toLowerCase()} lists saved yet.
                  </p>
                ) : (
                  <div style={{ marginTop: "var(--space-2)" }}>
                    {groupLists.map((list) => (
                      <div key={list.id} className="f95-itemrow">
                        <div className="f95-itemrow__body">
                          <Link
                            href={`/lists/${list.id}`}
                            className="f95-itemrow__title f95-table__cell-link"
                          >
                            {list.name}
                          </Link>
                          <div className="f95-itemrow__meta">
                            <Badge tone={recordTypeTone(list.recordType)}>
                              {recordTypeLabel(list.recordType)}
                            </Badge>
                            <span>
                              {list.filterCount === 1 ? "1 filter" : `${list.filterCount} filters`}
                            </span>
                            <span>·</span>
                            <span>{list.ownerName ?? "Unassigned"}</span>
                            <span>·</span>
                            <span>{formatDate(list.createdAt)}</span>
                          </div>
                        </div>
                        <div className="f95-itemrow__actions">
                          <Link href={`/lists/${list.id}`}>
                            <Button variant="ghost" size="sm">
                              Open
                            </Button>
                          </Link>
                          <form action={deleteSavedListAction}>
                            <input type="hidden" name="id" value={list.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              aria-label={`Delete list ${list.name}`}
                              iconLeft={<Trash2 size={15} strokeWidth={1.8} />}
                            >
                              Delete
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

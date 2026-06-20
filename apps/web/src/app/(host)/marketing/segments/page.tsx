import Link from "next/link";
import { Plus, Trash2, Users } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { countSegmentMatches, listSegments } from "@/server/data/segments";
import { deleteSegmentAction } from "@/server/actions/segments";
import { MarketingNav } from "../MarketingNav";

export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const segments = await listSegments(user.tenantId);
  const counts = await Promise.all(
    segments.map((segment) => countSegmentMatches(user.tenantId, segment.definition)),
  );
  const total = segments.length;

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Marketing</div>
          <h1 className="f95-page__title">Segments</h1>
          <div className="f95-page__count">{total === 1 ? "1 segment" : `${total} segments`}</div>
        </div>
        <div className="f95-page__actions">
          <Link href="/marketing/segments/new">
            <Button variant="primary" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
              New segment
            </Button>
          </Link>
        </div>
      </div>

      <MarketingNav active="segments" />

      {total === 0 ? (
        <EmptyState
          icon={<Users size={20} strokeWidth={1.8} />}
          title="No segments yet"
          line="Build an audience from a constituent filter, then reuse it for your communications."
          action={
            <Link href="/marketing/segments/new">
              <Button variant="secondary" size="sm">
                New segment
              </Button>
            </Link>
          }
        />
      ) : (
        <Card pad="lg">
          {segments.map((segment, index) => (
            <div key={segment.id} className="f95-itemrow">
              <div className="f95-itemrow__body">
                <Link
                  href={`/marketing/segments/${segment.id}`}
                  className="f95-itemrow__title f95-table__cell-link"
                >
                  {segment.name}
                </Link>
                <div className="f95-itemrow__meta">
                  <span>
                    {counts[index] === 1 ? "1 constituent" : `${counts[index] ?? 0} constituents`}
                  </span>
                  {segment.description ? (
                    <>
                      <span>·</span>
                      <span>{segment.description}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="f95-itemrow__actions">
                <Link href={`/marketing/segments/${segment.id}`}>
                  <Button variant="ghost" size="sm">
                    Open
                  </Button>
                </Link>
                <form action={deleteSegmentAction}>
                  <input type="hidden" name="id" value={segment.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete segment ${segment.name}`}
                    iconLeft={<Trash2 size={15} strokeWidth={1.8} />}
                  >
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

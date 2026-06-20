import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { savedListDefinitionSchema, type SavedListDefinition } from "@95forward/shared";
import { listTags, listUsers } from "@/server/data/reference";
import { countSegmentMatches, getSegment } from "@/server/data/segments";
import { getCurrentUser } from "@/lib/auth";
import { validateFilters } from "@/lib/list-fields";
import type { RawSearchParams } from "@/lib/list-params";
import { updateSegmentAction } from "@/server/actions/segments";
import { SegmentBuilder, type SegmentRefOptions } from "../SegmentBuilder";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseDefinition(raw: string | undefined): SavedListDefinition | null {
  if (!raw) return null;
  try {
    const result = savedListDefinitionSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export default async function EditSegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const segment = await getSegment(user.tenantId, id);
  if (!segment) notFound();

  const raw = await searchParams;
  const draft = parseDefinition(firstParam(raw.def));
  const working = draft ?? segment.definition;

  const runnableDefinition: SavedListDefinition = {
    filters: validateFilters("constituent", working.filters ?? []),
    search: working.search,
    sort: working.sort,
  };

  const [users, tags, previewCount] = await Promise.all([
    listUsers(user.tenantId),
    listTags(user.tenantId),
    countSegmentMatches(user.tenantId, runnableDefinition),
  ]);

  const refOptions: SegmentRefOptions = {
    users: users.map((item) => ({ value: item.id, label: item.name })),
    tags: tags.map((item) => ({ value: item.id, label: item.name })),
  };

  const boundAction = updateSegmentAction.bind(null, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/marketing/segments" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Segments
        </Link>
        <h1 className="f95-page__title">Edit segment</h1>
      </div>

      <SegmentBuilder
        action={boundAction}
        definition={{
          filters: working.filters ?? [],
          search: working.search,
          sort: working.sort,
        }}
        previewCount={previewCount}
        refOptions={refOptions}
        builderBasePath={`/marketing/segments/${id}`}
        cancelHref="/marketing/segments"
        submitLabel="Save changes"
        initial={{
          name: segment.name,
          description: segment.description ?? undefined,
        }}
      />
    </div>
  );
}

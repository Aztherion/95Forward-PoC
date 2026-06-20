import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { savedListDefinitionSchema, type SavedListDefinition } from "@95forward/shared";
import { listTags, listUsers } from "@/server/data/reference";
import { countSegmentMatches } from "@/server/data/segments";
import { getCurrentUser } from "@/lib/auth";
import { validateFilters } from "@/lib/list-fields";
import type { RawSearchParams } from "@/lib/list-params";
import { createSegmentAction } from "@/server/actions/segments";
import { SegmentBuilder, type SegmentRefOptions } from "../SegmentBuilder";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseDefinition(raw: string | undefined): SavedListDefinition {
  if (!raw) return { filters: [] };
  try {
    const result = savedListDefinitionSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : { filters: [] };
  } catch {
    return { filters: [] };
  }
}

export default async function NewSegmentPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const parsed = parseDefinition(firstParam(raw.def));

  const runnableDefinition: SavedListDefinition = {
    filters: validateFilters("constituent", parsed.filters ?? []),
    search: parsed.search,
    sort: parsed.sort,
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

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/marketing/segments" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Segments
        </Link>
        <h1 className="f95-page__title">New segment</h1>
      </div>

      <SegmentBuilder
        action={createSegmentAction}
        definition={{
          filters: parsed.filters ?? [],
          search: parsed.search,
          sort: parsed.sort,
        }}
        previewCount={previewCount}
        refOptions={refOptions}
        builderBasePath="/marketing/segments/new"
        cancelHref="/marketing/segments"
        submitLabel="Create segment"
      />
    </div>
  );
}

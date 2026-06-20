import Link from "next/link";
import { savedListDefinitionSchema, type SavedListDefinition } from "@95forward/shared";
import { Button } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { listConstituentRefs, listTags, listUsers } from "@/server/data/reference";
import { listRevenueRefs } from "@/server/data/revenue-config";
import { countList } from "@/server/data/run-list";
import { validateFilters, type RecordType } from "@/lib/list-fields";
import type { RawSearchParams } from "@/lib/list-params";
import { ListBuilder, type RefOptions } from "./ListBuilder";

export const dynamic = "force-dynamic";

const RECORD_TYPES: RecordType[] = ["constituent", "gift", "interaction"];

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseRecordType(value: string | undefined): RecordType {
  if (value && (RECORD_TYPES as readonly string[]).includes(value)) {
    return value as RecordType;
  }
  return "constituent";
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

export default async function NewListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const raw = await searchParams;
  const recordType = parseRecordType(firstParam(raw.type));
  const parsed = parseDefinition(firstParam(raw.def));

  const sanitizedFilters = validateFilters(recordType, parsed.filters ?? []);
  const runnableDefinition: SavedListDefinition = {
    filters: sanitizedFilters,
    search: parsed.search,
    sort: parsed.sort,
  };

  const [users, tags, constituentRefs, revenueRefs, previewCount] = await Promise.all([
    listUsers(user.tenantId),
    listTags(user.tenantId),
    listConstituentRefs(user.tenantId),
    listRevenueRefs(user.tenantId),
    countList(user.tenantId, recordType, runnableDefinition),
  ]);

  const refOptions: RefOptions = {
    users: users.map((item) => ({ value: item.id, label: item.name })),
    tags: tags.map((item) => ({ value: item.id, label: item.name })),
    funds: revenueRefs.funds.map((item) => ({ value: item.id, label: item.name })),
    campaigns: revenueRefs.campaigns.map((item) => ({ value: item.id, label: item.name })),
    appeals: revenueRefs.appeals.map((item) => ({ value: item.id, label: item.name })),
    constituents: constituentRefs.map((item) => ({ value: item.id, label: item.name })),
  };

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM · Lists</div>
          <h1 className="f95-page__title">Build a list</h1>
          <div className="f95-page__count">
            Pick a record type, add filters, then save the list.
          </div>
        </div>
        <div className="f95-page__actions">
          <Link href="/lists">
            <Button variant="secondary" size="sm">
              Back to lists
            </Button>
          </Link>
        </div>
      </div>

      <ListBuilder
        recordType={recordType}
        definition={{
          filters: parsed.filters ?? [],
          search: parsed.search,
          sort: parsed.sort,
        }}
        previewCount={previewCount}
        refOptions={refOptions}
      />
    </div>
  );
}

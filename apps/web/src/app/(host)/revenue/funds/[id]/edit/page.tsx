import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getNamedRef } from "@/server/data/revenue-config";
import { updateNamedRefAction } from "@/server/actions/revenue-config";
import { NamedRefForm } from "../../../NamedRefForm";
import { ENTITY_META } from "../../../entity-config";

export const dynamic = "force-dynamic";

export default async function EditFundPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  const meta = ENTITY_META.fund;

  const record = await getNamedRef(user.tenantId, meta.entity, id);
  if (!record) notFound();

  const action = updateNamedRefAction.bind(null, meta.entity, id);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href={meta.basePath} className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> {meta.plural}
        </Link>
        <h1 className="f95-page__title">Edit {meta.singular.toLowerCase()}</h1>
      </div>
      <NamedRefForm
        action={action}
        legend={meta.singular}
        submitLabel="Save changes"
        cancelHref={meta.basePath}
        initial={{
          name: record.name,
          code: record.code ?? undefined,
          startDate: record.startDate ?? undefined,
          endDate: record.endDate ?? undefined,
        }}
      />
    </div>
  );
}

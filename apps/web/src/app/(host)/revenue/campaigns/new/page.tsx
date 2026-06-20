import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createNamedRefAction } from "@/server/actions/revenue-config";
import { NamedRefForm } from "../../NamedRefForm";
import { ENTITY_META } from "../../entity-config";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const meta = ENTITY_META.campaign;
  const action = createNamedRefAction.bind(null, meta.entity);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href={meta.basePath} className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> {meta.plural}
        </Link>
        <h1 className="f95-page__title">New {meta.singular.toLowerCase()}</h1>
      </div>
      <NamedRefForm
        action={action}
        legend={meta.singular}
        submitLabel={`Create ${meta.singular.toLowerCase()}`}
        cancelHref={meta.basePath}
      />
    </div>
  );
}

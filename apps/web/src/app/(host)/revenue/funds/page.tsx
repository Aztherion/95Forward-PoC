import { getCurrentUser } from "@/lib/auth";
import { listNamedRefs } from "@/server/data/revenue-config";
import { NamedRefListView } from "../NamedRefListView";
import { ENTITY_META } from "../entity-config";

export const dynamic = "force-dynamic";

export default async function FundsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await listNamedRefs(user.tenantId, "fund");
  return <NamedRefListView meta={ENTITY_META.fund} rows={rows} />;
}

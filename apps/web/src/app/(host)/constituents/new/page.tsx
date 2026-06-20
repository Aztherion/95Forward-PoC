import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/server/data/reference";
import { createConstituentAction } from "@/server/actions/constituents";
import { ConstituentForm } from "../ConstituentForm";

export const dynamic = "force-dynamic";

export default async function NewConstituentPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const users = await listUsers(user.tenantId);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/constituents" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Constituents
        </Link>
        <h1 className="f95-page__title">Add constituent</h1>
      </div>
      <ConstituentForm
        action={createConstituentAction}
        users={users}
        submitLabel="Add constituent"
      />
    </div>
  );
}

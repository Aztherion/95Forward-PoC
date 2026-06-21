import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { listRmUsers } from "@/server/data/prospects";
import { listConstituentsNotProspects } from "@/server/data/prospect-create";
import { NewProspectForm } from "./NewProspectForm";

export const dynamic = "force-dynamic";

export default async function NewProspectPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [constituents, rmUsers] = await Promise.all([
    listConstituentsNotProspects(user.tenantId),
    listRmUsers(user.tenantId),
  ]);

  return (
    <>
      <Topbar title="Add a prospect" subtitle="95 Forward" />
      <div className="f95-page" data-testid="prospect-new">
        <Link href="/95-forward/prospects" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Master Prospect List
        </Link>

        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward</div>
            <h1 className="f95-page__title">Add a prospect</h1>
            <p className="f95-page__count">
              Bring an existing constituent onto the Master Prospect List. They start unscored — add
              what you know, and the copilot can help fill the gaps.
            </p>
          </div>
        </div>

        {constituents.length === 0 ? (
          <EmptyState
            icon={<Users size={20} strokeWidth={1.8} />}
            title="Everyone's already on the list"
            line="Every constituent is already tracked as a prospect. Add a new constituent first to bring them onto the list."
          />
        ) : (
          <NewProspectForm constituents={constituents} rmUsers={rmUsers} />
        )}
      </div>
    </>
  );
}

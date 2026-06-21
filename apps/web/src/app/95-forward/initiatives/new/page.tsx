import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { NewInitiativeForm } from "./NewInitiativeForm";

export const dynamic = "force-dynamic";

export default async function NewInitiativePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <>
      <Topbar title="Add initiative" subtitle="95 Forward · Funding" />
      <div className="f95-page">
        <Link href="/95-forward/initiatives" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Funding initiatives
        </Link>
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">95 Forward</div>
          <h1 className="f95-page__title">Add a funding initiative</h1>
        </div>
        <NewInitiativeForm />
      </div>
    </>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listSegments } from "@/server/data/segments";
import { createCommunicationAction } from "@/server/actions/communications";
import { CommunicationForm } from "../../CommunicationForm";

export const dynamic = "force-dynamic";

export default async function NewCommunicationPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const segments = await listSegments(user.tenantId);

  return (
    <div className="f95-page">
      <div className="f95-page__heading">
        <Link href="/marketing/communications" className="f95-table__cell-link f95-cluster">
          <ArrowLeft size={15} strokeWidth={1.8} /> Communications
        </Link>
        <h1 className="f95-page__title">New communication</h1>
      </div>

      <CommunicationForm
        action={createCommunicationAction}
        segments={segments.map((segment) => ({ id: segment.id, name: segment.name }))}
        submitLabel="Create communication"
        cancelHref="/marketing/communications"
      />
    </div>
  );
}

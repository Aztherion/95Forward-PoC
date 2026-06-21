"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createProspect, constituentIsProspect } from "@/server/data/prospect-create";
import type { ProspectStatus } from "@/lib/prospect-cadence";
import type { FormState } from "@/server/actions/prospects";

const STATUSES: readonly ProspectStatus[] = [
  "research",
  "cultivation",
  "solicitation",
  "stewardship",
  "active",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function createProspectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const constituentId = text(formData.get("constituentId"));
  const rmUserId = text(formData.get("rmUserId"));
  const statusRaw = text(formData.get("status")) ?? "research";

  const fieldErrors: Record<string, string> = {};
  if (!constituentId || !UUID.test(constituentId)) {
    fieldErrors.constituentId = "Pick a constituent to track.";
  }
  if (rmUserId && !UUID.test(rmUserId)) {
    fieldErrors.rmUserId = "Choose a valid relationship manager.";
  }
  const status = STATUSES.includes(statusRaw as ProspectStatus)
    ? (statusRaw as ProspectStatus)
    : "research";

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  if (await constituentIsProspect(user.tenantId, constituentId!)) {
    return {
      ok: false,
      fieldErrors: { constituentId: "They're already on the list." },
    };
  }

  const id = await createProspect(user.tenantId, {
    constituentId: constituentId!,
    rmUserId,
    status,
  });

  revalidatePath("/95-forward/prospects");
  redirect(`/95-forward/prospects/${id}`);
}

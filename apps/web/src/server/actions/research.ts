"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createResearchJob } from "@/server/data/research-jobs";
import { enqueueResearch } from "@/server/jobs";

// Enqueue a prospect-research job from a Knowledge Base gap. The research_jobs row is created first
// (status queued) so the tray can show it immediately; the Graphile job then drives it to ready.
// tenantId and userId come from getCurrentUser() — never from client input.
export async function enqueueResearchJobAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const prospectId = formData.get("prospectId");
  if (typeof prospectId !== "string" || prospectId.length === 0) return;
  const gapRaw = formData.get("researchGapId");
  const researchGapId = typeof gapRaw === "string" && gapRaw.length > 0 ? gapRaw : null;

  const researchJobId = await createResearchJob(user.tenantId, {
    prospectId,
    researchGapId,
    requestedByUserId: user.id,
  });
  await enqueueResearch(user.tenantId, user.id, researchJobId);
  revalidatePath(`/95-forward/prospects/${prospectId}`);
  revalidatePath("/95-forward/today");
}

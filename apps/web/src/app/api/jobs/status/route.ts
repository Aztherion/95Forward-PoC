import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getJobTrayState } from "@/server/data/research-jobs";

export const dynamic = "force-dynamic";

// Polled by the job tray (~15s). Tenant-scoped via getCurrentUser() -> getJobTrayState, so a caller
// only ever receives their own tenant's job summaries.
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ researching: [], ready: [], readyCount: 0 });
  const state = await getJobTrayState(user.tenantId);
  return NextResponse.json(state);
}

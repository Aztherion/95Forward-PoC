import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getJobTrayState } from "@/server/data/research-jobs";
import { getDiscoveryTrayState } from "@/server/data/discovery";

export const dynamic = "force-dynamic";

const EMPTY = {
  researching: [],
  ready: [],
  readyCount: 0,
  discoveryResearching: [],
  discoveryReady: [],
  discoveryReadyCount: 0,
};

// Polled by the job tray (~15s). Tenant-scoped via getCurrentUser() so a caller only ever receives
// their own tenant's summaries. Research jobs and discovery batches share one tray (additively).
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(EMPTY);
  const [research, discovery] = await Promise.all([
    getJobTrayState(user.tenantId),
    getDiscoveryTrayState(user.tenantId),
  ]);
  return NextResponse.json({
    researching: research.researching,
    ready: research.ready,
    readyCount: research.readyCount,
    discoveryResearching: discovery.researching,
    discoveryReady: discovery.ready,
    discoveryReadyCount: discovery.readyCount,
  });
}

import "server-only";
import { loadMetricsSnapshot, withTenant, DEMO_TODAY } from "@95forward/db";
import { fixedClock, type Clock, type MetricsSnapshot } from "@95forward/shared";
import { getAppDb } from "@/server/db";

// The first web consumer of the I19-I21 services. Two things it must get right, both of which the
// services deliberately refuse to decide for themselves:
//
//   THE CLOCK IS INJECTED. Never `new Date()` inside a service. The seeded demo is arithmetic about
//   a fixed anchor — "81 days idle", a close date three weeks out — and it only reads correctly when
//   the screens agree with the seed about what day it is.
//
//   THE SNAPSHOT IS LOADED ONCE PER REQUEST. Metrics, checks and the simulation must describe the
//   same portfolio; loading it twice invites two screens disagreeing about a number by one edit.

/** Frozen at the seed's anchor so the demo reproduces. */
export function demoClock(): Clock {
  return fixedClock(DEMO_TODAY);
}

export async function loadForwardSnapshot(tenantId: string): Promise<MetricsSnapshot> {
  return withTenant(getAppDb(), tenantId, (tx) => loadMetricsSnapshot(tx, tenantId));
}

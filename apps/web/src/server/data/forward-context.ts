import "server-only";
import { loadMetricsSnapshot, withTenant, DEMO_TODAY } from "@95forward/db";
import { fixedClock, getEnv, type Clock, type MetricsSnapshot } from "@95forward/shared";
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

/**
 * The app's clock. Configurable, and defaulted to the seed's anchor.
 *
 * `DEMO_TODAY` in the environment wins; the compiled-in anchor is the fallback, so local
 * development and the test suite need no configuration. Before D1 there was no configuration path
 * at all — the constant worked, but an operator reading the deploy spec could not see what day the
 * demo thought it was, and a deployed environment that wanted a different anchor had to change
 * source.
 *
 * Read once per call and threaded through the EXISTING provider, deliberately — a second clock
 * would be a second answer to "what day is it", which is the whole thing this seam exists to
 * prevent. `getEnv()` validates the format, so a malformed value fails loudly at boot rather than
 * falling back to wall time.
 */
export function demoClock(): Clock {
  const configured = getEnv().DEMO_TODAY;
  if (!configured) return fixedClock(DEMO_TODAY);
  // Midday UTC, matching DEMO_TODAY: a calendar day rendered with `timeZone: "UTC"` then displays
  // as the same date wherever the server sits.
  return fixedClock(new Date(`${configured}T12:00:00.000Z`));
}

export async function loadForwardSnapshot(tenantId: string): Promise<MetricsSnapshot> {
  return withTenant(getAppDb(), tenantId, (tx) => loadMetricsSnapshot(tx, tenantId));
}

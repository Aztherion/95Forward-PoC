import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getScorecardPollState } from "@/server/data/scorecards";

export const dynamic = "force-dynamic";

/**
 * What I32 polls while the pipeline runs: queued -> classifying -> scoring -> ready | failed.
 *
 * 404 — NOT 403 — when the caller may not see it, and the SAME 404 when it does not exist. A 403
 * would confirm that a scorecard with this id exists and belongs to a colleague, which is exactly
 * the fact a rep must not be able to probe for about a peer. The visibility rule itself lives in
 * one function in @95forward/db; this route only carries the authenticated user into it.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await context.params;
  const state = await getScorecardPollState(
    { id: user.id, tenantId: user.tenantId, name: user.name },
    id,
  );
  if (state === null) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    scorecardId: id,
    status: state.status,
    failureReason: state.failureReason,
  });
}

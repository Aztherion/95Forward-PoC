"use server";

import type { MetricsOverrides } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { computeWhatIf, type WhatIfResultView } from "@/server/data/what-if";

/**
 * Recompute a hypothesis. THE ONLY SERVER CALL THE SANDBOX MAKES, and it writes nothing.
 *
 * Deliberately alone in this file. Every other action module in the app mixes reads and writes,
 * and `no-write-path.test.ts` asserts that the what-if surface imports from exactly this one —
 * so a future refactor that reaches for `editGridCellAction` from the sandbox fails a test rather
 * than quietly turning a hypothesis into a record.
 *
 * There is deliberately no `revalidatePath` either: a hypothesis has no effect on any cached
 * route, and revalidating would be the first step towards behaving as though it did.
 */
export async function computeWhatIfAction(input: {
  readonly rep: string;
  readonly initiative: string;
  readonly overrides: MetricsOverrides;
}): Promise<{ ok: true; result: WhatIfResultView } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    const result = await computeWhatIf(
      user.tenantId,
      user.id,
      { rep: input.rep, initiative: input.initiative },
      input.overrides,
    );
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The what-if could not be computed",
    };
  }
}

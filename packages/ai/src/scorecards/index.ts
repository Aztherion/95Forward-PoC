import type { Env } from "@95forward/shared";
import type { Providers } from "../types";
import { DeterministicMeetingDecider } from "./mock-decider";
import { ModelMeetingDecider } from "./model-decider";
import type { MeetingDecider } from "./types";

export * from "./types";
export * from "./prompts";
export * from "./model-decider";
export * from "./mock-decider";
export * from "./fixtures";

/**
 * Pick the decider, the same way I28 picks its drafter: on AI_MODE.
 *
 * `mock` is the default everywhere — local dev, CI, the whole Playwright suite — and reaches no
 * network and needs no key. `live` is opt-in and runs the real calls.
 *
 * Nothing above this line knows which model is behind the live path. That is the seam the
 * decision-model wrapper will slot into later.
 */
export function createMeetingDecider(
  env: Pick<Env, "AI_MODE">,
  providers: Pick<Providers, "model">,
): MeetingDecider {
  if (env.AI_MODE === "live") {
    return new ModelMeetingDecider({ model: providers.model });
  }
  return new DeterministicMeetingDecider();
}

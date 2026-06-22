// Research-job lifecycle (Initiative 11), reusing the DB discovery_status enum. The worker owns the
// "queued" through "ready" leg; the proposal approve/dismiss flow owns the final "reviewed" leg.
// Transitions are forward-only by one step and "reviewed" is terminal: skips and backward moves are
// rejected. ALLOWED_TRANSITIONS is the single source of truth enforced by the helpers below.
export type JobState = "queued" | "researching" | "ready" | "reviewed";

export const JOB_STATES: readonly JobState[] = ["queued", "researching", "ready", "reviewed"];

const ALLOWED_TRANSITIONS: Record<JobState, readonly JobState[]> = {
  queued: ["researching"],
  researching: ["ready"],
  ready: ["reviewed"],
  reviewed: [],
};

export function canTransition(from: JobState, to: JobState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(state: JobState): boolean {
  return ALLOWED_TRANSITIONS[state].length === 0;
}

// Throws on an illegal transition so a handler bug surfaces loudly rather than silently corrupting
// the lifecycle. Callers that need a soft check use canTransition. Note: the research handler does
// not call this — it enforces transitions with an idempotent SQL compare-and-swap that deliberately
// re-allows researching -> researching for crash recovery. This module is the authoritative spec of
// the lifecycle and is exercised by the unit tests.
export function assertTransition(from: JobState, to: JobState): void {
  if (!canTransition(from, to)) {
    throw new Error(`research job: illegal transition ${from} -> ${to}`);
  }
}

import type { HeartbeatStatus } from "@/components/ds";

export const FOLLOW_UP_WINDOW_MS = 24 * 60 * 60 * 1000;

// The 24-hour SLA clock: a follow-up is due 24h after the debrief that triggered it.
export function followUpDueAt(from: Date): Date {
  return new Date(from.getTime() + FOLLOW_UP_WINDOW_MS);
}

// The cadence heartbeat's status from a follow-up's due time. Overdue once the window has passed;
// due-soon inside the final 6 hours; on-track otherwise. Drives the pulse color, not the data.
export function heartbeatStatus(dueAt: Date, now: Date = new Date()): HeartbeatStatus {
  const msLeft = dueAt.getTime() - now.getTime();
  if (msLeft <= 0) return "overdue";
  if (msLeft <= 6 * 60 * 60 * 1000) return "due-soon";
  return "on-track";
}

export function followUpLabel(dueAt: Date, now: Date = new Date()): string {
  const msLeft = dueAt.getTime() - now.getTime();
  if (msLeft <= 0) {
    const hoursOver = Math.max(1, Math.round(-msLeft / (60 * 60 * 1000)));
    return hoursOver < 24
      ? `Overdue by ${hoursOver}h`
      : `Overdue by ${Math.round(hoursOver / 24)}d`;
  }
  const hoursLeft = Math.max(1, Math.round(msLeft / (60 * 60 * 1000)));
  return hoursLeft < 24 ? `Due in ${hoursLeft}h` : `Due in ${Math.round(hoursLeft / 24)}d`;
}

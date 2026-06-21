import { MEMBERSHIP_STATUSES } from "@95forward/shared";
import { titleCaseFromSnake } from "./format";
import type { BadgeTone } from "@/components/ds";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function membershipStatusLabel(status: string | null | undefined): string {
  if (!status) return "Active";
  return titleCaseFromSnake(status);
}

export function membershipStatusTone(status: string | null | undefined): BadgeTone {
  switch (status) {
    case "active":
      return "success";
    case "lapsed":
      return "attention";
    case "cancelled":
      return "unknown";
    case "pending":
      return "info";
    default:
      return "neutral";
  }
}

export const MEMBERSHIP_STATUS_OPTIONS = MEMBERSHIP_STATUSES.map((status) => ({
  value: status,
  label: titleCaseFromSnake(status),
}));

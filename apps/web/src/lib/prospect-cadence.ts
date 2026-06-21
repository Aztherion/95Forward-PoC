import type { QpiResult } from "@95forward/shared";

export type ProspectStatus = "research" | "cultivation" | "solicitation" | "stewardship" | "active";

const STATUS_LABELS: Record<ProspectStatus, string> = {
  research: "Research stage",
  cultivation: "Cultivating",
  solicitation: "Solicitation",
  stewardship: "Stewardship",
  active: "Active",
};

export function prospectStatusLabel(status: ProspectStatus): string {
  return STATUS_LABELS[status] ?? "Research stage";
}

// The cadence string surfaces "where this relationship stands" in one phrase. A logged contact wins
// (it is the freshest signal); otherwise we fall back to the stage. "No contact yet" is an honorable
// invitation, never an error.
export function deriveCadence(
  status: ProspectStatus,
  lastContactAt: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (lastContactAt) {
    const then = lastContactAt instanceof Date ? lastContactAt : new Date(lastContactAt);
    if (!Number.isNaN(then.getTime())) {
      const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000));
      if (days === 0) return "Last contact today";
      if (days === 1) return "Last contact 1d ago";
      return `Last contact ${days}d ago`;
    }
  }
  if (status === "research") return "Research stage";
  return "No contact yet";
}

export interface NextMove {
  headline: string;
  why: string;
}

// The next move is derived purely from the QPI band and relationship stage — go > research gaps >
// strong > open > nurture — so the surfaced action is always concrete and never fabricated.
export function deriveNextMove(
  qpi: QpiResult,
  status: ProspectStatus,
  lastContactAt: Date | string | null | undefined,
): NextMove {
  const hasContact = Boolean(lastContactAt);

  if (qpi.band === "go") {
    return {
      headline: "Plan the visit",
      why: "QPI 90+ — go see them today. The window is open.",
    };
  }

  if (qpi.unknownCount > 0) {
    return {
      headline: "Fill the research gaps",
      why: `${qpi.unknownCount} ${qpi.unknownCount === 1 ? "dimension is" : "dimensions are"} unknown — add what you know to sharpen the score.`,
    };
  }

  if (qpi.band === "strong") {
    return {
      headline: "Plan the visit",
      why: "Strong score — worth a visit. Build the relationship toward an ask.",
    };
  }

  if (status === "research" || !hasContact) {
    return {
      headline: "Open the relationship",
      why: "Early stage — make first contact and learn what matters to them.",
    };
  }

  return {
    headline: "Keep nurturing",
    why: "Building — stay in cadence and deepen the relationship.",
  };
}

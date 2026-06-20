export type RetentionBucket = "new" | "returning" | "lapsed";

export interface DonorYearActivity {
  constituentId: string;
  firstGiftYear: number;
  gaveThisYear: boolean;
}

export interface RetentionBreakdown {
  newCount: number;
  returningCount: number;
  lapsedCount: number;
  totalDonors: number;
  activeDonors: number;
  retentionRatePercent: number;
}

export function classifyDonor(donor: DonorYearActivity, currentYear: number): RetentionBucket {
  if (donor.firstGiftYear === currentYear) return "new";
  if (donor.gaveThisYear) return "returning";
  return "lapsed";
}

export function summarizeRetention(
  donors: readonly DonorYearActivity[],
  currentYear: number,
): RetentionBreakdown {
  let newCount = 0;
  let returningCount = 0;
  let lapsedCount = 0;
  for (const donor of donors) {
    const bucket = classifyDonor(donor, currentYear);
    if (bucket === "new") newCount += 1;
    else if (bucket === "returning") returningCount += 1;
    else lapsedCount += 1;
  }
  const totalDonors = donors.length;
  const activeDonors = newCount + returningCount;
  const priorDonors = returningCount + lapsedCount;
  const retentionRatePercent =
    priorDonors === 0 ? 0 : Math.round((returningCount / priorDonors) * 100);
  return {
    newCount,
    returningCount,
    lapsedCount,
    totalDonors,
    activeDonors,
    retentionRatePercent,
  };
}

export interface GoalProgress {
  raisedCents: number;
  goalCents: number;
  percentToGoal: number;
  remainingCents: number;
  metGoal: boolean;
}

export function computeGoalProgress(raisedCents: number, goalCents: number): GoalProgress {
  const safeRaised = raisedCents < 0 ? 0 : raisedCents;
  if (goalCents <= 0) {
    return {
      raisedCents: safeRaised,
      goalCents: 0,
      percentToGoal: 0,
      remainingCents: 0,
      metGoal: safeRaised > 0,
    };
  }
  const ratio = safeRaised / goalCents;
  const percentToGoal = Math.round(ratio * 100);
  const remainingCents = Math.max(goalCents - safeRaised, 0);
  return {
    raisedCents: safeRaised,
    goalCents,
    percentToGoal,
    remainingCents,
    metGoal: safeRaised >= goalCents,
  };
}

export function progressBarWidthPercent(percentToGoal: number): number {
  if (percentToGoal < 0) return 0;
  if (percentToGoal > 100) return 100;
  return percentToGoal;
}

export interface RankedAmount {
  id: string;
  name: string;
  amountCents: number;
}

export function topByAmount<T extends RankedAmount>(items: readonly T[], limit: number): T[] {
  return [...items].sort((a, b) => b.amountCents - a.amountCents).slice(0, Math.max(limit, 0));
}

export function maxAmount(items: readonly RankedAmount[]): number {
  let max = 0;
  for (const item of items) {
    if (item.amountCents > max) max = item.amountCents;
  }
  return max;
}

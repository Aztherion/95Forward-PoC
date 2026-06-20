export interface EventFeeLike {
  status: string | null;
  feeAmountCents: number | null;
}

export interface EventGiftLike {
  amountCents: number;
}

export interface EventRevenue {
  registrationFeesCents: number;
  giftRevenueCents: number;
  totalCents: number;
  registrationCount: number;
}

const CANCELLED_STATUS = "cancelled";

export function sumRegistrationFees(registrations: readonly EventFeeLike[]): number {
  return registrations.reduce((sum, registration) => {
    if (registration.status === CANCELLED_STATUS) return sum;
    return sum + (registration.feeAmountCents ?? 0);
  }, 0);
}

export function sumGiftRevenue(gifts: readonly EventGiftLike[]): number {
  return gifts.reduce((sum, gift) => sum + gift.amountCents, 0);
}

export function computeEventRevenue(
  registrations: readonly EventFeeLike[],
  gifts: readonly EventGiftLike[],
): EventRevenue {
  const registrationFeesCents = sumRegistrationFees(registrations);
  const giftRevenueCents = sumGiftRevenue(gifts);
  const registrationCount = registrations.filter(
    (registration) => registration.status !== CANCELLED_STATUS,
  ).length;
  return {
    registrationFeesCents,
    giftRevenueCents,
    totalCents: registrationFeesCents + giftRevenueCents,
    registrationCount,
  };
}

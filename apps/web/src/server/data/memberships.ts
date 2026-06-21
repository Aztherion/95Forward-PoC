import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { constituents, gifts, membershipTiers, memberships, withTenant } from "@95forward/db";
import type { MembershipInput, MembershipTierInput } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { classifyRenewal, nextRenewalDate } from "@/lib/membership-renewals";
import { summarizeWavemaker, type RecurringGiftLike } from "@/lib/wavemaker";

export interface MembershipListRow {
  id: string;
  constituentId: string;
  constituentName: string;
  tierId: string;
  tierName: string;
  status: string | null;
  startDate: string | null;
  renewalDate: string | null;
}

export async function getMembersList(tenantId: string): Promise<MembershipListRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    return tx
      .select({
        id: memberships.id,
        constituentId: memberships.constituentId,
        constituentName: constituents.displayName,
        tierId: memberships.tierId,
        tierName: membershipTiers.name,
        status: memberships.status,
        startDate: memberships.startDate,
        renewalDate: memberships.renewalDate,
      })
      .from(memberships)
      .innerJoin(constituents, eq(memberships.constituentId, constituents.id))
      .innerJoin(membershipTiers, eq(memberships.tierId, membershipTiers.id))
      .orderBy(asc(constituents.displayName));
  });
}

export interface MembershipDetail {
  id: string;
  constituentId: string;
  constituentName: string;
  tierId: string;
  tierName: string;
  tierAmountCents: number | null;
  tierLevel: number | null;
  status: string | null;
  startDate: string | null;
  renewalDate: string | null;
  lastRenewedOn: string | null;
}

export async function getMembershipDetail(
  tenantId: string,
  id: string,
): Promise<MembershipDetail | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: memberships.id,
        constituentId: memberships.constituentId,
        constituentName: constituents.displayName,
        tierId: memberships.tierId,
        tierName: membershipTiers.name,
        tierAmountCents: membershipTiers.amountCents,
        tierLevel: membershipTiers.level,
        status: memberships.status,
        startDate: memberships.startDate,
        renewalDate: memberships.renewalDate,
        lastRenewedOn: memberships.lastRenewedOn,
      })
      .from(memberships)
      .innerJoin(constituents, eq(memberships.constituentId, constituents.id))
      .innerJoin(membershipTiers, eq(memberships.tierId, membershipTiers.id))
      .where(eq(memberships.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

function membershipValues(input: MembershipInput) {
  return {
    constituentId: input.constituentId,
    tierId: input.tierId,
    status: input.status,
    startDate: input.startDate ?? null,
    renewalDate: input.renewalDate ?? null,
  };
}

export async function createMembership(tenantId: string, input: MembershipInput): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(memberships)
      .values({ tenantId, ...membershipValues(input) })
      .returning({ id: memberships.id });
    const row = rows[0];
    if (!row) throw new Error("createMembership: insert returned no rows");
    return row.id;
  });
}

export async function updateMembership(
  tenantId: string,
  id: string,
  input: MembershipInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.update(memberships).set(membershipValues(input)).where(eq(memberships.id, id));
  });
}

export async function deleteMembership(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(memberships).where(eq(memberships.id, id));
  });
}

export async function renewMembership(tenantId: string, id: string, today: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({ renewalDate: memberships.renewalDate })
      .from(memberships)
      .where(eq(memberships.id, id))
      .limit(1);
    const current = rows[0];
    if (!current) return;

    await tx
      .update(memberships)
      .set({
        status: "active",
        lastRenewedOn: today,
        renewalDate: nextRenewalDate(current.renewalDate, today),
      })
      .where(eq(memberships.id, id));
  });
}

export interface TierListRow {
  id: string;
  name: string;
  level: number | null;
  amountCents: number | null;
  benefits: string | null;
  memberCount: number;
}

export async function getTiersList(tenantId: string): Promise<TierListRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    return tx
      .select({
        id: membershipTiers.id,
        name: membershipTiers.name,
        level: membershipTiers.level,
        amountCents: membershipTiers.amountCents,
        benefits: membershipTiers.benefits,
        memberCount: sql<number>`(
          select count(*)::int from ${memberships}
          where ${memberships.tierId} = ${membershipTiers.id}
        )`,
      })
      .from(membershipTiers)
      .orderBy(asc(membershipTiers.level), asc(membershipTiers.name));
  });
}

export interface TierDetail {
  id: string;
  name: string;
  level: number | null;
  amountCents: number | null;
  benefits: string | null;
}

export async function getTierDetail(tenantId: string, id: string): Promise<TierDetail | null> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: membershipTiers.id,
        name: membershipTiers.name,
        level: membershipTiers.level,
        amountCents: membershipTiers.amountCents,
        benefits: membershipTiers.benefits,
      })
      .from(membershipTiers)
      .where(eq(membershipTiers.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

function tierValues(input: MembershipTierInput) {
  return {
    name: input.name,
    level: input.level ?? null,
    amountCents: input.amountCents ?? null,
    benefits: input.benefits ?? null,
  };
}

export async function createTier(tenantId: string, input: MembershipTierInput): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(membershipTiers)
      .values({ tenantId, ...tierValues(input) })
      .returning({ id: membershipTiers.id });
    const row = rows[0];
    if (!row) throw new Error("createTier: insert returned no rows");
    return row.id;
  });
}

export async function updateTier(
  tenantId: string,
  id: string,
  input: MembershipTierInput,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.update(membershipTiers).set(tierValues(input)).where(eq(membershipTiers.id, id));
  });
}

export async function deleteTier(tenantId: string, id: string): Promise<void> {
  await withTenant(getAppDb(), tenantId, async (tx) => {
    await tx.delete(membershipTiers).where(eq(membershipTiers.id, id));
  });
}

export interface RenewalRow extends MembershipListRow {
  classification: "upcoming" | "lapsed";
}

export interface RenewalsResult {
  upcoming: RenewalRow[];
  lapsed: RenewalRow[];
}

export async function getRenewals(tenantId: string, today: string): Promise<RenewalsResult> {
  const rows = await getMembersList(tenantId);

  const upcoming: RenewalRow[] = [];
  const lapsed: RenewalRow[] = [];

  for (const row of rows) {
    const classification = classifyRenewal(row.renewalDate, row.status, today);
    if (classification === "upcoming") {
      upcoming.push({ ...row, classification });
    } else if (classification === "lapsed") {
      lapsed.push({ ...row, classification });
    }
  }

  upcoming.sort((a, b) => (a.renewalDate ?? "").localeCompare(b.renewalDate ?? ""));
  lapsed.sort((a, b) => (b.renewalDate ?? "").localeCompare(a.renewalDate ?? ""));

  return { upcoming, lapsed };
}

export interface WavemakerSupporterRow {
  constituentId: string;
  constituentName: string;
  monthlyAmountCents: number;
  tenureMonths: number;
  totalGivenCents: number;
  recurringGiftCount: number;
}

export async function getWavemakerSupporters(
  tenantId: string,
  today: string,
): Promise<WavemakerSupporterRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const recurringGivers = await tx
      .selectDistinct({ constituentId: gifts.constituentId })
      .from(gifts)
      .where(eq(gifts.giftType, "recurring"));

    const flagged = await tx
      .select({ id: constituents.id })
      .from(constituents)
      .where(eq(constituents.wavemakerMonthly, true));

    const supporterIds = new Set<string>();
    for (const row of recurringGivers) supporterIds.add(row.constituentId);
    for (const row of flagged) supporterIds.add(row.id);

    if (supporterIds.size === 0) return [];

    const ids = [...supporterIds];

    const nameRows = await tx
      .select({ id: constituents.id, name: constituents.displayName })
      .from(constituents)
      .where(inArray(constituents.id, ids));
    const names = new Map(nameRows.map((row) => [row.id, row.name]));

    const giftRows = await tx
      .select({
        constituentId: gifts.constituentId,
        amountCents: gifts.amountCents,
        giftDate: gifts.giftDate,
      })
      .from(gifts)
      .where(and(eq(gifts.giftType, "recurring"), inArray(gifts.constituentId, ids)))
      .orderBy(desc(gifts.giftDate));

    const byConstituent = new Map<string, RecurringGiftLike[]>();
    for (const row of giftRows) {
      const list = byConstituent.get(row.constituentId) ?? [];
      list.push({ amountCents: row.amountCents, giftDate: row.giftDate });
      byConstituent.set(row.constituentId, list);
    }

    const supporters: WavemakerSupporterRow[] = ids.map((id) => {
      const summary = summarizeWavemaker(byConstituent.get(id) ?? [], today);
      return {
        constituentId: id,
        constituentName: names.get(id) ?? "Unknown",
        monthlyAmountCents: summary.monthlyAmountCents,
        tenureMonths: summary.tenureMonths,
        totalGivenCents: summary.totalGivenCents,
        recurringGiftCount: summary.recurringGiftCount,
      };
    });

    supporters.sort((a, b) => b.monthlyAmountCents - a.monthlyAmountCents);
    return supporters;
  });
}

export interface ConstituentMembershipRow {
  id: string;
  tierId: string;
  tierName: string;
  status: string | null;
  startDate: string | null;
  renewalDate: string | null;
  lastRenewedOn: string | null;
}

export async function getConstituentMemberships(
  tenantId: string,
  constituentId: string,
): Promise<ConstituentMembershipRow[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    return tx
      .select({
        id: memberships.id,
        tierId: memberships.tierId,
        tierName: membershipTiers.name,
        status: memberships.status,
        startDate: memberships.startDate,
        renewalDate: memberships.renewalDate,
        lastRenewedOn: memberships.lastRenewedOn,
      })
      .from(memberships)
      .innerJoin(membershipTiers, eq(memberships.tierId, membershipTiers.id))
      .where(eq(memberships.constituentId, constituentId))
      .orderBy(desc(memberships.startDate));
  });
}

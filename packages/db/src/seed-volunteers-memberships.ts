import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { constituents } from "./schema/constituents";
import {
  membershipTiers,
  memberships,
  volunteerHours,
  volunteerOpportunities,
} from "./schema/engagement";
import { stableId } from "./seed-records-core";

interface OpportunitySpec {
  key: string;
  name: string;
  startsAt: string | null;
  location: string;
  capacity: number;
  description: string;
}

interface HoursSpec {
  volunteerKey: string;
  opportunityKey: string;
  hours: number;
  loggedDate: string;
}

interface TierSpec {
  key: string;
  name: string;
  level: number;
  amountCents: number;
  benefits: string;
}

interface MembershipSpec {
  constituentKey: string;
  tierKey: string;
  status: string;
  startDate: string;
  /**
   * Renewal date as a day offset from the seed date (negative = already past). Relative so the
   * demo keeps a realistic mix of upcoming and lapsed renewals whenever it is seeded; absolute
   * dates silently drain the "next 60 days" list as wall-clock time passes them.
   */
  renewalInDays: number;
  /** Renewed once before, one year prior to the renewal date. */
  previouslyRenewed: boolean;
}

const VOLUNTEER_KEYS = [
  "lin",
  "bradley",
  "webb",
  "vega",
  "bello",
  "whitfield",
  "generic-10",
  "generic-15",
  "generic-20",
  "generic-12",
];

const OPPORTUNITIES: OpportunitySpec[] = [
  {
    key: "wwd-booth",
    name: "World Water Day Booth",
    startsAt: "2026-03-22T15:00:00Z",
    location: "Denver, CO",
    capacity: 10,
    description: "Staff the World Water Day awareness booth and engage supporters.",
  },
  {
    key: "gala-setup",
    name: "Year-End Gala Setup",
    startsAt: "2025-12-05T16:00:00Z",
    location: "Denver, CO",
    capacity: 15,
    description: "Set up tables, signage, and registration for the Year-End Gala.",
  },
  {
    key: "office-support",
    name: "Office Support — Data Entry",
    startsAt: null,
    location: "Denver HQ",
    capacity: 5,
    description: "Ongoing administrative and data-entry support at the Denver office.",
  },
  {
    key: "river-cleanup",
    name: "River Cleanup Day",
    startsAt: "2026-04-18T14:00:00Z",
    location: "Boulder, CO",
    capacity: 25,
    description: "Community river cleanup and watershed education event.",
  },
];

const HOURS: HoursSpec[] = [
  { volunteerKey: "lin", opportunityKey: "wwd-booth", hours: 6, loggedDate: "2026-03-22" },
  { volunteerKey: "lin", opportunityKey: "gala-setup", hours: 4, loggedDate: "2025-12-05" },
  { volunteerKey: "bradley", opportunityKey: "gala-setup", hours: 5, loggedDate: "2025-12-05" },
  { volunteerKey: "bradley", opportunityKey: "office-support", hours: 8, loggedDate: "2026-02-10" },
  { volunteerKey: "webb", opportunityKey: "wwd-booth", hours: 5, loggedDate: "2026-03-22" },
  { volunteerKey: "vega", opportunityKey: "river-cleanup", hours: 6, loggedDate: "2026-04-18" },
  { volunteerKey: "vega", opportunityKey: "wwd-booth", hours: 3, loggedDate: "2026-03-22" },
  { volunteerKey: "bello", opportunityKey: "office-support", hours: 4, loggedDate: "2026-05-12" },
  { volunteerKey: "whitfield", opportunityKey: "gala-setup", hours: 6, loggedDate: "2025-12-05" },
  { volunteerKey: "generic-10", opportunityKey: "wwd-booth", hours: 4, loggedDate: "2026-03-22" },
  {
    volunteerKey: "generic-10",
    opportunityKey: "river-cleanup",
    hours: 5,
    loggedDate: "2026-04-18",
  },
  { volunteerKey: "generic-15", opportunityKey: "gala-setup", hours: 7, loggedDate: "2025-12-05" },
  {
    volunteerKey: "generic-20",
    opportunityKey: "river-cleanup",
    hours: 8,
    loggedDate: "2026-04-18",
  },
  {
    volunteerKey: "generic-12",
    opportunityKey: "office-support",
    hours: 10,
    loggedDate: "2026-01-20",
  },
];

const TIERS: TierSpec[] = [
  {
    key: "friend",
    name: "Friend",
    level: 1,
    amountCents: 5_000,
    benefits: "Newsletter and annual impact report.",
  },
  {
    key: "sustainer",
    name: "Sustainer",
    level: 2,
    amountCents: 25_000,
    benefits: "Newsletter and quarterly program briefings.",
  },
  {
    key: "champion",
    name: "Champion",
    level: 3,
    amountCents: 100_000,
    benefits: "All Sustainer benefits plus an annual donor-event invitation.",
  },
  {
    key: "leadership",
    name: "Leadership Circle",
    level: 4,
    amountCents: 500_000,
    benefits: "All Champion benefits plus site-visit opportunities and direct program updates.",
  },
];

const MEMBERSHIPS: MembershipSpec[] = [
  {
    constituentKey: "hallworth",
    tierKey: "leadership",
    status: "active",
    startDate: "2024-01-15",
    renewalInDays: 19,
    previouslyRenewed: true,
  },
  {
    constituentKey: "cordova",
    tierKey: "champion",
    status: "active",
    startDate: "2023-06-01",
    renewalInDays: 345,
    previouslyRenewed: true,
  },
  {
    constituentKey: "whitfield",
    tierKey: "champion",
    status: "active",
    startDate: "2022-03-01",
    renewalInDays: 10,
    previouslyRenewed: true,
  },
  {
    constituentKey: "bradley",
    tierKey: "sustainer",
    status: "active",
    startDate: "2023-09-01",
    renewalInDays: 72,
    previouslyRenewed: true,
  },
  {
    constituentKey: "vega",
    tierKey: "sustainer",
    status: "active",
    startDate: "2024-02-15",
    renewalInDays: -37,
    previouslyRenewed: true,
  },
  {
    constituentKey: "lin",
    tierKey: "friend",
    status: "active",
    startDate: "2025-01-01",
    renewalInDays: 4,
    previouslyRenewed: false,
  },
  {
    constituentKey: "webb",
    tierKey: "friend",
    status: "lapsed",
    startDate: "2022-01-01",
    renewalInDays: -202,
    previouslyRenewed: true,
  },
  {
    constituentKey: "bello",
    tierKey: "friend",
    status: "pending",
    startDate: "2026-06-01",
    renewalInDays: 345,
    previouslyRenewed: false,
  },
  {
    constituentKey: "osgood",
    tierKey: "champion",
    status: "active",
    startDate: "2023-01-01",
    renewalInDays: 55,
    previouslyRenewed: true,
  },
  {
    constituentKey: "generic-10",
    tierKey: "sustainer",
    status: "active",
    startDate: "2024-04-01",
    renewalInDays: -81,
    previouslyRenewed: true,
  },
  {
    constituentKey: "generic-15",
    tierKey: "friend",
    status: "active",
    startDate: "2025-12-01",
    renewalInDays: 163,
    previouslyRenewed: false,
  },
  {
    constituentKey: "cornerstone",
    tierKey: "leadership",
    status: "active",
    startDate: "2024-01-01",
    renewalInDays: 194,
    previouslyRenewed: true,
  },
];

const DAY = 86_400_000;

function isoDateFrom(now: Date, offsetDays: number): string {
  return new Date(now.getTime() + offsetDays * DAY).toISOString().slice(0, 10);
}

function isoOneYearBefore(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

export async function seedVolunteersAndMemberships(
  db: Database,
  tenantId: string,
  now: Date = new Date(),
): Promise<void> {
  for (const key of VOLUNTEER_KEYS) {
    await db
      .update(constituents)
      .set({ volunteer: true })
      .where(eq(constituents.id, stableId(`constituent:${key}`)));
  }

  for (const o of OPPORTUNITIES) {
    await db
      .insert(volunteerOpportunities)
      .values({
        id: stableId(`opportunity:${o.key}`),
        tenantId,
        name: o.name,
        description: o.description,
        startsAt: o.startsAt ? new Date(o.startsAt) : null,
        location: o.location,
        capacity: o.capacity,
      })
      .onConflictDoNothing({ target: volunteerOpportunities.id });
  }

  for (const h of HOURS) {
    await db
      .insert(volunteerHours)
      .values({
        id: stableId(`hours:${h.volunteerKey}:${h.opportunityKey}:${h.loggedDate}`),
        tenantId,
        constituentId: stableId(`constituent:${h.volunteerKey}`),
        opportunityId: stableId(`opportunity:${h.opportunityKey}`),
        hours: h.hours.toFixed(2),
        loggedDate: h.loggedDate,
      })
      .onConflictDoNothing({ target: volunteerHours.id });
  }

  for (const t of TIERS) {
    await db
      .insert(membershipTiers)
      .values({
        id: stableId(`tier:${t.key}`),
        tenantId,
        name: t.name,
        level: t.level,
        amountCents: t.amountCents,
        benefits: t.benefits,
      })
      .onConflictDoNothing({ target: membershipTiers.id });
  }

  for (const m of MEMBERSHIPS) {
    const renewalDate = isoDateFrom(now, m.renewalInDays);
    await db
      .insert(memberships)
      .values({
        id: stableId(`membership:${m.constituentKey}`),
        tenantId,
        constituentId: stableId(`constituent:${m.constituentKey}`),
        tierId: stableId(`tier:${m.tierKey}`),
        status: m.status,
        startDate: m.startDate,
        renewalDate,
        lastRenewedOn: m.previouslyRenewed ? isoOneYearBefore(renewalDate) : null,
      })
      .onConflictDoNothing({ target: memberships.id });
  }
}

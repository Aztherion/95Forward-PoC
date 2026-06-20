import { eq } from "drizzle-orm";
import type { SavedListDefinition } from "@95forward/shared";
import type { Database } from "./client";
import { users } from "./schema/users";
import { gifts } from "./schema/revenue";
import { events, eventRegistrations, marketingMessages, segments } from "./schema/engagement";
import type { giftTypeEnum } from "./schema/enums";
import { stableId } from "./seed-records-core";

type GiftType = (typeof giftTypeEnum.enumValues)[number];

interface SegmentSpec {
  key: string;
  name: string;
  description: string;
  definition: SavedListDefinition;
}

interface CommunicationSpec {
  key: string;
  name: string;
  channel: "email" | "appeal";
  segmentKey: string | null;
  subject: string | null;
  body: string | null;
  status: "draft" | "scheduled" | "sent";
  scheduledAt: string | null;
  sentAt: string | null;
}

interface EventSpec {
  key: string;
  name: string;
  eventType: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  capacity: number | null;
  goalAmountCents: number | null;
  description: string;
}

interface RegistrationSpec {
  eventKey: string;
  constituentKey: string;
  status: "registered" | "waitlisted" | "cancelled";
  attended: boolean;
  guestCount: number;
  feeAmountCents: number;
}

interface EventGiftSpec {
  key: string;
  eventKey: string;
  constituentKey: string;
  amountCents: number;
  giftDate: string;
  giftType: GiftType;
  designation: string;
}

const tag = (name: string): string => stableId(`tag:${name}`);

function buildSegments(danaUserId: string): SegmentSpec[] {
  return [
    {
      key: "lapsed-donors",
      name: "Lapsed Donors",
      description: "Constituents flagged as lapsed, for re-engagement appeals.",
      definition: { filters: [{ field: "tagId", operator: "eq", value: tag("Lapsed") }] },
    },
    {
      key: "wavemakers",
      name: "Wavemakers (Monthly Donors)",
      description: "Active monthly Wavemaker sustainers.",
      definition: { filters: [{ field: "tagId", operator: "eq", value: tag("Wavemaker") }] },
    },
    {
      key: "major-donors",
      name: "Major Donors",
      description: "Constituents tagged as major donors.",
      definition: { filters: [{ field: "tagId", operator: "eq", value: tag("Major donor") }] },
    },
    {
      key: "legacy-society",
      name: "Legacy Society",
      description: "Planned-giving and legacy constituents.",
      definition: { filters: [{ field: "tagId", operator: "eq", value: tag("Legacy") }] },
    },
    {
      key: "foundations",
      name: "Foundations & Trusts",
      description: "All foundation-type constituents.",
      definition: { filters: [{ field: "type", operator: "eq", value: "foundation" }] },
    },
    {
      key: "dana-portfolio",
      name: "Dana's Portfolio",
      description: "Constituents assigned to Dana Reese.",
      definition: { filters: [{ field: "assignedUserId", operator: "eq", value: danaUserId }] },
    },
  ];
}

const COMMUNICATIONS: CommunicationSpec[] = [
  {
    key: "wwd-2026-appeal",
    name: "World Water Day 2026 Appeal",
    channel: "appeal",
    segmentKey: "major-donors",
    subject: "Bring clean water this World Water Day",
    body: "Dear friend, this World Water Day your gift brings lasting water access to families through Everyone Forever. Will you renew your support?",
    status: "sent",
    scheduledAt: null,
    sentAt: "2026-03-01T15:00:00Z",
  },
  {
    key: "wavemaker-welcome",
    name: "Wavemaker Welcome Series",
    channel: "email",
    segmentKey: "wavemakers",
    subject: "Welcome to the Wavemakers",
    body: "Thank you for becoming a monthly Wavemaker. Your steady support keeps clean water flowing, every single month.",
    status: "sent",
    scheduledAt: null,
    sentAt: "2025-09-15T16:00:00Z",
  },
  {
    key: "year-end-2025-email",
    name: "Year-End 2025 Email",
    channel: "email",
    segmentKey: "major-donors",
    subject: "Your year-end impact",
    body: "As 2025 closes, see how your partnership reached more families with safe water and sanitation across our program countries.",
    status: "sent",
    scheduledAt: null,
    sentAt: "2025-12-10T17:00:00Z",
  },
  {
    key: "spring-2026-appeal",
    name: "Spring 2026 Direct-Mail Appeal",
    channel: "appeal",
    segmentKey: "lapsed-donors",
    subject: "We miss you — renew your impact",
    body: "It has been a while. Your past generosity changed lives; please consider renewing your commitment to Everyone Forever.",
    status: "scheduled",
    scheduledAt: "2026-04-15T14:00:00Z",
    sentAt: null,
  },
  {
    key: "legacy-stewardship",
    name: "Legacy Society Stewardship Note",
    channel: "email",
    segmentKey: "legacy-society",
    subject: "The Forever Promise",
    body: "A heartfelt thank-you to our Legacy Society members for your enduring commitment to clean water for generations to come.",
    status: "draft",
    scheduledAt: null,
    sentAt: null,
  },
  {
    key: "wwd-save-the-date",
    name: "World Water Day Save-the-Date",
    channel: "email",
    segmentKey: null,
    subject: "Save the date: World Water Day Celebration",
    body: "Join us on March 22 to celebrate World Water Day with the communities and partners you make possible.",
    status: "draft",
    scheduledAt: null,
    sentAt: null,
  },
];

const EVENTS: EventSpec[] = [
  {
    key: "year-end-gala-2025",
    name: "Year-End Gala 2025",
    eventType: "gala",
    startsAt: "2025-12-05T18:00:00Z",
    endsAt: "2025-12-05T22:00:00Z",
    location: "Denver, CO",
    capacity: 250,
    goalAmountCents: 20_000_000,
    description:
      "Our flagship year-end celebration honoring donors who bring Everyone Forever to life.",
  },
  {
    key: "donor-breakfast-2026",
    name: "Denver Donor Breakfast",
    eventType: "breakfast",
    startsAt: "2026-03-22T08:00:00Z",
    endsAt: null,
    location: "Denver, CO",
    capacity: 80,
    goalAmountCents: 5_000_000,
    description: "An intimate morning briefing on our Bolivia and Uganda water programs.",
  },
  {
    key: "wwd-celebration-2026",
    name: "World Water Day Celebration 2026",
    eventType: "gala",
    startsAt: "2026-03-22T18:00:00Z",
    endsAt: "2026-03-22T22:00:00Z",
    location: "Chicago, IL",
    capacity: 200,
    goalAmountCents: 15_000_000,
    description:
      "A World Water Day celebration with program partners, supporters, and community leaders.",
  },
  {
    key: "spring-luncheon-2026",
    name: "Spring Stewardship Luncheon",
    eventType: "luncheon",
    startsAt: "2026-05-14T12:00:00Z",
    endsAt: null,
    location: "San Francisco, CA",
    capacity: 60,
    goalAmountCents: 2_500_000,
    description: "A spring stewardship luncheon for the Women & Water giving network.",
  },
  {
    key: "bolivia-site-visit-2026",
    name: "Bolivia Water Project Site Visit",
    eventType: "site_visit",
    startsAt: "2026-07-10T13:00:00Z",
    endsAt: "2026-07-14T22:00:00Z",
    location: "Cochabamba, Bolivia",
    capacity: 12,
    goalAmountCents: null,
    description: "A donor delegation visiting Everyone Forever water systems in Bolivia.",
  },
];

const GALA_FEE = 25_000;
const WWD_FEE = 15_000;
const LUNCHEON_FEE = 10_000;

const REGISTRATIONS: RegistrationSpec[] = [
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "hallworth",
    status: "registered",
    attended: true,
    guestCount: 1,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "cordova",
    status: "registered",
    attended: true,
    guestCount: 1,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "osgood",
    status: "registered",
    attended: true,
    guestCount: 0,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "whitfield",
    status: "registered",
    attended: true,
    guestCount: 1,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "bradley",
    status: "registered",
    attended: true,
    guestCount: 1,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "lin",
    status: "registered",
    attended: true,
    guestCount: 0,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "webb",
    status: "registered",
    attended: true,
    guestCount: 0,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "vega",
    status: "registered",
    attended: true,
    guestCount: 1,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "bello",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "generic-16",
    status: "registered",
    attended: true,
    guestCount: 0,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "generic-17",
    status: "registered",
    attended: true,
    guestCount: 1,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "generic-19",
    status: "registered",
    attended: true,
    guestCount: 0,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "generic-20",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "generic-5",
    status: "registered",
    attended: true,
    guestCount: 0,
    feeAmountCents: GALA_FEE,
  },
  {
    eventKey: "year-end-gala-2025",
    constituentKey: "generic-22",
    status: "cancelled",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },

  {
    eventKey: "donor-breakfast-2026",
    constituentKey: "bradley",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "donor-breakfast-2026",
    constituentKey: "whitfield",
    status: "registered",
    attended: false,
    guestCount: 1,
    feeAmountCents: 0,
  },
  {
    eventKey: "donor-breakfast-2026",
    constituentKey: "vega",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "donor-breakfast-2026",
    constituentKey: "lin",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "donor-breakfast-2026",
    constituentKey: "webb",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "donor-breakfast-2026",
    constituentKey: "generic-18",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "donor-breakfast-2026",
    constituentKey: "generic-19",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "donor-breakfast-2026",
    constituentKey: "generic-21",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },

  {
    eventKey: "wwd-celebration-2026",
    constituentKey: "cordova",
    status: "registered",
    attended: false,
    guestCount: 1,
    feeAmountCents: WWD_FEE,
  },
  {
    eventKey: "wwd-celebration-2026",
    constituentKey: "northwater",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: WWD_FEE,
  },
  {
    eventKey: "wwd-celebration-2026",
    constituentKey: "osgood",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: WWD_FEE,
  },
  {
    eventKey: "wwd-celebration-2026",
    constituentKey: "hallworth",
    status: "registered",
    attended: false,
    guestCount: 1,
    feeAmountCents: WWD_FEE,
  },
  {
    eventKey: "wwd-celebration-2026",
    constituentKey: "generic-16",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: WWD_FEE,
  },
  {
    eventKey: "wwd-celebration-2026",
    constituentKey: "generic-17",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: WWD_FEE,
  },
  {
    eventKey: "wwd-celebration-2026",
    constituentKey: "generic-20",
    status: "waitlisted",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "wwd-celebration-2026",
    constituentKey: "generic-22",
    status: "waitlisted",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },

  {
    eventKey: "spring-luncheon-2026",
    constituentKey: "vega",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: LUNCHEON_FEE,
  },
  {
    eventKey: "spring-luncheon-2026",
    constituentKey: "bello",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: LUNCHEON_FEE,
  },
  {
    eventKey: "spring-luncheon-2026",
    constituentKey: "whitfield",
    status: "registered",
    attended: false,
    guestCount: 1,
    feeAmountCents: LUNCHEON_FEE,
  },
  {
    eventKey: "spring-luncheon-2026",
    constituentKey: "generic-19",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: LUNCHEON_FEE,
  },
  {
    eventKey: "spring-luncheon-2026",
    constituentKey: "generic-22",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: LUNCHEON_FEE,
  },

  {
    eventKey: "bolivia-site-visit-2026",
    constituentKey: "hallworth",
    status: "registered",
    attended: false,
    guestCount: 1,
    feeAmountCents: 0,
  },
  {
    eventKey: "bolivia-site-visit-2026",
    constituentKey: "cordova",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "bolivia-site-visit-2026",
    constituentKey: "osgood",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "bolivia-site-visit-2026",
    constituentKey: "bradley",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
  {
    eventKey: "bolivia-site-visit-2026",
    constituentKey: "whitfield",
    status: "registered",
    attended: false,
    guestCount: 1,
    feeAmountCents: 0,
  },
  {
    eventKey: "bolivia-site-visit-2026",
    constituentKey: "vega",
    status: "registered",
    attended: false,
    guestCount: 0,
    feeAmountCents: 0,
  },
];

const EVENT_GIFTS: EventGiftSpec[] = [
  {
    key: "gala-2025:cordova",
    eventKey: "year-end-gala-2025",
    constituentKey: "cordova",
    amountCents: 5_000_000,
    giftDate: "2025-12-05",
    giftType: "corporate_grant",
    designation: "Year-End Gala lead sponsor",
  },
  {
    key: "gala-2025:northwater",
    eventKey: "year-end-gala-2025",
    constituentKey: "northwater",
    amountCents: 2_500_000,
    giftDate: "2025-12-05",
    giftType: "corporate_grant",
    designation: "Year-End Gala table sponsor",
  },
  {
    key: "gala-2025:osgood",
    eventKey: "year-end-gala-2025",
    constituentKey: "osgood",
    amountCents: 1_500_000,
    giftDate: "2025-12-05",
    giftType: "corporate_grant",
    designation: "Year-End Gala sponsor",
  },
  {
    key: "gala-2025:whitfield",
    eventKey: "year-end-gala-2025",
    constituentKey: "whitfield",
    amountCents: 1_000_000,
    giftDate: "2025-12-05",
    giftType: "one_time",
    designation: "Year-End Gala gift",
  },
  {
    key: "wwd-2026:cordova",
    eventKey: "wwd-celebration-2026",
    constituentKey: "cordova",
    amountCents: 1_000_000,
    giftDate: "2026-03-22",
    giftType: "corporate_grant",
    designation: "World Water Day Celebration sponsor",
  },
];

export async function seedEngagement(db: Database, tenantId: string): Promise<void> {
  const userRows = await db.query.users.findMany({ where: eq(users.tenantId, tenantId) });
  const dana = userRows.find((u) => u.email === "dana.reese@waterforpeople.org")?.id;
  if (!dana) {
    throw new Error("seedEngagement: expected Dana seed user to exist");
  }

  const everyoneForeverFundId = stableId("fund:everyone-forever");

  for (const s of buildSegments(dana)) {
    await db
      .insert(segments)
      .values({
        id: stableId(`segment:${s.key}`),
        tenantId,
        name: s.name,
        description: s.description,
        definition: s.definition,
      })
      .onConflictDoNothing({ target: segments.id });
  }

  for (const c of COMMUNICATIONS) {
    await db
      .insert(marketingMessages)
      .values({
        id: stableId(`communication:${c.key}`),
        tenantId,
        name: c.name,
        channel: c.channel,
        segmentId: c.segmentKey ? stableId(`segment:${c.segmentKey}`) : null,
        subject: c.subject,
        body: c.body,
        status: c.status,
        scheduledAt: c.scheduledAt ? new Date(c.scheduledAt) : null,
        sentAt: c.sentAt ? new Date(c.sentAt) : null,
      })
      .onConflictDoNothing({ target: marketingMessages.id });
  }

  for (const e of EVENTS) {
    await db
      .insert(events)
      .values({
        id: stableId(`event:${e.key}`),
        tenantId,
        name: e.name,
        eventType: e.eventType,
        startsAt: new Date(e.startsAt),
        endsAt: e.endsAt ? new Date(e.endsAt) : null,
        location: e.location,
        capacity: e.capacity,
        goalAmountCents: e.goalAmountCents,
        description: e.description,
      })
      .onConflictDoNothing({ target: events.id });
  }

  for (const r of REGISTRATIONS) {
    await db
      .insert(eventRegistrations)
      .values({
        id: stableId(`registration:${r.eventKey}:${r.constituentKey}`),
        tenantId,
        eventId: stableId(`event:${r.eventKey}`),
        constituentId: stableId(`constituent:${r.constituentKey}`),
        status: r.status,
        attended: r.attended,
        guestCount: r.guestCount,
        feeAmountCents: r.feeAmountCents,
      })
      .onConflictDoNothing({ target: eventRegistrations.id });
  }

  for (const g of EVENT_GIFTS) {
    await db
      .insert(gifts)
      .values({
        id: stableId(`gift:event:${g.key}`),
        tenantId,
        constituentId: stableId(`constituent:${g.constituentKey}`),
        amountCents: g.amountCents,
        giftDate: g.giftDate,
        fundId: everyoneForeverFundId,
        campaignId: null,
        appealId: null,
        eventId: stableId(`event:${g.eventKey}`),
        giftType: g.giftType,
        designation: g.designation,
        receiptStatus: "receipted",
      })
      .onConflictDoNothing({ target: gifts.id });
  }
}

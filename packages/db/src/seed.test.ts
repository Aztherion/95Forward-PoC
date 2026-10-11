import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNotNull } from "drizzle-orm";
import {
  computeMetrics,
  computeQpi,
  fixedClock,
  goalFor,
  QPI_DEFAULT_TOGGLES,
  QPI_DEFAULT_WEIGHTS,
  registerBuiltInRules,
  registerRankingRules,
  settingsFromCatalogue,
  simulate,
  stageBoard,
  verifyEvidenceQuote,
  type ForwardSettings,
  type MetricScope,
  type MetricsSnapshot,
  type QpiDimension,
} from "@95forward/shared";
import { seed } from "./seed";
import { seedScorecards, SCORECARD_SEED_FACTS } from "./seed-scorecards";
import { DEMO_TODAY } from "./demo-clock";
import { loadMetricsSnapshot } from "./forward-metrics-repo";
import { resolveTenantCatalogue } from "./rules-repo";
import {
  criterionResults,
  meetingTypes,
  meetings,
  scorecardCriteria,
  scorecardCriterionOptions,
  scorecardDefinitions,
  scorecards,
} from "./schema/scorecards";
import { stableId } from "./seed-records-core";
import type { Database } from "./client";
import { connectTestDb, type TestDb } from "./test-support";
import { tenants } from "./schema/tenants";
import { users } from "./schema/users";
import { tenantSettings } from "./schema/config";
import { constituents } from "./schema/constituents";
import {
  knowledgeBase,
  naturalPartners,
  prospects,
  prospectStrategy,
  qpiAssessments,
  relationshipMapEntries,
  researchGaps,
} from "./schema/prospects";
import { asks, followUpTasks, referrals, visits } from "./schema/execution";
import { fundingInitiatives, prospectFundingInitiatives } from "./schema/funding";
import { appeals, campaigns, funds, gifts } from "./schema/revenue";
import { opportunities, proposals } from "./schema/pipeline";
import {
  events,
  eventRegistrations,
  marketingMessages,
  membershipTiers,
  memberships,
  segments,
  volunteerHours,
  volunteerOpportunities,
} from "./schema/engagement";
import { researchJobs } from "./schema/jobs";
import { candidates, discoveryTasks } from "./schema/discovery";
import { copilotProposals } from "./schema/ai";
import {
  forwardOpportunities,
  goals,
  opportunityEvents,
  opportunityMilestones,
} from "./schema/forward";

let handle: TestDb | null = null;
let db: Database;
let tenantId: string;

beforeAll(async () => {
  handle = await connectTestDb();
  if (!handle) {
    return;
  }
  db = handle.db;
  const result = await seed(db);
  await seed(db);
  tenantId = result.tenantId;
});

afterAll(async () => {
  if (handle) {
    await handle.pool.end();
  }
});

describe("seed: Water For People", () => {
  it("creates the Water For People tenant", async () => {
    if (!handle) {
      return;
    }
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, "water-for-people"),
    });
    expect(tenant?.name).toBe("Water For People");
    expect(tenant?.id).toBe(tenantId);
  });

  it("creates exactly the three seed users with correct roles and emails", async () => {
    if (!handle) {
      return;
    }
    const seededUsers = await db.query.users.findMany({
      where: eq(users.tenantId, tenantId),
    });
    const byEmail = new Map(seededUsers.map((u) => [u.email, u]));

    expect(byEmail.get("dana.reese@waterforpeople.org")?.role).toBe("major_gifts_officer");
    expect(byEmail.get("dana.reese@waterforpeople.org")?.name).toBe("Dana Reese");
    expect(byEmail.get("priya.nair@waterforpeople.org")?.role).toBe("gift_officer");
    expect(byEmail.get("priya.nair@waterforpeople.org")?.name).toBe("Priya Nair");
    expect(byEmail.get("ruth.castellanos@waterforpeople.org")?.role).toBe(
      "chief_development_officer",
    );
    expect(byEmail.get("ruth.castellanos@waterforpeople.org")?.name).toBe("Ruth Castellanos");
  });

  it("is idempotent — running twice does not duplicate users", async () => {
    if (!handle) {
      return;
    }
    const danaRows = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.email, "dana.reese@waterforpeople.org")),
    });
    expect(danaRows.length).toBe(1);
  });

  it("seeds tenant_settings with the default QPI weights and toggles", async () => {
    if (!handle) {
      return;
    }
    const settings = await db.query.tenantSettings.findFirst({
      where: eq(tenantSettings.tenantId, tenantId),
    });
    expect(settings).toBeDefined();
    expect(settings?.weightCapacity).toBe(QPI_DEFAULT_WEIGHTS.capacity);
    expect(settings?.weightRelationship).toBe(QPI_DEFAULT_WEIGHTS.relationship);
    expect(settings?.weightTiming).toBe(QPI_DEFAULT_WEIGHTS.timing);
    expect(settings?.weightGiftHistory).toBe(QPI_DEFAULT_WEIGHTS.gift_history);
    expect(settings?.weightPhilanthropy).toBe(QPI_DEFAULT_WEIGHTS.philanthropy);
    expect(settings?.researchPublicSources).toBe(QPI_DEFAULT_TOGGLES.research_public_sources);
    expect(settings?.proposeQpiUpdatesAutomatically).toBe(
      QPI_DEFAULT_TOGGLES.propose_qpi_updates_automatically,
    );
    expect(settings?.draft24hFollowups).toBe(QPI_DEFAULT_TOGGLES.draft_24h_followups);
  });
});

describe("seed: records-core slice", () => {
  it("seeds dozens of constituents", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.constituents.findMany({
      where: eq(constituents.tenantId, tenantId),
    });
    expect(rows.length).toBeGreaterThan(20);
  });

  it("seeds The Hallworth Family Foundation as a foundation with 3 grants summing to $370,000", async () => {
    if (!handle) {
      return;
    }
    const hallworthId = stableId("constituent:hallworth");
    const hallworth = await db.query.constituents.findFirst({
      where: eq(constituents.id, hallworthId),
    });
    expect(hallworth?.displayName).toBe("The Hallworth Family Foundation");
    expect(hallworth?.type).toBe("foundation");

    const hallworthGifts = await db.query.gifts.findMany({
      where: eq(gifts.constituentId, hallworthId),
    });
    expect(hallworthGifts.length).toBe(3);
    const total = hallworthGifts.reduce((sum, g) => sum + g.amountCents, 0);
    expect(total).toBe(37_000_000);
    expect(hallworthGifts.every((g) => g.giftType === "corporate_grant")).toBe(true);
  });

  it("seeds funds, campaigns, and appeals", async () => {
    if (!handle) {
      return;
    }
    const [fundRows, campaignRows, appealRows] = await Promise.all([
      db.query.funds.findMany({ where: eq(funds.tenantId, tenantId) }),
      db.query.campaigns.findMany({ where: eq(campaigns.tenantId, tenantId) }),
      db.query.appeals.findMany({ where: eq(appeals.tenantId, tenantId) }),
    ]);
    expect(fundRows.length).toBeGreaterThanOrEqual(1);
    expect(campaignRows.length).toBeGreaterThanOrEqual(1);
    expect(appealRows.length).toBeGreaterThanOrEqual(1);
  });

  it("has at least one wavemaker monthly donor with recurring gifts", async () => {
    if (!handle) {
      return;
    }
    const wavemakers = await db.query.constituents.findMany({
      where: and(eq(constituents.tenantId, tenantId), eq(constituents.wavemakerMonthly, true)),
    });
    expect(wavemakers.length).toBeGreaterThanOrEqual(1);
    const first = wavemakers[0];
    expect(first).toBeDefined();
    if (!first) {
      return;
    }
    const recurring = await db.query.gifts.findMany({
      where: and(eq(gifts.constituentId, first.id), eq(gifts.giftType, "recurring")),
    });
    expect(recurring.length).toBeGreaterThan(0);
  });

  it("has at least one legacy donor with a planned gift", async () => {
    if (!handle) {
      return;
    }
    const legacyDonors = await db.query.constituents.findMany({
      where: and(eq(constituents.tenantId, tenantId), eq(constituents.legacy, true)),
    });
    expect(legacyDonors.length).toBeGreaterThanOrEqual(1);
    const ids = new Set(legacyDonors.map((c) => c.id));
    const plannedGifts = await db.query.gifts.findMany({
      where: and(eq(gifts.tenantId, tenantId), eq(gifts.giftType, "planned")),
    });
    expect(plannedGifts.some((g) => ids.has(g.constituentId))).toBe(true);
  });

  it("populates host_likelihood on some constituents", async () => {
    if (!handle) {
      return;
    }
    const withLikelihood = await db.query.constituents.findMany({
      where: and(eq(constituents.tenantId, tenantId), isNotNull(constituents.hostLikelihood)),
    });
    expect(withLikelihood.length).toBeGreaterThan(0);
  });

  it("is idempotent — re-seeding does not change constituent or gift counts", async () => {
    if (!handle) {
      return;
    }
    const before = {
      constituents: (
        await db.query.constituents.findMany({ where: eq(constituents.tenantId, tenantId) })
      ).length,
      gifts: (await db.query.gifts.findMany({ where: eq(gifts.tenantId, tenantId) })).length,
    };
    await seed(db);
    const after = {
      constituents: (
        await db.query.constituents.findMany({ where: eq(constituents.tenantId, tenantId) })
      ).length,
      gifts: (await db.query.gifts.findMany({ where: eq(gifts.tenantId, tenantId) })).length,
    };
    expect(after).toEqual(before);
  });
});

describe("seed: major-giving slice", () => {
  it("seeds opportunities across all four stages", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.opportunities.findMany({
      where: eq(opportunities.tenantId, tenantId),
    });
    expect(rows.length).toBeGreaterThanOrEqual(16);
    const stages = new Set(rows.map((r) => r.stage));
    for (const stage of ["identification", "cultivation", "solicitation", "stewardship"]) {
      expect(stages.has(stage as (typeof rows)[number]["stage"])).toBe(true);
    }
  });

  it("gives Hallworth a solicitation-stage opportunity with a large ask owned by Dana", async () => {
    if (!handle) {
      return;
    }
    const hallworthId = stableId("constituent:hallworth");
    const danaUser = await db.query.users.findFirst({
      where: eq(users.email, "dana.reese@waterforpeople.org"),
    });
    const opp = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, stableId("opportunity:hallworth:bolivia")),
    });
    expect(opp).toBeDefined();
    expect(opp?.constituentId).toBe(hallworthId);
    expect(opp?.stage).toBe("solicitation");
    expect(opp?.askAmountCents ?? 0).toBeGreaterThanOrEqual(200_000_000);
    expect(opp?.ownerUserId).toBe(danaUser?.id);
  });

  it("splits opportunity ownership between Dana and Priya", async () => {
    if (!handle) {
      return;
    }
    const [dana, priya] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.email, "dana.reese@waterforpeople.org") }),
      db.query.users.findFirst({ where: eq(users.email, "priya.nair@waterforpeople.org") }),
    ]);
    const rows = await db.query.opportunities.findMany({
      where: eq(opportunities.tenantId, tenantId),
    });
    expect(rows.some((r) => r.ownerUserId === dana?.id)).toBe(true);
    expect(rows.some((r) => r.ownerUserId === priya?.id)).toBe(true);
  });

  it("uses opaque likelihood_pct within the 0-100 range", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.opportunities.findMany({
      where: eq(opportunities.tenantId, tenantId),
    });
    const withLikelihood = rows.filter((r) => r.likelihoodPct !== null);
    expect(withLikelihood.length).toBeGreaterThan(0);
    expect(
      withLikelihood.every((r) => (r.likelihoodPct ?? 0) >= 0 && (r.likelihoodPct ?? 0) <= 100),
    ).toBe(true);
  });

  it("seeds proposals with a spread of statuses", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.proposals.findMany({
      where: eq(proposals.tenantId, tenantId),
    });
    expect(rows.length).toBeGreaterThanOrEqual(10);
    const statuses = new Set(rows.map((r) => r.status));
    expect(statuses.has("submitted")).toBe(true);
    expect(statuses.has("under_review")).toBe(true);
    expect(statuses.has("approved")).toBe(true);
    expect(statuses.has("funded")).toBe(true);
  });

  it("sets goal_amount_cents on all seeded campaigns and appeals", async () => {
    if (!handle) {
      return;
    }
    const [campaignRows, appealRows] = await Promise.all([
      db.query.campaigns.findMany({ where: eq(campaigns.tenantId, tenantId) }),
      db.query.appeals.findMany({ where: eq(appeals.tenantId, tenantId) }),
    ]);
    expect(campaignRows.length).toBeGreaterThan(0);
    expect(appealRows.length).toBeGreaterThan(0);
    expect(campaignRows.every((c) => c.goalAmountCents !== null && c.goalAmountCents > 0)).toBe(
      true,
    );
    expect(appealRows.every((a) => a.goalAmountCents !== null && a.goalAmountCents > 0)).toBe(true);
  });

  it("is idempotent — re-seeding leaves opportunity and proposal counts and goals stable", async () => {
    if (!handle) {
      return;
    }
    const before = {
      opportunities: (
        await db.query.opportunities.findMany({ where: eq(opportunities.tenantId, tenantId) })
      ).length,
      proposals: (await db.query.proposals.findMany({ where: eq(proposals.tenantId, tenantId) }))
        .length,
      campaignGoals: (
        await db.query.campaigns.findMany({ where: eq(campaigns.tenantId, tenantId) })
      ).reduce((sum, c) => sum + (c.goalAmountCents ?? 0), 0),
      appealGoals: (
        await db.query.appeals.findMany({ where: eq(appeals.tenantId, tenantId) })
      ).reduce((sum, a) => sum + (a.goalAmountCents ?? 0), 0),
    };
    await seed(db);
    const after = {
      opportunities: (
        await db.query.opportunities.findMany({ where: eq(opportunities.tenantId, tenantId) })
      ).length,
      proposals: (await db.query.proposals.findMany({ where: eq(proposals.tenantId, tenantId) }))
        .length,
      campaignGoals: (
        await db.query.campaigns.findMany({ where: eq(campaigns.tenantId, tenantId) })
      ).reduce((sum, c) => sum + (c.goalAmountCents ?? 0), 0),
      appealGoals: (
        await db.query.appeals.findMany({ where: eq(appeals.tenantId, tenantId) })
      ).reduce((sum, a) => sum + (a.goalAmountCents ?? 0), 0),
    };
    expect(after).toEqual(before);
  });
});

describe("seed: engagement slice", () => {
  it("seeds segments with constituent-filter definitions", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.segments.findMany({ where: eq(segments.tenantId, tenantId) });
    expect(rows.length).toBeGreaterThanOrEqual(6);
    const majorDonors = rows.find((s) => s.name === "Major Donors");
    expect(majorDonors).toBeDefined();
    expect(majorDonors?.definition).toBeTruthy();
  });

  it("seeds marketing communications across both channels and all statuses", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.marketingMessages.findMany({
      where: eq(marketingMessages.tenantId, tenantId),
    });
    expect(rows.length).toBeGreaterThanOrEqual(6);
    const channels = new Set(rows.map((r) => r.channel));
    expect(channels.has("email")).toBe(true);
    expect(channels.has("appeal")).toBe(true);
    const statuses = new Set(rows.map((r) => r.status));
    expect(statuses.has("draft")).toBe(true);
    expect(statuses.has("scheduled")).toBe(true);
    expect(statuses.has("sent")).toBe(true);
  });

  it("seeds events with types, a goal, and a past gala", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.events.findMany({ where: eq(events.tenantId, tenantId) });
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const gala = rows.find((e) => e.id === stableId("event:year-end-gala-2025"));
    expect(gala?.eventType).toBe("gala");
    expect(gala?.goalAmountCents ?? 0).toBeGreaterThan(0);
  });

  it("seeds registrations with attendance and fees, plus event-linked gift revenue", async () => {
    if (!handle) {
      return;
    }
    const galaId = stableId("event:year-end-gala-2025");
    const regs = await db.query.eventRegistrations.findMany({
      where: eq(eventRegistrations.eventId, galaId),
    });
    expect(regs.length).toBeGreaterThanOrEqual(10);
    expect(regs.some((r) => r.attended)).toBe(true);
    const feeRevenue = regs.reduce((sum, r) => sum + (r.feeAmountCents ?? 0), 0);
    expect(feeRevenue).toBeGreaterThan(0);

    const eventGifts = await db.query.gifts.findMany({
      where: and(eq(gifts.tenantId, tenantId), eq(gifts.eventId, galaId)),
    });
    expect(eventGifts.length).toBeGreaterThanOrEqual(4);
    const giftRevenue = eventGifts.reduce((sum, g) => sum + g.amountCents, 0);
    expect(giftRevenue).toBeGreaterThan(0);
  });

  it("is idempotent — re-seeding leaves engagement counts stable", async () => {
    if (!handle) {
      return;
    }
    const counts = async () => ({
      segments: (await db.query.segments.findMany({ where: eq(segments.tenantId, tenantId) }))
        .length,
      communications: (
        await db.query.marketingMessages.findMany({
          where: eq(marketingMessages.tenantId, tenantId),
        })
      ).length,
      events: (await db.query.events.findMany({ where: eq(events.tenantId, tenantId) })).length,
      registrations: (
        await db.query.eventRegistrations.findMany({
          where: eq(eventRegistrations.tenantId, tenantId),
        })
      ).length,
    });
    const before = await counts();
    await seed(db);
    const after = await counts();
    expect(after).toEqual(before);
  });
});

describe("seed: volunteers & memberships slice", () => {
  it("seeds volunteer opportunities and flags volunteers", async () => {
    if (!handle) {
      return;
    }
    const opps = await db.query.volunteerOpportunities.findMany({
      where: eq(volunteerOpportunities.tenantId, tenantId),
    });
    expect(opps.length).toBeGreaterThanOrEqual(4);
    expect(opps.some((o) => o.name === "World Water Day Booth")).toBe(true);

    const lin = await db.query.constituents.findFirst({
      where: eq(constituents.id, stableId("constituent:lin")),
    });
    expect(lin?.volunteer).toBe(true);
  });

  it("seeds logged hours that roll up per volunteer and per opportunity", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.volunteerHours.findMany({
      where: eq(volunteerHours.tenantId, tenantId),
    });
    expect(rows.length).toBeGreaterThanOrEqual(14);

    const linId = stableId("constituent:lin");
    const linHours = rows
      .filter((r) => r.constituentId === linId)
      .reduce((sum, r) => sum + Number(r.hours), 0);
    expect(linHours).toBe(10);

    const boothId = stableId("opportunity:wwd-booth");
    const boothHours = rows
      .filter((r) => r.opportunityId === boothId)
      .reduce((sum, r) => sum + Number(r.hours), 0);
    expect(boothHours).toBe(18);
  });

  it("seeds membership tiers with levels and member records across statuses", async () => {
    if (!handle) {
      return;
    }
    const tiers = await db.query.membershipTiers.findMany({
      where: eq(membershipTiers.tenantId, tenantId),
    });
    expect(tiers.length).toBeGreaterThanOrEqual(4);
    expect(tiers.every((t) => t.level !== null)).toBe(true);

    const members = await db.query.memberships.findMany({
      where: eq(memberships.tenantId, tenantId),
    });
    expect(members.length).toBeGreaterThanOrEqual(12);
    const statuses = new Set(members.map((m) => m.status));
    expect(statuses.has("active")).toBe(true);
    expect(statuses.has("lapsed")).toBe(true);
    expect(statuses.has("pending")).toBe(true);
  });

  it("includes both upcoming and lapsed renewals relative to the seed date", async () => {
    if (!handle) {
      return;
    }
    const members = await db.query.memberships.findMany({
      where: eq(memberships.tenantId, tenantId),
    });
    const day = 86_400_000;
    const reference = new Date().toISOString().slice(0, 10);
    const windowEnd = new Date(Date.now() + 60 * day).toISOString().slice(0, 10);
    const lapsed = members.filter(
      (m) => m.renewalDate !== null && m.renewalDate < reference && m.status !== "cancelled",
    );
    const upcoming = members.filter(
      (m) =>
        m.status === "active" &&
        m.renewalDate !== null &&
        m.renewalDate >= reference &&
        m.renewalDate <= windowEnd,
    );
    expect(lapsed.length).toBeGreaterThan(0);
    expect(upcoming.length).toBeGreaterThan(0);
  });

  it("is idempotent — re-seeding leaves volunteer and membership counts stable", async () => {
    if (!handle) {
      return;
    }
    const counts = async () => ({
      opportunities: (
        await db.query.volunteerOpportunities.findMany({
          where: eq(volunteerOpportunities.tenantId, tenantId),
        })
      ).length,
      hours: (
        await db.query.volunteerHours.findMany({ where: eq(volunteerHours.tenantId, tenantId) })
      ).length,
      tiers: (
        await db.query.membershipTiers.findMany({ where: eq(membershipTiers.tenantId, tenantId) })
      ).length,
      members: (await db.query.memberships.findMany({ where: eq(memberships.tenantId, tenantId) }))
        .length,
    });
    const before = await counts();
    await seed(db);
    const after = await counts();
    expect(after).toEqual(before);
  });
});

describe("seed: prospects & QPI (the 95 Forward grounding set)", () => {
  const GROUNDING_TOTALS: Record<string, number> = {
    hallworth: 92,
    cordova: 83,
    osgood: 77,
    vega: 70,
    cornerstone: 64,
    whitfield: 58,
    northwater: 48,
    bello: 40,
  };

  it("seeds all eight grounding prospects, each 1:1 with its host constituent", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.prospects.findMany({ where: eq(prospects.tenantId, tenantId) });
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const key of Object.keys(GROUNDING_TOTALS)) {
      const row = rows.find((r) => r.id === stableId(`prospect:${key}`));
      expect(row).toBeDefined();
      expect(row?.constituentId).toBe(stableId(`constituent:${key}`));
    }
  });

  it("seeds QPI assessments that compute to the exact grounding totals", async () => {
    if (!handle) {
      return;
    }
    for (const [key, expectedTotal] of Object.entries(GROUNDING_TOTALS)) {
      const prospectId = stableId(`prospect:${key}`);
      const rows = await db.query.qpiAssessments.findMany({
        where: eq(qpiAssessments.prospectId, prospectId),
      });
      expect(rows).toHaveLength(5);
      const result = computeQpi(
        rows.map((r) => ({
          dimension: r.dimension as QpiDimension,
          rating: r.rating,
          isUnknown: r.isUnknown,
        })),
        QPI_DEFAULT_WEIGHTS,
      );
      expect(result.total).toBe(expectedTotal);
    }
  });

  it("gives Hallworth the grounding hero breakdown (92 = 35+24+15+8+10, all known)", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.qpiAssessments.findMany({
      where: eq(qpiAssessments.prospectId, stableId("prospect:hallworth")),
    });
    const ratingByDimension = Object.fromEntries(rows.map((r) => [r.dimension, r.rating]));
    expect(ratingByDimension).toEqual({
      capacity: 5,
      relationship: 4,
      timing: 5,
      gift_history: 4,
      philanthropy: 5,
    });
    const capacity = rows.find((r) => r.dimension === "capacity");
    expect(capacity?.source).toContain("990-PF");
    expect(rows.every((r) => !r.isUnknown)).toBe(true);
  });

  it("seeds unknown QPI gaps on research-stage prospects (rating null, contributing 0)", async () => {
    if (!handle) {
      return;
    }
    const unknownRows = await db.query.qpiAssessments.findMany({
      where: and(eq(qpiAssessments.tenantId, tenantId), eq(qpiAssessments.isUnknown, true)),
    });
    expect(unknownRows.length).toBeGreaterThanOrEqual(4);
    expect(unknownRows.every((r) => r.rating === null)).toBe(true);
  });

  it("seeds natural partners and the Hallworth grounding capacity detail", async () => {
    if (!handle) {
      return;
    }
    const partners = await db.query.naturalPartners.findMany({
      where: eq(naturalPartners.tenantId, tenantId),
    });
    expect(partners.length).toBeGreaterThanOrEqual(5);
    const hallworthPartner = partners.find((p) => p.prospectId === stableId("prospect:hallworth"));
    expect(hallworthPartner?.constituentId).toBe(stableId("constituent:bradley"));

    const kb = await db.query.knowledgeBase.findFirst({
      where: eq(knowledgeBase.prospectId, stableId("prospect:hallworth")),
    });
    expect(kb?.capacitySource).toContain("$180M");
  });

  it("seeds I8 strategize data: Hallworth gaps, strategy, a planned visit, and trustees", async () => {
    if (!handle) {
      return;
    }
    const hallworthId = stableId("prospect:hallworth");

    const gaps = await db.query.researchGaps.findMany({
      where: eq(researchGaps.prospectId, hallworthId),
    });
    expect(gaps.length).toBeGreaterThanOrEqual(2);
    expect(gaps.some((g) => g.label.toLowerCase().includes("wealth screen"))).toBe(true);
    expect(gaps.every((g) => g.status === "open")).toBe(true);

    const strategy = await db.query.prospectStrategy.findFirst({
      where: eq(prospectStrategy.prospectId, hallworthId),
    });
    expect(strategy?.relationshipGoals).toContain("David Hallworth");

    const allVisits = await db.query.visits.findMany({
      where: eq(visits.prospectId, hallworthId),
    });
    const plannedVisits = allVisits.filter((v) => v.occurredAt === null);
    expect(plannedVisits.length).toBeGreaterThanOrEqual(1);
    expect(plannedVisits.every((v) => v.outcome === null)).toBe(true);

    const kdms = await db.query.relationshipMapEntries.findMany({
      where: eq(relationshipMapEntries.prospectId, hallworthId),
    });
    expect(kdms.some((k) => k.name === "David Hallworth" && k.role === "Trustee")).toBe(true);
  });

  it("is idempotent — re-seeding leaves prospect/QPI counts stable", async () => {
    if (!handle) {
      return;
    }
    const counts = async () => ({
      prospects: (await db.query.prospects.findMany({ where: eq(prospects.tenantId, tenantId) }))
        .length,
      qpi: (
        await db.query.qpiAssessments.findMany({ where: eq(qpiAssessments.tenantId, tenantId) })
      ).length,
      partners: (
        await db.query.naturalPartners.findMany({ where: eq(naturalPartners.tenantId, tenantId) })
      ).length,
      gaps: (await db.query.researchGaps.findMany({ where: eq(researchGaps.tenantId, tenantId) }))
        .length,
      strategy: (
        await db.query.prospectStrategy.findMany({ where: eq(prospectStrategy.tenantId, tenantId) })
      ).length,
      visits: (await db.query.visits.findMany({ where: eq(visits.tenantId, tenantId) })).length,
      kdms: (
        await db.query.relationshipMapEntries.findMany({
          where: eq(relationshipMapEntries.tenantId, tenantId),
        })
      ).length,
      initiatives: (
        await db.query.fundingInitiatives.findMany({
          where: eq(fundingInitiatives.tenantId, tenantId),
        })
      ).length,
      associations: (
        await db.query.prospectFundingInitiatives.findMany({
          where: eq(prospectFundingInitiatives.tenantId, tenantId),
        })
      ).length,
    });
    const before = await counts();
    await seed(db);
    const after = await counts();
    expect(after).toEqual(before);
  });
});

describe("seed: funding initiatives (I9)", () => {
  it("seeds the three grounded Water For People initiatives, one per frame", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.fundingInitiatives.findMany({
      where: eq(fundingInitiatives.tenantId, tenantId),
    });
    // I18 added a fourth, Unrestricted, which is modelled as an ordinary initiative. It shares the
    // "today" frame with Kamuli, so the three grounded ones are the restricted subset.
    expect(rows).toHaveLength(4);
    const grounded = rows.filter((r) => r.restricted);
    expect(grounded).toHaveLength(3);
    const byFrame = Object.fromEntries(grounded.map((r) => [r.frame, r]));
    expect(byFrame.today?.name).toContain("Kamuli");
    expect(byFrame.tomorrow?.name).toContain("Bolivia");
    expect(byFrame.tomorrow?.goalAmountCents).toBe(320_000_000);
    expect(byFrame.forever?.name).toContain("Forever Promise");
    expect(rows.every((r) => (r.story ?? "").length > 0)).toBe(true);
  });

  it("models Unrestricted as an ordinary initiative, not a special case (I18)", async () => {
    if (!handle) {
      return;
    }
    const rows = await db.query.fundingInitiatives.findMany({
      where: eq(fundingInitiatives.tenantId, tenantId),
    });
    const unrestricted = rows.find((r) => r.name === "Unrestricted");
    expect(unrestricted).toBeDefined();
    expect(unrestricted?.restricted).toBe(false);
    // A colour KEY, never a hex value — the palette itself is defined by I17b.
    expect(unrestricted?.colourKey).toBe("initiative-4");
    expect(rows.every((r) => (r.colourKey ?? "").startsWith("initiative-"))).toBe(true);
    expect(rows.every((r) => r.fiscalPeriod === "FY26")).toBe(true);
  });

  it("seeds cultivation associations (Hallworth -> Bolivia) without a frame column on prospects", async () => {
    if (!handle) {
      return;
    }
    const associations = await db.query.prospectFundingInitiatives.findMany({
      where: eq(prospectFundingInitiatives.tenantId, tenantId),
    });
    expect(associations.length).toBeGreaterThanOrEqual(8);

    const hallworthToBolivia = associations.find(
      (a) =>
        a.prospectId === stableId("prospect:hallworth") &&
        a.fundingInitiativeId === stableId("initiative:bolivia"),
    );
    expect(hallworthToBolivia).toBeDefined();
  });
});

describe("seed: execution set (I10)", () => {
  it("seeds executed visits, asks across outcomes, follow-ups, and a referral", async () => {
    if (!handle) {
      return;
    }
    const executedVisits = await db.query.visits.findMany({
      where: eq(visits.tenantId, tenantId),
    });
    expect(executedVisits.some((v) => v.occurredAt !== null)).toBe(true);

    const askRows = await db.query.asks.findMany({ where: eq(asks.tenantId, tenantId) });
    expect(askRows.length).toBeGreaterThanOrEqual(3);
    expect(
      askRows.some((a) => a.outcome === "commitment" && a.commitmentAmountCents !== null),
    ).toBe(true);
    expect(askRows.some((a) => a.outcome === "roadmap" && a.roadmapNextSteps !== null)).toBe(true);
    expect(askRows.some((a) => a.outcome === "decline")).toBe(true);

    const followUps = await db.query.followUpTasks.findMany({
      where: eq(followUpTasks.tenantId, tenantId),
    });
    expect(followUps.some((f) => f.status === "open")).toBe(true);
    expect(followUps.some((f) => f.status === "done")).toBe(true);

    const refRows = await db.query.referrals.findMany({ where: eq(referrals.tenantId, tenantId) });
    expect(refRows.length).toBeGreaterThanOrEqual(1);
  });

  it("ties Hallworth to a Bolivia roadmap ask with numbers on the table and an open follow-up", async () => {
    if (!handle) {
      return;
    }
    const hallworthAsk = await db.query.asks.findFirst({
      where: eq(asks.id, stableId("ask:hallworth-bolivia")),
    });
    expect(hallworthAsk?.outcome).toBe("roadmap");
    expect(hallworthAsk?.numbersOnTable).toBe(true);
    expect(hallworthAsk?.fundingInitiativeId).toBe(stableId("initiative:bolivia"));

    const hallworthFollowUp = await db.query.followUpTasks.findFirst({
      where: eq(followUpTasks.id, stableId("followup:hallworth-bolivia")),
    });
    expect(hallworthFollowUp?.status).toBe("open");
  });

  it("lands at least one commitment that lights an initiative's progress", async () => {
    if (!handle) {
      return;
    }
    const committed = await db.query.asks.findMany({ where: eq(asks.tenantId, tenantId) });
    const total = committed
      .filter((a) => a.outcome === "commitment")
      .reduce((sum, a) => sum + (a.commitmentAmountCents ?? 0), 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe("seed: research jobs (I11)", () => {
  it("seeds at least one ready research job for a grounded prospect", async () => {
    if (!handle) return;
    const ready = await db.query.researchJobs.findMany({
      where: and(eq(researchJobs.tenantId, tenantId), eq(researchJobs.status, "ready")),
    });
    expect(ready.length).toBeGreaterThanOrEqual(1);
    const hallworth = ready.find((j) => j.originKey === "seed:research:hallworth");
    expect(hallworth).toBeDefined();
    expect(hallworth?.completedAt).not.toBeNull();
  });

  it("attaches pending knowledge-base proposals to the ready job", async () => {
    if (!handle) return;
    const proposals = await db.query.copilotProposals.findMany({
      where: and(
        eq(copilotProposals.tenantId, tenantId),
        eq(copilotProposals.proposalType, "knowledge_base_update"),
      ),
    });
    const seeded = proposals.filter((p) => p.originKey?.startsWith("seed:research:hallworth:"));
    expect(seeded.length).toBeGreaterThanOrEqual(1);
    expect(seeded.every((p) => p.status === "pending")).toBe(true);
  });

  it("seeds a researching job for the in-progress pattern", async () => {
    if (!handle) return;
    const researching = await db.query.researchJobs.findMany({
      where: and(eq(researchJobs.tenantId, tenantId), eq(researchJobs.status, "researching")),
    });
    expect(researching.length).toBeGreaterThanOrEqual(1);
  });
});

describe("seed: discovery batches (I12)", () => {
  it("seeds a ready discovery batch (Sandra Kim) with fictional candidates", async () => {
    if (!handle) return;
    const ready = await db.query.discoveryTasks.findMany({
      where: and(eq(discoveryTasks.tenantId, tenantId), eq(discoveryTasks.status, "ready")),
    });
    const sandra = ready.find((t) => t.originKey === "seed:discovery:sandra-bolivia");
    expect(sandra).toBeDefined();
    expect(sandra?.completedAt).not.toBeNull();
  });

  it("attaches suggested candidates to the ready batch", async () => {
    if (!handle) return;
    const rows = await db.query.candidates.findMany({
      where: eq(candidates.tenantId, tenantId),
    });
    const seeded = rows.filter((c) => c.originKey?.startsWith("seed:discovery:sandra-bolivia:"));
    expect(seeded.length).toBeGreaterThanOrEqual(1);
    expect(seeded.every((c) => c.status === "suggested")).toBe(true);
    expect(seeded.every((c) => c.promotedProspectId === null)).toBe(true);
  });

  it("seeds a researching discovery batch (Tom Bradley) for the in-progress pattern", async () => {
    if (!handle) return;
    const researching = await db.query.discoveryTasks.findMany({
      where: and(eq(discoveryTasks.tenantId, tenantId), eq(discoveryTasks.status, "researching")),
    });
    expect(researching.some((t) => t.originKey === "seed:discovery:bradley-forever")).toBe(true);
  });
});

// =================================================================================================
// I31 — Scorecards
// =================================================================================================

describe("seed: scorecards (I31)", () => {
  it("makes the CDO the manager of both gift officers, and of nobody else", async () => {
    if (!handle) return;
    const rows = await db.query.users.findMany({ where: eq(users.tenantId, tenantId) });
    const ruth = rows.find((u) => u.email === SCORECARD_SEED_FACTS.managerEmail);
    expect(ruth).toBeDefined();
    expect(ruth?.managerId).toBeNull();

    const reports = rows.filter((u) => u.managerId === ruth?.id).map((u) => u.email);
    expect(reports.sort()).toEqual(
      [SCORECARD_SEED_FACTS.repEmails.dana, SCORECARD_SEED_FACTS.repEmails.priya].sort(),
    );
  });

  it("seeds exactly one fallback meeting type", async () => {
    if (!handle) return;
    const rows = await db.query.meetingTypes.findMany({
      where: eq(meetingTypes.tenantId, tenantId),
    });
    expect(rows).toHaveLength(SCORECARD_SEED_FACTS.meetingTypeKeys.length);
    expect(rows.filter((t) => t.isFallback)).toHaveLength(1);
    expect(rows.find((t) => t.isFallback)?.name).toBe("Discovery Visit");
    // The descriptions are the classifier's whole input besides the content. A short one is a bug.
    expect(rows.every((t) => t.description.length > 200)).toBe(true);
  });

  it("seeds one active definition per meeting type, each with sections and criteria", async () => {
    if (!handle) return;
    const definitions = await db.query.scorecardDefinitions.findMany({
      where: eq(scorecardDefinitions.tenantId, tenantId),
    });
    expect(definitions).toHaveLength(SCORECARD_SEED_FACTS.definitionKeys.length);
    expect(definitions.every((d) => d.isActive)).toBe(true);
    expect(new Set(definitions.map((d) => d.meetingTypeId)).size).toBe(definitions.length);

    const criteria = await db.query.scorecardCriteria.findMany({
      where: eq(scorecardCriteria.tenantId, tenantId),
    });
    expect(criteria).toHaveLength(SCORECARD_SEED_FACTS.criterionCount);
    expect(criteria.every((c) => c.prompt.trim().length > 0)).toBe(true);

    // Every classification criterion has at least two options, each with a description.
    const options = await db.query.scorecardCriterionOptions.findMany({
      where: eq(scorecardCriterionOptions.tenantId, tenantId),
    });
    for (const criterion of criteria.filter((c) => c.type === "classification")) {
      const own = options.filter((o) => o.criterionId === criterion.id);
      expect(own.length).toBeGreaterThanOrEqual(2);
      expect(own.every((o) => o.description.trim().length > 0)).toBe(true);
    }
  });

  it("seeds 8-10 meetings across both reps, with at least one prospect-only link", async () => {
    if (!handle) return;
    const rows = await db.query.meetings.findMany({ where: eq(meetings.tenantId, tenantId) });
    expect(rows.length).toBe(SCORECARD_SEED_FACTS.meetingKeys.length);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows.length).toBeLessThanOrEqual(10);

    expect(new Set(rows.map((m) => m.reportedBy)).size).toBe(2);
    expect(rows.filter((m) => m.prospectId !== null).length).toBeGreaterThanOrEqual(1);
    expect(rows.filter((m) => m.sourceType === "notes").length).toBeGreaterThanOrEqual(2);
    expect(rows.filter((m) => m.sourceType === "transcript").length).toBeGreaterThanOrEqual(1);
    // Every meeting links exactly one thing — the CHECK says so, this says we meant it.
    expect(rows.every((m) => (m.opportunityId === null) !== (m.prospectId === null))).toBe(true);
  });

  it("seeds a ready Scorecard for every meeting, one apiece", async () => {
    if (!handle) return;
    const cards = await db.query.scorecards.findMany({ where: eq(scorecards.tenantId, tenantId) });
    expect(cards).toHaveLength(SCORECARD_SEED_FACTS.meetingKeys.length);
    expect(cards.every((c) => c.status === "ready")).toBe(true);
    expect(new Set(cards.map((c) => c.meetingId)).size).toBe(cards.length);
    // Authored, and the audit row says so rather than inventing a model id.
    expect(cards.every((c) => c.scoreModel === "seed:authored")).toBe(true);
    // Exactly one fallback card, so the demo has the "no fit" story on screen.
    expect(cards.filter((c) => c.usedFallback)).toHaveLength(1);
  });

  it("snapshots the definition onto every Scorecard", async () => {
    if (!handle) return;
    const cards = await db.query.scorecards.findMany({ where: eq(scorecards.tenantId, tenantId) });
    for (const card of cards) {
      const snapshot = card.definitionSnapshot as { sections?: unknown[] } | null;
      expect(Array.isArray(snapshot?.sections)).toBe(true);
      expect(snapshot?.sections?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("EVERY authored evidence quote is verbatim in its own meeting content", async () => {
    // The single most embarrassing failure this feature could put in front of a manager: a quote
    // that is not in the transcript. Checked against the authored fixtures, not the database, so
    // the error points at the line that needs fixing.
    const failures = SCORECARD_SEED_FACTS.quotes.filter(
      (entry) => !verifyEvidenceQuote(entry.content, entry.quote),
    );
    expect(failures.map((f) => `${f.meetingKey} ${f.criterion}`)).toEqual([]);
    expect(SCORECARD_SEED_FACTS.quotes.length).toBeGreaterThan(40);
  });

  it("marks every stored quote verified, and gives every result a rationale", async () => {
    if (!handle) return;
    const rows = await db.query.criterionResults.findMany({
      where: eq(criterionResults.tenantId, tenantId),
    });
    expect(rows.length).toBeGreaterThan(50);
    expect(rows.every((r) => r.rationale.trim().length > 0)).toBe(true);
    expect(rows.filter((r) => r.evidenceQuote !== null).every((r) => r.evidenceVerified)).toBe(
      true,
    );
    // A not-determinable result carries a rationale saying WHY not, and no value.
    const undetermined = rows.filter((r) => !r.determinable);
    expect(undetermined.length).toBeGreaterThan(0);
    expect(
      undetermined.every(
        (r) => r.booleanValue === null && r.scoreValue === null && r.optionId === null,
      ),
    ).toBe(true);
  });

  it("gives the strong and the weak discovery visit visibly different scores", async () => {
    if (!handle) return;
    const strong = await db.query.scorecards.findFirst({
      where: eq(scorecards.id, stableId("scorecard:vega-discovery")),
    });
    const weak = await db.query.scorecards.findFirst({
      where: eq(scorecards.id, stableId("scorecard:ridgeway-discovery")),
    });
    const score = (value: string | null | undefined) => (value === null ? null : Number(value));
    expect(score(strong?.overallScore)).toBeGreaterThan(0.9);
    expect(score(weak?.overallScore)).toBeLessThan(0.1);
  });

  it("leaves the all-not-determinable Scorecard with a NULL overall score, not a zero", async () => {
    if (!handle) return;
    const card = await db.query.scorecards.findFirst({
      where: eq(scorecards.id, stableId("scorecard:bluemesa-catchup")),
    });
    expect(card?.usedFallback).toBe(true);
    // Nothing countable could be determined from a five-line logistics note. A confident 0 there
    // would be a lie about a fundraiser.
    expect(card?.overallScore).toBeNull();
  });

  it("is idempotent — re-seeding leaves scorecard counts and scores stable", async () => {
    if (!handle) return;
    const counts = async () => ({
      types: (await db.query.meetingTypes.findMany({ where: eq(meetingTypes.tenantId, tenantId) }))
        .length,
      definitions: (
        await db.query.scorecardDefinitions.findMany({
          where: eq(scorecardDefinitions.tenantId, tenantId),
        })
      ).length,
      criteria: (
        await db.query.scorecardCriteria.findMany({
          where: eq(scorecardCriteria.tenantId, tenantId),
        })
      ).length,
      meetings: (await db.query.meetings.findMany({ where: eq(meetings.tenantId, tenantId) }))
        .length,
      scorecards: (await db.query.scorecards.findMany({ where: eq(scorecards.tenantId, tenantId) }))
        .length,
      results: (
        await db.query.criterionResults.findMany({ where: eq(criterionResults.tenantId, tenantId) })
      ).length,
      scores: (await db.query.scorecards.findMany({ where: eq(scorecards.tenantId, tenantId) }))
        .map((c) => c.overallScore)
        .sort()
        .join("|"),
    });

    const before = await counts();
    await seed(db);
    expect(await counts()).toEqual(before);
  }, 120_000);
});

describe("seed: war-room invariance (I31)", () => {
  /** Every figure the Board, the Forecast Room and the queue put on screen, for one scope. */
  const figuresFor = (snapshot: MetricsSnapshot, scope: MetricScope, settings: ForwardSettings) => {
    const clock = fixedClock(DEMO_TODAY);
    const metrics = computeMetrics({ snapshot, scope, settings, clock });
    const simulation = simulate({ snapshot, scope, settings, clock });
    const stage = stageBoard(snapshot, scope, clock);
    const goal = goalFor(snapshot, scope);
    return JSON.stringify({ metrics, simulation, stage, goal });
  };

  it("the I19 metrics, the I21 forecast and the stage board are IDENTICAL after seeding scorecards", async () => {
    if (!handle) return;
    registerBuiltInRules();
    registerRankingRules();

    const resolved = await resolveTenantCatalogue(db, tenantId);
    const settings = settingsFromCatalogue(resolved);
    const period = settings.fiscalPeriods[0]?.label ?? "FY26";
    const dana = await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenantId), eq(users.email, "dana.reese@waterforpeople.org")),
    });
    const scopes: MetricScope[] = [
      { rep: "all", initiative: "all", period },
      { rep: dana?.id ?? "all", initiative: "all", period },
    ];

    const read = async () => {
      const snapshot = await loadMetricsSnapshot(db, tenantId, { now: DEMO_TODAY });
      return scopes.map((scope) => figuresFor(snapshot, scope, settings));
    };

    const before = await read();
    // Run ONLY the scorecards seed — the question is whether this module is inert, not whether the
    // whole seed is idempotent (which `seed.test.ts` asserts elsewhere).
    await seedScorecards(db, tenantId);
    const after = await read();

    expect(after).toEqual(before);
  }, 120_000);

  it("adds no opportunity, milestone, goal or event row", async () => {
    if (!handle) return;
    const counts = async () => ({
      opportunities: (
        await db.query.forwardOpportunities.findMany({
          where: eq(forwardOpportunities.tenantId, tenantId),
        })
      ).length,
      events: (
        await db.query.opportunityEvents.findMany({
          where: eq(opportunityEvents.tenantId, tenantId),
        })
      ).length,
      milestones: (
        await db.query.opportunityMilestones.findMany({
          where: eq(opportunityMilestones.tenantId, tenantId),
        })
      ).length,
      goals: (await db.query.goals.findMany({ where: eq(goals.tenantId, tenantId) })).length,
      users: (await db.query.users.findMany({ where: eq(users.tenantId, tenantId) })).length,
    });

    const before = await counts();
    await seedScorecards(db, tenantId);
    expect(await counts()).toEqual(before);
    // And the user count is still the three the seed has always created.
    expect(before.users).toBe(3);
  }, 120_000);
});

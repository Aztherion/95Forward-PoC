import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNotNull } from "drizzle-orm";
import { QPI_DEFAULT_TOGGLES, QPI_DEFAULT_WEIGHTS } from "@95forward/shared";
import { seed } from "./seed";
import { stableId } from "./seed-records-core";
import type { Database } from "./client";
import { connectTestDb, type TestDb } from "./test-support";
import { tenants } from "./schema/tenants";
import { users } from "./schema/users";
import { tenantSettings } from "./schema/config";
import { constituents } from "./schema/constituents";
import { appeals, campaigns, funds, gifts } from "./schema/revenue";

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

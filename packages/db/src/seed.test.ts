import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { QPI_DEFAULT_TOGGLES, QPI_DEFAULT_WEIGHTS } from "@95forward/shared";
import { seed } from "./seed";
import type { Database } from "./client";
import { connectTestDb, type TestDb } from "./test-support";
import { tenants } from "./schema/tenants";
import { users } from "./schema/users";
import { tenantSettings } from "./schema/config";

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

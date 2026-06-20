import { eq } from "drizzle-orm";
import { QPI_DEFAULT_TOGGLES, QPI_DEFAULT_WEIGHTS, type Role } from "@95forward/shared";
import { createDb, type Database } from "./client";
import { tenants } from "./schema/tenants";
import { users } from "./schema/users";
import { tenantSettings } from "./schema/config";
import { seedRecordsCore } from "./seed-records-core";

const TENANT_SLUG = "water-for-people";
const TENANT_NAME = "Water For People";

interface SeedUser {
  email: string;
  name: string;
  role: Role;
}

const SEED_USERS: SeedUser[] = [
  { email: "dana.reese@waterforpeople.org", name: "Dana Reese", role: "major_gifts_officer" },
  { email: "priya.nair@waterforpeople.org", name: "Priya Nair", role: "gift_officer" },
  {
    email: "ruth.castellanos@waterforpeople.org",
    name: "Ruth Castellanos",
    role: "chief_development_officer",
  },
];

export async function seed(db: Database): Promise<{ tenantId: string }> {
  await db
    .insert(tenants)
    .values({ name: TENANT_NAME, slug: TENANT_SLUG })
    .onConflictDoNothing({ target: tenants.slug });

  const tenantRow = await db.query.tenants.findFirst({
    where: eq(tenants.slug, TENANT_SLUG),
  });
  if (tenantRow === undefined) {
    throw new Error("seed: failed to load Water For People tenant after insert");
  }
  const tenantId = tenantRow.id;

  for (const user of SEED_USERS) {
    await db
      .insert(users)
      .values({ tenantId, email: user.email, name: user.name, role: user.role, auth0Subject: null })
      .onConflictDoNothing({ target: users.email });
  }

  await db
    .insert(tenantSettings)
    .values({
      tenantId,
      weightCapacity: QPI_DEFAULT_WEIGHTS.capacity,
      weightRelationship: QPI_DEFAULT_WEIGHTS.relationship,
      weightTiming: QPI_DEFAULT_WEIGHTS.timing,
      weightGiftHistory: QPI_DEFAULT_WEIGHTS.gift_history,
      weightPhilanthropy: QPI_DEFAULT_WEIGHTS.philanthropy,
      researchPublicSources: QPI_DEFAULT_TOGGLES.research_public_sources,
      proposeQpiUpdatesAutomatically: QPI_DEFAULT_TOGGLES.propose_qpi_updates_automatically,
      draft24hFollowups: QPI_DEFAULT_TOGGLES.draft_24h_followups,
    })
    .onConflictDoNothing({ target: tenantSettings.tenantId });

  await seedRecordsCore(db, tenantId);

  return { tenantId };
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to run the seed");
  }
  const { db, pool } = createDb(url);
  try {
    const { tenantId } = await seed(db);
    console.log(`[db] seed complete — Water For People tenant ${tenantId} ready`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error("[db] seed failed:", error);
    process.exit(1);
  });
}

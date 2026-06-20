import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { users } from "./schema/users";
import { appeals, campaigns } from "./schema/revenue";
import { opportunities, proposals } from "./schema/pipeline";
import type { opportunityStageEnum } from "./schema/enums";
import { stableId } from "./seed-records-core";

type OpportunityStage = (typeof opportunityStageEnum.enumValues)[number];
type Owner = "dana" | "priya";

interface OpportunitySpec {
  key: string;
  constituentKey: string;
  stage: OpportunityStage;
  askAmountCents: number | null;
  expectedAmountCents: number | null;
  expectedCloseDate: string | null;
  likelihoodPct: number | null;
  owner: Owner;
}

interface ProposalSpec {
  key: string;
  constituentKey: string;
  purpose: string;
  amountCents: number;
  status: string;
  deadline: string;
}

interface GoalSpec {
  key: string;
  goalAmountCents: number;
}

const OPPORTUNITIES: OpportunitySpec[] = [
  {
    key: "hallworth:bolivia",
    constituentKey: "hallworth",
    stage: "solicitation",
    askAmountCents: 280_000_000,
    expectedAmountCents: 250_000_000,
    expectedCloseDate: "2026-11-15",
    likelihoodPct: 80,
    owner: "dana",
  },
  {
    key: "cordova:stewardship",
    constituentKey: "cordova",
    stage: "cultivation",
    askAmountCents: 75_000_000,
    expectedAmountCents: 60_000_000,
    expectedCloseDate: "2026-09-30",
    likelihoodPct: 62,
    owner: "dana",
  },
  {
    key: "osgood:wash",
    constituentKey: "osgood",
    stage: "solicitation",
    askAmountCents: 120_000_000,
    expectedAmountCents: 100_000_000,
    expectedCloseDate: "2026-08-20",
    likelihoodPct: 55,
    owner: "priya",
  },
  {
    key: "vega:women-water",
    constituentKey: "vega",
    stage: "cultivation",
    askAmountCents: 25_000_000,
    expectedAmountCents: 18_000_000,
    expectedCloseDate: "2026-10-10",
    likelihoodPct: 47,
    owner: "dana",
  },
  {
    key: "cornerstone:kamuli",
    constituentKey: "cornerstone",
    stage: "cultivation",
    askAmountCents: 45_000_000,
    expectedAmountCents: 35_000_000,
    expectedCloseDate: "2026-07-01",
    likelihoodPct: 68,
    owner: "priya",
  },
  {
    key: "whitfield:legacy",
    constituentKey: "whitfield",
    stage: "stewardship",
    askAmountCents: 50_000_000,
    expectedAmountCents: 50_000_000,
    expectedCloseDate: "2026-12-31",
    likelihoodPct: 72,
    owner: "dana",
  },
  {
    key: "northwater:impact",
    constituentKey: "northwater",
    stage: "identification",
    askAmountCents: 90_000_000,
    expectedAmountCents: null,
    expectedCloseDate: "2027-02-28",
    likelihoodPct: 38,
    owner: "priya",
  },
  {
    key: "bello:forever",
    constituentKey: "bello",
    stage: "identification",
    askAmountCents: null,
    expectedAmountCents: null,
    expectedCloseDate: "2027-03-15",
    likelihoodPct: 33,
    owner: "dana",
  },
  {
    key: "bradley:board",
    constituentKey: "bradley",
    stage: "stewardship",
    askAmountCents: 15_000_000,
    expectedAmountCents: 15_000_000,
    expectedCloseDate: "2026-06-30",
    likelihoodPct: 85,
    owner: "dana",
  },
  {
    key: "webb:cornerstone-intro",
    constituentKey: "webb",
    stage: "cultivation",
    askAmountCents: 12_000_000,
    expectedAmountCents: 9_000_000,
    expectedCloseDate: "2026-09-15",
    likelihoodPct: 54,
    owner: "priya",
  },
  {
    key: "lin:wavemaker-upgrade",
    constituentKey: "lin",
    stage: "solicitation",
    askAmountCents: 5_000_000,
    expectedAmountCents: 4_000_000,
    expectedCloseDate: "2026-05-31",
    likelihoodPct: 60,
    owner: "priya",
  },
  {
    key: "generic-0:corporate",
    constituentKey: "generic-0",
    stage: "cultivation",
    askAmountCents: 30_000_000,
    expectedAmountCents: 22_000_000,
    expectedCloseDate: "2026-10-31",
    likelihoodPct: 44,
    owner: "dana",
  },
  {
    key: "generic-1:corporate",
    constituentKey: "generic-1",
    stage: "identification",
    askAmountCents: 20_000_000,
    expectedAmountCents: null,
    expectedCloseDate: "2027-01-20",
    likelihoodPct: 36,
    owner: "priya",
  },
  {
    key: "generic-3:foundation",
    constituentKey: "generic-3",
    stage: "solicitation",
    askAmountCents: 60_000_000,
    expectedAmountCents: 48_000_000,
    expectedCloseDate: "2026-08-05",
    likelihoodPct: 58,
    owner: "dana",
  },
  {
    key: "generic-4:foundation",
    constituentKey: "generic-4",
    stage: "cultivation",
    askAmountCents: 40_000_000,
    expectedAmountCents: 30_000_000,
    expectedCloseDate: "2026-11-28",
    likelihoodPct: 49,
    owner: "priya",
  },
  {
    key: "generic-19:individual",
    constituentKey: "generic-19",
    stage: "stewardship",
    askAmountCents: 3_500_000,
    expectedAmountCents: 3_500_000,
    expectedCloseDate: "2026-07-18",
    likelihoodPct: 77,
    owner: "dana",
  },
  {
    key: "generic-20:individual",
    constituentKey: "generic-20",
    stage: "identification",
    askAmountCents: null,
    expectedAmountCents: null,
    expectedCloseDate: "2027-04-01",
    likelihoodPct: 41,
    owner: "priya",
  },
  {
    key: "generic-22:individual",
    constituentKey: "generic-22",
    stage: "cultivation",
    askAmountCents: 8_000_000,
    expectedAmountCents: 6_000_000,
    expectedCloseDate: "2026-09-09",
    likelihoodPct: 52,
    owner: "dana",
  },
];

const PROPOSALS: ProposalSpec[] = [
  {
    key: "hallworth:1",
    constituentKey: "hallworth",
    purpose: "Everyone Forever: Bolivia scale-up — multi-year",
    amountCents: 280_000_000,
    status: "submitted",
    deadline: "2026-10-15",
  },
  {
    key: "cordova:1",
    constituentKey: "cordova",
    purpose: "Corporate water-stewardship partnership renewal",
    amountCents: 75_000_000,
    status: "under_review",
    deadline: "2026-09-01",
  },
  {
    key: "osgood:1",
    constituentKey: "osgood",
    purpose: "WASH district program grant — Bolivia",
    amountCents: 120_000_000,
    status: "submitted",
    deadline: "2026-08-01",
  },
  {
    key: "vega:1",
    constituentKey: "vega",
    purpose: "Women & Water leadership initiative",
    amountCents: 25_000_000,
    status: "draft",
    deadline: "2026-10-01",
  },
  {
    key: "cornerstone:1",
    constituentKey: "cornerstone",
    purpose: "Everyone in Kamuli — Uganda 2026",
    amountCents: 45_000_000,
    status: "approved",
    deadline: "2026-06-15",
  },
  {
    key: "whitfield:1",
    constituentKey: "whitfield",
    purpose: "Legacy gift intent — The Forever Promise",
    amountCents: 50_000_000,
    status: "approved",
    deadline: "2026-12-01",
  },
  {
    key: "northwater:1",
    constituentKey: "northwater",
    purpose: "Impact investment in water-sector infrastructure",
    amountCents: 90_000_000,
    status: "draft",
    deadline: "2027-02-01",
  },
  {
    key: "bradley:1",
    constituentKey: "bradley",
    purpose: "Board leadership gift — Everyone Forever Fund",
    amountCents: 15_000_000,
    status: "funded",
    deadline: "2026-06-01",
  },
  {
    key: "lin:1",
    constituentKey: "lin",
    purpose: "Wavemaker growth — annual upgrade",
    amountCents: 5_000_000,
    status: "under_review",
    deadline: "2026-05-15",
  },
  {
    key: "generic-3:1",
    constituentKey: "generic-3",
    purpose: "Everyone Forever Fund — general operating",
    amountCents: 60_000_000,
    status: "submitted",
    deadline: "2026-07-20",
  },
  {
    key: "generic-0:1",
    constituentKey: "generic-0",
    purpose: "Corporate grant — Guatemala programs",
    amountCents: 30_000_000,
    status: "under_review",
    deadline: "2026-10-10",
  },
  {
    key: "generic-19:1",
    constituentKey: "generic-19",
    purpose: "Major gift stewardship — Rwanda programs",
    amountCents: 3_500_000,
    status: "funded",
    deadline: "2026-07-05",
  },
];

const CAMPAIGN_GOALS: GoalSpec[] = [
  { key: "wavemaker", goalAmountCents: 250_000_000 },
  { key: "world-water-day", goalAmountCents: 150_000_000 },
  { key: "everyone-forever", goalAmountCents: 800_000_000 },
];

const APPEAL_GOALS: GoalSpec[] = [
  { key: "wavemaker-monthly", goalAmountCents: 120_000_000 },
  { key: "world-water-day-2026", goalAmountCents: 90_000_000 },
  { key: "year-end-2025", goalAmountCents: 60_000_000 },
  { key: "spring-2026", goalAmountCents: 45_000_000 },
  { key: "world-water-day-2025", goalAmountCents: 75_000_000 },
];

export async function seedMajorGiving(db: Database, tenantId: string): Promise<void> {
  const userRows = await db.query.users.findMany({ where: eq(users.tenantId, tenantId) });
  const userByEmail = new Map(userRows.map((u) => [u.email, u.id]));
  const dana = userByEmail.get("dana.reese@waterforpeople.org");
  const priya = userByEmail.get("priya.nair@waterforpeople.org");
  if (!dana || !priya) {
    throw new Error("seedMajorGiving: expected Dana and Priya seed users to exist");
  }
  const ownerIds: Record<Owner, string> = { dana, priya };

  for (const o of OPPORTUNITIES) {
    await db
      .insert(opportunities)
      .values({
        id: stableId(`opportunity:${o.key}`),
        tenantId,
        constituentId: stableId(`constituent:${o.constituentKey}`),
        stage: o.stage,
        askAmountCents: o.askAmountCents,
        expectedAmountCents: o.expectedAmountCents,
        expectedCloseDate: o.expectedCloseDate,
        likelihoodPct: o.likelihoodPct,
        ownerUserId: ownerIds[o.owner],
      })
      .onConflictDoNothing({ target: opportunities.id });
  }

  for (const p of PROPOSALS) {
    await db
      .insert(proposals)
      .values({
        id: stableId(`proposal:${p.key}`),
        tenantId,
        constituentId: stableId(`constituent:${p.constituentKey}`),
        purpose: p.purpose,
        amountCents: p.amountCents,
        status: p.status,
        deadline: p.deadline,
      })
      .onConflictDoNothing({ target: proposals.id });
  }

  for (const c of CAMPAIGN_GOALS) {
    await db
      .update(campaigns)
      .set({ goalAmountCents: c.goalAmountCents })
      .where(eq(campaigns.id, stableId(`campaign:${c.key}`)));
  }

  for (const a of APPEAL_GOALS) {
    await db
      .update(appeals)
      .set({ goalAmountCents: a.goalAmountCents })
      .where(eq(appeals.id, stableId(`appeal:${a.key}`)));
  }
}

import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { users } from "./schema/users";
import { knowledgeBase, prospects } from "./schema/prospects";
import { stableId } from "./seed-records-core";

type ProspectStatus = "research" | "cultivation" | "solicitation" | "stewardship" | "active";

interface ProspectSpec {
  key: string;
  constituentKey: string;
  status: ProspectStatus;
  rank: number;
  rm: "dana" | "priya";
  top33: boolean;
  momentum: boolean;
  connector: boolean;
  leadership: boolean;
  kb: {
    capacitySource: string | null;
    relationshipToCause: string | null;
    connectorsNote: string | null;
    giftHistorySummary: string | null;
    otherPhilanthropy: string | null;
    timingNote: string | null;
  };
}

const PROSPECTS: ProspectSpec[] = [
  {
    key: "hallworth",
    constituentKey: "hallworth",
    status: "cultivation",
    rank: 1,
    rm: "dana",
    top33: true,
    momentum: true,
    connector: false,
    leadership: true,
    kb: {
      capacitySource:
        "Foundation assets ≈ $40M; granted $1.2M to peer orgs last cycle (IRS 990-PF · 2024).",
      relationshipToCause: "Trustees care about clean-water access; aligned with Everyone Forever.",
      connectorsNote: "Tom Bradley (board) introduces the Hallworth trustees.",
      giftHistorySummary: "Three corporate grants over five years trending up to $200,000.",
      otherPhilanthropy: "Actively funds peer youth and water organizations.",
      timingNote: "Giving committee meets in Q3 — the campaign window is open now.",
    },
  },
  {
    key: "cordova",
    constituentKey: "cordova",
    status: "solicitation",
    rank: 2,
    rm: "dana",
    top33: true,
    momentum: false,
    connector: false,
    leadership: false,
    kb: {
      capacitySource: "Corporate water-stewardship budget; mid-six-figure capacity.",
      relationshipToCause: "ESG mandate aligns with watershed programs.",
      connectorsNote: "Sofia Lin connects to the Cordova ESG team.",
      giftHistorySummary: "Year-End Gala lead sponsor ($50,000) plus prior grants.",
      otherPhilanthropy: null,
      timingNote: "Renewal conversation underway this quarter.",
    },
  },
  {
    key: "vega",
    constituentKey: "vega",
    status: "research",
    rank: 3,
    rm: "dana",
    top33: false,
    momentum: false,
    connector: false,
    leadership: false,
    kb: {
      capacitySource: null,
      relationshipToCause: "Engaged through the Women & Water network.",
      connectorsNote: null,
      giftHistorySummary: "Several mid-level one-time gifts.",
      otherPhilanthropy: null,
      timingNote: null,
    },
  },
];

export async function seedProspects(db: Database, tenantId: string): Promise<void> {
  const userRows = await db.query.users.findMany({ where: eq(users.tenantId, tenantId) });
  const rmIds: Record<"dana" | "priya", string | undefined> = {
    dana: userRows.find((u) => u.email === "dana.reese@waterforpeople.org")?.id,
    priya: userRows.find((u) => u.email === "priya.nair@waterforpeople.org")?.id,
  };

  for (const p of PROSPECTS) {
    await db
      .insert(prospects)
      .values({
        id: stableId(`prospect:${p.key}`),
        tenantId,
        constituentId: stableId(`constituent:${p.constituentKey}`),
        rank: p.rank,
        rmUserId: rmIds[p.rm] ?? null,
        status: p.status,
        top33: p.top33,
        momentum: p.momentum,
        connector: p.connector,
        leadership: p.leadership,
      })
      .onConflictDoNothing({ target: prospects.id });

    await db
      .insert(knowledgeBase)
      .values({
        id: stableId(`kb:${p.key}`),
        tenantId,
        prospectId: stableId(`prospect:${p.key}`),
        capacitySource: p.kb.capacitySource,
        relationshipToCause: p.kb.relationshipToCause,
        connectorsNote: p.kb.connectorsNote,
        giftHistorySummary: p.kb.giftHistorySummary,
        otherPhilanthropy: p.kb.otherPhilanthropy,
        timingNote: p.kb.timingNote,
      })
      .onConflictDoNothing({ target: knowledgeBase.id });
  }
}

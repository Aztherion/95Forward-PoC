import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { users } from "./schema/users";
import {
  knowledgeBase,
  naturalPartners,
  prospects,
  prospectStrategy,
  qpiAssessments,
  relationshipMapEntries,
  researchGaps,
} from "./schema/prospects";
import { visits } from "./schema/execution";
import { stableId } from "./seed-records-core";

type ProspectStatus = "research" | "cultivation" | "solicitation" | "stewardship" | "active";
type Dimension = "capacity" | "relationship" | "timing" | "gift_history" | "philanthropy";
type Rm = "dana" | "priya";

interface DimSpec {
  rating: number | null;
  isUnknown: boolean;
  rationale: string | null;
  source: string | null;
}

interface PartnerSpec {
  constituentKey: string;
  role: string;
  warmPathNote: string;
}

interface StrategySpec {
  relationshipGoals?: string;
  hooks?: string;
  objections?: string;
  predispositionPlan?: string;
  presentationDesign?: string;
  actionPlan?: string;
}

interface VisitSpec {
  key: string;
  goal: string;
  discoveryQuestions?: string;
  team?: string;
  locationType?: string;
}

interface KdmSpec {
  key: string;
  name: string;
  role: string;
  decisionPower: string;
  warmPathNote: string;
  source: string;
}

interface ProspectSpec {
  key: string;
  constituentKey: string;
  status: ProspectStatus;
  rank: number;
  rm: Rm;
  top33: boolean;
  momentum: boolean;
  leadership: boolean;
  qpi: Record<Dimension, DimSpec>;
  kb: {
    capacitySource: string | null;
    relationshipToCause: string | null;
    connectorsNote: string | null;
    giftHistorySummary: string | null;
    otherPhilanthropy: string | null;
    timingNote: string | null;
  };
  partners: PartnerSpec[];
  gaps?: string[];
  strategy?: StrategySpec;
  visits?: VisitSpec[];
  kdms?: KdmSpec[];
}

function known(rating: number, rationale: string, source: string): DimSpec {
  return { rating, isUnknown: false, rationale, source };
}

function gap(note: string): DimSpec {
  return { rating: null, isUnknown: true, rationale: note, source: null };
}

// Per-dimension 1-5 ratings are chosen so that Σ(rating × default weight [7/6/3/2/2]) equals each
// prospect's authoritative Water For People grounding total (Hallworth 92 … Bello 40). Research-stage
// prospects carry genuine unknown gaps (contributing 0) — that is why their totals are lower.
const PROSPECTS: ProspectSpec[] = [
  {
    key: "hallworth",
    constituentKey: "hallworth",
    status: "cultivation",
    rank: 1,
    rm: "dana",
    top33: true,
    momentum: true,
    leadership: true,
    qpi: {
      capacity: known(
        5,
        "Foundation assets ≈ $180M; makes $1M+ global-development grants.",
        "IRS 990-PF · 2024",
      ),
      relationship: known(
        4,
        "Trustee David Hallworth serves with our CDO Ruth on a water-sector board; institutional relationship still building.",
        "Logged · Dana R.",
      ),
      timing: known(
        5,
        "Board reviews multi-year commitments this quarter — the window is open.",
        "Logged · Dana R.",
      ),
      gift_history: known(
        4,
        "Three grants over four years, trending up ($50K → $120K → $200K).",
        "Gift records",
      ),
      philanthropy: known(5, "Funds WASH and global health broadly.", "IRS 990-PF · 2024"),
    },
    kb: {
      capacitySource:
        "Foundation assets ≈ $180M; makes $1M+ global-development grants (IRS 990-PF · 2024).",
      relationshipToCause:
        "Trustees care about clean-water access; aligned with Everyone Forever: Bolivia Scale-Up.",
      connectorsNote: "Tom Bradley (board) introduces the Hallworth trustees.",
      giftHistorySummary: "Three grants over four years trending up ($50K → $120K → $200K).",
      otherPhilanthropy: "Funds WASH and global health broadly.",
      timingNote: "Board reviews multi-year commitments this quarter — the window is open.",
    },
    partners: [
      {
        constituentKey: "bradley",
        role: "Board connector",
        warmPathNote: "Tom Bradley introduces the Hallworth trustees.",
      },
    ],
    gaps: ["Wealth screen on the trustees", "Spouse / family giving connections"],
    strategy: {
      relationshipGoals:
        "Move from an institutional contact to a personal relationship with David Hallworth, anchored on Everyone Forever: Bolivia Scale-Up.",
      hooks:
        "Clean-water access; global health; the multi-year, measurable Everyone Forever model.",
      objections:
        "May prefer a single-year grant over a multi-year commitment; will want evidence of sustained local capacity.",
      predispositionPlan:
        "Tom Bradley makes the warm introduction; invite a trustee to a Bolivia program briefing before any ask.",
      presentationDesign:
        "Lead with the Bolivia Scale-Up as a flagship multi-year commitment with clear coverage milestones.",
      actionPlan:
        "Bradley intro this month → trustee briefing → cultivation visit → align on a lead gift to Bolivia.",
    },
    visits: [
      {
        key: "bolivia-brief",
        goal: "Confirm trustee interest in the Bolivia Scale-Up and surface who else shapes the decision.",
        discoveryQuestions:
          "What outcomes matter most to the board this cycle? Who else weighs in on a multi-year commitment? What would make this an easy yes?",
        team: "Dana Reese; Ruth Castellanos (CDO)",
        locationType: "In person — foundation office",
      },
    ],
    kdms: [
      {
        key: "david",
        name: "David Hallworth",
        role: "Trustee",
        decisionPower: "High — sits on the grants committee",
        warmPathNote: "Serves with our CDO Ruth on a water-sector board.",
        source: "Board minutes",
      },
      {
        key: "program-officer",
        name: "Program Officer (WASH)",
        role: "Program officer",
        decisionPower: "Medium — screens and recommends grants",
        warmPathNote: "No warm path yet — worth an introduction.",
        source: "IRS 990-PF · 2024",
      },
    ],
  },
  {
    key: "cordova",
    constituentKey: "cordova",
    status: "solicitation",
    rank: 2,
    rm: "dana",
    top33: true,
    momentum: false,
    leadership: false,
    qpi: {
      capacity: known(
        4,
        "Corporate water-stewardship budget supports mid-six-figure commitments.",
        "Logged · Dana R.",
      ),
      relationship: known(
        4,
        "Active sponsor relationship; ESG team engaged through Sofia Lin.",
        "Logged · Dana R.",
      ),
      timing: known(5, "Renewal conversation underway this quarter.", "Logged · Dana R."),
      gift_history: known(
        5,
        "Year-End Gala lead sponsor ($50,000) plus prior grants, trending up.",
        "Gift records",
      ),
      philanthropy: known(3, "ESG mandate aligned with watershed programs.", "Company ESG report"),
    },
    kb: {
      capacitySource: "Corporate water-stewardship budget; mid-six-figure capacity.",
      relationshipToCause: "ESG mandate aligns with watershed programs.",
      connectorsNote: "Sofia Lin connects to the Cordova ESG team.",
      giftHistorySummary: "Year-End Gala lead sponsor ($50,000) plus prior grants.",
      otherPhilanthropy: "Corporate giving focused on environmental stewardship.",
      timingNote: "Renewal conversation underway this quarter.",
    },
    partners: [
      {
        constituentKey: "lin",
        role: "ESG connector",
        warmPathNote: "Sofia Lin connects to the Cordova ESG team.",
      },
    ],
    strategy: {
      relationshipGoals:
        "Convert the ESG conversation into a multi-year water-stewardship partnership in an active district.",
      hooks: "Water-stewardship mandate; measurable coverage outcomes; employee-engagement angle.",
      actionPlan:
        "Sofia Lin warms the ESG team → align a corporate grant to a Today district push.",
    },
    kdms: [
      {
        key: "esg-lead",
        name: "Head of ESG",
        role: "ESG lead",
        decisionPower: "High — owns the water-stewardship budget",
        warmPathNote: "Reached through Sofia Lin.",
        source: "Company ESG report",
      },
    ],
  },
  {
    key: "osgood",
    constituentKey: "osgood",
    status: "research",
    rank: 3,
    rm: "priya",
    top33: false,
    momentum: false,
    leadership: false,
    qpi: {
      capacity: known(4, "Foundation with a strong WASH-program endowment.", "IRS 990-PF · 2024"),
      relationship: known(
        4,
        "Program officer engaged; Priya in regular contact.",
        "Logged · Priya N.",
      ),
      timing: known(3, "Grant cycle opens next quarter.", "Foundation guidelines"),
      gift_history: known(3, "Two prior WASH grants on record.", "Gift records"),
      philanthropy: known(5, "WASH is a core funding priority.", "IRS 990-PF · 2024"),
    },
    kb: {
      capacitySource: "Foundation with a strong WASH-program endowment.",
      relationshipToCause: "WASH district programs are a core funding priority.",
      connectorsNote: null,
      giftHistorySummary: "Two prior WASH grants on record.",
      otherPhilanthropy: "Funds water, sanitation, and hygiene globally.",
      timingNote: "Grant cycle opens next quarter.",
    },
    partners: [],
    gaps: [
      "Program officer's giving-committee influence",
      "Whether the grant cycle allows multi-year asks",
    ],
    strategy: {
      relationshipGoals:
        "Build a direct line to the program officer ahead of the next grant cycle.",
      hooks: "WASH district programs; measurable Everyone Forever milestones.",
    },
    kdms: [
      {
        key: "program-officer",
        name: "Program Officer",
        role: "Program officer",
        decisionPower: "Medium — recommends grants to the committee",
        warmPathNote: "Priya is in regular contact.",
        source: "Foundation guidelines",
      },
    ],
  },
  {
    key: "vega",
    constituentKey: "vega",
    status: "research",
    rank: 4,
    rm: "dana",
    top33: false,
    momentum: false,
    leadership: false,
    qpi: {
      capacity: known(4, "Established philanthropist with major-gift capacity.", "Wealth screen"),
      relationship: known(4, "Engaged through the Women & Water network.", "Logged · Dana R."),
      timing: known(2, "No active ask window yet.", "Logged · Dana R."),
      gift_history: known(3, "Several mid-level one-time gifts.", "Gift records"),
      philanthropy: known(3, "Supports women's leadership and water causes.", "Public profile"),
    },
    kb: {
      capacitySource: "Established philanthropist with major-gift capacity.",
      relationshipToCause: "Engaged through the Women & Water network.",
      connectorsNote: null,
      giftHistorySummary: "Several mid-level one-time gifts.",
      otherPhilanthropy: "Supports women's leadership initiatives.",
      timingNote: "No active ask window yet — continue cultivation.",
    },
    partners: [],
  },
  {
    key: "cornerstone",
    constituentKey: "cornerstone",
    status: "research",
    rank: 5,
    rm: "priya",
    top33: false,
    momentum: false,
    leadership: false,
    qpi: {
      capacity: known(4, "Charitable trust with a solid corpus.", "Trust filings"),
      relationship: known(
        4,
        "Marcus Webb (trustee colleague) opens the door.",
        "Logged · Priya N.",
      ),
      timing: known(
        2,
        "Trustees meet semi-annually; next window later this year.",
        "Logged · Priya N.",
      ),
      gift_history: gap("No gift history on record yet — worth researching."),
      philanthropy: known(3, "Faith-based community giving focus.", "Public profile"),
    },
    kb: {
      capacitySource: "Charitable trust with a solid corpus.",
      relationshipToCause: "Faith-based community giving aligns with local water access.",
      connectorsNote: "Marcus Webb sits with the Cornerstone trustees.",
      giftHistorySummary: null,
      otherPhilanthropy: "Community and faith-based causes.",
      timingNote: "Trustees meet semi-annually; next window later this year.",
    },
    partners: [
      {
        constituentKey: "webb",
        role: "Trustee colleague",
        warmPathNote: "Marcus Webb sits with the Cornerstone trustees.",
      },
    ],
  },
  {
    key: "whitfield",
    constituentKey: "whitfield",
    status: "research",
    rank: 6,
    rm: "dana",
    top33: false,
    momentum: false,
    leadership: false,
    qpi: {
      capacity: known(
        4,
        "Longtime donors with appreciated assets and legacy intent.",
        "Logged · Dana R.",
      ),
      relationship: known(
        4,
        "Strong personal relationship; Tom Bradley is a longtime friend.",
        "Logged · Dana R.",
      ),
      timing: gap("Legacy gift timing depends on estate planning — worth a conversation."),
      gift_history: known(1, "Modest recent annual gifts.", "Gift records"),
      philanthropy: known(2, "Focused giving to a few causes.", "Logged · Dana R."),
    },
    kb: {
      capacitySource: "Longtime donors with appreciated assets and legacy intent.",
      relationshipToCause: "Care deeply about a lasting clean-water legacy.",
      connectorsNote: "Tom Bradley is a longtime friend of the Whitfields.",
      giftHistorySummary: "Modest recent annual gifts; legacy intent is the opportunity.",
      otherPhilanthropy: "Focused giving to a few trusted causes.",
      timingNote: null,
    },
    partners: [
      {
        constituentKey: "bradley",
        role: "Personal friend",
        warmPathNote: "Tom Bradley is a longtime friend of the Whitfields.",
      },
    ],
  },
  {
    key: "northwater",
    constituentKey: "northwater",
    status: "research",
    rank: 7,
    rm: "priya",
    top33: false,
    momentum: false,
    leadership: false,
    qpi: {
      capacity: gap("Impact-investment vehicle — grant capacity unclear; worth researching."),
      relationship: known(
        4,
        "Impact partner overseeing water-sector investments.",
        "Logged · Priya N.",
      ),
      timing: known(4, "Evaluating water-sector commitments this cycle.", "Logged · Priya N."),
      gift_history: known(
        4,
        "Prior impact commitments to peer water organizations.",
        "Public filings",
      ),
      philanthropy: known(2, "Impact-first, mission-aligned mandate.", "Company materials"),
    },
    kb: {
      capacitySource: null,
      relationshipToCause: "Impact-investment thesis aligns with water-sector infrastructure.",
      connectorsNote: null,
      giftHistorySummary: "Prior impact commitments to peer water organizations.",
      otherPhilanthropy: "Impact-first investing across the water sector.",
      timingNote: "Evaluating water-sector commitments this cycle.",
    },
    partners: [],
  },
  {
    key: "bello",
    constituentKey: "bello",
    status: "research",
    rank: 8,
    rm: "dana",
    top33: false,
    momentum: false,
    leadership: false,
    qpi: {
      capacity: gap("Individual capacity not yet screened — worth researching."),
      relationship: known(
        3,
        "Board member's colleague; introduced via Tom Bradley.",
        "Logged · Dana R.",
      ),
      timing: known(4, "Newly engaged and open to a first conversation.", "Logged · Dana R."),
      gift_history: known(1, "First-time prospect; no prior gifts on record.", "Gift records"),
      philanthropy: known(4, "Actively supports climate and health causes.", "Public profile"),
    },
    kb: {
      capacitySource: null,
      relationshipToCause: "Climate-and-health lens aligns with clean-water access.",
      connectorsNote: "Tom Bradley's colleague; can make the introduction.",
      giftHistorySummary: "First-time prospect; no prior gifts on record.",
      otherPhilanthropy: "Supports climate and global-health causes.",
      timingNote: "Newly engaged and open to a first conversation.",
    },
    partners: [
      {
        constituentKey: "bradley",
        role: "Colleague introduction",
        warmPathNote: "Tom Bradley's colleague; can make the introduction.",
      },
    ],
  },
];

export async function seedProspects(db: Database, tenantId: string): Promise<void> {
  const userRows = await db.query.users.findMany({ where: eq(users.tenantId, tenantId) });
  const rmIds: Record<Rm, string | undefined> = {
    dana: userRows.find((u) => u.email === "dana.reese@waterforpeople.org")?.id,
    priya: userRows.find((u) => u.email === "priya.nair@waterforpeople.org")?.id,
  };

  for (const p of PROSPECTS) {
    const prospectId = stableId(`prospect:${p.key}`);
    const rmUserId = rmIds[p.rm] ?? null;

    await db
      .insert(prospects)
      .values({
        id: prospectId,
        tenantId,
        constituentId: stableId(`constituent:${p.constituentKey}`),
        rank: p.rank,
        rmUserId,
        status: p.status,
        top33: p.top33,
        momentum: p.momentum,
        connector: p.partners.length > 0,
        leadership: p.leadership,
      })
      .onConflictDoNothing({ target: prospects.id });

    await db
      .insert(knowledgeBase)
      .values({ id: stableId(`kb:${p.key}`), tenantId, prospectId, ...p.kb })
      .onConflictDoNothing({ target: knowledgeBase.id });

    for (const dimension of Object.keys(p.qpi) as Dimension[]) {
      const d = p.qpi[dimension];
      await db
        .insert(qpiAssessments)
        .values({
          id: stableId(`qpi:${p.key}:${dimension}`),
          tenantId,
          prospectId,
          dimension,
          rating: d.rating,
          isUnknown: d.isUnknown,
          rationale: d.rationale,
          source: d.source,
          updatedByUserId: rmUserId,
        })
        .onConflictDoUpdate({
          target: qpiAssessments.id,
          set: {
            rating: d.rating,
            isUnknown: d.isUnknown,
            rationale: d.rationale,
            source: d.source,
            updatedByUserId: rmUserId,
          },
        });
    }

    for (const partner of p.partners) {
      await db
        .insert(naturalPartners)
        .values({
          id: stableId(`np:${p.key}:${partner.constituentKey}`),
          tenantId,
          prospectId,
          constituentId: stableId(`constituent:${partner.constituentKey}`),
          role: partner.role,
          warmPathNote: partner.warmPathNote,
        })
        .onConflictDoNothing({ target: naturalPartners.id });
    }

    for (const label of p.gaps ?? []) {
      await db
        .insert(researchGaps)
        .values({
          id: stableId(`gap:${p.key}:${label}`),
          tenantId,
          prospectId,
          label,
          status: "open",
        })
        .onConflictDoNothing({ target: researchGaps.id });
    }

    if (p.strategy) {
      await db
        .insert(prospectStrategy)
        .values({
          id: stableId(`strategy:${p.key}`),
          tenantId,
          prospectId,
          relationshipGoals: p.strategy.relationshipGoals ?? null,
          hooks: p.strategy.hooks ?? null,
          objections: p.strategy.objections ?? null,
          predispositionPlan: p.strategy.predispositionPlan ?? null,
          presentationDesign: p.strategy.presentationDesign ?? null,
          actionPlan: p.strategy.actionPlan ?? null,
        })
        .onConflictDoUpdate({
          target: [prospectStrategy.tenantId, prospectStrategy.prospectId],
          set: {
            relationshipGoals: p.strategy.relationshipGoals ?? null,
            hooks: p.strategy.hooks ?? null,
            objections: p.strategy.objections ?? null,
            predispositionPlan: p.strategy.predispositionPlan ?? null,
            presentationDesign: p.strategy.presentationDesign ?? null,
            actionPlan: p.strategy.actionPlan ?? null,
          },
        });
    }

    for (const v of p.visits ?? []) {
      await db
        .insert(visits)
        .values({
          id: stableId(`visit:${p.key}:${v.key}`),
          tenantId,
          prospectId,
          goal: v.goal,
          discoveryQuestions: v.discoveryQuestions ?? null,
          team: v.team ?? null,
          locationType: v.locationType ?? null,
        })
        .onConflictDoNothing({ target: visits.id });
    }

    for (const k of p.kdms ?? []) {
      await db
        .insert(relationshipMapEntries)
        .values({
          id: stableId(`kdm:${p.key}:${k.key}`),
          tenantId,
          prospectId,
          name: k.name,
          role: k.role,
          decisionPower: k.decisionPower,
          warmPathNote: k.warmPathNote,
          source: k.source,
        })
        .onConflictDoNothing({ target: relationshipMapEntries.id });
    }
  }
}

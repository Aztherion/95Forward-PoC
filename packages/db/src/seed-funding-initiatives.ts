import type { Database } from "./client";
import { fundingInitiatives, prospectFundingInitiatives } from "./schema/funding";
import { stableId } from "./seed-records-core";

type Frame = "today" | "tomorrow" | "forever";

interface InitiativeSpec {
  key: string;
  name: string;
  frame: Frame;
  goalAmountCents: number;
  timelineStart: string;
  timelineEnd: string | null;
  story: string;
}

// The three grounded Water For People initiatives, one per horizon. Goals are illustrative
// constructs in the shape of the real Everyone Forever model. Bolivia's $3.2M is the lead-gift
// target Hallworth's existing $2.8M host opportunity is cultivating toward.
const INITIATIVES: InitiativeSpec[] = [
  {
    key: "kamuli",
    name: "Everyone in Kamuli — Uganda 2026",
    frame: "today",
    goalAmountCents: 45_000_000,
    timelineStart: "2026-01-01",
    timelineEnd: "2026-12-31",
    story:
      "This year, in one Ugandan district, we finish the job. Everyone in Kamuli closes the last gap to full water coverage — every household, school, and clinic reached before the year is out. Your gift funds the final push to the milestone where a district can say: everyone, here, now.",
  },
  {
    key: "bolivia",
    name: "Everyone Forever: Bolivia Scale-Up",
    frame: "tomorrow",
    goalAmountCents: 320_000_000,
    timelineStart: "2026-01-01",
    timelineEnd: "2028-12-31",
    story:
      "Over three years, we bring an entire Bolivian region to full, self-sustaining water coverage — and then we leave, because the services last without us. This is the patient, multi-year commitment behind Everyone Forever: infrastructure and institutions built together so that coverage holds for a generation.",
  },
  {
    key: "forever-promise",
    name: "The Forever Promise — Sustainability & Legacy",
    frame: "forever",
    goalAmountCents: 800_000_000,
    timelineStart: "2026-01-01",
    timelineEnd: null,
    story:
      "Water that lasts needs more than pipes — it needs a promise kept across decades. The Forever Promise is our endowment and legacy fund: planned gifts that keep services running long after we exit, so that Everyone, Forever is not a slogan but a guarantee carried forward by those who come after us.",
  },
];

// The cultivation associations realize the grounding's prospect -> horizon mapping. This is the soft
// pipeline link, NOT a frame column on the prospect — a prospect's horizon emerges from these rows.
const ASSOCIATIONS: { prospectKey: string; initiativeKey: string }[] = [
  { prospectKey: "hallworth", initiativeKey: "bolivia" },
  { prospectKey: "cordova", initiativeKey: "kamuli" },
  { prospectKey: "osgood", initiativeKey: "bolivia" },
  { prospectKey: "vega", initiativeKey: "bolivia" },
  { prospectKey: "cornerstone", initiativeKey: "kamuli" },
  { prospectKey: "whitfield", initiativeKey: "forever-promise" },
  { prospectKey: "northwater", initiativeKey: "bolivia" },
  { prospectKey: "bello", initiativeKey: "forever-promise" },
];

export async function seedFundingInitiatives(db: Database, tenantId: string): Promise<void> {
  for (const i of INITIATIVES) {
    await db
      .insert(fundingInitiatives)
      .values({
        id: stableId(`initiative:${i.key}`),
        tenantId,
        name: i.name,
        frame: i.frame,
        story: i.story,
        goalAmountCents: i.goalAmountCents,
        timelineStart: i.timelineStart,
        timelineEnd: i.timelineEnd,
      })
      .onConflictDoUpdate({
        target: fundingInitiatives.id,
        set: {
          name: i.name,
          frame: i.frame,
          story: i.story,
          goalAmountCents: i.goalAmountCents,
          timelineStart: i.timelineStart,
          timelineEnd: i.timelineEnd,
        },
      });
  }

  for (const a of ASSOCIATIONS) {
    await db
      .insert(prospectFundingInitiatives)
      .values({
        id: stableId(`cultivation:${a.prospectKey}:${a.initiativeKey}`),
        tenantId,
        prospectId: stableId(`prospect:${a.prospectKey}`),
        fundingInitiativeId: stableId(`initiative:${a.initiativeKey}`),
      })
      .onConflictDoNothing({ target: prospectFundingInitiatives.id });
  }
}

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { users } from "./schema/users";
import {
  constituents,
  constituentTags,
  interactions,
  relationships,
  tags,
} from "./schema/constituents";
import { appeals, campaigns, funds, gifts } from "./schema/revenue";
import type { constituentTypeEnum, giftTypeEnum } from "./schema/enums";

type ConstituentType = (typeof constituentTypeEnum.enumValues)[number];
type GiftType = (typeof giftTypeEnum.enumValues)[number];
type ProspectStatus = "none" | "suspect" | "prospect" | "active" | "donor";

export function stableId(key: string): string {
  const hash = createHash("sha1").update(key).digest("hex");
  const hex = hash.slice(0, 32);
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

function rng(seed: string): () => number {
  let state = parseInt(createHash("sha1").update(seed).digest("hex").slice(0, 8), 16) || 1;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function pick<T>(next: () => number, items: readonly T[]): T {
  const item = items[Math.floor(next() * items.length) % items.length];
  if (item === undefined) {
    throw new Error("pick: empty items array");
  }
  return item;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function at<T>(items: readonly T[], index: number): T {
  const item = items[((index % items.length) + items.length) % items.length];
  if (item === undefined) {
    throw new Error("at: empty items array");
  }
  return item;
}

interface FundSpec {
  key: string;
  name: string;
  code: string;
}

interface CampaignSpec {
  key: string;
  name: string;
  code: string;
}

interface AppealSpec {
  key: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string | null;
}

const FUNDS: FundSpec[] = [
  { key: "everyone-forever", name: "Everyone Forever Fund", code: "EF" },
  { key: "uganda-kamuli", name: "Uganda — Kamuli District", code: "UG-KAM" },
  { key: "bolivia", name: "Bolivia Programs", code: "BO" },
  { key: "guatemala", name: "Guatemala Programs", code: "GT" },
  { key: "india-birbhum", name: "India — Birbhum", code: "IN-BIR" },
  { key: "rwanda", name: "Rwanda Programs", code: "RW" },
  { key: "global-hub", name: "Global Hub Operations", code: "HUB" },
];

const CAMPAIGNS: CampaignSpec[] = [
  { key: "wavemaker", name: "Wavemaker", code: "WM" },
  { key: "world-water-day", name: "World Water Day", code: "WWD" },
  { key: "everyone-forever", name: "Everyone Forever", code: "EFC" },
];

const APPEALS: AppealSpec[] = [
  {
    key: "wavemaker-monthly",
    name: "Wavemaker Monthly",
    code: "WM-MO",
    startDate: "2023-01-01",
    endDate: null,
  },
  {
    key: "world-water-day-2026",
    name: "World Water Day 2026",
    code: "WWD-26",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
  },
  {
    key: "year-end-2025",
    name: "Year-End 2025",
    code: "YE-25",
    startDate: "2025-11-01",
    endDate: "2025-12-31",
  },
  {
    key: "spring-2026",
    name: "Spring 2026 Appeal",
    code: "SP-26",
    startDate: "2026-03-15",
    endDate: "2026-05-15",
  },
  {
    key: "world-water-day-2025",
    name: "World Water Day 2025",
    code: "WWD-25",
    startDate: "2025-03-01",
    endDate: "2025-03-31",
  },
];

type AssignedTo = "dana" | "priya" | "ruth" | null;

interface ConstituentSpec {
  key: string;
  type: ConstituentType;
  displayName: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  email?: string;
  phone?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  prospectStatus: ProspectStatus;
  assignedTo: AssignedTo;
  boardMember?: boolean;
  volunteer?: boolean;
  wavemakerMonthly?: boolean;
  legacy?: boolean;
  hostLikelihood?: number;
  tags: string[];
}

const TAG_NAMES = [
  "Major donor",
  "Wavemaker",
  "Legacy",
  "Board member",
  "Corporate partner",
  "Lapsed",
  "Foundation",
  "Volunteer",
  "Climate",
  "Women & Water",
] as const;

const NAMED: ConstituentSpec[] = [
  {
    key: "hallworth",
    type: "foundation",
    displayName: "The Hallworth Family Foundation",
    organizationName: "The Hallworth Family Foundation",
    email: "grants@hallworthfdn.org",
    phone: "+1-303-555-0142",
    city: "Denver",
    region: "CO",
    postalCode: "80202",
    country: "USA",
    prospectStatus: "donor",
    assignedTo: "dana",
    hostLikelihood: 91,
    tags: ["Foundation", "Major donor", "Climate"],
  },
  {
    key: "cordova",
    type: "organization",
    displayName: "Cordova Beverage Company",
    organizationName: "Cordova Beverage Company",
    email: "giving@cordovabev.com",
    phone: "+1-312-555-0188",
    city: "Chicago",
    region: "IL",
    postalCode: "60601",
    country: "USA",
    prospectStatus: "donor",
    assignedTo: "dana",
    hostLikelihood: 84,
    tags: ["Corporate partner", "Major donor"],
  },
  {
    key: "osgood",
    type: "foundation",
    displayName: "The Osgood Foundation",
    organizationName: "The Osgood Foundation",
    email: "info@osgoodfoundation.org",
    phone: "+1-206-555-0110",
    city: "Seattle",
    region: "WA",
    postalCode: "98101",
    country: "USA",
    prospectStatus: "donor",
    assignedTo: "priya",
    hostLikelihood: 78,
    tags: ["Foundation", "Major donor"],
  },
  {
    key: "vega",
    type: "individual",
    displayName: "Marisol Vega",
    firstName: "Marisol",
    lastName: "Vega",
    email: "marisol.vega@example.com",
    phone: "+1-415-555-0173",
    city: "San Francisco",
    region: "CA",
    postalCode: "94105",
    country: "USA",
    prospectStatus: "prospect",
    assignedTo: "dana",
    hostLikelihood: 71,
    tags: ["Major donor", "Women & Water"],
  },
  {
    key: "cornerstone",
    type: "foundation",
    displayName: "Cornerstone Charitable Trust",
    organizationName: "Cornerstone Charitable Trust",
    email: "trustees@cornerstonetrust.org",
    phone: "+1-214-555-0156",
    city: "Dallas",
    region: "TX",
    postalCode: "75201",
    country: "USA",
    prospectStatus: "active",
    assignedTo: "priya",
    hostLikelihood: 65,
    tags: ["Foundation"],
  },
  {
    key: "whitfield",
    type: "individual",
    displayName: "James & Eleanor Whitfield",
    firstName: "James",
    lastName: "Whitfield",
    email: "whitfield.household@example.com",
    phone: "+1-303-555-0199",
    city: "Boulder",
    region: "CO",
    postalCode: "80301",
    country: "USA",
    prospectStatus: "donor",
    assignedTo: "dana",
    legacy: true,
    hostLikelihood: 58,
    tags: ["Legacy", "Major donor"],
  },
  {
    key: "northwater",
    type: "organization",
    displayName: "Northwater Capital",
    organizationName: "Northwater Capital",
    email: "impact@northwatercapital.com",
    phone: "+1-212-555-0124",
    city: "New York",
    region: "NY",
    postalCode: "10004",
    country: "USA",
    prospectStatus: "prospect",
    assignedTo: "priya",
    hostLikelihood: 49,
    tags: ["Corporate partner"],
  },
  {
    key: "bello",
    type: "individual",
    displayName: "Dr. Aisha Bello",
    firstName: "Aisha",
    lastName: "Bello",
    email: "aisha.bello@example.com",
    phone: "+1-617-555-0137",
    city: "Boston",
    region: "MA",
    postalCode: "02108",
    country: "USA",
    prospectStatus: "suspect",
    assignedTo: "dana",
    hostLikelihood: 40,
    tags: ["Climate"],
  },
];

const CONNECTORS: ConstituentSpec[] = [
  {
    key: "bradley",
    type: "individual",
    displayName: "Tom Bradley",
    firstName: "Tom",
    lastName: "Bradley",
    email: "tom.bradley@example.com",
    phone: "+1-303-555-0101",
    city: "Denver",
    region: "CO",
    postalCode: "80203",
    country: "USA",
    prospectStatus: "donor",
    assignedTo: "ruth",
    boardMember: true,
    hostLikelihood: 62,
    tags: ["Board member", "Major donor"],
  },
  {
    key: "lin",
    type: "individual",
    displayName: "Sofia Lin",
    firstName: "Sofia",
    lastName: "Lin",
    email: "sofia.lin@example.com",
    phone: "+1-408-555-0119",
    city: "San Jose",
    region: "CA",
    postalCode: "95110",
    country: "USA",
    prospectStatus: "donor",
    assignedTo: "priya",
    volunteer: true,
    tags: ["Volunteer"],
  },
  {
    key: "webb",
    type: "individual",
    displayName: "Marcus Webb",
    firstName: "Marcus",
    lastName: "Webb",
    email: "marcus.webb@example.com",
    phone: "+1-214-555-0166",
    city: "Dallas",
    region: "TX",
    postalCode: "75204",
    country: "USA",
    prospectStatus: "donor",
    assignedTo: "priya",
    boardMember: true,
    tags: ["Board member"],
  },
];

const FIRST_NAMES = [
  "Grace",
  "Daniel",
  "Naomi",
  "Samuel",
  "Olivia",
  "Caleb",
  "Hannah",
  "Isaac",
  "Maya",
  "Leo",
  "Clara",
  "Owen",
  "Ruth",
  "Eli",
  "Nora",
  "Theo",
  "Iris",
  "Jonah",
  "Lena",
  "Felix",
  "Greta",
  "Miles",
  "Esther",
  "Hugo",
] as const;

const LAST_NAMES = [
  "Abernathy",
  "Calloway",
  "Donnelly",
  "Ellsworth",
  "Fairbanks",
  "Greenwood",
  "Holloway",
  "Ingram",
  "Kavanagh",
  "Lindqvist",
  "Montrose",
  "Nakamura",
  "Ortega",
  "Pemberton",
  "Quartey",
  "Ridgeway",
  "Sorenson",
  "Thackeray",
  "Underhill",
  "Vasquez",
  "Winslow",
  "Yarbrough",
  "Ashford",
  "Brennan",
] as const;

const ORG_NAMES = [
  "Summit Ridge Partners",
  "Blue Mesa Industries",
  "Cedar Hollow Group",
  "Meridian Logistics",
  "Front Range Manufacturing",
  "Larkspur Holdings",
] as const;

const FDN_NAMES = [
  "The Aldridge Foundation",
  "Willow Creek Family Foundation",
  "The Sterling Community Trust",
  "Highline Charitable Foundation",
] as const;

const CITIES: [string, string, string][] = [
  ["Denver", "CO", "80205"],
  ["Boulder", "CO", "80302"],
  ["Fort Collins", "CO", "80521"],
  ["Colorado Springs", "CO", "80903"],
  ["Aurora", "CO", "80012"],
  ["Portland", "OR", "97201"],
  ["Austin", "TX", "78701"],
  ["Minneapolis", "MN", "55401"],
  ["Atlanta", "GA", "30303"],
  ["Phoenix", "AZ", "85003"],
];

function buildGenericConstituents(): ConstituentSpec[] {
  const next = rng("generic-constituents");
  const out: ConstituentSpec[] = [];
  const wavemakerCount = 7;
  const legacyCount = 4;
  const orgCount = 3;
  const fdnCount = 3;
  const total = 23;

  for (let i = 0; i < total; i += 1) {
    const key = `generic-${i}`;
    const [city, region, postalCode] = at(CITIES, i);
    const assigned = pick<AssignedTo>(next, ["dana", "priya", "ruth"]);
    const tagList: string[] = [];

    let spec: ConstituentSpec;
    if (i < orgCount) {
      const name = at(ORG_NAMES, i);
      tagList.push("Corporate partner");
      spec = {
        key,
        type: "organization",
        displayName: name,
        organizationName: name,
        email: `giving@${name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
        phone: `+1-${300 + i}-555-0${pad(100 + i)}`,
        city,
        region,
        postalCode,
        country: "USA",
        prospectStatus: "donor",
        assignedTo: assigned,
        tags: tagList,
      };
    } else if (i < orgCount + fdnCount) {
      const name = at(FDN_NAMES, i - orgCount);
      tagList.push("Foundation");
      spec = {
        key,
        type: "foundation",
        displayName: name,
        organizationName: name,
        email: `info@${name.toLowerCase().replace(/[^a-z]+/g, "")}.org`,
        phone: `+1-${300 + i}-555-0${pad(100 + i)}`,
        city,
        region,
        postalCode,
        country: "USA",
        prospectStatus: "donor",
        assignedTo: assigned,
        tags: tagList,
      };
    } else {
      const firstName = at(FIRST_NAMES, i);
      const lastName = at(LAST_NAMES, i * 3);
      const isWavemaker = i >= total - wavemakerCount;
      const isLegacy = i >= orgCount + fdnCount && i < orgCount + fdnCount + legacyCount;
      const isLapsed = i % 9 === 0;
      const isBoard = i % 11 === 0;
      const isVolunteer = i % 5 === 0;
      if (isWavemaker) tagList.push("Wavemaker");
      if (isLegacy) tagList.push("Legacy");
      if (isLapsed) tagList.push("Lapsed");
      if (isBoard) tagList.push("Board member");
      if (isVolunteer) tagList.push("Volunteer");
      spec = {
        key,
        type: "individual",
        displayName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `+1-${300 + i}-555-0${pad(100 + i)}`,
        city,
        region,
        postalCode,
        country: "USA",
        prospectStatus: isLapsed ? "none" : "donor",
        assignedTo: assigned,
        boardMember: isBoard,
        volunteer: isVolunteer,
        wavemakerMonthly: isWavemaker,
        legacy: isLegacy,
        tags: tagList,
      };
    }

    if (next() < 0.45) {
      spec.hostLikelihood = 40 + Math.floor(next() * 56);
    }
    out.push(spec);
  }
  return out;
}

interface ResolvedRefs {
  tenantId: string;
  fundIds: Map<string, string>;
  campaignIds: Map<string, string>;
  appealIds: Map<string, string>;
  userIds: Record<"dana" | "priya" | "ruth", string>;
}

interface GiftRow {
  id: string;
  tenantId: string;
  constituentId: string;
  amountCents: number;
  giftDate: string;
  fundId: string | null;
  campaignId: string | null;
  appealId: string | null;
  giftType: GiftType;
  designation: string | null;
  receiptStatus: string;
}

function buildGiftsFor(
  spec: ConstituentSpec,
  constituentId: string,
  refs: ResolvedRefs,
): GiftRow[] {
  const next = rng(`gifts:${spec.key}`);
  const rows: GiftRow[] = [];
  const ef = refs.fundIds.get("everyone-forever") ?? null;
  const countryFundKeys = ["uganda-kamuli", "bolivia", "guatemala", "india-birbhum", "rwanda"];
  const receipt = (): string => (next() < 0.85 ? "receipted" : "unreceipted");

  const add = (g: Omit<GiftRow, "id" | "tenantId" | "constituentId">, idx: number): void => {
    rows.push({
      id: stableId(`gift:${spec.key}:${idx}`),
      tenantId: refs.tenantId,
      constituentId,
      ...g,
    });
  };

  if (spec.key === "hallworth") {
    const ladder = [
      { year: 2022, cents: 5_000_000 },
      { year: 2024, cents: 12_000_000 },
      { year: 2025, cents: 20_000_000 },
    ];
    ladder.forEach((step, idx) => {
      add(
        {
          amountCents: step.cents,
          giftDate: `${step.year}-09-${pad(10 + idx)}`,
          fundId: refs.fundIds.get("bolivia") ?? ef,
          campaignId: refs.campaignIds.get("everyone-forever") ?? null,
          appealId: null,
          giftType: "corporate_grant",
          designation: "Everyone Forever: Bolivia Scale-Up",
          receiptStatus: "receipted",
        },
        idx,
      );
    });
    return rows;
  }

  const countryFund = (): string | null => refs.fundIds.get(pick(next, countryFundKeys)) ?? ef;

  let idx = 0;
  if (spec.wavemakerMonthly) {
    const monthly = 2500 + Math.floor(next() * 7500);
    for (let m = 0; m < 18; m += 1) {
      const year = 2025 + Math.floor((2 + m) / 12);
      const month = ((2 + m) % 12) + 1;
      add(
        {
          amountCents: monthly,
          giftDate: `${year}-${pad(month)}-15`,
          fundId: ef,
          campaignId: refs.campaignIds.get("wavemaker") ?? null,
          appealId: refs.appealIds.get("wavemaker-monthly") ?? null,
          giftType: "recurring",
          designation: "Wavemaker monthly",
          receiptStatus: receipt(),
        },
        idx,
      );
      idx += 1;
    }
  }

  if (spec.legacy) {
    add(
      {
        amountCents: 25_000_00 + Math.floor(next() * 50_000_00),
        giftDate: `2025-06-${pad(5 + Math.floor(next() * 20))}`,
        fundId: ef,
        campaignId: refs.campaignIds.get("everyone-forever") ?? null,
        appealId: null,
        giftType: "planned",
        designation: "Legacy / planned gift — The Forever Promise",
        receiptStatus: "receipted",
      },
      idx,
    );
    idx += 1;
  }

  if (spec.type === "foundation" || spec.type === "organization") {
    const grants = 2 + Math.floor(next() * 3);
    for (let g = 0; g < grants; g += 1) {
      add(
        {
          amountCents: 1_500_000 + Math.floor(next() * 8_500_000),
          giftDate: `${2023 + (g % 3)}-${pad(1 + Math.floor(next() * 12))}-${pad(1 + Math.floor(next() * 27))}`,
          fundId: countryFund(),
          campaignId: refs.campaignIds.get("everyone-forever") ?? null,
          appealId: null,
          giftType: spec.type === "organization" && next() < 0.3 ? "in_kind" : "corporate_grant",
          designation: "Program grant",
          receiptStatus: receipt(),
        },
        idx,
      );
      idx += 1;
    }
  }

  const oneTimeCount = 2 + Math.floor(next() * 5);
  for (let o = 0; o < oneTimeCount; o += 1) {
    const year = 2023 + Math.floor(next() * 4);
    const isPledge = next() < 0.15;
    add(
      {
        amountCents: 5000 + Math.floor(next() * 495000),
        giftDate: `${year}-${pad(1 + Math.floor(next() * 12))}-${pad(1 + Math.floor(next() * 27))}`,
        fundId: next() < 0.5 ? ef : countryFund(),
        campaignId: next() < 0.5 ? (refs.campaignIds.get("world-water-day") ?? null) : null,
        appealId: pick(next, [
          refs.appealIds.get("year-end-2025") ?? null,
          refs.appealIds.get("world-water-day-2025") ?? null,
          refs.appealIds.get("spring-2026") ?? null,
          null,
        ]),
        giftType: isPledge ? "pledge" : "one_time",
        designation: next() < 0.4 ? "Everyone Forever Fund" : "Where needed most",
        receiptStatus: receipt(),
      },
      idx,
    );
    idx += 1;
  }

  return rows;
}

interface InteractionRow {
  id: string;
  tenantId: string;
  constituentId: string;
  type: string;
  occurredAt: Date;
  summary: string;
  ownerUserId: string;
}

function buildInteractions(
  spec: ConstituentSpec,
  constituentId: string,
  refs: ResolvedRefs,
): InteractionRow[] {
  const major = spec.hostLikelihood !== undefined && spec.hostLikelihood >= 55;
  if (!major && rng(`int-gate:${spec.key}`)() < 0.6) {
    return [];
  }
  const next = rng(`interactions:${spec.key}`);
  const owner =
    spec.assignedTo && spec.assignedTo !== null ? refs.userIds[spec.assignedTo] : refs.userIds.dana;
  const count = major ? 2 + Math.floor(next() * 3) : 1 + Math.floor(next() * 2);
  const types = ["call", "email", "meeting", "note"] as const;
  const rows: InteractionRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const month = 1 + Math.floor(next() * 12);
    const day = 1 + Math.floor(next() * 27);
    rows.push({
      id: stableId(`interaction:${spec.key}:${i}`),
      tenantId: refs.tenantId,
      constituentId,
      type: pick(next, types),
      occurredAt: new Date(Date.UTC(2025, month - 1, day, 16, 0, 0)),
      summary: `Touchpoint with ${spec.displayName} re: Everyone Forever giving.`,
      ownerUserId: owner,
    });
  }
  return rows;
}

interface RelationshipRow {
  id: string;
  tenantId: string;
  fromConstituentId: string;
  toConstituentId: string | null;
  externalName: string | null;
  type: string;
  note: string | null;
}

export async function seedRecordsCore(db: Database, tenantId: string): Promise<void> {
  const userRows = await db.query.users.findMany({ where: eq(users.tenantId, tenantId) });
  const userByEmail = new Map(userRows.map((u) => [u.email, u.id]));
  const dana = userByEmail.get("dana.reese@waterforpeople.org");
  const priya = userByEmail.get("priya.nair@waterforpeople.org");
  const ruth = userByEmail.get("ruth.castellanos@waterforpeople.org");
  if (!dana || !priya || !ruth) {
    throw new Error("seedRecordsCore: expected the three I1 seed users to exist");
  }
  const userIds = { dana, priya, ruth };

  const fundIds = new Map<string, string>();
  for (const f of FUNDS) {
    const id = stableId(`fund:${f.key}`);
    fundIds.set(f.key, id);
    await db
      .insert(funds)
      .values({ id, tenantId, name: f.name, code: f.code })
      .onConflictDoNothing({ target: funds.id });
  }

  const campaignIds = new Map<string, string>();
  for (const c of CAMPAIGNS) {
    const id = stableId(`campaign:${c.key}`);
    campaignIds.set(c.key, id);
    await db
      .insert(campaigns)
      .values({ id, tenantId, name: c.name, code: c.code })
      .onConflictDoNothing({ target: campaigns.id });
  }

  const appealIds = new Map<string, string>();
  for (const a of APPEALS) {
    const id = stableId(`appeal:${a.key}`);
    appealIds.set(a.key, id);
    await db
      .insert(appeals)
      .values({
        id,
        tenantId,
        name: a.name,
        code: a.code,
        startDate: a.startDate,
        endDate: a.endDate,
      })
      .onConflictDoNothing({ target: appeals.id });
  }

  const tagIds = new Map<string, string>();
  for (const name of TAG_NAMES) {
    const id = stableId(`tag:${name}`);
    tagIds.set(name, id);
    await db.insert(tags).values({ id, tenantId, name }).onConflictDoNothing({ target: tags.id });
  }

  const refs: ResolvedRefs = { tenantId, fundIds, campaignIds, appealIds, userIds };
  const allSpecs = [...NAMED, ...CONNECTORS, ...buildGenericConstituents()];

  const allGifts: GiftRow[] = [];
  const allInteractions: InteractionRow[] = [];
  const allConstituentTags: {
    id: string;
    tenantId: string;
    constituentId: string;
    tagId: string;
  }[] = [];

  for (const spec of allSpecs) {
    const constituentId = stableId(`constituent:${spec.key}`);
    const assignedUserId = spec.assignedTo ? userIds[spec.assignedTo] : null;
    await db
      .insert(constituents)
      .values({
        id: constituentId,
        tenantId,
        type: spec.type,
        displayName: spec.displayName,
        firstName: spec.firstName ?? null,
        lastName: spec.lastName ?? null,
        organizationName: spec.organizationName ?? null,
        email: spec.email ?? null,
        phone: spec.phone ?? null,
        city: spec.city ?? null,
        region: spec.region ?? null,
        postalCode: spec.postalCode ?? null,
        country: spec.country ?? null,
        prospectStatus: spec.prospectStatus,
        assignedUserId,
        boardMember: spec.boardMember ?? false,
        volunteer: spec.volunteer ?? false,
        wavemakerMonthly: spec.wavemakerMonthly ?? false,
        legacy: spec.legacy ?? false,
        hostLikelihood: spec.hostLikelihood ?? null,
      })
      .onConflictDoNothing({ target: constituents.id });

    allGifts.push(...buildGiftsFor(spec, constituentId, refs));
    allInteractions.push(...buildInteractions(spec, constituentId, refs));

    for (const tagName of spec.tags) {
      const tagId = tagIds.get(tagName);
      if (!tagId) continue;
      allConstituentTags.push({
        id: stableId(`constituent-tag:${spec.key}:${tagName}`),
        tenantId,
        constituentId,
        tagId,
      });
    }
  }

  for (const g of allGifts) {
    await db.insert(gifts).values(g).onConflictDoNothing({ target: gifts.id });
  }

  for (const i of allInteractions) {
    await db.insert(interactions).values(i).onConflictDoNothing({ target: interactions.id });
  }

  for (const ct of allConstituentTags) {
    await db.insert(constituentTags).values(ct).onConflictDoNothing({ target: constituentTags.id });
  }

  const relSpecs: {
    key: string;
    from: string;
    to?: string;
    external?: string;
    type: string;
    note: string;
  }[] = [
    {
      key: "bradley-hallworth",
      from: "bradley",
      to: "hallworth",
      type: "connector",
      note: "Tom Bradley introduces the Hallworth trustees.",
    },
    {
      key: "lin-cordova",
      from: "lin",
      to: "cordova",
      type: "connector",
      note: "Sofia Lin connects to Cordova Beverage ESG team.",
    },
    {
      key: "webb-cornerstone",
      from: "webb",
      to: "cornerstone",
      type: "connector",
      note: "Marcus Webb sits with Cornerstone trustees.",
    },
    {
      key: "bradley-whitfield",
      from: "bradley",
      to: "whitfield",
      type: "connector",
      note: "Tom Bradley is a longtime friend of the Whitfields.",
    },
    {
      key: "bradley-bello",
      from: "bradley",
      to: "bello",
      type: "colleague",
      note: "Dr. Bello is a board member's colleague via Tom Bradley.",
    },
    {
      key: "whitfield-vega",
      from: "whitfield",
      to: "vega",
      type: "peer",
      note: "Whitfields and Marisol Vega co-hosted a giving circle.",
    },
    {
      key: "hallworth-trustee",
      from: "hallworth",
      external: "David Hallworth (Trustee)",
      type: "board_contact",
      note: "Primary trustee contact at the foundation.",
    },
    {
      key: "cordova-csr",
      from: "cordova",
      external: "Elena Cordova (CSR Director)",
      type: "staff_contact",
      note: "CSR lead for water-stewardship grants.",
    },
    {
      key: "osgood-program",
      from: "osgood",
      external: "Priscilla Osgood (Program Officer)",
      type: "staff_contact",
      note: "WASH program officer.",
    },
    {
      key: "northwater-partner",
      from: "northwater",
      external: "Raj Patel (Managing Partner)",
      type: "staff_contact",
      note: "Impact partner overseeing water-sector investments.",
    },
    {
      key: "generic-0-affil",
      from: "generic-3",
      to: "generic-9",
      type: "household",
      note: "Shared household giving.",
    },
    {
      key: "vega-bello",
      from: "vega",
      to: "bello",
      type: "peer",
      note: "Met through the Women & Water network.",
    },
  ];

  const constituentIdByKey = new Map(
    allSpecs.map((s) => [s.key, stableId(`constituent:${s.key}`)]),
  );
  const relRows: RelationshipRow[] = [];
  for (const r of relSpecs) {
    const fromId = constituentIdByKey.get(r.from);
    if (!fromId) continue;
    const toId = r.to ? (constituentIdByKey.get(r.to) ?? null) : null;
    if (r.to && !toId) continue;
    relRows.push({
      id: stableId(`relationship:${r.key}`),
      tenantId,
      fromConstituentId: fromId,
      toConstituentId: toId,
      externalName: r.external ?? null,
      type: r.type,
      note: r.note,
    });
  }
  for (const r of relRows) {
    await db.insert(relationships).values(r).onConflictDoNothing({ target: relationships.id });
  }
}

import "server-only";
import { asc, desc, eq, ilike, or } from "drizzle-orm";
import {
  constituents,
  interactions,
  knowledgeBase,
  naturalPartners,
  prospects,
  relationshipMapEntries,
  researchGaps,
  tenantSettings,
  users,
  visits,
  withTenant,
} from "@95forward/db";
import {
  computeQpi,
  getEnv,
  QPI_DEFAULT_WEIGHTS,
  type CurrentUser,
  type QpiBand,
  type QpiDimensionInput,
  type QpiResult,
  type QpiWeights,
} from "@95forward/shared";
import {
  createProviders,
  hybridRetrieve,
  type CallerContext,
  type RetrievalResult,
} from "@95forward/ai";
import { getAppDb } from "@/server/db";
import {
  deriveCadence,
  deriveNextMove,
  prospectStatusLabel,
  type NextMove,
  type ProspectStatus,
} from "@/lib/prospect-cadence";

export type ProspectType = "individual" | "organization" | "foundation";

export interface ProspectListParams {
  type?: ProspectType;
  rm?: string;
  band?: QpiBand;
  status?: ProspectStatus;
  focus?: "top33" | "unvisited90" | "hasOpenSuggestion";
}

export interface ProspectListRow {
  id: string;
  rank: number;
  name: string;
  type: ProspectType;
  descriptor: string;
  qpi: QpiResult;
  rmName: string | null;
  partnerName: string | null;
  status: ProspectStatus;
  cadence: string;
  top33: boolean;
}

export interface ProspectRef {
  id: string;
  name: string;
}

function partnerDisplayName(partner: {
  externalName: string | null;
  user: { name: string } | null;
  constituent: { displayName: string } | null;
}): string | null {
  return partner.constituent?.displayName ?? partner.user?.name ?? partner.externalName ?? null;
}

function toDimensionInputs(
  rows: readonly {
    dimension: QpiDimensionInput["dimension"];
    rating: number | null;
    isUnknown: boolean;
    rationale: string | null;
    source: string | null;
  }[],
): QpiDimensionInput[] {
  return rows.map((row) => ({
    dimension: row.dimension,
    rating: row.rating,
    isUnknown: row.isUnknown,
    rationale: row.rationale,
    source: row.source,
  }));
}

function descriptorFor(type: ProspectType, status: ProspectStatus): string {
  const typeLabel =
    type === "individual" ? "Individual" : type === "organization" ? "Organization" : "Foundation";
  return `${typeLabel} · ${prospectStatusLabel(status)}`;
}

export async function getTenantWeights(tenantId: string): Promise<QpiWeights> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({
        capacity: tenantSettings.weightCapacity,
        relationship: tenantSettings.weightRelationship,
        timing: tenantSettings.weightTiming,
        gift_history: tenantSettings.weightGiftHistory,
        philanthropy: tenantSettings.weightPhilanthropy,
      })
      .from(tenantSettings)
      .limit(1);
    const row = rows[0];
    if (!row) return { ...QPI_DEFAULT_WEIGHTS };
    return {
      capacity: row.capacity,
      relationship: row.relationship,
      timing: row.timing,
      gift_history: row.gift_history,
      philanthropy: row.philanthropy,
    };
  });
}

export async function getProspectsList(
  tenantId: string,
  caller: Pick<CurrentUser, "id">,
  params: ProspectListParams = {},
): Promise<ProspectListRow[]> {
  const weights = await getTenantWeights(tenantId);
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const records = await tx.query.prospects.findMany({
      orderBy: [asc(prospects.rank)],
      with: {
        constituent: { columns: { id: true, displayName: true, type: true } },
        rm: { columns: { id: true, name: true } },
        qpiAssessments: {
          columns: {
            dimension: true,
            rating: true,
            isUnknown: true,
            rationale: true,
            source: true,
          },
        },
        naturalPartners: {
          with: {
            user: { columns: { name: true } },
            constituent: { columns: { displayName: true } },
          },
        },
      },
    });

    const constituentIds = records.map((record) => record.constituent.id);
    const lastContactByConstituent = await loadLastContact(tx, constituentIds);

    const rows = records.map((record) => {
      const qpi = computeQpi(toDimensionInputs(record.qpiAssessments), weights);
      const status = record.status as ProspectStatus;
      const firstPartner = record.naturalPartners[0];
      const lastContactAt = lastContactByConstituent.get(record.constituent.id) ?? null;
      return {
        id: record.id,
        rank: record.rank ?? 0,
        name: record.constituent.displayName,
        type: record.constituent.type as ProspectType,
        descriptor: descriptorFor(record.constituent.type as ProspectType, status),
        qpi,
        rmName: record.rm?.name ?? null,
        partnerName: firstPartner ? partnerDisplayName(firstPartner) : null,
        status,
        cadence: deriveCadence(status, lastContactAt),
        top33: record.top33,
        rmUserId: record.rm?.id ?? null,
        lastContactAt,
      };
    });

    const filtered = rows.filter((row) => {
      if (params.type && row.type !== params.type) return false;
      if (params.status && row.status !== params.status) return false;
      if (params.band && row.qpi.band !== params.band) return false;
      if (params.rm) {
        const target = params.rm === "me" ? caller.id : params.rm;
        if (row.rmUserId !== target) return false;
      }
      if (params.focus === "top33" && !row.top33) return false;
      if (params.focus === "unvisited90" && !(row.qpi.band === "go" && row.lastContactAt === null))
        return false;
      if (params.focus === "hasOpenSuggestion" && row.qpi.unknownCount === 0) return false;
      return true;
    });

    return filtered
      .sort((a, b) => b.qpi.total - a.qpi.total || a.rank - b.rank)
      .map(({ rmUserId: _rmUserId, lastContactAt: _lastContactAt, ...row }) => row);
  });
}

export interface ProspectActivity {
  id: string;
  type: string;
  occurredAt: Date;
  summary: string | null;
  ownerName: string | null;
}

export interface ProspectDetail {
  id: string;
  rank: number;
  name: string;
  type: ProspectType;
  descriptor: string;
  status: ProspectStatus;
  qpi: QpiResult;
  rmName: string | null;
  rmUserId: string | null;
  cadence: string;
  nextMove: NextMove;
  knowledge: {
    capacitySource: string | null;
    relationshipToCause: string | null;
    connectorsNote: string | null;
    giftHistorySummary: string | null;
    otherPhilanthropy: string | null;
    timingNote: string | null;
  } | null;
  naturalPartners: {
    id: string;
    name: string | null;
    role: string | null;
    warmPathNote: string | null;
  }[];
  researchGaps: { id: string; label: string; status: string | null }[];
  strategy: {
    relationshipGoals: string | null;
    hooks: string | null;
    objections: string | null;
    predispositionPlan: string | null;
    presentationDesign: string | null;
    actionPlan: string | null;
  } | null;
  relationshipMap: {
    id: string;
    name: string;
    role: string | null;
    decisionPower: string | null;
    warmPathNote: string | null;
    source: string | null;
  }[];
  plannedVisits: {
    id: string;
    goal: string | null;
    discoveryQuestions: string | null;
    team: string | null;
    locationType: string | null;
  }[];
  activity: ProspectActivity[];
}

export async function getProspectDetail(
  tenantId: string,
  id: string,
): Promise<ProspectDetail | null> {
  const weights = await getTenantWeights(tenantId);
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const record = await tx.query.prospects.findFirst({
      where: eq(prospects.id, id),
      with: {
        constituent: { columns: { id: true, displayName: true, type: true } },
        rm: { columns: { id: true, name: true } },
        qpiAssessments: {
          columns: {
            dimension: true,
            rating: true,
            isUnknown: true,
            rationale: true,
            source: true,
          },
        },
        naturalPartners: {
          orderBy: [asc(naturalPartners.createdAt)],
          with: {
            user: { columns: { name: true } },
            constituent: { columns: { displayName: true } },
          },
        },
        knowledgeBase: {
          columns: {
            capacitySource: true,
            relationshipToCause: true,
            connectorsNote: true,
            giftHistorySummary: true,
            otherPhilanthropy: true,
            timingNote: true,
          },
        },
        researchGaps: {
          orderBy: [asc(researchGaps.createdAt)],
          columns: { id: true, label: true, status: true },
        },
        strategy: {
          columns: {
            relationshipGoals: true,
            hooks: true,
            objections: true,
            predispositionPlan: true,
            presentationDesign: true,
            actionPlan: true,
          },
        },
        relationshipMapEntries: {
          orderBy: [asc(relationshipMapEntries.createdAt)],
          columns: {
            id: true,
            name: true,
            role: true,
            decisionPower: true,
            warmPathNote: true,
            source: true,
          },
        },
        visits: {
          orderBy: [asc(visits.createdAt)],
          columns: {
            id: true,
            goal: true,
            discoveryQuestions: true,
            team: true,
            locationType: true,
            occurredAt: true,
          },
        },
      },
    });
    if (!record) return null;

    const activityRows = await tx
      .select({
        id: interactions.id,
        type: interactions.type,
        occurredAt: interactions.occurredAt,
        summary: interactions.summary,
        ownerName: users.name,
      })
      .from(interactions)
      .leftJoin(users, eq(users.id, interactions.ownerUserId))
      .where(eq(interactions.constituentId, record.constituent.id))
      .orderBy(desc(interactions.occurredAt))
      .limit(20);

    const qpi = computeQpi(toDimensionInputs(record.qpiAssessments), weights);
    const status = record.status as ProspectStatus;
    const type = record.constituent.type as ProspectType;
    const lastContactAt = activityRows[0]?.occurredAt ?? null;

    return {
      id: record.id,
      rank: record.rank ?? 0,
      name: record.constituent.displayName,
      type,
      descriptor: descriptorFor(type, status),
      status,
      qpi,
      rmName: record.rm?.name ?? null,
      rmUserId: record.rm?.id ?? null,
      cadence: deriveCadence(status, lastContactAt),
      nextMove: deriveNextMove(qpi, status, lastContactAt),
      knowledge: record.knowledgeBase ?? null,
      naturalPartners: record.naturalPartners.map((partner) => ({
        id: partner.id,
        name: partnerDisplayName(partner),
        role: partner.role,
        warmPathNote: partner.warmPathNote,
      })),
      researchGaps: record.researchGaps.map((g) => ({
        id: g.id,
        label: g.label,
        status: g.status,
      })),
      strategy: record.strategy ?? null,
      relationshipMap: record.relationshipMapEntries.map((entry) => ({
        id: entry.id,
        name: entry.name,
        role: entry.role,
        decisionPower: entry.decisionPower,
        warmPathNote: entry.warmPathNote,
        source: entry.source,
      })),
      plannedVisits: record.visits
        .filter((v) => v.occurredAt === null)
        .map((v) => ({
          id: v.id,
          goal: v.goal,
          discoveryQuestions: v.discoveryQuestions,
          team: v.team,
          locationType: v.locationType,
        })),
      activity: activityRows,
    };
  });
}

export async function getProspectRefs(tenantId: string): Promise<ProspectRef[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .select({ id: prospects.id, name: constituents.displayName })
      .from(prospects)
      .innerJoin(constituents, eq(constituents.id, prospects.constituentId))
      .orderBy(asc(constituents.displayName));
    return rows;
  });
}

export async function listRmUsers(tenantId: string): Promise<ProspectRef[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx.query.users.findMany({
      orderBy: [asc(users.name)],
      columns: { id: true, name: true },
    });
    return rows.map((row) => ({ id: row.id, name: row.name }));
  });
}

export interface ProspectSearchResult {
  facts: RetrievalResult["facts"];
  unknown: boolean;
  note?: string;
  matches: ProspectMatch[];
}

export interface ProspectMatch {
  id: string;
  name: string;
  type: ProspectType;
  rank: number;
  qpi: QpiResult;
}

// NL prospect search grounds every answer in retrieval provenance, then maps the matched rows back
// to ranked prospects so the UI can show "here are the people this is about" with their citations.
export async function searchProspects(
  tenantId: string,
  caller: CallerContext,
  query: string,
): Promise<ProspectSearchResult> {
  const embedding = createProviders(getEnv()).embedding;
  const retrieval = await hybridRetrieve(getAppDb(), caller, embedding, query, { topK: 8 });

  const matchedRowIds = new Set(
    retrieval.facts.flatMap((fact) => fact.citations.map((citation) => citation.rowId)),
  );

  const list = await getProspectsList(tenantId, caller);
  let matches = list
    .filter((row) => matchedRowIds.has(row.id))
    .map((row) => ({ id: row.id, name: row.name, type: row.type, rank: row.rank, qpi: row.qpi }));

  // Mock embeddings aren't semantically clusterable, so vector retrieval can match no prospect rows
  // in CI/demo. Fall back to a deterministic keyword scan over prospect/constituent names and KB
  // text so natural-language search still returns the prospects the query is about.
  if (matches.length === 0) {
    const fallbackIds = await keywordMatchProspectIds(tenantId, query);
    matches = list
      .filter((row) => fallbackIds.has(row.id))
      .map((row) => ({ id: row.id, name: row.name, type: row.type, rank: row.rank, qpi: row.qpi }));
  }

  return {
    facts: retrieval.facts,
    unknown: retrieval.unknown,
    note: retrieval.note,
    matches,
  };
}

async function keywordMatchProspectIds(tenantId: string, query: string): Promise<Set<string>> {
  const escaped = query.trim().replace(/[\\%_]/g, (char) => `\\${char}`);
  const term = `%${escaped}%`;
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const ids = new Set<string>();

    const byName = await tx
      .select({ id: prospects.id })
      .from(prospects)
      .innerJoin(constituents, eq(prospects.constituentId, constituents.id))
      .where(ilike(constituents.displayName, term));
    for (const row of byName) ids.add(row.id);

    const byKnowledge = await tx
      .select({ prospectId: knowledgeBase.prospectId })
      .from(knowledgeBase)
      .where(
        or(
          ilike(knowledgeBase.capacitySource, term),
          ilike(knowledgeBase.relationshipToCause, term),
          ilike(knowledgeBase.connectorsNote, term),
          ilike(knowledgeBase.giftHistorySummary, term),
          ilike(knowledgeBase.otherPhilanthropy, term),
          ilike(knowledgeBase.timingNote, term),
        ),
      );
    for (const row of byKnowledge) ids.add(row.prospectId);

    return ids;
  });
}

type Tx = Parameters<Parameters<typeof withTenant<unknown>>[2]>[0];

async function loadLastContact(tx: Tx, constituentIds: string[]): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (constituentIds.length === 0) return map;
  const rows = await tx
    .select({ constituentId: interactions.constituentId, occurredAt: interactions.occurredAt })
    .from(interactions)
    .orderBy(asc(interactions.constituentId), desc(interactions.occurredAt));
  for (const row of rows) {
    if (!map.has(row.constituentId)) map.set(row.constituentId, row.occurredAt);
  }
  return map;
}

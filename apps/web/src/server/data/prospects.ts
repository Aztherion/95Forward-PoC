import "server-only";
import { asc, desc, eq, ilike, inArray, isNotNull, or } from "drizzle-orm";
import {
  asks,
  constituents,
  followUpTasks,
  fundingInitiatives,
  interactions,
  knowledgeBase,
  naturalPartners,
  prospectFundingInitiatives,
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
  extractSearchFilters,
  hybridRetrieve,
  type CallerContext,
  type Citation,
  type RetrievalResult,
} from "@95forward/ai";
import type { QueryInterpretation } from "@95forward/shared";
import { getAppDb } from "@/server/db";
import {
  deriveCadence,
  deriveNextMove,
  prospectStatusLabel,
  type NextMove,
  type ProspectStatus,
} from "@/lib/prospect-cadence";

import type { ProspectType, FundingFrame, ProspectListRow } from "./prospect-types";
import { applyStructuredFilters, type EnrichedProspectListRow } from "./structured-filters";
export type { ProspectType, FundingFrame, ProspectListRow } from "./prospect-types";
export { applyStructuredFilters, type EnrichedProspectListRow } from "./structured-filters";

export interface ProspectListParams {
  type?: ProspectType;
  rm?: string;
  band?: QpiBand;
  status?: ProspectStatus;
  focus?: "top33" | "unvisited90" | "hasOpenSuggestion";
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

// Bulk-load each prospect's funding horizons via the cultivation join (a prospect can be cultivated
// toward several initiatives across horizons; ANY association of a frame qualifies it). Empty-guarded.
async function loadProspectHorizons(
  tx: Tx,
  prospectIds: string[],
): Promise<Map<string, Set<FundingFrame>>> {
  const map = new Map<string, Set<FundingFrame>>();
  if (prospectIds.length === 0) return map;
  const rows = await tx
    .selectDistinct({
      prospectId: prospectFundingInitiatives.prospectId,
      frame: fundingInitiatives.frame,
    })
    .from(prospectFundingInitiatives)
    .innerJoin(
      fundingInitiatives,
      eq(fundingInitiatives.id, prospectFundingInitiatives.fundingInitiativeId),
    )
    .where(inArray(prospectFundingInitiatives.prospectId, prospectIds));
  for (const row of rows) {
    const set = map.get(row.prospectId) ?? new Set<FundingFrame>();
    set.add(row.frame as FundingFrame);
    map.set(row.prospectId, set);
  }
  return map;
}

// The full enriched prospect list (rank-then-QPI ordered), carrying the internal fields the
// structured-search filters need. getProspectsList wraps this and strips them.
export async function getEnrichedProspects(tenantId: string): Promise<EnrichedProspectListRow[]> {
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
    const prospectIds = records.map((record) => record.id);
    const lastContactByConstituent = await loadLastContact(tx, constituentIds);
    const openFollowUpByProspect = await loadOpenFollowUps(tx);
    const visitedProspects = await loadExecutedVisitProspects(tx);
    const askProspects = await loadAskProspects(tx);
    const horizonsByProspect = await loadProspectHorizons(tx, prospectIds);

    const rows: EnrichedProspectListRow[] = records.map((record) => {
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
        openFollowUpDueAt: openFollowUpByProspect.get(record.id) ?? null,
        visited: visitedProspects.has(record.id),
        hasAsk: askProspects.has(record.id),
        rmUserId: record.rm?.id ?? null,
        lastContactAt,
        horizons: horizonsByProspect.get(record.id) ?? new Set<FundingFrame>(),
      };
    });

    return rows.sort((a, b) => b.qpi.total - a.qpi.total || a.rank - b.rank);
  });
}

export async function getProspectsList(
  tenantId: string,
  caller: Pick<CurrentUser, "id">,
  params: ProspectListParams = {},
): Promise<ProspectListRow[]> {
  const rows = await getEnrichedProspects(tenantId);
  return rows
    .filter((row) => {
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
    })
    .map(
      ({ rmUserId: _rmUserId, lastContactAt: _lastContactAt, horizons: _horizons, ...row }) => row,
    );
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
  interpretation: QueryInterpretation;
}

export interface ProspectMatch {
  id: string;
  name: string;
  type: ProspectType;
  rank: number;
  qpi: QpiResult;
}

function toMatch(row: {
  id: string;
  name: string;
  type: ProspectType;
  rank: number;
  qpi: QpiResult;
}): ProspectMatch {
  return { id: row.id, name: row.name, type: row.type, rank: row.rank, qpi: row.qpi };
}

// NL prospect search (Initiative 14): an LLM extracts whitelist-bounded structured filters + an
// optional semantic term, and we compose three modes. Pure-semantic is the existing path, untouched.
export async function searchProspects(
  tenantId: string,
  caller: CallerContext,
  query: string,
): Promise<ProspectSearchResult> {
  const model = createProviders(getEnv()).model;
  const interpretation = await extractSearchFilters(model, query);

  if (interpretation.mode === "semantic") {
    return semanticSearch(tenantId, caller, query, interpretation);
  }
  if (interpretation.mode === "structured") {
    return structuredSearch(tenantId, caller, interpretation);
  }
  return hybridSearch(tenantId, caller, interpretation);
}

// Pure-semantic: the existing vector+keyword path, unchanged — extraction returned no filters.
async function semanticSearch(
  tenantId: string,
  caller: CallerContext,
  query: string,
  interpretation: QueryInterpretation,
): Promise<ProspectSearchResult> {
  const embedding = createProviders(getEnv()).embedding;
  const retrieval = await hybridRetrieve(getAppDb(), caller, embedding, query, { topK: 8 });

  const vectorProspectIds = await resolveProspectIdsFromCitations(
    tenantId,
    retrieval.facts.flatMap((fact) => fact.citations),
  );
  const keywordProspectIds = await keywordMatchProspectIds(tenantId, query);

  const list = await getProspectsList(tenantId, caller);
  const matchedIds = new Set<string>([...vectorProspectIds, ...keywordProspectIds]);
  const matches = list
    .filter((row) => matchedIds.has(row.id))
    .map(toMatch)
    .sort((a, b) => {
      const aVec = vectorProspectIds.has(a.id) ? 0 : 1;
      const bVec = vectorProspectIds.has(b.id) ? 0 : 1;
      return aVec - bVec || b.qpi.total - a.qpi.total;
    });

  return {
    facts: retrieval.facts,
    unknown: retrieval.unknown,
    note: retrieval.note,
    matches,
    interpretation,
  };
}

function structuredSummaryFact(count: number): RetrievalResult["facts"] {
  if (count === 0) return [];
  return [
    {
      fact: `${count} prospect${count === 1 ? "" : "s"} match these filters.`,
      citations: [
        { source: "prospects", sourceType: "structured", detail: "structured filter match" },
      ],
    },
  ];
}

// Pure-structured: deterministic filter over the enriched list, ranked by QPI. No semantic retrieval
// runs, so facts are synthesized from the deterministic match (not fabricated per-prospect claims).
async function structuredSearch(
  tenantId: string,
  caller: CallerContext,
  interpretation: QueryInterpretation,
): Promise<ProspectSearchResult> {
  const rows = await getEnrichedProspects(tenantId);
  const matched = applyStructuredFilters(rows, interpretation.filters, caller.id);
  const matches = matched.map(toMatch);
  return {
    facts: structuredSummaryFact(matches.length),
    unknown: false,
    note: matches.length === 0 ? "No prospects match those filters." : undefined,
    matches,
    interpretation,
  };
}

// Hybrid: the structured filter defines the candidate set; the semantic term orders within it —
// semantically-matched candidates first (by retrieval recall), then the rest by QPI. Structured-only
// matches are kept (a valid filter match without a semantic signal isn't dropped).
async function hybridSearch(
  tenantId: string,
  caller: CallerContext,
  interpretation: QueryInterpretation,
): Promise<ProspectSearchResult> {
  const rows = await getEnrichedProspects(tenantId);
  const candidates = applyStructuredFilters(rows, interpretation.filters, caller.id);
  if (candidates.length === 0) {
    return {
      facts: [],
      unknown: false,
      note: "No prospects match those filters.",
      matches: [],
      interpretation,
    };
  }

  const semanticTerms = interpretation.semanticTerms ?? "";
  const embedding = createProviders(getEnv()).embedding;
  const retrieval = await hybridRetrieve(getAppDb(), caller, embedding, semanticTerms, { topK: 8 });
  const semanticIds = await resolveProspectIdsFromCitations(
    tenantId,
    retrieval.facts.flatMap((fact) => fact.citations),
  );

  const candidateById = new Map(candidates.map((row) => [row.id, row]));
  const matches = [...candidateById.values()].map(toMatch).sort((a, b) => {
    const aSem = semanticIds.has(a.id) ? 0 : 1;
    const bSem = semanticIds.has(b.id) ? 0 : 1;
    return aSem - bSem || b.qpi.total - a.qpi.total;
  });

  return {
    facts: [...retrieval.facts, ...structuredSummaryFact(matches.length)],
    unknown: false,
    note: undefined,
    matches,
    interpretation,
  };
}

// Map retrieval citations (which reference constituents / knowledge_base / interactions rows) back
// to the prospects they belong to, via the schema FKs. Each branch is guarded against empty arrays
// because drizzle's inArray() emits invalid SQL for [].
export async function resolveProspectIdsFromCitations(
  tenantId: string,
  citations: Citation[],
): Promise<Set<string>> {
  const constituentRowIds: string[] = [];
  const kbRowIds: string[] = [];
  const interactionRowIds: string[] = [];
  for (const c of citations) {
    if (c.rowId === undefined) continue;
    if (c.source === "constituents") constituentRowIds.push(c.rowId);
    else if (c.source === "knowledge_base") kbRowIds.push(c.rowId);
    else if (c.source === "interactions") interactionRowIds.push(c.rowId);
  }

  const resolved = new Set<string>();
  if (constituentRowIds.length === 0 && kbRowIds.length === 0 && interactionRowIds.length === 0) {
    return resolved;
  }

  await withTenant(getAppDb(), tenantId, async (tx) => {
    if (constituentRowIds.length > 0) {
      const rows = await tx
        .select({ id: prospects.id })
        .from(prospects)
        .where(inArray(prospects.constituentId, constituentRowIds));
      for (const row of rows) resolved.add(row.id);
    }
    if (kbRowIds.length > 0) {
      const rows = await tx
        .select({ prospectId: knowledgeBase.prospectId })
        .from(knowledgeBase)
        .where(inArray(knowledgeBase.id, kbRowIds));
      for (const row of rows) resolved.add(row.prospectId);
    }
    if (interactionRowIds.length > 0) {
      const rows = await tx
        .select({ id: prospects.id })
        .from(prospects)
        .innerJoin(interactions, eq(interactions.constituentId, prospects.constituentId))
        .where(inArray(interactions.id, interactionRowIds));
      for (const row of rows) resolved.add(row.id);
    }
  });

  return resolved;
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

// Earliest open follow-up per prospect (joined through visits) — drives the top banner rung.
async function loadOpenFollowUps(tx: Tx): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  const rows = await tx
    .select({ prospectId: visits.prospectId, dueAt: followUpTasks.dueAt })
    .from(followUpTasks)
    .innerJoin(visits, eq(visits.id, followUpTasks.visitId))
    .where(eq(followUpTasks.status, "open"))
    .orderBy(asc(visits.prospectId), asc(followUpTasks.dueAt));
  for (const row of rows) {
    if (!map.has(row.prospectId)) map.set(row.prospectId, row.dueAt);
  }
  return map;
}

async function loadExecutedVisitProspects(tx: Tx): Promise<Set<string>> {
  const rows = await tx
    .selectDistinct({ prospectId: visits.prospectId })
    .from(visits)
    .where(isNotNull(visits.occurredAt));
  return new Set(rows.map((r) => r.prospectId));
}

async function loadAskProspects(tx: Tx): Promise<Set<string>> {
  const rows = await tx.selectDistinct({ prospectId: asks.prospectId }).from(asks);
  return new Set(rows.map((r) => r.prospectId));
}

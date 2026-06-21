import { cosineDistance, eq, sql } from "drizzle-orm";
import {
  constituents,
  gifts,
  interactions,
  knowledgeBase,
  prospects,
  withTenant,
  type Database,
  type TenantTransaction,
} from "@95forward/db";
import type {
  CallerContext,
  Citation,
  EmbeddingProvider,
  RetrievalResult,
  RetrievedFact,
} from "./types";

export interface HybridRetrieveOptions {
  subjectType?: "prospect" | "constituent";
  subjectId?: string;
  topK?: number;
  maxDistance?: number;
}

const DEFAULT_TOP_K = 5;
const DEFAULT_MAX_DISTANCE = 0.35;

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

async function deterministicFacts(
  tx: TenantTransaction,
  opts: HybridRetrieveOptions,
): Promise<RetrievedFact[]> {
  const facts: RetrievedFact[] = [];
  if (opts.subjectId === undefined) return facts;

  let constituentId = opts.subjectId;
  let prospectId: string | undefined;

  if (opts.subjectType === "prospect") {
    const prospectRows = await tx
      .select({
        id: prospects.id,
        constituentId: prospects.constituentId,
        status: prospects.status,
      })
      .from(prospects)
      .where(eq(prospects.id, opts.subjectId))
      .limit(1);
    const prospect = prospectRows[0];
    if (prospect === undefined) return facts;
    prospectId = prospect.id;
    constituentId = prospect.constituentId;
    facts.push({
      fact: `Prospect status is ${prospect.status}.`,
      citations: [
        { source: "prospects", sourceType: "structured", rowId: prospect.id, detail: "status" },
      ],
    });
  } else {
    const prospectRows = await tx
      .select({ id: prospects.id, status: prospects.status })
      .from(prospects)
      .where(eq(prospects.constituentId, constituentId))
      .limit(1);
    const prospect = prospectRows[0];
    if (prospect !== undefined) {
      prospectId = prospect.id;
      facts.push({
        fact: `Prospect status is ${prospect.status}.`,
        citations: [
          { source: "prospects", sourceType: "structured", rowId: prospect.id, detail: "status" },
        ],
      });
    }
  }

  const constituentRows = await tx
    .select({
      id: constituents.id,
      displayName: constituents.displayName,
      assignedUserId: constituents.assignedUserId,
    })
    .from(constituents)
    .where(eq(constituents.id, constituentId))
    .limit(1);
  const constituent = constituentRows[0];
  if (constituent === undefined) return facts;

  const givingRows = await tx
    .select({
      total: sql<number>`coalesce(sum(${gifts.amountCents}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(gifts)
    .where(eq(gifts.constituentId, constituentId));
  const giving = givingRows[0];
  if (giving !== undefined && Number(giving.count) > 0) {
    facts.push({
      fact: `${constituent.displayName} has given ${formatUsd(Number(giving.total))} lifetime across ${Number(giving.count)} gift(s).`,
      citations: [
        {
          source: "gifts",
          sourceType: "structured",
          rowId: constituent.id,
          detail: "lifetime giving total",
        },
      ],
    });
  }

  if (constituent.assignedUserId !== null) {
    facts.push({
      fact: `${constituent.displayName} is assigned to a relationship manager.`,
      citations: [
        {
          source: "constituents",
          sourceType: "structured",
          rowId: constituent.id,
          detail: "assigned_user_id",
        },
      ],
    });
  }

  if (prospectId !== undefined) {
    const kbRows = await tx
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.prospectId, prospectId))
      .limit(1);
    const kb = kbRows[0];
    if (kb !== undefined && kb.capacitySource !== null) {
      facts.push({
        fact: `Capacity source on record: ${kb.capacitySource}.`,
        citations: [
          {
            source: "knowledge_base",
            sourceType: "knowledge_base",
            rowId: kb.id,
            detail: "capacity_source",
          },
        ],
      });
    }
  }

  return facts;
}

interface VectorHit {
  id: string;
  text: string;
  distance: number;
  source: "constituents" | "knowledge_base" | "interactions";
}

async function vectorFacts(
  tx: TenantTransaction,
  queryVec: number[],
  topK: number,
  maxDistance: number,
): Promise<RetrievedFact[]> {
  const constituentHits = await tx
    .select({
      id: constituents.id,
      text: constituents.embeddingText,
      distance: cosineDistance(constituents.embedding, queryVec),
    })
    .from(constituents)
    .where(sql`${constituents.embedding} is not null`)
    .orderBy(cosineDistance(constituents.embedding, queryVec))
    .limit(topK);

  const kbHits = await tx
    .select({
      id: knowledgeBase.id,
      text: knowledgeBase.embeddingText,
      distance: cosineDistance(knowledgeBase.embedding, queryVec),
    })
    .from(knowledgeBase)
    .where(sql`${knowledgeBase.embedding} is not null`)
    .orderBy(cosineDistance(knowledgeBase.embedding, queryVec))
    .limit(topK);

  const interactionHits = await tx
    .select({
      id: interactions.id,
      text: interactions.embeddingText,
      distance: cosineDistance(interactions.embedding, queryVec),
    })
    .from(interactions)
    .where(sql`${interactions.embedding} is not null`)
    .orderBy(cosineDistance(interactions.embedding, queryVec))
    .limit(topK);

  const all: VectorHit[] = [
    ...constituentHits.map((h) => ({
      ...h,
      distance: Number(h.distance),
      source: "constituents" as const,
    })),
    ...kbHits.map((h) => ({
      ...h,
      distance: Number(h.distance),
      source: "knowledge_base" as const,
    })),
    ...interactionHits.map((h) => ({
      ...h,
      distance: Number(h.distance),
      source: "interactions" as const,
    })),
  ];

  return all
    .filter((hit) => hit.distance <= maxDistance && hit.text.trim().length > 0)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, topK)
    .map((hit) => {
      const citation: Citation = {
        source: hit.source,
        sourceType: "vector",
        rowId: hit.id,
        detail: `cosine distance ${hit.distance.toFixed(4)}`,
      };
      return { fact: hit.text, citations: [citation] };
    });
}

export async function hybridRetrieve(
  db: Database,
  caller: CallerContext,
  provider: EmbeddingProvider,
  query: string,
  opts: HybridRetrieveOptions = {},
): Promise<RetrievalResult> {
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const maxDistance = opts.maxDistance ?? DEFAULT_MAX_DISTANCE;
  const queryVec = await provider.embed(query);

  const facts = await withTenant(db, caller.tenantId, async (tx) => {
    const structured = await deterministicFacts(tx, opts);
    const vector = await vectorFacts(tx, queryVec, topK, maxDistance);
    return [...structured, ...vector];
  });

  if (facts.length === 0) {
    return { facts: [], unknown: true, note: "unknown — worth researching" };
  }
  return { facts, unknown: false };
}

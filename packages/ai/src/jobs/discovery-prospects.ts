import { and, eq, isNotNull, sql } from "drizzle-orm";
import {
  candidates,
  constituents,
  discoveryTasks,
  fundingInitiatives,
  withTenant,
  type Database,
} from "@95forward/db";
import type { DiscoverySuggestion, Providers } from "../types";

export interface DiscoveryJobPayload {
  tenantId: string;
  userId: string;
  discoveryTaskId: string;
}

export interface DiscoveryJobContext {
  db: Database;
  providers: Providers;
}

interface DiscoveryCheckpoint {
  suggestions: DiscoverySuggestion[];
}

interface DiscoveryContext {
  connectorName: string;
  initiativeContext: string;
}

// The discovery job (Initiative 12): mine a connector's network for candidate people with affinity
// to a funding initiative, emitting hypothesis-grade `candidates` rows OFF the ranked MPL. Mirrors
// the I11 research handler exactly — idempotent + checkpointed so a Graphile retry never duplicates
// candidates and resumes without re-calling the provider:
//   - early-exit once the task is ready/reviewed
//   - suggestions persisted to discovery_tasks.checkpoint before any candidate is written
//   - candidates carry a stable origin_key and insert ON CONFLICT DO NOTHING
//   - the ready transition shares one transaction with the candidate inserts
// All DB work runs under withTenant(payload.tenantId). The provider's evidence text is untrusted: it
// only lands in candidate evidence columns for a human to validate — it never alters control flow,
// and a candidate becomes a prospect only via explicit human promotion (off-MPL until then).
export async function runDiscoveryJob(
  payload: DiscoveryJobPayload,
  ctx: DiscoveryJobContext,
): Promise<void> {
  const { db, providers } = ctx;
  const { tenantId, discoveryTaskId } = payload;

  if (providers.discovery.kind === "live") {
    console.warn(
      "[discovery] live OSINT discovery is internal-testing-only; results are hypothesis-grade and require human validation before any prospect is created",
    );
  }

  const context = await withTenant(db, tenantId, async (tx): Promise<DiscoveryContext | null> => {
    const taskRows = await tx
      .select({
        status: discoveryTasks.status,
        connectorConstituentId: discoveryTasks.connectorConstituentId,
        connectorExternalName: discoveryTasks.connectorExternalName,
        fundingInitiativeId: discoveryTasks.fundingInitiativeId,
      })
      .from(discoveryTasks)
      .where(eq(discoveryTasks.id, discoveryTaskId))
      .limit(1);
    const task = taskRows[0];
    if (!task) return null;
    if (task.status === "ready" || task.status === "reviewed") return null;

    const claimed = await tx
      .update(discoveryTasks)
      .set({ status: "researching" })
      .where(
        and(
          eq(discoveryTasks.id, discoveryTaskId),
          eq(discoveryTasks.tenantId, tenantId),
          sql`${discoveryTasks.status} in ('queued', 'researching')`,
        ),
      )
      .returning({ id: discoveryTasks.id });
    if (claimed.length === 0) return null;

    let connectorName = task.connectorExternalName ?? "the connector";
    if (task.connectorConstituentId) {
      const connectorRows = await tx
        .select({ name: constituents.displayName })
        .from(constituents)
        .where(eq(constituents.id, task.connectorConstituentId))
        .limit(1);
      connectorName = connectorRows[0]?.name ?? connectorName;
    }

    const initiativeRows = await tx
      .select({ name: fundingInitiatives.name, story: fundingInitiatives.story })
      .from(fundingInitiatives)
      .where(eq(fundingInitiatives.id, task.fundingInitiativeId))
      .limit(1);
    const initiative = initiativeRows[0];
    const initiativeContext = initiative
      ? `${initiative.name}${initiative.story ? ` — ${initiative.story}` : ""}`
      : "this initiative";

    return { connectorName, initiativeContext };
  });

  if (context === null) return;

  const existing = await withTenant(db, tenantId, async (tx) => {
    const rows = await tx
      .select({ checkpoint: discoveryTasks.checkpoint })
      .from(discoveryTasks)
      .where(eq(discoveryTasks.id, discoveryTaskId))
      .limit(1);
    return (rows[0]?.checkpoint as DiscoveryCheckpoint | null) ?? null;
  });

  let suggestions: DiscoverySuggestion[];
  if (existing?.suggestions !== undefined) {
    suggestions = existing.suggestions;
  } else {
    const result = await providers.discovery.discover({
      connectorName: context.connectorName,
      initiativeContext: context.initiativeContext,
    });
    suggestions = result.suggestions;
    const checkpoint: DiscoveryCheckpoint = { suggestions };
    await withTenant(db, tenantId, async (tx) => {
      await tx
        .update(discoveryTasks)
        .set({ checkpoint })
        .where(eq(discoveryTasks.id, discoveryTaskId));
    });
  }

  await withTenant(db, tenantId, async (tx) => {
    for (let i = 0; i < suggestions.length; i += 1) {
      const suggestion = suggestions[i];
      if (suggestion === undefined) continue;
      await tx
        .insert(candidates)
        .values({
          tenantId,
          discoveryTaskId,
          name: suggestion.name,
          evidenceConnection: suggestion.evidenceConnection,
          evidenceAffinity: suggestion.evidenceAffinity,
          confidence: suggestion.confidence,
          status: "suggested",
          originKey: `discovery:${discoveryTaskId}:${String(i)}`,
        })
        .onConflictDoNothing({
          target: candidates.originKey,
          where: isNotNull(candidates.originKey),
        });
    }

    await tx
      .update(discoveryTasks)
      .set({ status: "ready", completedAt: new Date() })
      .where(
        and(
          eq(discoveryTasks.id, discoveryTaskId),
          eq(discoveryTasks.tenantId, tenantId),
          eq(discoveryTasks.status, "researching"),
        ),
      );
  });
}

// Drives the final ready -> reviewed leg: a discovery task is reviewed once none of its candidates
// remain in the undecided "suggested" or "endorsed"/"intro_requested" working states — i.e. every
// candidate is either promoted or dismissed. Called from the candidate decision actions.
export async function markDiscoveryReviewedIfComplete(
  db: Database,
  tenantId: string,
  discoveryTaskId: string,
): Promise<void> {
  await withTenant(db, tenantId, async (tx) => {
    const open = await tx
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.tenantId, tenantId),
          eq(candidates.discoveryTaskId, discoveryTaskId),
          sql`${candidates.status} in ('suggested', 'endorsed', 'intro_requested')`,
        ),
      )
      .limit(1);
    if (open.length > 0) return;

    await tx
      .update(discoveryTasks)
      .set({ status: "reviewed" })
      .where(
        and(
          eq(discoveryTasks.id, discoveryTaskId),
          eq(discoveryTasks.tenantId, tenantId),
          eq(discoveryTasks.status, "ready"),
        ),
      );
  });
}

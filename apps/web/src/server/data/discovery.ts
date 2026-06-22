import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { candidates, constituents, discoveryTasks, withTenant } from "@95forward/db";
import { getAppDb } from "@/server/db";

export interface CreateDiscoveryTaskInput {
  fundingInitiativeId: string;
  connectorConstituentId?: string | null;
  connectorExternalName?: string | null;
  requestedByUserId: string;
}

// Constituents that can serve as a connector for discovery (anyone in the book — a board member,
// major donor, or relationship can make an introduction). Tenant-scoped; capped for the picker.
export async function getConnectorOptions(
  tenantId: string,
): Promise<{ id: string; name: string }[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    return tx
      .select({ id: constituents.id, name: constituents.displayName })
      .from(constituents)
      .where(eq(constituents.tenantId, tenantId))
      .orderBy(asc(constituents.displayName))
      .limit(200);
  });
}

export async function createDiscoveryTask(
  tenantId: string,
  input: CreateDiscoveryTaskInput,
): Promise<string> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx
      .insert(discoveryTasks)
      .values({
        tenantId,
        fundingInitiativeId: input.fundingInitiativeId,
        connectorConstituentId: input.connectorConstituentId ?? null,
        connectorExternalName: input.connectorExternalName ?? null,
        requestedByUserId: input.requestedByUserId,
        status: "queued",
      })
      .returning({ id: discoveryTasks.id });
    const inserted = rows[0];
    if (inserted === undefined) throw new Error("createDiscoveryTask: insert returned no row");
    return inserted.id;
  });
}

export type CandidateConfidence = "low" | "medium" | "high";
export type CandidateStatus =
  | "suggested"
  | "endorsed"
  | "intro_requested"
  | "promoted"
  | "dismissed";
export type DiscoveryStatus = "queued" | "researching" | "ready" | "reviewed";

export interface CandidateView {
  id: string;
  name: string;
  evidenceConnection: string | null;
  evidenceAffinity: string | null;
  confidence: CandidateConfidence;
  status: CandidateStatus;
  promotedProspectId: string | null;
}

export interface CandidateBatch {
  taskId: string;
  connectorName: string;
  initiativeName: string;
  status: DiscoveryStatus;
  candidates: CandidateView[];
}

function connectorNameOf(task: {
  connectorExternalName: string | null;
  connectorConstituent: { displayName: string } | null;
}): string {
  return (
    task.connectorConstituent?.displayName ?? task.connectorExternalName ?? "Unknown connector"
  );
}

// The Candidates view: discovery batches grouped by task (each task = connector × initiative), with
// their candidate cards. This queries discovery_tasks + candidates ONLY — never the prospects table —
// so candidates are structurally off the ranked MPL until a human promotes one.
export async function getCandidateBatches(tenantId: string): Promise<CandidateBatch[]> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx.query.discoveryTasks.findMany({
      where: eq(discoveryTasks.tenantId, tenantId),
      orderBy: [desc(discoveryTasks.requestedAt)],
      with: {
        connectorConstituent: { columns: { displayName: true } },
        fundingInitiative: { columns: { name: true } },
        candidates: {
          orderBy: [asc(candidates.createdAt)],
          columns: {
            id: true,
            name: true,
            evidenceConnection: true,
            evidenceAffinity: true,
            confidence: true,
            status: true,
            promotedProspectId: true,
          },
        },
      },
    });
    return rows.map((task) => ({
      taskId: task.id,
      connectorName: connectorNameOf(task),
      initiativeName: task.fundingInitiative.name,
      status: task.status,
      candidates: task.candidates,
    }));
  });
}

export interface DiscoveryTraySummary {
  taskId: string;
  connectorName: string;
  status: DiscoveryStatus;
}

export interface DiscoveryTrayState {
  researching: DiscoveryTraySummary[];
  ready: DiscoveryTraySummary[];
  readyCount: number;
}

// Feeds the polling tray + Today touch alongside research jobs: active and ready-to-review discovery
// batches, tenant-scoped via withTenant so a caller only sees their own tenant's batches.
export async function getDiscoveryTrayState(tenantId: string): Promise<DiscoveryTrayState> {
  return withTenant(getAppDb(), tenantId, async (tx) => {
    const rows = await tx.query.discoveryTasks.findMany({
      where: and(
        eq(discoveryTasks.tenantId, tenantId),
        inArray(discoveryTasks.status, ["queued", "researching", "ready"]),
      ),
      orderBy: [desc(discoveryTasks.requestedAt)],
      with: {
        connectorConstituent: { columns: { displayName: true } },
      },
    });
    const summaries: DiscoveryTraySummary[] = rows.map((task) => ({
      taskId: task.id,
      connectorName: connectorNameOf(task),
      status: task.status,
    }));
    const researching = summaries.filter(
      (s) => s.status === "queued" || s.status === "researching",
    );
    const ready = summaries.filter((s) => s.status === "ready");
    return { researching, ready, readyCount: ready.length };
  });
}

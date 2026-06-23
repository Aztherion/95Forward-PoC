"use server";

import { revalidatePath } from "next/cache";
import {
  buildToolset,
  createProviders,
  MockEmbeddingProvider,
  MockModelProvider,
  runTask,
  SeededDiscoveryProvider,
  SeededResearchProvider,
  textResponse,
  toolUseResponse,
  type Providers,
} from "@95forward/ai";
import { getEnv } from "@95forward/shared";
import type { CurrentUser } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { getAppDb } from "@/server/db";
import type { CopilotActionState } from "@/components/copilot/copilot-action-state";

type Caller = Pick<CurrentUser, "id" | "tenantId" | "role">;

function callerOf(user: CurrentUser): Caller {
  return { id: user.id, tenantId: user.tenantId, role: user.role };
}

// rating MUST be 1-5: the QPI engine multiplies each dimension's 1-5 rating by its weight. The
// script only stages a pending proposal — nothing is applied without approval.
function qpiProviders(prospectId: string): Providers {
  const model = MockModelProvider.scripted({
    propose_qpi: [
      toolUseResponse("retrieve", {
        query: "recent major gifts and relationship history",
      }),
      toolUseResponse("propose_qpi", {
        prospectId,
        dimension: "capacity",
        rating: 5,
        rationale:
          "Foundation assets near $40M with $1.2M granted to peer water orgs last cycle — can give at the top level.",
        source: "IRS 990-PF · 2024",
      }),
      textResponse("Proposed a QPI capacity assessment for your review."),
    ],
  });
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
    discovery: new SeededDiscoveryProvider(),
  };
}

export async function runProspectQpiAction(
  _prev: CopilotActionState,
  formData: FormData,
): Promise<CopilotActionState> {
  return runCopilotTask(formData, "propose_qpi", qpiProviders, "runProspectQpiAction");
}

function knowledgeProviders(prospectId: string): Providers {
  const model = MockModelProvider.scripted({
    research_prospect: [
      toolUseResponse("retrieve", { query: "what the records already hold about this prospect" }),
      toolUseResponse("propose_knowledge_base_update", {
        prospectId,
        field: "connectorsNote",
        value:
          "A board member already knows a trustee — worth a warm introduction before any formal approach.",
        source: "Logged · Dana R.",
      }),
      textResponse("Proposed a knowledge-base update for your review, grounded in the file."),
    ],
  });
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
    discovery: new SeededDiscoveryProvider(),
  };
}

function strategyProviders(prospectId: string): Providers {
  const model = MockModelProvider.scripted({
    draft_strategy: [
      toolUseResponse("retrieve", { query: "prospect capacity, interests, and timing" }),
      toolUseResponse("propose_strategy", {
        prospectId,
        field: "relationshipGoals",
        value:
          "Move from an institutional contact to a personal relationship with a lead trustee, anchored on the multi-year scale-up.",
        rationale:
          "Strong capacity and an open window, but the relationship is still building — the goal should deepen the personal tie.",
      }),
      textResponse("Drafted a relationship goal for your review."),
    ],
  });
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
    discovery: new SeededDiscoveryProvider(),
  };
}

function visitPlanProviders(prospectId: string): Providers {
  const model = MockModelProvider.scripted({
    draft_visit_plan: [
      toolUseResponse("retrieve", { query: "what is known and unknown about this prospect" }),
      toolUseResponse("propose_visit_plan", {
        prospectId,
        goal: "Confirm interest in the multi-year scale-up and surface who else shapes the decision.",
        discoveryQuestions:
          "What outcomes matter most to your board this cycle? Who else weighs in on a commitment of this size? What would make this an easy yes?",
      }),
      textResponse("Drafted a visit plan for your review, grounded in the prospect file."),
    ],
  });
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
    discovery: new SeededDiscoveryProvider(),
  };
}

function relationshipMapProviders(prospectId: string): Providers {
  const model = MockModelProvider.scripted({
    propose_relationship_map: [
      toolUseResponse("retrieve", { query: "key decision-makers and board members" }),
      toolUseResponse("propose_relationship_map_entry", {
        prospectId,
        name: "David Hallworth",
        role: "Trustee",
        decisionPower: "High — sits on the grants committee",
        warmPathNote: "Serves with our CDO Ruth on a water-sector board.",
        source: "Board minutes",
      }),
      textResponse("Proposed a key decision-maker for your review."),
    ],
  });
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
    discovery: new SeededDiscoveryProvider(),
  };
}

async function runCopilotTask(
  formData: FormData,
  taskType:
    | "propose_qpi"
    | "draft_strategy"
    | "propose_relationship_map"
    | "research_prospect"
    | "draft_visit_plan",
  providersFor: (prospectId: string) => Providers,
  label: string,
): Promise<CopilotActionState> {
  let prospectId: string | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has expired — sign in again." };
    const raw = formData.get("prospectId");
    if (typeof raw !== "string" || raw.length === 0)
      return { ok: false, error: "Missing prospect." };
    prospectId = raw;

    const providers = getEnv().AI_MODE === "live" ? createProviders(getEnv()) : providersFor(raw);
    await runTask({
      providers,
      taskType,
      tools: buildToolset(),
      caller: callerOf(user),
      db: getAppDb(),
      userContent: `${taskType} for prospect ${raw}.`,
    });
    return { ok: true };
  } catch (error) {
    console.error(`[prospects] ${label} failed`, error);
    return { ok: false, error: "The copilot could not finish — please try again." };
  } finally {
    if (prospectId) revalidatePath(`/95-forward/prospects/${prospectId}`);
  }
}

export async function runProspectKnowledgeAction(
  _prev: CopilotActionState,
  formData: FormData,
): Promise<CopilotActionState> {
  return runCopilotTask(
    formData,
    "research_prospect",
    knowledgeProviders,
    "runProspectKnowledgeAction",
  );
}

export async function runProspectStrategyAction(
  _prev: CopilotActionState,
  formData: FormData,
): Promise<CopilotActionState> {
  return runCopilotTask(formData, "draft_strategy", strategyProviders, "runProspectStrategyAction");
}

export async function runProspectVisitPlanAction(
  _prev: CopilotActionState,
  formData: FormData,
): Promise<CopilotActionState> {
  return runCopilotTask(
    formData,
    "draft_visit_plan",
    visitPlanProviders,
    "runProspectVisitPlanAction",
  );
}

export async function runProspectRelationshipMapAction(
  _prev: CopilotActionState,
  formData: FormData,
): Promise<CopilotActionState> {
  return runCopilotTask(
    formData,
    "propose_relationship_map",
    relationshipMapProviders,
    "runProspectRelationshipMapAction",
  );
}

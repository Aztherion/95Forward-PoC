"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import {
  askInputSchema,
  draftRequestSchema,
  followUpDoneInputSchema,
  getEnv,
  promoteReferralInputSchema,
  referralInputSchema,
  saveCallMemoInputSchema,
  visitDebriefInputSchema,
  type CurrentUser,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { getAppDb } from "@/server/db";
import {
  createAsk,
  createReferral,
  debriefVisit,
  markFollowUpDone,
  promoteReferral,
  saveCallMemo,
} from "@/server/data/execution-mutations";
import { getConstituentIdForProspect } from "@/server/data/execution-data";
import { getTenantSettings } from "@/server/data/settings";
import { enqueueFollowUpDraft } from "@/server/jobs";
import type { CopilotActionState } from "@/components/copilot/copilot-action-state";

export interface FormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

function fieldErrorsFrom(flattened: Record<string, string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flattened)) {
    if (messages && messages[0]) out[key] = messages[0];
  }
  return out;
}

function optionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function dollarsToCents(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

function revalidateProspect(prospectId: string): void {
  revalidatePath(`/95-forward/prospects/${prospectId}`);
}

export async function createAskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const outcome = optionalText(formData.get("outcome"));
  const parsed = askInputSchema.safeParse({
    prospectId: formData.get("prospectId"),
    visitId: optionalText(formData.get("visitId")),
    fundingInitiativeId: formData.get("fundingInitiativeId"),
    amountMinCents: dollarsToCents(formData.get("amountMinDollars")),
    amountMaxCents: dollarsToCents(formData.get("amountMaxDollars")),
    askType: optionalText(formData.get("askType")),
    numbersOnTable: formData.get("numbersOnTable") === "on",
    outcome,
    commitmentAmountCents: dollarsToCents(formData.get("commitmentAmountDollars")),
    commitmentSchedule: optionalText(formData.get("commitmentSchedule")),
    roadmapNextSteps: optionalText(formData.get("roadmapNextSteps")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await createAsk(user.tenantId, parsed.data);
  revalidateProspect(parsed.data.prospectId);
  revalidatePath(`/95-forward/initiatives/${parsed.data.fundingInitiativeId}`);
  revalidatePath("/95-forward/initiatives");
  return { ok: true };
}

export async function debriefVisitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = visitDebriefInputSchema.safeParse({
    visitId: formData.get("visitId"),
    prospectId: formData.get("prospectId"),
    outcome: optionalText(formData.get("outcome")),
    callMemo: optionalText(formData.get("callMemo")),
    nextStep: optionalText(formData.get("nextStep")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await debriefVisit(user.tenantId, user.id, parsed.data);
  revalidateProspect(parsed.data.prospectId);
  return { ok: true };
}

export async function markFollowUpDoneAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const prospectId = formData.get("prospectId");
  const parsed = followUpDoneInputSchema.safeParse({
    followUpTaskId: formData.get("followUpTaskId"),
  });
  if (!parsed.success) return;
  await markFollowUpDone(user.tenantId, parsed.data.followUpTaskId);
  if (typeof prospectId === "string") revalidateProspect(prospectId);
  revalidatePath("/95-forward/today");
  revalidatePath("/95-forward/green-sheet");
}

export async function createReferralAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = referralInputSchema.safeParse({
    sourceProspectId: formData.get("sourceProspectId"),
    sourceVisitId: optionalText(formData.get("sourceVisitId")),
    referredName: formData.get("referredName"),
    mayUseName: formData.get("mayUseName") === "on",
    willSendNote: formData.get("willSendNote") === "on",
    relationshipNote: optionalText(formData.get("relationshipNote")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.flatten().fieldErrors) };
  }
  await createReferral(user.tenantId, parsed.data);
  revalidateProspect(parsed.data.sourceProspectId);
  return { ok: true };
}

export async function promoteReferralAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const sourceProspectId = formData.get("sourceProspectId");
  const parsed = promoteReferralInputSchema.safeParse({
    referralId: formData.get("referralId"),
    displayName: formData.get("displayName"),
    type: optionalText(formData.get("type")) ?? "individual",
  });
  if (!parsed.success) return;
  const newProspectId = await promoteReferral(user.tenantId, parsed.data);
  if (typeof sourceProspectId === "string") revalidateProspect(sourceProspectId);
  redirect(`/95-forward/prospects/${newProspectId}`);
}

export async function saveCallMemoAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const prospectId = formData.get("prospectId");
  const parsed = saveCallMemoInputSchema.safeParse({
    visitId: formData.get("visitId"),
    callMemo: formData.get("callMemo"),
  });
  if (!parsed.success) return;
  await saveCallMemo(user.tenantId, parsed.data.visitId, parsed.data.callMemo);
  if (typeof prospectId === "string") revalidateProspect(prospectId);
}

function callerOf(user: CurrentUser): Pick<CurrentUser, "id" | "tenantId" | "role"> {
  return { id: user.id, tenantId: user.tenantId, role: user.role };
}

function draftProviders(
  taskType: "draft_call_memo" | "draft_follow_up",
  constituentId: string,
): Providers {
  const points =
    taskType === "draft_call_memo"
      ? [
          "Discussed the multi-year Bolivia scale-up; strong trustee interest.",
          "Outcome: roadmap — board reviews multi-year commitments next quarter.",
          "Next step: send the Bolivia briefing and propose a trustee visit.",
        ]
      : [
          "Thank them for the candid conversation about Bolivia.",
          "Reflect their interest in a measurable, multi-year commitment.",
          "Confirm the next step: briefing materials on the way this week.",
        ];
  const model = MockModelProvider.scripted({
    [taskType]: [
      toolUseResponse("retrieve", { query: "the visit notes and outcome" }),
      toolUseResponse("draft_text", {
        kind: taskType === "draft_call_memo" ? "call_memo" : "follow_up",
        constituentId,
        points,
      }),
      textResponse("Drafted for your review."),
    ],
  });
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
    discovery: new SeededDiscoveryProvider(),
  };
}

async function runDraft(
  formData: FormData,
  taskType: "draft_call_memo" | "draft_follow_up",
  label: string,
): Promise<CopilotActionState> {
  let prospectId: string | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has expired — sign in again." };
    const parsed = draftRequestSchema.safeParse({ prospectId: formData.get("prospectId") });
    if (!parsed.success) return { ok: false, error: "Missing prospect." };
    prospectId = parsed.data.prospectId;
    const constituentId = await getConstituentIdForProspect(user.tenantId, prospectId);
    if (!constituentId) return { ok: false, error: "Prospect not found." };
    const providers =
      getEnv().AI_MODE === "live"
        ? createProviders(getEnv())
        : draftProviders(taskType, constituentId);
    await runTask({
      providers,
      taskType,
      tools: buildToolset(),
      caller: callerOf(user),
      db: getAppDb(),
      userContent: `${taskType} for prospect ${prospectId}.`,
    });
    return { ok: true };
  } catch (error) {
    console.error(`[execution] ${label} failed`, error);
    return { ok: false, error: "The copilot could not finish — please try again." };
  } finally {
    if (prospectId) revalidateProspect(prospectId);
  }
}

export async function runCallMemoDraftAction(
  _prev: CopilotActionState,
  formData: FormData,
): Promise<CopilotActionState> {
  return runDraft(formData, "draft_call_memo", "runCallMemoDraftAction");
}

// The 24-hour follow-up draft is now a durable background job (Initiative 11), enqueued only when
// the draft_24h_followups copilot toggle is on. The draft still lands as the I10 draft artifact.
export async function runFollowUpDraftAction(
  _prev: CopilotActionState,
  formData: FormData,
): Promise<CopilotActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired — sign in again." };
  const parsed = draftRequestSchema.safeParse({ prospectId: formData.get("prospectId") });
  if (!parsed.success) return { ok: false, error: "Missing prospect." };
  const settings = await getTenantSettings(user.tenantId);
  if (!settings.toggles.draft_24h_followups) {
    return { ok: false, error: "24-hour follow-up drafts are turned off in settings." };
  }
  await enqueueFollowUpDraft(user.tenantId, user.id, parsed.data.prospectId);
  revalidateProspect(parsed.data.prospectId);
  return { ok: true };
}

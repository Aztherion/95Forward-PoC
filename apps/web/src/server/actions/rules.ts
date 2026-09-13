"use server";

import { revalidatePath } from "next/cache";
import { RuleValidationError, type RuleEdit } from "@95forward/db";
import { catalogueEntry, type ParameterSpec } from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import {
  addGoal,
  captureProposal,
  removeGoal,
  resetRuleToDefault,
  saveRule,
  setGoalOrder,
} from "@/server/data/rules";

export interface RulesFormState {
  ok?: boolean;
  error?: string;
  /** Parameter key -> message, so the input that is wrong is the one that says so. */
  fieldErrors?: Record<string, string>;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

function revalidateRules(ruleId?: string) {
  revalidatePath("/rules");
  if (ruleId) revalidatePath(`/rules/${ruleId}`);
}

/**
 * Turn form strings back into the types the catalogue declares.
 *
 * Returns `undefined` for an absent field rather than coercing: `Number("")` is 0, and 0 is a legal
 * -looking number that would sail past a "did they submit it?" check and land as a coverage
 * multiple of zero.
 */
function readParameter(formData: FormData, spec: ParameterSpec): unknown {
  if (spec.type === "enum-list") {
    return formData.getAll(`param.${spec.key}`).map(String);
  }
  const raw = formData.get(`param.${spec.key}`);
  if (raw === null) return undefined;
  const text = String(raw);
  if (spec.type === "number") {
    if (text.trim() === "") return undefined;
    return Number(text);
  }
  return text;
}

function handle(error: unknown): RulesFormState {
  if (error instanceof RuleValidationError) {
    const fieldErrors: Record<string, string> = {};
    for (const e of error.errors) fieldErrors[e.parameterKey] = e.message;
    return { ok: false, error: error.message, fieldErrors };
  }
  throw error;
}

export async function saveRuleAction(
  _prev: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  const user = await requireUser();
  const ruleId = String(formData.get("ruleId") ?? "");
  const entry = catalogueEntry(ruleId);
  if (!entry) return { ok: false, error: `"${ruleId}" is not a rule in the catalogue.` };

  const parameterValues: Record<string, unknown> = {};
  for (const spec of entry.parameters) {
    const value = readParameter(formData, spec);
    if (value !== undefined) parameterValues[spec.key] = value;
  }

  const statement = String(formData.get("statement") ?? "").trim();
  const edit: RuleEdit = {
    parameterValues: Object.keys(parameterValues).length > 0 ? parameterValues : null,
    // Storing the default verbatim would mark the rule "edited" forever, so an unchanged sentence
    // clears the override instead.
    statement: statement && statement !== entry.statement ? statement : null,
  };

  try {
    await saveRule(user.tenantId, ruleId, edit, { userId: user.id, name: user.name });
  } catch (error) {
    return handle(error);
  }
  revalidateRules(ruleId);
  return { ok: true };
}

export async function toggleRuleAction(
  _prev: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  const user = await requireUser();
  const ruleId = String(formData.get("ruleId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  try {
    await saveRule(user.tenantId, ruleId, { enabled }, { userId: user.id, name: user.name });
  } catch (error) {
    return handle(error);
  }
  revalidateRules(ruleId);
  return { ok: true };
}

export async function resetRuleAction(
  _prev: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  const user = await requireUser();
  const ruleId = String(formData.get("ruleId") ?? "");
  await resetRuleToDefault(user.tenantId, ruleId, { userId: user.id, name: user.name });
  revalidateRules(ruleId);
  return { ok: true };
}

export async function reorderGoalsAction(
  _prev: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  const user = await requireUser();
  const orderedIds = formData.getAll("goalId").map(String);
  try {
    await setGoalOrder(user.tenantId, orderedIds, { userId: user.id, name: user.name });
  } catch (error) {
    return handle(error);
  }
  revalidateRules();
  return { ok: true };
}

export async function addGoalAction(
  _prev: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  const user = await requireUser();
  try {
    await addGoal(user.tenantId, String(formData.get("statement") ?? ""), {
      userId: user.id,
      name: user.name,
    });
  } catch (error) {
    return handle(error);
  }
  revalidateRules();
  return { ok: true };
}

export async function removeGoalAction(
  _prev: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  const user = await requireUser();
  await removeGoal(user.tenantId, String(formData.get("goalId") ?? ""), {
    userId: user.id,
    name: user.name,
  });
  revalidateRules();
  return { ok: true };
}

/**
 * Capture a rule the org wants that we do not have.
 *
 * It is stored and shown; it is NOT compiled into behaviour. The catalogue is code — see
 * `packages/shared/src/rules-catalogue.ts` for why that boundary is the point rather than a gap.
 */
export async function proposeRuleAction(
  _prev: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  const user = await requireUser();
  try {
    await captureProposal(user.tenantId, String(formData.get("statement") ?? ""), {
      userId: user.id,
      name: user.name,
    });
  } catch (error) {
    return handle(error);
  }
  revalidateRules();
  return { ok: true };
}

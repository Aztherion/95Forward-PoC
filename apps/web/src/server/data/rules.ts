import "server-only";
import {
  createRuleGoal,
  deleteRuleGoal,
  listProposedRules,
  listRuleChanges,
  listRuleGoals,
  proposeRule,
  reorderRuleGoals,
  resetRule,
  resolveTenantCatalogue,
  resolveTenantSettings,
  rulesVersion,
  updateRule,
  withTenant,
  type ProposedRuleRow,
  type RuleActor,
  type RuleChangeRow,
  type RuleEdit,
  type RuleGoalRow,
} from "@95forward/db";
import {
  CATEGORY_LABELS,
  checkScope,
  enabledCheckDefinitions,
  firingFor,
  registerBuiltInRules,
  type CatalogueCategory,
  type FiringResult,
  type MetricScope,
  type ResolvedEntry,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { demoClock, loadForwardSnapshot } from "@/server/data/forward-context";

// The catalogue registry is module-global and populated by import side effect. Calling this on every
// entry point is intentional and cheap: Next.js can tear down and rebuild a server module between
// requests, and a half-registered catalogue would render an editor missing rules rather than fail.
registerBuiltInRules();

export interface RuleGroup {
  readonly category: CatalogueCategory;
  readonly label: string;
  readonly entries: readonly ResolvedEntry[];
}

export interface RulesPageData {
  readonly groups: readonly RuleGroup[];
  readonly goals: readonly RuleGoalRow[];
  readonly proposals: readonly ProposedRuleRow[];
  readonly changes: readonly RuleChangeRow[];
  readonly version: string;
  /** ruleId -> how many opportunities it is firing on right now. */
  readonly firingCounts: Readonly<Record<string, number>>;
}

const SCOPE: MetricScope = { rep: "all", initiative: "all", period: "FY26" };

export async function getRulesPageData(tenantId: string): Promise<RulesPageData> {
  const [resolved, goals, proposals, changes, version] = await withTenant(
    getAppDb(),
    tenantId,
    async (tx) =>
      Promise.all([
        resolveTenantCatalogue(tx, tenantId),
        listRuleGoals(tx, tenantId),
        listProposedRules(tx, tenantId),
        listRuleChanges(tx, tenantId, { limit: 12 }),
        rulesVersion(tx, tenantId),
      ]),
  );

  const settings = await withTenant(getAppDb(), tenantId, (tx) =>
    resolveTenantSettings(tx, tenantId),
  );
  const snapshot = await loadForwardSnapshot(tenantId);
  const clock = demoClock();

  // ONE run of the SAME engine the Fix-first block uses, grouped by rule — not one run per rule.
  // Cheaper, but mostly it means the list cannot disagree with the block: they are the same
  // findings. A rule that is off contributes nothing here and is labelled "Not running" rather than
  // "Firing on 0", because "off" and "clean" must not look alike.
  const findings = checkScope({
    snapshot,
    scope: SCOPE,
    settings,
    clock,
    checks: enabledCheckDefinitions(resolved),
  }).findings;

  const firingCounts: Record<string, number> = {};
  for (const entry of resolved) {
    if (entry.kind === "rule") firingCounts[entry.id] = 0;
  }
  for (const finding of findings) {
    firingCounts[finding.ruleId] = (firingCounts[finding.ruleId] ?? 0) + 1;
  }

  const byCategory = new Map<CatalogueCategory, ResolvedEntry[]>();
  for (const entry of resolved) {
    const bucket = byCategory.get(entry.category) ?? [];
    bucket.push(entry);
    byCategory.set(entry.category, bucket);
  }

  const groups: RuleGroup[] = [...byCategory.entries()].map(([category, entries]) => ({
    category,
    label: CATEGORY_LABELS[category],
    entries,
  }));
  // Rules before parameters: what the system does comes ahead of what it is tuned to.
  const ORDER: CatalogueCategory[] = [
    "forecast-hygiene",
    "relationship-cadence",
    "coverage-parameters",
    "forecasting-parameters",
  ];
  groups.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));

  return { groups, goals, proposals, changes, version, firingCounts };
}

export interface RuleDetailData {
  readonly entry: ResolvedEntry;
  readonly firing: FiringResult;
  readonly changes: readonly RuleChangeRow[];
  readonly enabledCheckCount: number;
}

export async function getRuleDetail(
  tenantId: string,
  ruleId: string,
): Promise<RuleDetailData | null> {
  const [resolved, changes] = await withTenant(getAppDb(), tenantId, async (tx) =>
    Promise.all([
      resolveTenantCatalogue(tx, tenantId),
      listRuleChanges(tx, tenantId, { ruleId, limit: 50 }),
    ]),
  );

  const entry = resolved.find((e) => e.id === ruleId);
  if (!entry) return null;

  const settings = await withTenant(getAppDb(), tenantId, (tx) =>
    resolveTenantSettings(tx, tenantId),
  );
  const snapshot = await loadForwardSnapshot(tenantId);

  const firing = firingFor(ruleId, {
    snapshot,
    scope: SCOPE,
    settings,
    clock: demoClock(),
    resolved,
  });

  return {
    entry,
    firing,
    changes,
    enabledCheckCount: enabledCheckDefinitions(resolved).length,
  };
}

// -------------------------------------------------------------------------------------------
// Writes — every one of them through withTenant, so RLS applies to the editor too.
// -------------------------------------------------------------------------------------------

export async function saveRule(
  tenantId: string,
  ruleId: string,
  edit: RuleEdit,
  actor: RuleActor,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) => updateRule(tx, tenantId, ruleId, edit, actor));
}

export async function resetRuleToDefault(
  tenantId: string,
  ruleId: string,
  actor: RuleActor,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) => resetRule(tx, tenantId, ruleId, actor));
}

export async function addGoal(
  tenantId: string,
  statement: string,
  actor: RuleActor,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) => createRuleGoal(tx, tenantId, statement, actor));
}

export async function removeGoal(
  tenantId: string,
  goalId: string,
  actor: RuleActor,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) => deleteRuleGoal(tx, tenantId, goalId, actor));
}

export async function setGoalOrder(
  tenantId: string,
  orderedIds: readonly string[],
  actor: RuleActor,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) =>
    reorderRuleGoals(tx, tenantId, orderedIds, actor),
  );
}

export async function captureProposal(
  tenantId: string,
  statement: string,
  actor: RuleActor,
): Promise<void> {
  await withTenant(getAppDb(), tenantId, (tx) =>
    proposeRule(tx, tenantId, statement, { actor }),
  );
}

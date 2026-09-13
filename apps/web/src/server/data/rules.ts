import "server-only";
import {
  createRuleGoal,
  deleteRuleGoal,
  listProposedRules,
  listRuleChanges,
  listRuleGoals,
  loadMetricsSnapshot,
  proposeRule,
  reorderRuleGoals,
  resetRule,
  resolveTenantCatalogue,
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
  RANKING_RULE_IDS,
  registerBuiltInRules,
  registerRankingRules,
  settingsFromCatalogue,
  type CatalogueCategory,
  type FiringResult,
  type MetricScope,
  type ResolvedEntry,
} from "@95forward/shared";
import { getAppDb } from "@/server/db";
import { demoClock } from "@/server/data/forward-context";

// The catalogue registry is module-global and populated by import side effect. Calling this on every
// entry point is intentional and cheap: Next.js can tear down and rebuild a server module between
// requests, and a half-registered catalogue would render an editor missing rules rather than fail.
registerBuiltInRules();
// I23 registers the seven ranking rules, so /rules lists and explains them like any other.
registerRankingRules();

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
  // ONE tenant transaction for everything the page needs.
  //
  // This used to be three — catalogue, then settings, then the snapshot — and each `withTenant` is
  // a round trip that opens a transaction and sets the tenant GUC. I23 made the snapshot heavier
  // (events, visits and partners for the ranking rules), and three serial trips was enough to put
  // the page over a Playwright navigation timeout under load. One trip is also simply correct:
  // three reads of the same tenant taken at three moments can disagree with each other.
  const { resolved, goals, proposals, changes, version, settings, snapshot } = await withTenant(
    getAppDb(),
    tenantId,
    async (tx) => {
      const [resolved, goals, proposals, changes, version, snapshot] = await Promise.all([
        resolveTenantCatalogue(tx, tenantId),
        listRuleGoals(tx, tenantId),
        listProposedRules(tx, tenantId),
        listRuleChanges(tx, tenantId, { limit: 12 }),
        rulesVersion(tx, tenantId),
        loadMetricsSnapshot(tx, tenantId, { now: demoClock().now() }),
      ]);
      return {
        resolved,
        goals,
        proposals,
        changes,
        version,
        snapshot,
        // Derived from `resolved`, so it costs nothing and cannot disagree with it.
        settings: settingsFromCatalogue(resolved),
      };
    },
  );

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

  // I23's ranking rules are not consistency checks, so `checkScope` never returns them and the
  // loop above would leave every one of them reading "Firing on 0" — a page lying about its own
  // rules. They go through `firingFor`, which is the same registered predicate the detail page
  // and the queue use, so the three cannot disagree.
  for (const entry of resolved) {
    if (entry.kind !== "rule" || !RANKING_RULE_IDS.includes(entry.id as never)) continue;
    firingCounts[entry.id] = firingFor(entry.id, {
      snapshot,
      scope: SCOPE,
      settings,
      clock,
      resolved,
    }).count;
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
  // One transaction, for the same reasons as above.
  const { resolved, changes, snapshot } = await withTenant(getAppDb(), tenantId, async (tx) => {
    const [resolved, changes, snapshot] = await Promise.all([
      resolveTenantCatalogue(tx, tenantId),
      listRuleChanges(tx, tenantId, { ruleId, limit: 50 }),
      loadMetricsSnapshot(tx, tenantId, { now: demoClock().now() }),
    ]);
    return { resolved, changes, snapshot };
  });

  const entry = resolved.find((e) => e.id === ruleId);
  if (!entry) return null;

  const settings = settingsFromCatalogue(resolved);

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

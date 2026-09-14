import "server-only";
import {
  completeDraft,
  getDraft,
  getForwardOpportunity,
  listOpportunityEvents,
  loadMetricsSnapshot,
  loadMilestoneStates,
  loadOpportunityFacts,
  resolveTenantCatalogue,
  saveDraftEdit,
  saveGeneratedDraft,
  withTenant,
  type OpportunityDraftRow,
} from "@95forward/db";
import {
  DRAFT_AUDIENCE,
  editedPercent,
  generateDraft,
  type DraftContext,
  type DraftResult,
} from "@95forward/ai";
import { createProviders } from "@95forward/ai";
import {
  getEnv,
  rankOne,
  registerBuiltInRules,
  registerRankingRules,
  settingsFromCatalogue,
  stageNextAction,
  type MetricScope,
  type NextActionKind,
} from "@95forward/shared";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";
import { getAppDb } from "@/server/db";
import { demoClock } from "@/server/data/forward-context";
import { stageLabel } from "@/app/95-forward/board/board-copy";

registerBuiltInRules();
registerRankingRules();

/**
 * Mock or live, by the same seam the feedback widget uses.
 *
 * `AI_MODE` already distinguishes them everywhere else; `DRAFT_MODE` is not a second switch, it is
 * the same one read through one function so a test can see at a glance what a run will do. Every
 * e2e run is mock, and there is no code path from a test to a model.
 */
export function draftMode(): "mock" | "live" {
  return getEnv().AI_MODE === "live" ? "live" : "mock";
}

/**
 * Build the briefing for one opportunity.
 *
 * Everything the drafter may use, and nothing else — which is why it is assembled here, from the
 * record, rather than by the drafter reaching for things. Amounts and dates are formatted on the
 * way in, so the model never handles cents and never formats a date.
 */
export async function buildDraftContext(
  tenantId: string,
  opportunityId: string,
  repUserId: string,
  kind?: NextActionKind,
): Promise<DraftContext | null> {
  const clock = demoClock();
  const now = clock.now();

  const loaded = await withTenant(getAppDb(), tenantId, async (tx) => {
    const opportunity = await getForwardOpportunity(tx, tenantId, opportunityId);
    if (!opportunity) return null;
    const [resolved, snapshot, facts, milestones, events] = await Promise.all([
      resolveTenantCatalogue(tx, tenantId),
      loadMetricsSnapshot(tx, tenantId, { now }),
      loadOpportunityFacts(tx, tenantId, opportunityId),
      loadMilestoneStates(tx, tenantId, opportunityId),
      listOpportunityEvents(tx, tenantId, opportunityId),
    ]);
    return { opportunity, resolved, snapshot, facts, milestones, events };
  });
  if (!loaded || !loaded.facts) return null;

  const { opportunity, resolved, snapshot, facts, milestones, events } = loaded;
  const settings = settingsFromCatalogue(resolved);
  const period = settings.fiscalPeriods[0]?.label ?? "FY26";
  const row = snapshot.opportunities.find((o) => o.id === opportunityId);
  if (!row) return null;

  const scope: MetricScope = { rep: repUserId, initiative: "all", period };
  const ranked = rankOne({ snapshot, scope, settings, clock, resolved, opportunityId });
  const action =
    ranked?.nextAction ?? stageNextAction(row.stage, { opportunityId, prospectId: row.prospectId });
  const resolvedKind = kind ?? action.kind;

  const silenceDays =
    row.lastContactAt === null
      ? null
      : Math.max(
          0,
          Math.floor((now.getTime() - new Date(row.lastContactAt).getTime()) / 86_400_000),
        );

  // The connector: for `use-introduction` the one who OFFERED; for `ask-partner` one who has not
  // been asked. Handing over the wrong partner writes to the wrong person.
  const partner =
    resolvedKind === "use-introduction"
      ? (row.partners.find((p) => p.introOfferedAt && !p.introUsedAt) ?? row.partners[0] ?? null)
      : resolvedKind === "ask-partner"
        ? (row.partners.find((p) => !p.askedToOpenDoorAt) ?? row.partners[0] ?? null)
        : (row.partners[0] ?? null);

  const leader = milestones.find((m) => m.key === "ask_approved_by_leader")?.confirmedBy ?? null;

  return {
    kind: resolvedKind,
    today: formatDate(now.toISOString().slice(0, 10)),
    prospect: {
      name: facts.prospectName,
      type: facts.prospectType,
      // Only what the knowledge base holds. No research, no inference.
      facts: [],
    },
    opportunity: {
      amount: formatCurrencyFromCents(opportunity.amountCents),
      amountNote: facts.amountNote,
      closeDate: opportunity.closeDate ? formatDate(opportunity.closeDate) : null,
      stage: stageLabel(opportunity.stage),
      closeDateMoves: row.closeDateMoves,
      closeDateMovesProspectSourced: row.closeDateMovesProspectSourced,
      silenceDays,
      lastContact: row.lastContactAt ? formatDate(row.lastContactAt.slice(0, 10)) : null,
    },
    initiative: {
      name: facts.initiativeName,
      story: null,
      goal: null,
    },
    milestones: milestones.map((m) => ({
      label: m.label,
      source: m.source,
      blocking: m.blocking,
      confirmed: m.confirmed,
      confirmedBy: m.confirmedBy,
      confirmedOn: m.confirmedAt ? formatDate(m.confirmedAt.toISOString().slice(0, 10)) : null,
      evidence: m.evidence,
    })),
    rule: ranked
      ? {
          id: ranked.primaryRuleId,
          statement: resolved.find((e) => e.id === ranked.primaryRuleId)?.statement ?? "",
          rationale: ranked.rationale,
        }
      : null,
    people: {
      relationshipManager: facts.relationshipManager,
      connector: partner
        ? {
            name: partner.name,
            role: partner.role,
            introOfferedOn: partner.introOfferedAt
              ? formatDate(partner.introOfferedAt.slice(0, 10))
              : null,
          }
        : null,
      leader,
    },
    recentEvents: events.slice(0, 6).map((event) => {
      const when = formatDate(event.occurredAt.toISOString().slice(0, 10));
      const who = event.actorName ? `, ${event.actorName}` : "";
      const sourced = event.prospectSourced ? ", from the prospect" : "";
      const what =
        event.note ??
        `${event.eventType.replace(/_/g, " ")}${event.field ? ` (${event.field})` : ""}`;
      return `${when} — ${what}${who}${sourced}.`;
    }),
  };
}

export interface DraftView {
  readonly kind: NextActionKind;
  readonly audience: string;
  readonly subject: string | null;
  readonly generatedText: string;
  readonly finalText: string;
  readonly edited: boolean;
  readonly editedPercent: number;
  readonly regeneratedCount: number;
  readonly completedAt: string | null;
  readonly provider: string;
  /** Advisory: what the checker thought the draft mentioned that the record does not. */
  readonly groundingIssues: readonly string[];
}

function toView(row: OpportunityDraftRow, issues: readonly string[] = []): DraftView {
  return {
    kind: row.kind as NextActionKind,
    audience: row.audience,
    subject: row.subject,
    generatedText: row.generatedText,
    finalText: row.finalText,
    edited: row.edited,
    editedPercent: row.editedPercent,
    regeneratedCount: row.regeneratedCount,
    completedAt: row.completedAt?.toISOString() ?? null,
    provider: row.provider,
    groundingIssues: issues,
  };
}

export async function loadDraft(
  tenantId: string,
  opportunityId: string,
  kind: NextActionKind,
): Promise<DraftView | null> {
  const row = await withTenant(getAppDb(), tenantId, (tx) =>
    getDraft(tx, tenantId, opportunityId, kind),
  );
  return row ? toView(row) : null;
}

/** Generate (or regenerate) and persist. Both bodies are stored from the first save. */
export async function generateAndSave(
  tenantId: string,
  opportunityId: string,
  repUserId: string,
  kind: NextActionKind,
  actor: { userId: string; name: string },
): Promise<DraftView> {
  const context = await buildDraftContext(tenantId, opportunityId, repUserId, kind);
  if (!context) throw new Error("generateAndSave: no such opportunity");

  const mode = draftMode();
  const result: DraftResult = await generateDraft({
    providers: createProviders(getEnv()),
    context,
    mode,
  });

  const row = await withTenant(getAppDb(), tenantId, (tx) =>
    saveGeneratedDraft(tx, tenantId, {
      opportunityId,
      kind,
      audience: DRAFT_AUDIENCE[kind],
      subject: result.subject,
      generatedText: result.text,
      provider: result.provider,
      actor,
      clock: demoClock(),
    }),
  );
  return toView(
    row,
    result.grounding.issues.map((issue) => `${issue.value} — ${issue.why}`),
  );
}

export async function saveEdit(
  tenantId: string,
  opportunityId: string,
  kind: NextActionKind,
  finalText: string,
  actor: { userId: string; name: string },
): Promise<DraftView> {
  const existing = await withTenant(getAppDb(), tenantId, (tx) =>
    getDraft(tx, tenantId, opportunityId, kind),
  );
  if (!existing) throw new Error("saveEdit: no draft to edit");

  const row = await withTenant(getAppDb(), tenantId, (tx) =>
    saveDraftEdit(tx, tenantId, {
      opportunityId,
      kind,
      finalText,
      editedPercent: editedPercent(existing.generatedText, finalText),
      actor,
      clock: demoClock(),
    }),
  );
  return toView(row);
}

export async function markDraftDone(
  tenantId: string,
  opportunityId: string,
  kind: NextActionKind,
  actor: { userId: string; name: string },
): Promise<{ view: DraftView; effect: string }> {
  const result = await withTenant(getAppDb(), tenantId, (tx) =>
    completeDraft(tx, tenantId, { opportunityId, kind, actor, clock: demoClock() }),
  );
  return { view: toView(result.draft), effect: result.effect };
}

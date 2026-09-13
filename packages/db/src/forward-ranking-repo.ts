// 95 Forward — the action queue, persisted (Initiative 23).
//
// The ranking itself is pure (@95forward/shared/forward-ranking). This module supplies the three
// things it cannot compute for itself: the org's doctrine, the human overrides, and a PER-
// OPPORTUNITY DATA VERSION that dismissals are pinned to.
//
// That last one is the whole design of dismiss. A dismissal records what the opportunity looked like
// when somebody waved the coaching away, and is honoured only while that still matches. Fixing the
// problem re-arms the rule; so does the problem getting worse. Without it a rep could permanently
// silence guidance about a deal that is quietly falling apart, which is exactly the failure an
// override mechanism has to avoid being.

import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import {
  dayWork,
  enabledCheckDefinitions,
  registerBuiltInRules,
  registerRankingRules,
  type Clock,
  type DayWorkResult,
  type DecisionKind,
  type ForwardSettings,
  type MetricScope,
  type MetricsSnapshot,
  type QueueDecision,
  type ResolvedEntry,
} from "@95forward/shared";
import type { Database } from "./client";
import { forwardOpportunities, opportunityEvents } from "./schema/forward";
import { queueDecisions } from "./schema/queue";

// The catalogue registry is module-global and populated by call, not by import side effect. Doing it
// here means any consumer of the queue gets all seven rules registered without having to know they
// need to, and both calls are idempotent.
registerBuiltInRules();
registerRankingRules();

export type QueueDecisionRow = typeof queueDecisions.$inferSelect;

export interface QueueActor {
  readonly userId?: string | null;
  readonly name?: string | null;
}

/**
 * What "the data changed" means, per opportunity.
 *
 * The row's own `updated_at` plus the latest event timestamp and the event count. Three parts
 * because each catches something the others miss: a direct field edit bumps `updated_at`, a
 * milestone confirmation or a logged contact appends an event without touching the row, and the
 * count moves even when two events land in the same second.
 *
 * Deliberately NOT the tenant-wide `dataVersion` used by I21's simulation cache: that one moves when
 * ANY opportunity changes, which would expire every dismissal in the portfolio the moment one
 * unrelated record was touched. A dismissal should survive somebody else's Tuesday.
 */
export async function opportunityDataVersions(
  db: Database,
  tenantId: string,
): Promise<Record<string, string>> {
  const rows = await db
    .select({
      id: forwardOpportunities.id,
      updatedAt: forwardOpportunities.updatedAt,
    })
    .from(forwardOpportunities)
    .where(eq(forwardOpportunities.tenantId, tenantId));

  const events = await db
    .select({
      opportunityId: opportunityEvents.opportunityId,
      latest: sql<string | null>`max(${opportunityEvents.occurredAt})`,
      rows: sql<number>`count(*)::int`,
    })
    .from(opportunityEvents)
    .where(
      and(
        eq(opportunityEvents.tenantId, tenantId),
        // Guidance events are EXCLUDED, and this is load-bearing rather than tidy.
        //
        // Dismissing an item writes a `guidance_dismissed` row to this same log. If that counted
        // toward the version, the act of dismissing would move the version past the one the
        // dismissal was just pinned to, and every dismissal would expire the instant it was made —
        // silently, and only visible as "dismiss does nothing".
        //
        // It is also the right answer on its own terms: a rep reacting to coaching is not a change
        // to the opportunity, and re-arming a rule because somebody waved it away would be circular.
        notInArray(opportunityEvents.eventType, ["guidance_pinned", "guidance_dismissed"]),
      ),
    )
    .groupBy(opportunityEvents.opportunityId);

  const byOpportunity = new Map(events.map((e) => [e.opportunityId, e]));

  const out: Record<string, string> = {};
  for (const row of rows) {
    const event = byOpportunity.get(row.id);
    out[row.id] = [
      row.updatedAt?.toISOString() ?? "none",
      event?.latest ?? "none",
      event?.rows ?? 0,
    ].join("|");
  }
  return out;
}

export async function listQueueDecisions(
  db: Database,
  tenantId: string,
): Promise<QueueDecisionRow[]> {
  return db.select().from(queueDecisions).where(eq(queueDecisions.tenantId, tenantId));
}

function toDecision(row: QueueDecisionRow): QueueDecision {
  return {
    kind: row.kind,
    opportunityId: row.opportunityId,
    ruleId: row.ruleId,
    dataVersion: row.dataVersion,
    decidedAt: row.decidedAt.toISOString(),
  };
}

export interface DayWorkServiceInput {
  readonly snapshot: MetricsSnapshot;
  readonly scope: MetricScope;
  readonly settings: ForwardSettings;
  readonly clock: Clock;
  readonly resolved: readonly ResolvedEntry[];
}

/**
 * Everything a rep should do today, for one scope.
 *
 * `enabledCheckDefinitions` is threaded through so that switching an I20 check off in the rules
 * editor removes it from Fix first here too — one doctrine, read by both halves of the screen.
 */
export async function loadDayWork(
  db: Database,
  tenantId: string,
  input: DayWorkServiceInput,
): Promise<DayWorkResult> {
  const [decisionRows, dataVersions] = await Promise.all([
    listQueueDecisions(db, tenantId),
    opportunityDataVersions(db, tenantId),
  ]);

  return dayWork({
    snapshot: input.snapshot,
    scope: input.scope,
    settings: input.settings,
    clock: input.clock,
    resolved: input.resolved,
    decisions: decisionRows.map(toDecision),
    dataVersions,
    checks: enabledCheckDefinitions(input.resolved),
  });
}

// -------------------------------------------------------------------------------------------
// Pin and dismiss
// -------------------------------------------------------------------------------------------

export interface DecideInput {
  readonly opportunityId: string;
  /** Null for the queue item; an I20 or I23 rule id for one finding about it. */
  readonly ruleId?: string | null;
  readonly kind: DecisionKind;
  readonly actor?: QueueActor;
  readonly clock: Clock;
}

/**
 * Record a pin or a dismissal, and log it.
 *
 * The event log entry is not bookkeeping. A rep dismissing coaching is INFORMATION — it is what
 * lets a leader see that guidance was seen and rejected rather than never shown — so the write and
 * the log happen in one transaction and neither can be forgotten separately.
 */
export async function decideQueueItem(
  db: Database,
  tenantId: string,
  input: DecideInput,
): Promise<QueueDecisionRow> {
  const versions = await opportunityDataVersions(db, tenantId);
  const dataVersion = versions[input.opportunityId];
  if (dataVersion === undefined) {
    throw new Error(`decideQueueItem: no opportunity ${input.opportunityId} in this tenant.`);
  }

  const ruleId = input.ruleId ?? null;
  const decidedAt = input.clock.now();

  return db.transaction(async (tx) => {
    const values = {
      tenantId,
      opportunityId: input.opportunityId,
      ruleId,
      kind: input.kind,
      dataVersion,
      decidedByUserId: input.actor?.userId ?? null,
      decidedByName: input.actor?.name ?? null,
      decidedAt,
    };

    // Re-deciding is an UPDATE: it re-pins the decision to the CURRENT data version, which is what
    // "I have looked at this again and still do not want it" means. A second row would leave the
    // stale version behind and the dismissal would expire against data nobody was looking at.
    const existing = await tx
      .select()
      .from(queueDecisions)
      .where(
        and(
          eq(queueDecisions.tenantId, tenantId),
          eq(queueDecisions.opportunityId, input.opportunityId),
          eq(queueDecisions.kind, input.kind),
          ruleId === null ? sql`${queueDecisions.ruleId} is null` : eq(queueDecisions.ruleId, ruleId),
        ),
      );

    let row: QueueDecisionRow;
    if (existing[0]) {
      const [updated] = await tx
        .update(queueDecisions)
        .set({ dataVersion, decidedAt, decidedByUserId: values.decidedByUserId, decidedByName: values.decidedByName })
        .where(eq(queueDecisions.id, existing[0].id))
        .returning();
      row = updated!;
    } else {
      const [inserted] = await tx.insert(queueDecisions).values(values).returning();
      row = inserted!;
    }

    await tx.insert(opportunityEvents).values({
      tenantId,
      opportunityId: input.opportunityId,
      eventType: input.kind === "pin" ? "guidance_pinned" : "guidance_dismissed",
      field: ruleId,
      newValue: input.kind,
      actorUserId: input.actor?.userId ?? null,
      actorName: input.actor?.name ?? null,
      // Ours, not theirs: the prospect had no part in a rep waving away a coaching card.
      prospectSourced: false,
      note:
        input.kind === "pin"
          ? `Pinned${ruleId ? ` ${ruleId}` : ""} to the top of the queue`
          : `Dismissed${ruleId ? ` ${ruleId}` : ""} from the queue`,
      occurredAt: decidedAt,
    });

    return row;
  });
}

/** Undo a pin or dismissal outright, rather than waiting for the data to move. */
export async function undecideQueueItem(
  db: Database,
  tenantId: string,
  input: { readonly opportunityId: string; readonly ruleId?: string | null; readonly kind: DecisionKind },
): Promise<void> {
  const ruleId = input.ruleId ?? null;
  await db
    .delete(queueDecisions)
    .where(
      and(
        eq(queueDecisions.tenantId, tenantId),
        eq(queueDecisions.opportunityId, input.opportunityId),
        eq(queueDecisions.kind, input.kind),
        ruleId === null ? sql`${queueDecisions.ruleId} is null` : eq(queueDecisions.ruleId, ruleId),
      ),
    );
}

/**
 * The decisions that are still in force.
 *
 * A pin holds until somebody removes it. A dismissal holds only while the opportunity's data version
 * still matches — see the module header.
 */
export async function liveDecisions(
  db: Database,
  tenantId: string,
): Promise<readonly QueueDecision[]> {
  const [rows, versions] = await Promise.all([
    listQueueDecisions(db, tenantId),
    opportunityDataVersions(db, tenantId),
  ]);
  return rows
    .map(toDecision)
    .filter(
      (d) => d.kind === "pin" || versions[d.opportunityId] === undefined || versions[d.opportunityId] === d.dataVersion,
    );
}

/** Housekeeping: drop dismissals whose data has moved on. Safe to call at any time. */
export async function pruneExpiredDismissals(db: Database, tenantId: string): Promise<number> {
  const [rows, versions] = await Promise.all([
    listQueueDecisions(db, tenantId),
    opportunityDataVersions(db, tenantId),
  ]);
  const stale = rows.filter(
    (row) =>
      row.kind === "dismiss" &&
      versions[row.opportunityId] !== undefined &&
      versions[row.opportunityId] !== row.dataVersion,
  );
  if (stale.length === 0) return 0;
  await db.delete(queueDecisions).where(
    and(
      eq(queueDecisions.tenantId, tenantId),
      inArray(queueDecisions.id, stale.map((row) => row.id)),
    ),
  );
  return stale.length;
}

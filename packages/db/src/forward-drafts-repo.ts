// 95 Forward — drafted artifacts and what the human did with them (Initiative 28).
//
// Robb's one hard technical condition: every generated draft and every human edit is logged. Not as
// an audit chore — as the evidence that a person worked WITH the AI rather than rubber-stamping it.
//
// Marking a draft done is not bookkeeping either. It is what closes the loop the rule opened: a
// sent follow-up resets the silence the rule measured, a used introduction stops the intro rule
// firing, a prepped visit stops the prep rule firing. The completion semantics differ per kind and
// getting them wrong would leave a rep staring at coaching they have already acted on.

import { and, desc, eq } from "drizzle-orm";
import type { Clock } from "@95forward/shared";
import type { Database } from "./client";
import { forwardOpportunities, opportunityDrafts } from "./schema/forward";
import { naturalPartners } from "./schema/prospects";
import { visits } from "./schema/execution";
import { appendOpportunityEvent, type Actor } from "./forward-repo";

export type OpportunityDraftRow = typeof opportunityDrafts.$inferSelect;

export interface SaveDraftInput {
  readonly opportunityId: string;
  readonly kind: string;
  readonly audience: string;
  readonly subject: string | null;
  readonly generatedText: string;
  readonly provider: "mock" | "live";
  readonly actor?: Actor;
  readonly clock: Clock;
  /** True when this replaces an existing draft for the same kind. */
  readonly regenerate?: boolean;
}

export async function getDraft(
  db: Database,
  tenantId: string,
  opportunityId: string,
  kind: string,
): Promise<OpportunityDraftRow | undefined> {
  const [row] = await db
    .select()
    .from(opportunityDrafts)
    .where(
      and(
        eq(opportunityDrafts.tenantId, tenantId),
        eq(opportunityDrafts.opportunityId, opportunityId),
        eq(opportunityDrafts.kind, kind),
      ),
    );
  return row;
}

export async function listDrafts(
  db: Database,
  tenantId: string,
  opportunityId: string,
): Promise<OpportunityDraftRow[]> {
  return db
    .select()
    .from(opportunityDrafts)
    .where(
      and(
        eq(opportunityDrafts.tenantId, tenantId),
        eq(opportunityDrafts.opportunityId, opportunityId),
      ),
    )
    .orderBy(desc(opportunityDrafts.updatedAt));
}

/**
 * Record a generated draft.
 *
 * `finalText` starts equal to `generatedText` — the human has not touched it yet, and the two
 * fields only diverge when they do. A regenerate resets both and increments the count; it does not
 * append a second row, because the question the log answers is "what did they use and how much of
 * it was the model's", not "how many times did they press the button" — that is the counter.
 */
export async function saveGeneratedDraft(
  db: Database,
  tenantId: string,
  input: SaveDraftInput,
): Promise<OpportunityDraftRow> {
  const now = input.clock.now();
  const existing = await getDraft(db, tenantId, input.opportunityId, input.kind);

  const values = {
    tenantId,
    opportunityId: input.opportunityId,
    kind: input.kind,
    audience: input.audience,
    subject: input.subject,
    generatedText: input.generatedText,
    finalText: input.generatedText,
    edited: false,
    editedPercent: 0,
    regeneratedCount: existing ? existing.regeneratedCount + 1 : 0,
    completedAt: null,
    actorUserId: input.actor?.userId ?? null,
    actorName: input.actor?.name ?? null,
    provider: input.provider,
    updatedAt: now,
  };

  const [row] = await db
    .insert(opportunityDrafts)
    .values(values)
    .onConflictDoUpdate({
      target: [opportunityDrafts.tenantId, opportunityDrafts.opportunityId, opportunityDrafts.kind],
      set: values,
    })
    .returning();
  if (!row) throw new Error("saveGeneratedDraft: upsert returned no row");
  return row;
}

/** Record the human's edit. `editedPercent` is computed by the caller — it is a string measure. */
export async function saveDraftEdit(
  db: Database,
  tenantId: string,
  input: {
    readonly opportunityId: string;
    readonly kind: string;
    readonly finalText: string;
    readonly editedPercent: number;
    readonly actor?: Actor;
    readonly clock: Clock;
  },
): Promise<OpportunityDraftRow> {
  const [row] = await db
    .update(opportunityDrafts)
    .set({
      finalText: input.finalText,
      edited: input.editedPercent > 0,
      editedPercent: input.editedPercent,
      actorUserId: input.actor?.userId ?? null,
      actorName: input.actor?.name ?? null,
      updatedAt: input.clock.now(),
    })
    .where(
      and(
        eq(opportunityDrafts.tenantId, tenantId),
        eq(opportunityDrafts.opportunityId, input.opportunityId),
        eq(opportunityDrafts.kind, input.kind),
      ),
    )
    .returning();
  if (!row) throw new Error("saveDraftEdit: no draft to edit");
  return row;
}

/** The artifact's name, for the timeline sentence. */
/** The artifacts nobody sends: they are written for us, not to anybody. */
const INTERNAL_KINDS = new Set(["prep-the-visit", "get-ask-approved"]);

const ARTIFACT_NAME: Record<string, string> = {
  "follow-up-to-close": "Follow-up",
  "make-specific-ask": "The ask",
  "get-it-in-writing": "Confirmation letter",
  "prep-the-visit": "Visit prep brief",
  "get-ask-approved": "Approval request",
  "use-introduction": "Introduction request",
  // Not the same artifact: one takes up an offered introduction, the other asks for one.
  "ask-partner": "Ask to your partner",
  "get-the-visit": "Meeting request",
  "steward-the-gift": "Thank-you",
};

export interface CompleteDraftResult {
  readonly draft: OpportunityDraftRow;
  /** What the completion did to the record, in the user's words. */
  readonly effect: string;
}

/**
 * Mark the action done, and do what "done" means for this kind.
 *
 * | Kind | Done means |
 * | --- | --- |
 * | follow-up, the ask, confirmation, meeting request, thank-you | a contact event — the silence counter resets and the queue re-ranks |
 * | introduction / partner outreach | contact WITH the partner, and the introduction marked used |
 * | visit prep | the next scheduled visit gains a goal and discovery questions, so it counts as prepped |
 * | approval | the REQUEST is recorded — and nothing else |
 *
 * That last row is the one that matters. Requesting approval is not receiving it: confirming
 * `ask_approved_by_leader` here would let a rep approve their own ask, which is precisely the
 * we-said/they-said distinction the whole product is built on, applied internally.
 */
export async function completeDraft(
  db: Database,
  tenantId: string,
  input: {
    readonly opportunityId: string;
    readonly kind: string;
    readonly actor?: Actor;
    readonly clock: Clock;
  },
): Promise<CompleteDraftResult> {
  const now = input.clock.now();
  const draft = await getDraft(db, tenantId, input.opportunityId, input.kind);
  if (!draft) throw new Error("completeDraft: no draft to complete");

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(opportunityDrafts)
      .set({ completedAt: now, updatedAt: now })
      .where(eq(opportunityDrafts.id, draft.id))
      .returning();
    if (!updated) throw new Error("completeDraft: update returned no row");

    const name = ARTIFACT_NAME[input.kind] ?? "Draft";
    // Internal artifacts are not sent anywhere — "Visit prep brief drafted and sent" is simply
    // false, and the timeline is the one place a leader goes to find out what actually happened.
    // Derived from the kind, like every other branch here, rather than from the stored `audience`:
    // the kind is what the caller asked for, the audience is a denormalised copy of it.
    const verb = INTERNAL_KINDS.has(input.kind) ? "drafted" : "drafted and sent";
    const provenance = updated.edited
      ? `edited by ${updated.actorName ?? input.actor?.name ?? "the officer"} (${updated.editedPercent}% changed)`
      : "unedited";

    // The timeline sentence, and the whole point of the log: a leader can see at a glance that
    // guidance was worked with rather than rubber-stamped.
    await appendOpportunityEvent(tx, tenantId, {
      opportunityId: input.opportunityId,
      eventType: "note",
      field: input.kind,
      oldValue: null,
      newValue: updated.editedPercent > 0 ? String(updated.editedPercent) : "0",
      prospectSourced: false,
      actor: input.actor,
      note: `${name} ${verb} · ${provenance}`,
      occurredAt: now,
    });

    let effect = "Logged on the record.";

    const CONTACT_KINDS = new Set([
      "follow-up-to-close",
      "make-specific-ask",
      "get-it-in-writing",
      "get-the-visit",
      "steward-the-gift",
    ]);
    const CONNECTOR_KINDS = new Set(["use-introduction", "ask-partner"]);

    if (CONTACT_KINDS.has(input.kind)) {
      await appendOpportunityEvent(tx, tenantId, {
        opportunityId: input.opportunityId,
        eventType: "contact_logged",
        prospectSourced: false,
        actor: input.actor,
        note: `${name} sent.`,
        occurredAt: now,
      });
      effect = "Contact logged — the silence counter is reset and the board re-ranks.";
    } else if (CONNECTOR_KINDS.has(input.kind)) {
      const [opportunity] = await tx
        .select({ prospectId: forwardOpportunities.prospectId })
        .from(forwardOpportunities)
        .where(eq(forwardOpportunities.id, input.opportunityId));

      if (opportunity) {
        const [partner] = await tx
          .select()
          .from(naturalPartners)
          .where(
            and(
              eq(naturalPartners.tenantId, tenantId),
              eq(naturalPartners.prospectId, opportunity.prospectId),
            ),
          );
        if (partner) {
          // The two connector kinds are not the same act, and the record should not pretend they
          // are. `use-introduction` takes up an introduction that was OFFERED, so the offer is now
          // spent. `ask-partner` fires precisely when nobody has offered anything — marking an
          // introduction used there would record a thing that did not happen, and would spend an
          // offer before it was ever made, so the offer→use rule could never fire afterwards.
          // Both count as having asked the connector to act.
          await tx
            .update(naturalPartners)
            .set({
              introUsedAt:
                input.kind === "use-introduction"
                  ? (partner.introUsedAt ?? now)
                  : partner.introUsedAt,
              askedToOpenDoorAt: partner.askedToOpenDoorAt ?? now,
            })
            .where(eq(naturalPartners.id, partner.id));
        }
      }
      // Contact with the PARTNER, not with the prospect. Logging this as prospect contact would
      // reset a silence counter that has not moved: nobody has spoken to the donor.
      await appendOpportunityEvent(tx, tenantId, {
        opportunityId: input.opportunityId,
        eventType: "note",
        field: "connector-contact",
        oldValue: null,
        newValue: null,
        prospectSourced: false,
        actor: input.actor,
        note: `${name} sent to the connector.`,
        occurredAt: now,
      });
      effect =
        input.kind === "use-introduction"
          ? "Introduction marked used, and the outreach logged against the connector."
          : "Your partner has been asked to open the door, and the outreach logged against them.";
    } else if (input.kind === "prep-the-visit") {
      const [opportunity] = await tx
        .select({ prospectId: forwardOpportunities.prospectId })
        .from(forwardOpportunities)
        .where(eq(forwardOpportunities.id, input.opportunityId));

      if (opportunity) {
        const upcoming = await tx
          .select()
          .from(visits)
          .where(and(eq(visits.tenantId, tenantId), eq(visits.prospectId, opportunity.prospectId)));
        // The next scheduled visit. "Prepared" is a goal AND discovery questions, so the brief is
        // written onto both fields — anything less and the rule keeps firing, correctly.
        const next = upcoming
          .filter((v) => v.scheduledAt && v.scheduledAt >= now)
          .sort((a, b) => (a.scheduledAt!.getTime() ?? 0) - (b.scheduledAt!.getTime() ?? 0))[0];
        if (next) {
          const goal = /WHAT WE WANT FROM THE MEETING\n([\s\S]*?)\n\n/.exec(updated.finalText)?.[1];
          const questions = /DISCOVERY QUESTIONS\n([\s\S]*?)\n\n/.exec(updated.finalText)?.[1];
          await tx
            .update(visits)
            .set({
              goal: goal?.trim() || next.goal || "Prepared from the drafted brief.",
              discoveryQuestions: questions?.trim() || next.discoveryQuestions || updated.finalText,
            })
            .where(eq(visits.id, next.id));
          effect = "The visit is prepped — the prep rule stops firing.";
        } else {
          effect = "Brief saved. No visit is scheduled yet, so nothing was attached to one.";
        }
      }
    } else if (input.kind === "get-ask-approved") {
      // The REQUEST, not the approval. Confirming ask_approved_by_leader here would let a rep
      // approve their own ask; the leader confirms that milestone on Opportunity Detail.
      effect = "Approval requested. Your leader confirms the milestone on the record.";
    }

    return { draft: updated, effect };
  });
}

/** Delete every draft on an opportunity. Used by tests to restore a record. */
export async function clearDrafts(
  db: Database,
  tenantId: string,
  opportunityId: string,
): Promise<void> {
  await db
    .delete(opportunityDrafts)
    .where(
      and(
        eq(opportunityDrafts.tenantId, tenantId),
        eq(opportunityDrafts.opportunityId, opportunityId),
      ),
    );
}

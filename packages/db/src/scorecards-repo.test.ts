import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { seed } from "./seed";
import { stableId } from "./seed-records-core";
import { connectTestDb, uniqueSuffix, type TestDb } from "./test-support";
import type { Database } from "./client";
import { users } from "./schema/users";
import { opportunityEvents } from "./schema/forward";
import {
  criterionResults,
  meetingTypes,
  meetings,
  scorecardDefinitions,
  scorecards,
} from "./schema/scorecards";
import {
  DefinitionInvalidError,
  InUseError,
  LinkTargetNotVisibleError,
  buildDefinitionSnapshot,
  createMeetingType,
  deleteMeetingType,
  deleteScorecardDefinition,
  getActiveDefinitionForType,
  getFallbackMeetingType,
  getCurrentScorecardForMeeting,
  getScorecardForViewer,
  getScorecardStatus,
  hasDirectReports,
  listScorecards,
  logScorecardEvent,
  overrideMeetingType,
  recordScoring,
  reportMeeting,
  requestRescore,
  saveScorecardDefinition,
  transitionScorecard,
  visibleReporterIds,
  type ScorecardViewer,
} from "./scorecards-repo";

// I31 — the service layer against a live database. Three things are being proved here that a pure
// test cannot: the CONSTRAINTS actually bite, the VISIBILITY predicate actually filters, and
// override/re-score actually replace in place rather than appending.

let handle: TestDb | null = null;
let db: Database;
let tenantId: string;
const suffix = uniqueSuffix();

/** The three seeded people, in the roles the seed gives them. */
let dana: ScorecardViewer;
let priya: ScorecardViewer;
let ruth: ScorecardViewer;

const scratchMeetings: string[] = [];

beforeAll(async () => {
  handle = await connectTestDb();
  if (!handle) return;
  db = handle.db;
  ({ tenantId } = await seed(db));

  const rows = await db.select().from(users).where(eq(users.tenantId, tenantId));
  const byEmail = (email: string): ScorecardViewer => {
    const row = rows.find((candidate) => candidate.email === email);
    if (!row) throw new Error(`scorecards-repo.test: missing seeded user ${email}`);
    return { userId: row.id, tenantId };
  };
  dana = byEmail("dana.reese@waterforpeople.org");
  priya = byEmail("priya.nair@waterforpeople.org");
  ruth = byEmail("ruth.castellanos@waterforpeople.org");
}, 180_000);

afterAll(async () => {
  if (!handle) return;
  // Clean up through the DATABASE, not by re-driving a service. A test that failed half way leaves
  // the service in an unknown state; the rows are still exactly where they are.
  for (const id of scratchMeetings.splice(0)) {
    await db.delete(meetings).where(eq(meetings.id, id));
  }
  await db
    .delete(meetingTypes)
    .where(and(eq(meetingTypes.tenantId, tenantId), eq(meetingTypes.name, `Scratch ${suffix}`)));
  await handle.pool.end();
});

/** The demo anchor. Every write in this codebase stamps rows with the injected clock, not wall time. */
const NOW = new Date("2026-09-12T12:00:00.000Z");

const maybe = (name: string, fn: () => Promise<void>, timeout?: number) =>
  it(
    name,
    async () => {
      if (!handle) return;
      await fn();
    },
    timeout,
  );

/** A throwaway meeting + queued scorecard, tracked for teardown. */
async function scratchMeeting(
  viewer: ScorecardViewer,
  over: Partial<Parameters<typeof reportMeeting>[2]> = {},
): Promise<{ meetingId: string; scorecardId: string }> {
  const created = await reportMeeting(db, viewer, {
    opportunityId: stableId("forward-opportunity:vega-forever-promise"),
    occurredAt: new Date("2026-09-01T10:00:00.000Z"),
    sourceType: "notes",
    content: "Scratch meeting content for a test. Asked why they are involved.",
    ...over,
  });
  scratchMeetings.push(created.meetingId);
  return created;
}

// =================================================================================================
// Constraints
// =================================================================================================

describe("constraints", () => {
  maybe("allows exactly one fallback meeting type per tenant", async () => {
    const fallback = await getFallbackMeetingType(db, tenantId);
    expect(fallback?.name).toBe("Discovery Visit");

    // A second fallback must be refused by the DATABASE, not by a service check that a concurrent
    // writer could step around.
    await expect(
      db
        .insert(meetingTypes)
        .values({
          tenantId,
          name: `Scratch ${suffix}`,
          description: "A second fallback, which must not be allowed to exist.",
          isFallback: true,
        })
        .returning(),
    ).rejects.toThrow(/meeting_types_one_fallback_per_tenant|duplicate key/i);
  });

  maybe("allows at most one ACTIVE definition per meeting type", async () => {
    const [discoveryType] = await db
      .select()
      .from(meetingTypes)
      .where(and(eq(meetingTypes.tenantId, tenantId), eq(meetingTypes.name, "Discovery Visit")));
    expect(discoveryType).toBeDefined();
    if (!discoveryType) return;

    await expect(
      db.insert(scorecardDefinitions).values({
        tenantId,
        name: `Second active ${suffix}`,
        meetingTypeId: discoveryType.id,
        isActive: true,
      }),
    ).rejects.toThrow(/scorecard_definitions_one_active_per_type|duplicate key/i);
  });

  maybe("requires a meeting to link exactly one target", async () => {
    const both = db.insert(meetings).values({
      tenantId,
      occurredAt: new Date(),
      reportedBy: dana.userId,
      sourceType: "notes",
      content: "both",
      opportunityId: stableId("forward-opportunity:vega-forever-promise"),
      prospectId: stableId("prospect:vega"),
    });
    await expect(both).rejects.toThrow(/meetings_exactly_one_link/);

    const neither = db.insert(meetings).values({
      tenantId,
      occurredAt: new Date(),
      reportedBy: dana.userId,
      sourceType: "notes",
      content: "neither",
    });
    await expect(neither).rejects.toThrow(/meetings_exactly_one_link/);
  });

  maybe("requires a criterion result's value column to match its type", async () => {
    const [scorecard] = await db
      .select({ id: scorecards.id })
      .from(scorecards)
      .where(eq(scorecards.tenantId, tenantId))
      .limit(1);
    expect(scorecard).toBeDefined();
    if (!scorecard) return;

    // A score written into a boolean criterion.
    await expect(
      db.insert(criterionResults).values({
        tenantId,
        scorecardId: scorecard.id,
        criterionId: stableId(`bogus-criterion:${suffix}`),
        sectionId: stableId(`bogus-section:${suffix}`),
        criterionType: "boolean",
        determinable: true,
        scoreValue: "0.5000",
        rationale: "wrong column for the type",
      }),
    ).rejects.toThrow(/criterion_results_value_matches_type/);

    // A value on a not-determinable result.
    await expect(
      db.insert(criterionResults).values({
        tenantId,
        scorecardId: scorecard.id,
        criterionId: stableId(`bogus-criterion-2:${suffix}`),
        sectionId: stableId(`bogus-section:${suffix}`),
        criterionType: "boolean",
        determinable: false,
        booleanValue: true,
        rationale: "a value it should not have",
      }),
    ).rejects.toThrow(/criterion_results_value_matches_type/);

    // A score outside [0, 1].
    await expect(
      db.insert(criterionResults).values({
        tenantId,
        scorecardId: scorecard.id,
        criterionId: stableId(`bogus-criterion-3:${suffix}`),
        sectionId: stableId(`bogus-section:${suffix}`),
        criterionType: "score",
        determinable: true,
        scoreValue: "1.5000",
        rationale: "out of range",
      }),
    ).rejects.toThrow(/criterion_results_value_matches_type/);
  });

  maybe("allows exactly ONE CURRENT scorecard per meeting, but many superseded ones", async () => {
    const created = await scratchMeeting(dana);

    // A second CURRENT version is refused by the partial unique index.
    await expect(
      db.insert(scorecards).values({
        tenantId,
        meetingId: created.meetingId,
        definitionSnapshot: {},
        status: "queued",
        isCurrent: true,
      }),
    ).rejects.toThrow(/scorecards_one_current_per_meeting|duplicate key/i);

    // A superseded one is not — that is the whole point of versioning.
    const extra = await db
      .insert(scorecards)
      .values({
        tenantId,
        meetingId: created.meetingId,
        definitionSnapshot: {},
        status: "ready",
        isCurrent: false,
        supersedeReason: "rescore",
      })
      .returning({ id: scorecards.id });
    expect(extra).toHaveLength(1);
  });
});

// =================================================================================================
// Definition validation, through the service
// =================================================================================================

describe("definition validation", () => {
  maybe("refuses a definition with a section that has no criteria", async () => {
    const [type] = await db
      .select()
      .from(meetingTypes)
      .where(and(eq(meetingTypes.tenantId, tenantId), eq(meetingTypes.name, "Ask Visit")));
    if (!type) return;
    await expect(
      saveScorecardDefinition(db, tenantId, {
        name: `Invalid ${suffix}`,
        meetingTypeId: type.id,
        isActive: false,
        sections: [{ title: "Empty", criteria: [] }],
      }),
    ).rejects.toBeInstanceOf(DefinitionInvalidError);
  });

  maybe("refuses a meeting type with no description — the classifier reads it", async () => {
    await expect(
      createMeetingType(db, tenantId, { name: `Nameless ${suffix}`, description: "  " }),
    ).rejects.toBeInstanceOf(DefinitionInvalidError);
  });

  maybe("keeps section, criterion and option ids stable across an edit", async () => {
    const definitionId = stableId("scorecard-definition:discovery");
    const before = await buildDefinitionSnapshot(db, tenantId, definitionId);
    expect(before).not.toBeNull();
    if (!before) return;

    const idsOf = (snapshot: NonNullable<typeof before>) =>
      snapshot.sections.flatMap((section) => [
        section.id,
        ...section.criteria.flatMap((criterion) => [
          criterion.id,
          ...criterion.options.map((option) => option.id),
        ]),
      ]);

    await saveScorecardDefinition(db, tenantId, {
      id: before.id,
      name: before.name,
      meetingTypeId: before.meetingTypeId,
      sections: before.sections.map((section) => ({
        id: section.id,
        // Rewriting the wording is exactly the operation that must NOT orphan history.
        title: `${section.title} (edited ${suffix})`,
        description: section.description,
        criteria: section.criteria.map((criterion) => ({
          id: criterion.id,
          type: criterion.type,
          prompt: `${criterion.prompt} (edited)`,
          guidance: criterion.guidance,
          options: criterion.options.map((option) => ({
            id: option.id,
            label: option.label,
            description: option.description,
          })),
        })),
      })),
    });

    const after = await buildDefinitionSnapshot(db, tenantId, definitionId);
    expect(after).not.toBeNull();
    if (!after) return;
    expect(idsOf(after)).toEqual(idsOf(before));
    expect(after.sections[0]?.title).toContain("(edited");

    // Put the wording back so the seeded fixture stays readable for every other test and for the
    // demo. The ids are what the assertion was about; the text is not.
    await saveScorecardDefinition(db, tenantId, {
      id: before.id,
      name: before.name,
      meetingTypeId: before.meetingTypeId,
      sections: before.sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        criteria: section.criteria.map((criterion) => ({
          id: criterion.id,
          type: criterion.type,
          prompt: criterion.prompt,
          guidance: criterion.guidance,
          options: criterion.options.map((option) => ({
            id: option.id,
            label: option.label,
            description: option.description,
          })),
        })),
      })),
    });
  });

  maybe("refuses to delete a definition that Scorecards point at", async () => {
    await expect(
      deleteScorecardDefinition(db, tenantId, stableId("scorecard-definition:discovery")),
    ).rejects.toBeInstanceOf(InUseError);
  });

  maybe("refuses to delete a meeting type that Scorecards point at", async () => {
    await expect(
      deleteMeetingType(db, tenantId, stableId("meeting-type:discovery")),
    ).rejects.toBeInstanceOf(InUseError);
  });
});

// =================================================================================================
// Visibility
// =================================================================================================

describe("visibility", () => {
  maybe("gives a rep themselves and nobody else", async () => {
    const ids = await visibleReporterIds(db, dana);
    expect(ids).toEqual([dana.userId]);
    expect(await hasDirectReports(db, dana)).toBe(false);
  });

  maybe("gives a manager themselves plus their direct reports", async () => {
    const ids = await visibleReporterIds(db, ruth);
    expect(ids).toContain(ruth.userId);
    expect(ids).toContain(dana.userId);
    expect(ids).toContain(priya.userId);
    expect(await hasDirectReports(db, ruth)).toBe(true);
  });

  maybe("lets a rep see their own scorecards", async () => {
    const rows = await listScorecards(db, dana);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.reportedByUserId === dana.userId)).toBe(true);
  });

  maybe("does NOT let a rep see a peer's scorecard, even by id", async () => {
    const [priyaCard] = await listScorecards(db, priya);
    expect(priyaCard).toBeDefined();
    if (!priyaCard) return;
    expect(await getScorecardForViewer(db, dana, priyaCard.scorecardId)).toBeNull();
    expect(await getScorecardStatus(db, dana, priyaCard.scorecardId)).toBeNull();
  });

  maybe("lets a manager see a direct report's scorecard AND the raw source content", async () => {
    const [danaCard] = await listScorecards(db, dana);
    expect(danaCard).toBeDefined();
    if (!danaCard) return;

    const asManager = await getScorecardForViewer(db, ruth, danaCard.scorecardId);
    expect(asManager).not.toBeNull();
    // The point of the manager view: the transcript itself, not a redacted summary of it.
    expect(asManager?.meeting.content.length ?? 0).toBeGreaterThan(100);
  });

  maybe("does not let a manager see someone who does not report to them", async () => {
    // Detach Priya for the length of this assertion, then put her back.
    await db.update(users).set({ managerId: null }).where(eq(users.id, priya.userId));
    try {
      const [priyaCard] = await listScorecards(db, priya);
      if (!priyaCard) return;
      expect(await getScorecardForViewer(db, ruth, priyaCard.scorecardId)).toBeNull();
    } finally {
      await db.update(users).set({ managerId: ruth.userId }).where(eq(users.id, priya.userId));
    }
  });

  maybe("reports a meeting as the CALLER — there is no way to report for someone else", async () => {
    const created = await scratchMeeting(dana);
    const [row] = await db
      .select({ reportedBy: meetings.reportedBy })
      .from(meetings)
      .where(eq(meetings.id, created.meetingId));
    expect(row?.reportedBy).toBe(dana.userId);
    // reportMeeting's input type carries no `reportedBy`, so a manager calling it creates their
    // OWN meeting rather than one on a rep's behalf. The compiler is the enforcement.
  });

  maybe("refuses a link target that is not in the tenant", async () => {
    await expect(
      reportMeeting(db, dana, {
        prospectId: "00000000-0000-4000-8000-0000000000ff",
        occurredAt: new Date(),
        sourceType: "notes",
        content: "nope",
      }),
    ).rejects.toBeInstanceOf(LinkTargetNotVisibleError);
  });

  maybe("filters a list by rep only within what the viewer may already see", async () => {
    const rows = await listScorecards(db, ruth, { reportedBy: dana.userId });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.reportedByUserId === dana.userId)).toBe(true);

    // A rep asking for a peer's rows gets nothing, not an error and not the peer's data.
    expect(await listScorecards(db, dana, { reportedBy: priya.userId })).toEqual([]);
  });

  maybe("sorts by occurred-at and by overall score", async () => {
    const byDate = await listScorecards(db, ruth, { sortBy: "occurredAt", direction: "desc" });
    const dates = byDate.map((row) => row.occurredAt.getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);

    const byScore = await listScorecards(db, ruth, { sortBy: "overallScore", direction: "desc" });
    const scores = byScore
      .map((row) => row.overallScore)
      .filter((score): score is number => score !== null);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});

// =================================================================================================
// Report, override, re-score
// =================================================================================================

describe("report, override and re-score", () => {
  maybe("creates the meeting and a queued scorecard together", async () => {
    const created = await scratchMeeting(dana);
    const detail = await getScorecardForViewer(db, dana, created.scorecardId);
    expect(detail?.scorecard.status).toBe("queued");
    expect(detail?.meeting.id).toBe(created.meetingId);
    // A meeting changes no opportunity field — it is a record of what happened, not an update.
    expect(detail?.meeting.opportunityId).toBe(
      stableId("forward-opportunity:vega-forever-promise"),
    );
  });

  maybe(
    "a re-score PRESERVES the previous scorecard and its results, unchanged",
    async () => {
      // The whole point of versioning. The old results must still be readable, still attached to
      // the version that produced them, and still saying what they said.
      const created = await scratchMeeting(dana);
      const snapshot = await buildDefinitionSnapshot(
        db,
        tenantId,
        stableId("scorecard-definition:discovery"),
      );
      if (!snapshot) return;
      const section = snapshot.sections[0];
      const criterion = section?.criteria[0];
      if (!section || !criterion) return;

      await recordScoring(db, tenantId, created.scorecardId, {
        results: [
          {
            criterionId: criterion.id,
            sectionId: section.id,
            criterionType: criterion.type,
            determinable: true,
            booleanValue: true,
            scoreValue: null,
            optionId: null,
            rationale: "the first version said yes",
            evidenceQuote: null,
          },
        ],
        content: "Scratch meeting content for a test. Asked why they are involved.",
        snapshot,
        model: "version-one",
        latencyMs: 11,
        inputTokens: 1,
        outputTokens: 1,
        scoredAt: NOW,
      });

      const first = await getScorecardForViewer(db, dana, created.scorecardId);
      expect(first?.scorecard.status).toBe("ready");
      expect(first?.results).toHaveLength(1);
      expect(first?.scorecard.overallScoreValue).toBe(1);

      const outcome = await requestRescore(db, dana, created.scorecardId, NOW);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      // Score the NEW version differently, so "unchanged" means something.
      await recordScoring(db, tenantId, outcome.scorecardId, {
        results: [
          {
            criterionId: criterion.id,
            sectionId: section.id,
            criterionType: criterion.type,
            determinable: true,
            booleanValue: false,
            scoreValue: null,
            optionId: null,
            rationale: "the second version said no",
            evidenceQuote: null,
          },
        ],
        content: "Scratch meeting content for a test. Asked why they are involved.",
        snapshot,
        model: "version-two",
        latencyMs: 22,
        inputTokens: 1,
        outputTokens: 1,
        scoredAt: NOW,
      });

      const oldVersion = await getScorecardForViewer(db, dana, created.scorecardId);
      expect(oldVersion?.results).toHaveLength(1);
      expect(oldVersion?.results[0]?.rationale).toBe("the first version said yes");
      expect(oldVersion?.results[0]?.booleanValue).toBe(true);
      expect(oldVersion?.scorecard.overallScoreValue).toBe(1);
      // The audit row still names the model that produced THIS score — which is the comparison
      // the decision-model wrapper swap will need.
      expect(oldVersion?.scorecard.scoreModel).toBe("version-one");
      expect(oldVersion?.scorecard.isCurrent).toBe(false);

      const newVersion = await getScorecardForViewer(db, dana, outcome.scorecardId);
      expect(newVersion?.results[0]?.booleanValue).toBe(false);
      expect(newVersion?.scorecard.overallScoreValue).toBe(0);
      expect(newVersion?.scorecard.scoreModel).toBe("version-two");
      expect(newVersion?.scorecard.isCurrent).toBe(true);
    },
    120_000,
  );

  maybe("keeps exactly ONE current scorecard under a concurrent re-score", async () => {
    const created = await scratchMeeting(dana);

    // Two re-scores racing the same current version. One must win; the other must not create a
    // second current row. The compare-and-swap decides it and the partial unique index backs it.
    const outcomes = await Promise.allSettled([
      requestRescore(db, dana, created.scorecardId, NOW),
      requestRescore(db, dana, created.scorecardId, NOW),
    ]);
    const succeeded = outcomes.filter(
      (result) => result.status === "fulfilled" && result.value.ok,
    );
    expect(succeeded.length).toBeGreaterThanOrEqual(1);

    const all = await db
      .select({ id: scorecards.id, isCurrent: scorecards.isCurrent })
      .from(scorecards)
      .where(and(eq(scorecards.tenantId, tenantId), eq(scorecards.meetingId, created.meetingId)));
    expect(all.filter((row) => row.isCurrent)).toHaveLength(1);
    // However the race resolved, no version was lost.
    expect(all.length).toBeGreaterThanOrEqual(2);
  }, 120_000);

  maybe("refuses to override or re-score a superseded version", async () => {
    const created = await scratchMeeting(dana);
    const outcome = await requestRescore(db, dana, created.scorecardId, NOW);
    expect(outcome.ok).toBe(true);

    // History is immutable.
    expect((await requestRescore(db, dana, created.scorecardId, NOW)).ok).toBe(false);
    const override = await overrideMeetingType(
      db,
      dana,
      created.scorecardId,
      stableId("meeting-type:ask"),
      NOW,
    );
    expect(override.ok).toBe(false);
  });

  maybe("lists only CURRENT versions, and returns prior ones only when asked", async () => {
    const created = await scratchMeeting(dana);
    const outcome = await requestRescore(db, dana, created.scorecardId, NOW);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // The meeting appears once in the list, as its current version.
    const listed = await listScorecards(db, dana);
    const forMeeting = listed.filter((row) => row.meetingId === created.meetingId);
    expect(forMeeting).toHaveLength(1);
    expect(forMeeting[0]?.scorecardId).toBe(outcome.scorecardId);

    // By default a get carries no history.
    const plain = await getScorecardForViewer(db, dana, outcome.scorecardId);
    expect(plain?.versions).toEqual([]);

    // Asked for, it carries the chain.
    const withHistory = await getScorecardForViewer(db, dana, outcome.scorecardId, {
      includeVersions: true,
    });
    expect(withHistory?.versions).toHaveLength(1);
    expect(withHistory?.versions[0]?.scorecard.id).toBe(created.scorecardId);
    expect(withHistory?.versions[0]?.scorecard.supersedeReason).toBe("rescore");

    // And the meeting-keyed read lands on the current one.
    const current = await getCurrentScorecardForMeeting(db, dana, created.meetingId);
    expect(current?.scorecard.id).toBe(outcome.scorecardId);
  }, 120_000);

  maybe("verifies a verbatim quote and flags an altered one, storing both", async () => {
    const created = await scratchMeeting(dana, {
      content: "Dana: I asked why they are involved and they told me about their grandmother.",
    });
    const snapshot = await buildDefinitionSnapshot(
      db,
      tenantId,
      stableId("scorecard-definition:discovery"),
    );
    if (!snapshot) return;
    const section = snapshot.sections[0];
    const [verbatim, altered] = section?.criteria ?? [];
    if (!section || !verbatim || !altered) return;

    const detail = await getScorecardForViewer(db, dana, created.scorecardId);
    if (!detail) return;

    await recordScoring(db, tenantId, created.scorecardId, {
      results: [
        {
          criterionId: verbatim.id,
          sectionId: section.id,
          criterionType: "boolean",
          determinable: true,
          booleanValue: true,
          scoreValue: null,
          optionId: null,
          rationale: "verbatim",
          evidenceQuote: "they told me about their grandmother",
        },
        {
          criterionId: altered.id,
          sectionId: section.id,
          criterionType: "boolean",
          determinable: true,
          booleanValue: true,
          scoreValue: null,
          optionId: null,
          rationale: "paraphrased",
          evidenceQuote: "they told me about their grandfather",
        },
      ],
      content: detail.meeting.content,
      snapshot,
      model: "test",
      latencyMs: 1,
      inputTokens: 1,
      outputTokens: 1,
      scoredAt: new Date(),
    });

    const after = await getScorecardForViewer(db, dana, created.scorecardId);
    const byId = new Map(after?.results.map((row) => [row.criterionId, row]) ?? []);
    expect(byId.get(verbatim.id)?.evidenceVerified).toBe(true);
    expect(byId.get(altered.id)?.evidenceVerified).toBe(false);
    // Flagged, never dropped.
    expect(byId.get(altered.id)?.evidenceQuote).toBe("they told me about their grandfather");
  });

  maybe("overrides the meeting type, re-snapshots, and logs an event", async () => {
    const created = await scratchMeeting(dana);
    const askType = stableId("meeting-type:ask");
    const definition = await getActiveDefinitionForType(db, tenantId, askType);
    expect(definition).toBeDefined();
    if (!definition) return;

    const outcome = await overrideMeetingType(db, dana, created.scorecardId, askType, NOW);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // A NEW Scorecard, not the one we submitted.
    expect(outcome.scorecardId).not.toBe(created.scorecardId);

    const after = await getScorecardForViewer(db, dana, outcome.scorecardId);
    expect(after?.scorecard.meetingTypeId).toBe(askType);
    expect(after?.scorecard.meetingTypeOverriddenBy).toBe(dana.userId);
    expect(after?.scorecard.status).toBe("scoring");
    expect(after?.scorecard.usedFallback).toBe(false);
    expect(after?.scorecard.isCurrent).toBe(true);
    expect(after?.snapshot?.meetingTypeName).toBe("Ask Visit");

    // The old version survives, marked and linked.
    const old = await getScorecardForViewer(db, dana, created.scorecardId);
    expect(old?.scorecard.isCurrent).toBe(false);
    expect(old?.scorecard.supersedeReason).toBe("override");
    expect(old?.scorecard.supersededBy).toBe(outcome.scorecardId);
    expect(old?.scorecard.supersededAt).not.toBeNull();

    const logged = await logScorecardEvent(db, tenantId, {
      meetingId: created.meetingId,
      note: "Scorecard meeting type changed by a test.",
      oldValue: "Discovery Visit · —",
      newValue: "Ask Visit · pending",
      actor: { userId: dana.userId, name: "Dana Reese" },
      occurredAt: new Date("2026-09-12T12:00:00.000Z"),
    });
    expect(logged).toBe(true);

    const events = await db
      .select()
      .from(opportunityEvents)
      .where(
        and(
          eq(opportunityEvents.tenantId, tenantId),
          eq(opportunityEvents.opportunityId, stableId("forward-opportunity:vega-forever-promise")),
          eq(opportunityEvents.field, "scorecard"),
        ),
      );
    expect(events.length).toBeGreaterThan(0);
    // Logged as `note`, NOT `field_change`: field_change feeds the slippage arithmetic and a
    // re-score is not a move on the deal.
    expect(events[0]?.eventType).toBe("note");
    for (const event of events) {
      await db.delete(opportunityEvents).where(eq(opportunityEvents.id, event.id));
    }
  });

  maybe("logs nothing for a prospect-only meeting, and says so", async () => {
    const created = await scratchMeeting(dana, {
      opportunityId: null,
      prospectId: stableId("prospect:vega"),
    });
    const logged = await logScorecardEvent(db, tenantId, {
      meetingId: created.meetingId,
      note: "no opportunity to hang this on",
      oldValue: null,
      newValue: null,
      actor: { userId: dana.userId, name: "Dana Reese" },
      occurredAt: new Date("2026-09-12T12:00:00.000Z"),
    });
    // The event log's subject is an Opportunity. A prospect-only meeting has none, so the write is
    // declined rather than forced. See the schema comment on logScorecardEvent.
    expect(logged).toBe(false);
  });

  maybe("a re-score creates a NEW queued scorecard and supersedes the old one", async () => {
    const created = await scratchMeeting(dana);
    await transitionScorecard(db, tenantId, created.scorecardId, "queued", "classifying");

    const outcome = await requestRescore(db, dana, created.scorecardId, NOW);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.scorecardId).not.toBe(created.scorecardId);

    const fresh = await getScorecardForViewer(db, dana, outcome.scorecardId);
    expect(fresh?.scorecard.status).toBe("queued");
    expect(fresh?.scorecard.isCurrent).toBe(true);
    // Classification runs again, so the new version starts with no snapshot and no type.
    expect(fresh?.scorecard.meetingTypeId).toBeNull();

    const old = await getScorecardForViewer(db, dana, created.scorecardId);
    expect(old?.scorecard.isCurrent).toBe(false);
    expect(old?.scorecard.supersedeReason).toBe("rescore");
  });

  maybe("refuses an override or re-score on a scorecard the viewer cannot see", async () => {
    const [priyaCard] = await listScorecards(db, priya);
    if (!priyaCard) return;
    const outcome = await overrideMeetingType(
      db,
      dana,
      priyaCard.scorecardId,
      stableId("meeting-type:ask"),
      NOW,
    );
    expect(outcome.ok).toBe(false);
    expect((await requestRescore(db, dana, priyaCard.scorecardId, NOW)).ok).toBe(false);
  });

  maybe("refuses an illegal status transition", async () => {
    const created = await scratchMeeting(dana);
    await expect(
      transitionScorecard(db, tenantId, created.scorecardId, "queued", "ready"),
    ).rejects.toThrow(/illegal transition/);
  });

  maybe("compare-and-swaps a transition, so a late retry does nothing", async () => {
    const created = await scratchMeeting(dana);
    expect(await transitionScorecard(db, tenantId, created.scorecardId, "queued", "classifying"))
      .toBe(true);
    // The same move again: the row is no longer in `queued`, so nothing happens.
    expect(await transitionScorecard(db, tenantId, created.scorecardId, "queued", "classifying"))
      .toBe(false);
  });
});

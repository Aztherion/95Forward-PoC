/**
 * Score a meeting through the REAL pipeline and print the Scorecard (Initiative 31).
 *
 *   pnpm --filter @95forward/ai score-meeting <file.txt> [--type <name|id>] [--source notes|transcript]
 *   pnpm --filter @95forward/ai score-meeting @vega-discovery        # a seeded meeting, by key
 *
 * Why it exists: a green mock suite proves the plumbing, not the product. The mock cannot tell you
 * whether a real model can read a transcript and say something a manager would agree with, and
 * that is the only question this feature is actually judged on.
 *
 * AI_MODE=live + ANTHROPIC_API_KEY makes the calls real. With AI_MODE=mock it runs the
 * deterministic decider instead, which is useful for checking the plumbing but is NOT a live run.
 *
 * READ-ONLY. It loads the tenant's meeting types and the snapshotted definition from the database
 * and writes nothing back — so it is safe to point at a demo database, and a bad answer from a new
 * prompt cannot land on a seeded Scorecard.
 */
import { readFileSync } from "node:fs";
import {
  buildDefinitionSnapshot,
  createDb,
  getActiveDefinitionForType,
  getFallbackMeetingType,
  listMeetingTypes,
  meetings,
  stableId,
  tenants,
  type Database,
} from "@95forward/db";
import {
  aggregateScorecard,
  snapshotCriteria,
  verifyEvidenceQuote,
  type MeetingSourceType,
  type ScorecardDefinitionSnapshot,
} from "@95forward/shared";
import { eq } from "drizzle-orm";
import { createMeetingDecider } from "../scorecards";
import { createProviders } from "../provider";
import type { Providers } from "../types";

interface Args {
  readonly target: string;
  readonly type: string | null;
  readonly source: MeetingSourceType;
}

function parseArgs(argv: readonly string[]): Args {
  const rest = argv.slice(2);
  const target = rest.find((value) => !value.startsWith("--"));
  if (target === undefined) {
    console.error(
      "usage: score-meeting <file.txt|@seededMeetingKey> [--type <name|id>] [--source notes|transcript]",
    );
    process.exit(2);
  }
  const flag = (name: string): string | null => {
    const index = rest.indexOf(`--${name}`);
    return index >= 0 ? (rest[index + 1] ?? null) : null;
  };
  const source = flag("source");
  return {
    target,
    type: flag("type"),
    source: source === "notes" ? "notes" : "transcript",
  };
}

async function loadContent(
  db: Database,
  target: string,
): Promise<{ content: string; sourceType: MeetingSourceType | null; label: string }> {
  if (target.startsWith("@")) {
    const key = target.slice(1);
    const [row] = await db
      .select({ content: meetings.content, sourceType: meetings.sourceType })
      .from(meetings)
      .where(eq(meetings.id, stableId(`meeting:${key}`)))
      .limit(1);
    if (!row) throw new Error(`score-meeting: no seeded meeting with key "${key}"`);
    return { content: row.content, sourceType: row.sourceType, label: `@${key}` };
  }
  return { content: readFileSync(target, "utf8"), sourceType: null, label: target };
}

const pct = (value: number | null): string =>
  value === null ? "—" : `${(value * 100).toFixed(0)}%`;

function describeValue(
  snapshot: ScorecardDefinitionSnapshot,
  criterionId: string,
  result: {
    determinable: boolean;
    booleanValue: boolean | null;
    scoreValue: number | null;
    optionId: string | null;
  },
): string {
  if (!result.determinable) return "not determinable";
  if (result.booleanValue !== null) return result.booleanValue ? "YES" : "NO";
  if (result.scoreValue !== null) return result.scoreValue.toFixed(2);
  if (result.optionId !== null) {
    for (const { criterion } of snapshotCriteria(snapshot)) {
      if (criterion.id !== criterionId) continue;
      const option = criterion.options.find((candidate) => candidate.id === result.optionId);
      if (option) return option.label;
    }
    return result.optionId;
  }
  return "—";
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("score-meeting: DATABASE_URL is required");

  const mode = process.env.AI_MODE === "live" ? "live" : "mock";
  if (mode === "live" && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("score-meeting: AI_MODE=live needs ANTHROPIC_API_KEY");
  }

  const { db, pool } = createDb(url);
  try {
    const [tenant] = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).limit(1);
    if (!tenant) throw new Error("score-meeting: no tenant — is this database seeded?");

    const loaded = await loadContent(db, args.target);
    const sourceType = loaded.sourceType ?? args.source;

    // Build the providers exactly as the worker does, then pick the decider on AI_MODE. Nothing
    // below this line knows which model is behind the seam.
    const providers = createProviders({
      AI_MODE: mode,
      RESEARCH_MODE: "demo",
      EMBEDDING_MODE: "mock",
      EMBEDDINGS_MODEL: "text-embedding-3-small",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    } as Parameters<typeof createProviders>[0]) as Providers;
    const decider = createMeetingDecider({ AI_MODE: mode }, providers);

    const types = await listMeetingTypes(db, tenant.id);
    if (types.length === 0) throw new Error("score-meeting: this tenant has no meeting types");

    console.log(`\n═══ score-meeting ═══`);
    console.log(`  source     ${loaded.label}  (${sourceType}, ${loaded.content.length} chars)`);
    console.log(`  mode       ${mode}${mode === "mock" ? "  — NOT a live run" : ""}`);
    console.log(`  tenant     ${tenant.name}`);

    // ---- Call 1: classify (unless a type was forced) -------------------------------------------
    let chosenId: string;
    let usedFallback = false;
    let classifyLine = "forced by --type";
    if (args.type !== null) {
      const match = types.find(
        (type) => type.id === args.type || type.name.toLowerCase() === args.type?.toLowerCase(),
      );
      if (!match) throw new Error(`score-meeting: no meeting type "${args.type}"`);
      chosenId = match.id;
      console.log(`\n  ── classify ──  skipped (--type ${match.name})`);
    } else {
      const classification = await decider.classifyMeetingType({
        content: loaded.content,
        sourceType,
        meetingTypes: types.map((type) => ({
          id: type.id,
          name: type.name,
          description: type.description,
        })),
      });
      usedFallback = classification.meetingTypeId === "none";
      const resolved = usedFallback
        ? await getFallbackMeetingType(db, tenant.id)
        : types.find((type) => type.id === classification.meetingTypeId);
      if (!resolved) throw new Error("score-meeting: the classifier's answer resolved to nothing");
      chosenId = resolved.id;
      classifyLine = `${resolved.name}${usedFallback ? "  (FALLBACK — classifier said none)" : ""}`;
      console.log(`\n  ── classify ──`);
      console.log(`  model      ${classification.audit.model}`);
      console.log(
        `  tokens     in ${String(classification.audit.inputTokens)} · out ${String(classification.audit.outputTokens)}`,
      );
      console.log(`  latency    ${String(classification.audit.latencyMs)} ms`);
      console.log(`  chose      ${classifyLine}`);
      console.log(`  because    ${classification.rationale}`);
    }

    const definition = await getActiveDefinitionForType(db, tenant.id, chosenId);
    if (!definition) throw new Error("score-meeting: that type has no active definition");
    const snapshot = await buildDefinitionSnapshot(db, tenant.id, definition.id);
    if (!snapshot) throw new Error("score-meeting: the definition could not be read");

    // ---- Call 2: score -------------------------------------------------------------------------
    const scored = await decider.scoreMeeting({ content: loaded.content, sourceType, snapshot });
    console.log(`\n  ── score ──`);
    console.log(`  model      ${scored.audit.model}`);
    console.log(
      `  tokens     in ${String(scored.audit.inputTokens)} · out ${String(scored.audit.outputTokens)}`,
    );
    console.log(`  latency    ${String(scored.audit.latencyMs)} ms`);
    console.log(`  scorecard  ${snapshot.name}`);

    const aggregate = aggregateScorecard(snapshot, scored.results);
    const byCriterion = new Map(scored.results.map((result) => [result.criterionId, result]));
    let quoted = 0;
    let verified = 0;

    for (const section of [...snapshot.sections].sort((a, b) => a.sortOrder - b.sortOrder)) {
      console.log(
        `\n  ${section.title.toUpperCase()}   ${pct(aggregate.sectionScores[section.id] ?? null)}`,
      );
      for (const criterion of [...section.criteria].sort((a, b) => a.sortOrder - b.sortOrder)) {
        const result = byCriterion.get(criterion.id);
        if (!result) {
          console.log(`    ! ${criterion.prompt}  — MISSING FROM THE ANSWER`);
          continue;
        }
        const isVerified =
          result.evidenceQuote === null
            ? null
            : verifyEvidenceQuote(loaded.content, result.evidenceQuote);
        if (result.evidenceQuote !== null) {
          quoted += 1;
          if (isVerified) verified += 1;
        }
        console.log(`    · ${criterion.prompt}`);
        console.log(`      ${describeValue(snapshot, criterion.id, result)}`);
        console.log(`      ${result.rationale}`);
        if (result.evidenceQuote !== null) {
          console.log(
            `      "${result.evidenceQuote}"  ${isVerified ? "[verified]" : "[NOT VERBATIM]"}`,
          );
        }
      }
    }

    console.log(`\n  ── summary ──`);
    console.log(`  overall    ${pct(aggregate.overallScore)}`);
    console.log(
      `  evidence   ${String(verified)}/${String(quoted)} quotes verified verbatim${
        quoted === 0 ? "" : ` (${((verified / quoted) * 100).toFixed(0)}%)`
      }`,
    );
    const tokens = scored.audit.inputTokens + scored.audit.outputTokens;
    console.log(`  tokens     ${String(tokens)} on the scoring call\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("score-meeting failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

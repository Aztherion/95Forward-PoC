import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { copilotProposals, researchJobs, users } from "./schema";
import { stableId } from "./seed-records-core";

// Initiative 11 demo state: a coherent set of research jobs so the polling tray + review flow are
// demoable in RESEARCH_MODE=demo. One job is already `ready` (with its proposed knowledge-base
// updates attached) and one is mid-`researching`, mirroring the long-running-task pattern. All rows
// use stable ids / origin_keys so re-seeding is idempotent and so the e2e cleanup can preserve them.
const READY_JOB_ID = stableId("research-job:hallworth");
const RESEARCHING_JOB_ID = stableId("research-job:osgood");
const HALLWORTH_PROSPECT_ID = stableId("prospect:hallworth");
const OSGOOD_PROSPECT_ID = stableId("prospect:osgood");

const READY_FINDINGS = [
  {
    title: "Hallworth Foundation — 2024 grants summary",
    snippet:
      "Public filings show the Hallworth Foundation granting roughly $3.1M annually, with a clear tilt toward clean-water and sanitation programs.",
    source: "https://example.org/hallworth-foundation/2024",
    confidence: 0.84,
  },
  {
    title: "Trustee profile — civic leadership",
    snippet:
      "Two Hallworth trustees sit on regional water-access boards, suggesting strong personal affinity for the cause.",
    source: "https://example.org/hallworth/trustees",
    confidence: 0.62,
  },
];

export async function seedJobs(db: Database, tenantId: string): Promise<void> {
  const dana = await db.query.users.findFirst({
    where: eq(users.email, "dana.reese@waterforpeople.org"),
  });
  if (dana === undefined) return;

  await db
    .insert(researchJobs)
    .values({
      id: READY_JOB_ID,
      tenantId,
      prospectId: HALLWORTH_PROSPECT_ID,
      researchGapId: stableId("gap:hallworth:Wealth screen on the trustees"),
      requestedByUserId: dana.id,
      status: "ready",
      completedAt: new Date(),
      checkpoint: { findings: READY_FINDINGS },
      originKey: "seed:research:hallworth",
    })
    .onConflictDoNothing({ target: researchJobs.id });

  for (let i = 0; i < READY_FINDINGS.length; i += 1) {
    const finding = READY_FINDINGS[i]!;
    await db
      .insert(copilotProposals)
      .values({
        id: stableId(`research-proposal:hallworth:${String(i)}`),
        tenantId,
        subjectType: "knowledge_base",
        subjectId: HALLWORTH_PROSPECT_ID,
        proposalType: "knowledge_base_update",
        status: "pending",
        title: finding.title,
        summary: `Researched: ${finding.title}`,
        payload: { field: "capacitySource", value: finding.snippet },
        provenance: [{ sourceType: "research", source: finding.source, detail: finding.title }],
        confidence: Math.round(finding.confidence * 100),
        taskType: "research_prospect",
        origin: "copilot",
        createdByUserId: dana.id,
        originKey: `seed:research:hallworth:${String(i)}`,
      })
      .onConflictDoNothing({ target: copilotProposals.id });
  }

  await db
    .insert(researchJobs)
    .values({
      id: RESEARCHING_JOB_ID,
      tenantId,
      prospectId: OSGOOD_PROSPECT_ID,
      requestedByUserId: dana.id,
      status: "researching",
      originKey: "seed:research:osgood",
    })
    .onConflictDoNothing({ target: researchJobs.id });
}

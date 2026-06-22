# Initiative 12 — Connector-Based Discovery & Candidates — Implementation Plan

Status: DRAFT (pending Momus review)
Repo: /Users/Spoon/Projects/95Forward-PoC
Builds on: I0–I11 (complete). Grounded in 5 explore sweeps + an Oracle architecture review.

---

## 0. Goal

The front of the referral funnel, built ON the I11 jobs infrastructure. A discovery job mines a
connector's network for people with affinity to a funding initiative → a batch of hypothesis-grade
Candidates held OFF the ranked MPL → reviewed/endorsed → promoted to a prospect with the connector
auto-set as Natural Partner. Responsible-AI guardrail (fictional demo candidates; internal-only live)
is non-negotiable.

Done = all 10 DoD items met; unit + Playwright green key-free in CI (worker drains via the runOnce
test seam); lint/typecheck/format clean; fresh migrate+seed+embed works and the worker drains.

---

## 1. Architecture decisions (locked, from Oracle review)

1. **`discovery_tasks` is the domain state table** (already exists, RLS'd, zero code refs), advanced
   `queued→researching→ready→reviewed` with the SAME CAS/checkpoint/idempotent/withTenant pattern as
   I11's research_jobs. **`candidates`** rows are the discovery output (already exists, RLS'd).
2. **Migration 0012**: `discovery_tasks` += `checkpoint jsonb`, `error text`, `origin_key text`;
   `candidates` += `origin_key text` + partial unique index `(origin_key) WHERE origin_key IS NOT
NULL`. Idempotent RLS DO-loop (new cols on already-RLS'd tables → no new policy, loop is insurance).
3. **New `DiscoveryProvider` seam** (parallel to ResearchProvider — `research()` is one-subject, can't
   model connector×initiative→many people): `discover({connectorName, initiativeContext}) →
{suggestions: {name, evidenceConnection, evidenceAffinity, confidence}[]}`. `SeededDiscoveryProvider`
   (demo, keyed by connector name, FICTIONAL) + `LiveDiscoveryProvider` (Anthropic web_search,
   internal-only). `createProviders` returns `{model, embedding, research, discovery}`.
4. **Candidate idempotency = (d)+(a)**: CAS + single-tx primary; `origin_key`
   `discovery:{taskId}:{i}` + `ON CONFLICT … WHERE origin_key IS NOT NULL DO NOTHING` safety net.
   Handler 3-phase: CAS queued|researching→researching → checkpoint-or-discover (persist findings) →
   ONE tx: insert candidates (ON CONFLICT) + CAS researching→ready+completedAt.
5. **Promote = ONE withTenant tx** (NOT promoteReferral — no NP handling): read candidate+task →
   insert constituent {type:"individual", displayName:candidate.name} → insert prospect
   {constituentId, status:"research", rank:max+1} → insert natural_partner (connectorConstituentId →
   {constituentId} path, else {externalName}; role "Connector", warmPathNote=evidenceConnection) →
   update candidate {status:"promoted", promotedProspectId}. Guard the prospects UNIQUE(tenant,
   constituent) collision (fictional data won't fire it; test covers).
6. **Status flow** (CAS each, forward-only): Endorse suggested→endorsed; Request intro
   endorsed→intro_requested; Promote intro_requested→promoted (the heavy tx); Dismiss
   suggested|endorsed→dismissed. Discovery task ready→reviewed when all candidates decided
   (mirror markResearchJobReviewedIfComplete).
7. **"Keep researching" = RE-DISCOVERY, not an I11 research job** (DEVIATION, flagged): research_jobs
   .prospectId is NOT NULL → can't target a candidate without creating a prospect (violates off-MPL).
   Resolution faithful to the card affordance: re-run discovery-style research on the candidate's name,
   refresh evidenceConnection/evidenceAffinity in place, stay `suggested`, stay off-MPL. (Future fix if
   needed: nullable prospectId + candidateId FK on research_jobs — NOT this PoC.)
8. **Off-MPL is structural**: getProspectsList queries `prospects` only; candidates link to prospects
   ONLY via promotedProspectId (one-way read). Promote is the sole gateway onto the MPL.
9. **Tray extended additively**: getJobTrayState += discoveryResearching/discoveryReady/
   discoveryReadyCount (second query on discovery_tasks w/ connector+initiative relations); JobTray
   renders both; discovery "ready" links to the Candidates view/batch (research links to KB tab).
10. **Responsible-AI = env gate + warn-log** (proportionate PoC): demo provider returns only seeded
    fictional candidates; RESEARCH_MODE=live requires ANTHROPIC_API_KEY (env already validates);
    handler warn-logs when discovery.kind==="live"; CI is demo → fictional by construction. Injection-
    hardened: findings → candidate evidence TEXT only, never instructions; adversarial fixture as data.

---

## 2. Work breakdown (sequenced; each phase ends with its verification)

### Phase A — DB: migration 0012 (idempotency columns)

- A1. `schema/discovery.ts`: add `checkpoint jsonb`, `error text`, `originKey text` to discoveryTasks;
  `originKey text` to candidates. `pnpm db:generate` → 0012.
- A2. Manually append to 0012: partial unique index on candidates.origin_key (WHERE NOT NULL);
  idempotent RLS DO-loop (insurance). Migrate; psql-verify cols + index.
- A3. RLS isolation test: add discovery_tasks + candidates cross-tenant assertions to
  rls-isolation.test.ts (mirror the I11 research_jobs ones).
- ✅ Verify: migrate clean; `pnpm --filter @95forward/db test`.

### Phase B — DiscoveryProvider seam + injection fixture

- B1. `packages/ai/src/types.ts`: DiscoveryQuery/DiscoverySuggestion/DiscoveryResult/DiscoveryProvider;
  add `discovery` to Providers.
- B2. `provider/discovery.ts`: SeededDiscoveryProvider (SEEDED_DISCOVERY_RESULTS keyed by connector
  name — fictional: Sandra Kim batch; one suggestion's evidenceAffinity = ADVERSARIAL_INJECTION_SNIPPET)
  - LiveDiscoveryProvider (Anthropic web_search, no-any parsing). Export from provider/index.
- B3. `provider/index.ts` createProviders: add createDiscoveryProvider (RESEARCH_MODE live→Anthropic
  key required; warn-log live).
- B4. Unit tests: demo determinism; adversarial-as-data; live shape (mocked SDK).
- ✅ Verify: `pnpm --filter @95forward/ai test`.

### Phase C — Discovery job handler + state

- C1. `jobs/discovery-prospects.ts`: runDiscoveryJob (3-phase, mirror research-prospect.ts):
  CAS→checkpoint/discover→ONE tx insert candidates (origin_key, ON CONFLICT) + ready. Resolve connector
  name + initiative context within withTenant. + markDiscoveryReviewedIfComplete (ready→reviewed when
  all candidates decided). + a re-discovery helper for "keep researching".
- C2. `jobs/task-list.ts`: JOB_NAMES += discovery; buildTaskList += discovery handler (needs discovery
  provider in JobRuntime). Pass providers.discovery.
- C3. Unit tests: idempotency (re-run = no dup candidates); checkpoint resume; adversarial-as-data;
  tenancy (tenant-A job can't touch tenant-B); ready→reviewed.
- ✅ Verify: `pnpm --filter @95forward/ai test`; typecheck.

### Phase D — Enqueue + data loaders + actions

- D1. `apps/web/src/server/jobs.ts`: enqueueDiscovery (mirror enqueueResearch, jobKey discovery-{id}).
- D2. `server/data/discovery.ts`: createDiscoveryTask, getCandidateBatches (grouped by task, w/
  connector+initiative+candidates), getDiscoveryTrayState. updateCandidateStatus (CAS).
- D3. `server/data/discovery-mutations.ts`: promoteCandidate (the one-tx promote), keepResearching
  (re-discovery enqueue), endorse/requestIntro/dismiss (CAS).
- D4. `server/actions/discovery.ts`: findIntroductionsAction (connector×initiative → createDiscoveryTask
  - enqueueDiscovery; tenantId/userId server-side), endorse/requestIntro/dismiss/keepResearching/
    promoteCandidate actions (Zod-validated via shared schemas).
- D5. `packages/shared/src/forms.ts`: discovery Zod schemas (findIntroductions, candidate status,
  promoteCandidate) + tests.
- ✅ Verify: typecheck; shared tests.

### Phase E — Candidates UI (off MPL, iris/provisional) + Find introductions

- E1. Route `/95-forward/prospects/candidates/page.tsx`: grouped batches (connector×initiative header,
  status, count), each expandable to candidate cards. iris/provisional (`Card tone="ai"`).
- E2. CandidateCard component: name·confidence·connection-evidence(SourceTag)·affinity-evidence
  (SourceTag or "Unknown — worth researching" dashed-neutral)·hypothesis framing; Endorse/Keep
  researching/Dismiss; promote on intro_requested. Reuse ProvisionalSuggestion/SourceTag/Badge tone=ai.
- E3. nav.ts: add "Candidates" leaf under 95-forward (after Prospects).
- E4. "Find introductions" action: on initiative detail (choose connector) + a "New introduction
  search" in the Candidates view. data-testids: candidates-view, candidate-batch, candidate-card,
  find-introductions, candidate-endorse/keep-researching/dismiss/promote.
- ✅ Verify: web typecheck, lint; design-skill consulted (iris, sage NP, mono provenance, unknown dashed).

### Phase F — Tray + Today extension

- F1. getJobTrayState += discovery fields (additive). /api/jobs/status returns combined.
- F2. JobTray.tsx: render discovery summaries ("Researching {connector} → N ready"); discovery ready
  links to Candidates batch. Today touch: discovery ready-to-review.
- ✅ Verify: web typecheck, build compiles.

### Phase G — Seed + e2e + CI

- G1. `seed-discovery.ts` (after seedJobs): Sandra Kim batch `ready` (fictional candidates incl. one
  with adversarial-snippet evidence, connection+affinity+confidence) for Bolivia Scale-Up; Tom Bradley
  batch `researching` for The Forever Promise. Idempotent (stableId+onConflictDoNothing). seed.test.ts
  += I12 assertions. Connectors = grounded WfP constituents (Sandra Kim, Tom Bradley) or external names.
- G2. e2e `candidates.spec.ts`: Find introductions → tray Researching → drain (runOnce seam) → batch
  ready in Candidates view → review card (evidence/confidence/hypothesis) → Endorse → (request intro) →
  Promote → new prospect on MPL with connector as Natural Partner + candidate promoted; assert
  candidates NEVER on MPL pre-promotion. afterEach preserves seed:%; serial.
- G3. CI: no change needed (drain auto-wires via buildTaskList; RESEARCH_MODE=demo already set).
- ✅ Verify: full gate (Phase H).

### Phase H — Final gate

- down -v → up/wait/migrate → graphile schema → seed → embed → `pnpm test` → full e2e (worker drains) →
  lint/typecheck → `prettier --write` new → format:check → isolated build. Then Oracle I12 review
  (background) → apply P1/P2 → report against DoD.

---

## 3. Mandatory test assertions (from Oracle)

1. Idempotency: handler twice → identical candidate count.
2. Off-MPL: getProspectsList excludes candidate pre-promote, includes the new prospect post-promote.
3. Promote atomicity: new prospect has NP role "Connector" w/ connector name; candidate promoted +
   promotedProspectId set.
4. Connector external-name path: promote w/ connectorExternalName → NP uses externalName.
5. Adversarial: snippet lands in candidates.evidenceAffinity as data text.
6. Status CAS forward-only (no endorsed→suggested, no promoted→endorsed).
7. ready→reviewed when all candidates decided.
8. Tray returns both research + discovery, tenant-scoped.
9. Tenancy: tenant-A discovery job can't touch tenant-B (withTenant).
10. e2e golden path (Find intro → drain → ready → endorse → promote → MPL + NP).

## 4. Risk register (ranked) + mitigations

1. BLOCKER "keep researching" vs research_jobs.prospectId NOT NULL → redefine as re-discovery (§1.7).
2. HIGH provider shape mismatch → new DiscoveryProvider seam (§1.3).
3. MED promote atomicity + connector variants + prospects UNIQUE collision → one tx, ordered, guarded.
4. LOW candidate idempotency → CAS+tx primary, origin_key safety net.
5. LOW responsible-AI → env gate + warn-log; CI demo by construction.

## 5. Out of scope (do NOT build)

- Demo readiness / comprehensive seed / a11y (I13). Test-seam gating decision (I13).
- Rebuilding I6/I11 or any I7–I10 surface. No frame column on prospects. Candidates off MPL except via
  promote. No I0–I11 regress.

## 6. Exact commands

- Reset: `docker compose down -v && pnpm db:up && pnpm db:wait && pnpm db:migrate`
- Graphile schema: `pnpm --filter @95forward/worker migrate:jobs`
- Seed/embed: `pnpm --filter @95forward/db seed && pnpm --filter @95forward/ai embed`
- Run: `pnpm dev` (web :3000 + worker)
- Test: `pnpm test`; e2e: `pnpm --filter @95forward/web test:e2e`
- mock/demo everywhere in CI/e2e (key-free). live discovery needs ANTHROPIC_API_KEY (internal-only).

## 7. Deviations from prompt (flagged)

- "Keep researching enqueues an I11 research job" → implemented as **re-discovery on the candidate**
  (refresh evidence, stay suggested, stay off-MPL). Reason: research_jobs.prospectId is NOT NULL;
  honoring the literal wording would require creating a prospect = putting the candidate on the MPL,
  contradicting the hard off-MPL invariant. Faithful to the card affordance + the off-MPL rule.

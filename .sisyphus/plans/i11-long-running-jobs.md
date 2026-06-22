# Initiative 11 — Long-Running Jobs Infrastructure — Implementation Plan

Status: DRAFT (pending Momus review)
Repo: /Users/Spoon/Projects/95Forward-PoC
Builds on: I0–I10 (complete). Grounded in 6 explore/librarian sweeps + an Oracle architecture review.

---

## 0. Goal & success definition

Pivot the copilot from synchronous to durable background work. Stand up Graphile Worker, an
enqueue path from the web app, a checkpointed tenant-scoped job state machine
(`queued→researching→ready→reviewed`), the real `ResearchProvider` behind the I6 seam
(`RESEARCH_MODE=demo|live`), a calm polling job tray + Today touch, and move embedding +
follow-up drafting to durable jobs plus one cron job. Headline demonstrable: enqueue prospect
research from a KB gap → job runs → proposed KB updates (via I6 proposal mechanism) → review →
approve write-back → reviewed. Key-free in CI; the worker drains the queue during e2e.

Done = all 10 DoD items in the I11 prompt met; unit + Playwright green key-free in CI;
lint/typecheck/format clean; fresh migrate+seed+embed works and the worker drains the queue.

---

## 1. Architecture decisions (locked, from Oracle review)

1. **Dedicated `research_jobs` table** (NOT generic `background_jobs`, NOT overloading I12's
   `discovery_tasks`). Reuse the EXISTING `discoveryStatusEnum`
   (`queued|researching|ready|reviewed`) as its `status` column type.
2. **RLS split**:
   - Graphile Worker's own tables → its own `graphile_worker` schema, on the **owner** pool
     (`DATABASE_URL`). No `tenant_id`, not RLS-relevant.
   - `research_jobs` + all domain data → **app_user** pool (`APP_DATABASE_URL`), RLS-enforced,
     all worker domain writes wrapped in `withTenant(getAppDb(), payload.tenantId, …)`.
   - Worker process holds **two pools** (owner for Graphile; app_user for domain).
3. **Worker job lifecycle ends at `ready`.** `reviewed` is driven by the existing
   approve/dismiss flow: when ALL proposals for a research job are decided, flip
   `research_jobs.status → reviewed`. The worker never models `reviewed`.
4. **Idempotency/checkpoint**:
   - `research_jobs.checkpoint` jsonb stores `{ findings }` after the ResearchProvider call so a
     retry resumes without re-researching.
   - New `copilot_proposals.origin_key` (nullable) + UNIQUE partial index; handler emits stable
     keys `research:{researchJobId}:{field}` and uses `INSERT … ON CONFLICT (origin_key) DO
NOTHING` → no duplicate proposals on retry.
   - Handler steps: (1) early-exit if status already `ready`/`reviewed`; (2) CAS
     `queued|researching → researching`; (3) if `checkpoint.findings` empty → call
     ResearchProvider, persist findings to checkpoint; (4) ONE transaction: upsert proposals by
     origin_key + set status `ready` + completed_at.
   - Graphile job: `jobKey: research-{researchJobId}`, `maxAttempts: 3`.
5. **Enqueue**: `getWorkerUtils()` singleton cached on `globalThis` (HMR-safe), owner pool,
   calls `utils.migrate()` once (CRITICAL — makeWorkerUtils does NOT auto-install schema).
   `tenantId`/`userId` stamped from `getCurrentUser()` server-side; handler trusts only payload.
6. **Worker in e2e = option (c)**: gated test-only `POST /api/test-drain-jobs` route calling
   `runOnce()` (skips cron → no flaky cron). Shared `taskList` between worker `run()` and the
   drain route. Synchronous drain before assertions = no timing flake.
7. **Env split**: `baseEnvSchema` (DATABASE*URL, NODE/APP_ENV, LOG_LEVEL, AI*\*; Auth0 optional in
   base) → `webEnvSchema` (Auth0 required + APP_BASE_URL + AUTH_DEV_LOGIN) used by `getEnv()`
   (unchanged for web) + `workerEnvSchema` (WORKER_PORT, APP_DATABASE_URL, JOBS_CONCURRENCY,
   JOBS_SCHEMA) used by new `getWorkerEnv()`. `createProviders(ProviderEnv)` unchanged.
8. **Keep NestJS** in the worker (already works; /health needed for DO health check). `run()`
   starts alongside Nest in bootstrap; graceful shutdown stops both.
9. **Shared `taskList`** location: `packages/ai/src/jobs/` (handlers need providers + db; ai is
   imported by both web and worker). Handlers receive an injected db/providers factory so the
   web (drain route) and worker both supply their own pools.
10. **Connection budget**: explicit `max` on pools (owner ~3, app_user ~5, JOBS_CONCURRENCY=3).

---

## 2. Work breakdown (sequenced; each step ends with its verification)

### Phase A — Env split (foundation, no behavior change)

- A1. Refactor `packages/shared/src/env.ts`: base/web/worker schemas; keep `getEnv()`=web; add
  `getWorkerEnv()`; export `webEnvSchema`/`workerEnvSchema`. Auth0 optional in base, required in
  web. Add WORKER vars + APP_DATABASE_URL + JOBS_CONCURRENCY/JOBS_SCHEMA to worker schema.
- A2. Update `packages/shared/src/env.test.ts`: web rejects missing Auth0; worker accepts missing
  Auth0; worker requires APP*DATABASE_URL; JOBS*\* defaults.
- A3. Switch `apps/worker/src/main.ts` to `getWorkerEnv()`.
- A4. Update `.env.example` (uncomment JOBS\_\*, note worker vs web), `.do/app.yaml` (remove Auth0
  from worker service, add APP_DATABASE_URL), `.github/workflows/ci.yml` (see Phase G).
- ✅ Verify: `pnpm --filter @95forward/shared test`, `pnpm typecheck`.

### Phase B — DB: research_jobs + origin_key + migration 0011

- B1. `packages/db/src/schema/jobs.ts`: `research_jobs` table (id, tenantScoped, prospectId FK,
  researchGapId FK nullable, status `discoveryStatusEnum` default queued, requestedByUserId,
  requestedAt, completedAt, checkpoint jsonb, error text, originKey text unique, timestamps +
  indexes). Export from `schema/index.ts`; add relations.
- B2. Add `originKey: text("origin_key")` to `copilot_proposals` (schema/ai.ts).
- B3. `pnpm db:generate` → 0011. **Manually append**: `GRANT … ON research_jobs TO app_user`;
  per-table RLS block (ENABLE RLS + `tenant_isolation` policy) for research_jobs (do NOT rely on
  0004 DO-loop); `CREATE UNIQUE INDEX copilot_proposals_origin_key_unique … WHERE origin_key IS
NOT NULL`. Use `--> statement-breakpoint` between statements.
- B4. `pnpm db:migrate`; verify col/policy/index exist via psql.
- ✅ Verify: migrate clean; add RLS-isolation unit assertion for research_jobs in
  `packages/db/src/rls-isolation.test.ts`.

### Phase C — ResearchProvider (live) + injection hardening

- C1. Implement `LiveResearchProvider.research()` in `packages/ai/src/provider/research.ts` using
  `@anthropic-ai/sdk` web_search tool (`web_search_20250305`+, max_uses cap). Map results →
  `ResearchFinding[]`. Treat all returned content as untrusted (user-role only).
- C2. Keep `SeededResearchProvider` (demo) + `ADVERSARIAL_INJECTION_SNIPPET` as-is.
- C3. Unit tests: demo determinism; live provider shape (mock the SDK, no network); adversarial
  snippet surfaced as data.
- ✅ Verify: `pnpm --filter @95forward/ai test`.

### Phase D — Job handlers + state machine (the core)

- D1. `packages/ai/src/jobs/state.ts`: pure state-machine helpers (valid transitions; reject
  skips; `reviewed` terminal) + unit tests (transitions, idempotency, resumability-from-checkpoint
  via simulated restart).
- D2. `packages/ai/src/jobs/research-prospect.ts`: handler per §1.4. Emits proposals via existing
  `propose_knowledge_base_update`/`createProposal` with origin_key; checkpointed; idempotent.
- D3. `packages/ai/src/jobs/embed-content.ts`: wraps `embedAndStore` for a tenant (durable,
  retryable).
- D4. `packages/ai/src/jobs/draft-follow-up.ts`: moves I10 follow-up drafting off the synchronous
  path; honors `draft_24h_followups` toggle; lands as the I10 `draft` proposal artifact.
- D5. `packages/ai/src/jobs/task-list.ts`: assemble `taskList` from a `{ getDb, providers }`
  factory so web/worker inject their own pools; export cron item(s) (daily overdue-follow-up or
  re-embed sweep).
- D6. Unit tests for each handler incl. tenancy (tenant-A handler cannot touch tenant-B via
  withTenant) and the adversarial fixture.
- ✅ Verify: `pnpm --filter @95forward/ai test`; `pnpm typecheck`.

### Phase E — Worker wiring + web enqueue path

- E1. `apps/worker`: add `graphile-worker` dep; bootstrap `run()` alongside Nest using
  `getWorkerEnv()`, the shared taskList (owner pool for Graphile + app_user pool for domain),
  parsedCronItems, JOBS_CONCURRENCY, graceful SIGTERM (stop runner + close Nest). Call
  `migrate()` on boot before run().
- E2. `apps/web/src/server/jobs.ts`: `getWorkerUtils()` globalThis singleton (owner pool,
  migrate() once) + `enqueueResearch/enqueueEmbed/enqueueFollowUpDraft` (tenantId/userId from
  getCurrentUser()).
- E3. Server actions: `enqueueResearchJobAction` (creates research_jobs row status=queued +
  enqueues), wired to the KB research-gap affordance. Re-route I10 `runFollowUpDraftAction` →
  enqueue (keep synchronous fallback path removed/guarded). On-write embed enqueue where content
  changes (KB/constituent/interaction mutations) — minimal, additive.
- ✅ Verify: `pnpm typecheck`; manual local: worker boots, enqueue → drain → proposals appear.

### Phase F — UI: polling job tray + Today touch (design skill loaded)

- F1. `JobTray` client component in the 95 Forward shell (AppShell): polls a status endpoint
  (`GET /api/jobs/status` or a server action) every ~15s; shows "Researching… {prospect}" and
  "N ready to review"; iris/copilot register; heartbeat-style calm; `prefers-reduced-motion`
  respected; quiet, glanceable (no notification-center noise).
- F2. `GET` status endpoint/loader: lists current user's tenant research_jobs (researching count;
  ready-to-review count) via withTenant.
- F3. Today touch: surface "N ready to review" in the existing "From your copilot" section.
- F4. Enqueue affordance on the KB research-gap row ("Research this" → enqueues).
- F5. data-testids: job-tray, job-tray-researching, job-tray-ready, research-this, job-ready.
- ✅ Verify: `pnpm --filter @95forward/web typecheck`, lint; visual sanity at /styleguide-adjacent.

### Phase G — Seed + e2e drain + CI

- G1. `packages/db/src/seed-jobs.ts` (wired after seedExecution): ≥1 research_job status=`ready`
  for a grounded WfP prospect with KB gaps, with proposed KB updates (copilot_proposals,
  origin_key=`seed:…`) attached; + one mid-`researching` job for the pattern. Idempotent.
  Update seed.test.ts.
- G2. `apps/web/src/app/api/test-drain-jobs/route.ts`: gated (NODE_ENV!=production &&
  AUTH_DEV_LOGIN) `runOnce()` with the shared taskList (web pools). Mirror dev-login gating.
- G3. `apps/web/e2e/jobs.spec.ts` (Playwright skill): enqueue research from KB gap → drain →
  tray shows ready → click → review proposed KB updates → approve → KB write-back + job→reviewed;
  Today shows ready-to-review. `test.describe.serial`; afterEach cleans graphile_worker.jobs +
  non-seed research_jobs + non-seed copilot_proposals (preserve seed:%).
- G4. CI: add Graphile schema install step (`graphile-worker --schema-only` OR seed-driven
  migrate()) after `pnpm db:migrate`, before seed. Keep AI_MODE=mock, RESEARCH_MODE=demo.
- ✅ Verify: full gate (Phase H).

### Phase H — Final gate

- Canonical reset `docker compose down -v` → up/wait/migrate → graphile schema install → seed →
  embed → `pnpm test` → full `pnpm --filter @95forward/web test:e2e` (worker drains) →
  lint/typecheck → `prettier --write` new files → format:check → isolated build.
- Then Oracle I11 review (background) → apply P1/P2 → report against DoD.

---

## 3. Mandatory test assertions (from Oracle)

1. RLS on research_jobs: app_user with tenant-B cannot SELECT tenant-A research_jobs.
2. Idempotent re-enqueue: same researchJobId → one graphile job (jobKey dedup).
3. Handler retry idempotency: checkpoint populated → no duplicate proposals (count by origin_key).
4. Invalid transition queued→reviewed rejected (CAS fails; status unchanged).
5. Adversarial research content surfaced as data in proposal payload, no unintended tool calls.
6. getWorkerEnv() OK without Auth0; getEnv() throws without Auth0.
7. e2e enqueue→drain→ready→approve→reviewed; Today shows ready.
8. Seeded ready job + proposals survive afterEach cleanup.

---

## 4. Risk register (ranked) + mitigations

1. CRITICAL: Graphile schema not installed before first addJob → migrate() in getWorkerUtils
   singleton + CI --schema-only step.
2. HIGH: duplicate proposals on retry → origin_key unique partial index + ON CONFLICT DO NOTHING
   - checkpoint.
3. HIGH: e2e flake from async jobs → option (c) synchronous runOnce drain; serial job specs.
4. HIGH: tenant isolation in worker → all domain work via withTenant(appDb); RLS unit test.
5. MED: connection exhaustion → explicit pool max; JOBS_CONCURRENCY=3.
6. MED: worker boot fails on Auth0 env → env split + getWorkerEnv.
7. MED: new table missing RLS → explicit 0011 RLS block + test.
8. MED: parallel e2e job pollution → origin_key prefixes + surgical cleanup + serial.
9. LOW: cron fires in CI → runOnce skips cron.
10. LOW: HMR pool leak → globalThis caching.

---

## 5. Out of scope (do NOT build)

- Connector discovery / Candidates view (I12) — though research_jobs pattern must generalize.
- Demo readiness / comprehensive seed / a11y pass (I13).
- Rebuilding I6 substrate or any I7–I10 feature. No frame column on prospects. No I0–I10 regress.

---

## 6. Exact commands

- Reset: `docker compose down -v && pnpm db:up && pnpm db:wait && pnpm db:migrate`
- Graphile schema: `pnpm --filter @95forward/worker exec graphile-worker -c "$DATABASE_URL" --schema-only` (or via seed migrate())
- Seed/embed: `pnpm --filter @95forward/db seed && pnpm --filter @95forward/ai embed`
- Run: `pnpm dev` (web :3000 + worker); worker alone: `pnpm --filter @95forward/worker start`
- Test: `pnpm test`; e2e: `pnpm --filter @95forward/web test:e2e`
- Env (local shell): DATABASE_URL(owner), APP_DATABASE_URL(app_user), AI_MODE=mock,
  RESEARCH_MODE=demo, JOBS_SCHEMA=graphile_worker.
- mock vs live: CI/e2e = mock model + mock embed + demo research (key-free). live needs
  ANTHROPIC_API_KEY (model + web search) / OPENAI_API_KEY (embeddings).

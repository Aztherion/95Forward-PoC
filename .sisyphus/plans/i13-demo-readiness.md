# Initiative 13 — Demo Readiness, Comprehensive Seed & E2E — Implementation Plan (FINAL)

Status: DRAFT (pending Momus review)
Repo: /Users/Spoon/Projects/95Forward-PoC
Builds on: I0–I12 (complete). Grounded in 5 explore + 1 librarian sweep + an Oracle architecture review.
This is the FINAL initiative; the review doubles as ship sign-off.

---

## 0. Goal

Make the PoC demo-perfect and deploy-ready. NO new product surface. Consolidation + a guarded reset

- comprehensive e2e + a11y + deployment wiring + unified seam-gating + the permanent debris fix +
  documented demo config with a live smoke pass. After this, the PoC ships.

Done = all 10 DoD items met; unit + Playwright green key-free in CI; lint/typecheck/format clean;
fresh `down -v`→migrate→migrate:jobs→seed→embed→run produces the full demo state + drainable queue;
the guarded reset reproduces it and refuses on a non-demo DB.

---

## 1. Locked decisions (from Oracle review)

1. **Guarded reset** (`packages/db/src/reset.ts`): `assertResetAllowed()` = require ALL of:
   `ALLOW_DESTRUCTIVE_RESET === "true"` (the demo-DB marker — NOT NODE_ENV/APP_ENV, because the
   deployed demo IS NODE_ENV=production) AND `RESEARCH_MODE !== "live"` AND `process.argv` includes
   `--confirm`. Then `TRUNCATE <hardcoded tenant-table list> CASCADE` on the OWNER connection +
   `DELETE FROM graphile_worker.jobs` + `DELETE FROM graphile_worker.known_crontabs` → `seed(db)`.
   Export the TRUNCATE SQL/list as a shared constant (reused by e2e global-setup). Hardcoded list
   (not pg_tables query) so a new table is a conscious add; CASCADE backstops any miss.
2. **Seam gating**: rename `AUTH_DEV_LOGIN`→`E2E_TEST_MODE`. Gate (all 3 touchpoints) =
   `process.env.NODE_ENV !== "production" && process.env.E2E_TEST_MODE === "true"`, read from RAW
   process.env (NOT getEnv() — static gate must hold even if schema parse throws). Add E2E_TEST_MODE
   to webEnvSchema for docs/type only. Clean cut, no alias. Update: test-login/route.ts,
   test-drain-jobs/route.ts, middleware.ts (isPublicPath — also explicitly gate test-drain-jobs),
   playwright.config webServer env, ci.yml env, .env.example, README/docs.
3. **e2e self-cleaning**: a **global SETUP** (`apps/web/e2e/global-setup.ts`, wired via
   `globalSetup` in playwright.config) that TRUNCATEs the shared table list + clears graphile jobs +
   `seed(db)` once before the suite (skip embed — EMBEDDING_MODE=mock). Keep the 6 per-spec afterEach
   hooks. No teardown. Runs before auth.setup + workers, so pristine start regardless of prior run.
4. **Deployment**: do NOT add a reset Job component (no manual-job kind in DO). Fix .do/app.yaml
   worker `AI_MODE=mock→live` + add `EMBEDDING_MODE=live` + ANTHROPIC_API_KEY/OPENAI_API_KEY
   placeholders; add the same AI vars to web; set `ALLOW_DESTRUCTIVE_RESET=true` at app level (safe —
   --confirm still required) so Console resets work. PRE_DEPLOY migrate job + env split already
   correct. `production:false` intentional (flag in runbook). Runbook: reset paths (Console + local),
   first-deploy seed+embed step.
5. **a11y**: global prefers-reduced-motion handler is WCAG-sufficient (no per-animation wrapping
   needed). Add: skip-link in AppShell, Topbar search aria-label, JobTray visibilitychange pause.
   Keep commitment `min(0)`; show "TBD"/"—" in UI when null. WCAG 2.1 AA target.

---

## 2. Work breakdown (sequenced; each phase ends with its verification)

### Phase A — Guarded reset (the dangerous one, first + most-tested)

- A1. `packages/db/src/reset.ts`: `TENANT_TABLES_TRUNCATE_SQL` const (hardcoded list, child→parent
  order for readability though CASCADE handles FKs); `assertResetAllowed()` (3-layer guard);
  `reset(db, pool)` = assert → TRUNCATE CASCADE → clear graphile jobs/known_crontabs → seed(db);
  `main()` entry reading DATABASE_URL. Script `"reset": "tsx src/reset.ts"` in packages/db/package.json.
- A2. `packages/db/src/reset.test.ts` (pure-logic, no DB): assertResetAllowed throws when
  ALLOW_DESTRUCTIVE_RESET unset; throws when RESEARCH_MODE=live; throws without --confirm; passes when
  all three hold. (Mock process.env/argv.)
- A3. Manual integration verify (local): `ALLOW_DESTRUCTIVE_RESET=true RESEARCH_MODE=demo pnpm
--filter @95forward/db reset --confirm` → seed.test still green (idempotency survives).
- ✅ Verify: reset.test passes; manual reset reproduces demo state; seed.test green after.

### Phase B — Unified seam gating + production unreachability

- B1. Shared `isTestSeamEnabled()` logic (inline in each, or a tiny shared helper) =
  `NODE_ENV!=="production" && E2E_TEST_MODE==="true"` from raw process.env. Update test-login/route.ts
  - test-drain-jobs/route.ts isEnabled() + middleware.ts isPublicPath (gate both routes).
- B2. env.ts: replace AUTH_DEV_LOGIN with E2E_TEST_MODE in webEnvSchema (docs/type). env.test += the
  flag. playwright.config webServer env: E2E_TEST_MODE=true (drop AUTH_DEV_LOGIN). ci.yml env:
  E2E_TEST_MODE=true. .env.example: rename + comment. Grep AUTH_DEV_LOGIN → update all (README/runbook).
- B3. Seam unit/route tests (web): 403 when NODE_ENV=production regardless of flag; 403 when flag
  off; 200 when dev+flag; same for both routes; middleware isPublicPath false when gate off.
- ✅ Verify: web typecheck + the seam tests; e2e auth.setup still logs in (E2E_TEST_MODE path).

### Phase C — e2e self-cleaning global setup

- C1. `apps/web/e2e/global-setup.ts`: import TENANT_TABLES_TRUNCATE_SQL + seed; TRUNCATE + clear
  graphile + seed(db) on DATABASE_URL. Wire `globalSetup` in playwright.config.ts.
- ✅ Verify: run `pnpm --filter @95forward/web test:e2e` twice consecutively on a dirtied DB → both
  green; `pnpm --filter @95forward/db test` (seed.test) green afterward (no debris).

### Phase D — Comprehensive demo-workflow E2E

- D1. `apps/web/e2e/demo-journey.spec.ts` (the centerpiece, serial): the headline journey end to end
  — host foil → MPL + banner → Hallworth → QPI hide-the-math → Strategize tabs → research gap →
  "Research this" → drain (runOnce seam) → review+approve KB proposal → plan visit → Visit Mode →
  log ask → 24h follow-up + heartbeat → initiative progress → Green Sheet (Me/Team by role) → Find
  introductions → Candidates (OFF-MPL assertion) → endorse→promote → new prospect on MPL with
  connector as Natural Partner. Reuse existing testids; lean on global-setup for clean state +
  per-test cleanup where it mutates seeded rows.
- D2. Keep the per-initiative specs (they're the regression net). Add Green Sheet Me-vs-Team-by-role
  coverage if not already present (as leadership=Ruth, as gift_officer=Priya/Dana).
- ✅ Verify: full e2e suite green (worker drains via seam), no I0–I12 regressions.

### Phase E — a11y / reduced-motion + cosmetic bucket

- E1. Skip-link: `<a href="#shell-content" class="skip-link">Skip to main</a>` in AppShell before
  the sidebar; `id="shell-content"` on <main>; skip-link CSS (off-screen, visible on :focus).
- E2. Topbar search input: add `aria-label="Search Keystone"` (or wire a visually-hidden label).
- E3. JobTray.tsx: pause the poll interval on `document.visibilitychange` (hidden→clear, visible→
  poll+restart). Optimization, reduced-motion-safe.
- E4. Cosmetic (demo-affecting): show "TBD"/"—" for null/$0 commitment amount in the ask/visit
  surfaces (no schema change). Document the rest (Overdue-by-1h label, completedOnTime naming, bigint
  annotation, Avatar lazy/decoding) as intentionally-left or apply if trivial.
- E5. Confirm global prefers-reduced-motion covers heartbeat + rise (no per-animation wrap needed).
- ✅ Verify: web typecheck + lint; manual keyboard-tab + skip-link; /styleguide sanity.

### Phase F — Deployment wiring reconciliation

- F1. .do/app.yaml: worker env AI_MODE=live + EMBEDDING_MODE=live + ANTHROPIC_API_KEY/OPENAI_API_KEY
  (SECRET, REPLACE_ME); add AI_MODE/EMBEDDING_MODE/keys to web; ALLOW_DESTRUCTIVE_RESET=true at the
  app/shared level (or both services). Keep PRE_DEPLOY migrate + env split. (`production:false` left,
  noted.)
- F2. docs/deployment-and-ops-runbook.md: the guarded-reset section (the marker = ALLOW*DESTRUCTIVE*
  RESET, the 3-layer guard, Console + local-machine commands), first-deploy seed+embed step,
  production:false intentional, the AI_MODE=live + RESEARCH_MODE=demo demo config, the live
  model/embedding smoke result (Phase G).
- F3. Local verify: the migrate command runs; app.yaml is valid YAML; the reset script's guard
  refuses without the marker.
- ✅ Verify: YAML parses; migrate command works locally; reset guard refuses on default env.

### Phase G — Demo config + live-path smoke (manual, documented)

- G1. Document the intended deployed-demo mode (AI_MODE=live + EMBEDDING_MODE=live + RESEARCH_MODE=
  demo) in README + runbook.
- G2. Live smoke in dev (real keys, NOT CI): a QPI suggestion, a draft, the research-gap proposal,
  and NL-search/embeddings — record the result. CI/e2e stay key-free (mock/demo). If keys are
  unavailable in this environment, document the smoke as "to be run by operator pre-demo" with the
  exact steps. (Deviation note if so.)
- ✅ Verify: documented; smoke result (or operator-instructions) recorded.

### Phase H — Final ship gate

- Fresh `docker compose down -v` → up/wait/migrate → migrate:jobs → seed → embed → `pnpm test` (3×)
  → full `pnpm --filter @95forward/web test:e2e` (worker drains via seam; global-setup cleans) →
  lint/typecheck → `prettier --write` new → format:check → isolated build. Then run the guarded
  reset and re-verify the demo state. Then Oracle I13 review (background) → apply P1/P2 → final
  ship-readiness report against the DoD.

---

## 3. Mandatory unit assertions (from Oracle)

- reset: throws (no ALLOW_DESTRUCTIVE_RESET) / throws (RESEARCH_MODE=live) / throws (no --confirm) /
  passes (all three) / seed.test idempotency survives a reset.
- seam: test-login 403 when NODE_ENV=production (any flag); 403 when flag off; 200 when dev+flag;
  same for test-drain-jobs; middleware isPublicPath false when gate off.
- commitment "TBD" UI for null/$0 (lib/component level if extracted).

## 4. Risk register (ranked) + mitigations

1. CATASTROPHIC: reset truncating a real DB → ALLOW_DESTRUCTIVE_RESET opt-in (not NODE_ENV) +
   RESEARCH_MODE!=live + --confirm; unit-tested refusals; TRUNCATE on owner only.
2. HIGH: seam reachable in prod → two-condition AND gate from raw process.env, prod hard-wall;
   unit-tested prod refusal.
3. MED: e2e debris breaking local seed.test → global-setup truncate+reseed (pristine start).
4. MED: worker shipping AI_MODE=mock in the live demo → app.yaml fix.
5. LOW: a11y gaps → skip-link + search aria-label; global reduced-motion already WCAG-sufficient.

## 5. Out of scope (do NOT build)

- New product surface. Provisioning/deploying to DO (operator does it per runbook). Real-multi-tenancy
  hardening + scale opts (documented future). No I0–I12 regress.

## 6. Exact commands

- Fresh bring-up: `docker compose down -v && pnpm db:up && pnpm db:wait && pnpm db:migrate &&
pnpm --filter @95forward/worker migrate:jobs && pnpm --filter @95forward/db seed &&
pnpm --filter @95forward/ai embed && pnpm dev`
- Guarded reset (local): `ALLOW_DESTRUCTIVE_RESET=true RESEARCH_MODE=demo pnpm --filter @95forward/db reset --confirm`
- Test: `pnpm test`; e2e: `pnpm --filter @95forward/web test:e2e`
- Demo config: deployed = AI_MODE=live + EMBEDDING_MODE=live + RESEARCH_MODE=demo. CI/e2e = mock/demo, key-free.

## 7. Deviations (flagged)

- No DO reset Job component (DO has no manual-job kind) → Console/local commands documented instead.
- Live model/embedding smoke may be operator-run if real keys are unavailable in this env (documented).
- AUTH_DEV_LOGIN fully replaced by E2E_TEST_MODE (clean cut, no alias) — a deliberate rename.

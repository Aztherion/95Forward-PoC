# 95 Forward — Deployment & Operations Runbook

Operational companion to the implementation plan: how to deploy **95 Forward + Keystone CRM** to **DigitalOcean App Platform**, run the initial migration and seed, and keep schema and demo data in sync across local and DO as the project evolves.

> Some DO specifics (exact job-spec keys, pgvector availability per PG version/region) are worth confirming against current DO docs at setup time; the approach below is stable regardless.

---

## Mental model (read this first)

Two different problems, two different cadences — and only one of them ever runs automatically:

- **Schema** — the committed **Drizzle migrations are the single source of truth**. The identical ordered files run in _every_ environment, idempotently, tracked in `__drizzle_migrations` (a fresh DB gets all of them; an existing DB gets only the pending ones). Local and DO **cannot drift**. Runs **automatically on every deploy**.
- **Seed / demo data** — a **deliberate, idempotent, occasional** operation. **Never** part of a deploy. The only destructive operation (wipe + reseed) is always manual and explicit.

The payoff: the routine operations (migrate, idempotent re-seed) are safe and repeatable; the destructive one (reset) never happens by accident.

---

## Components, roles & connections

| Component                                   | DB role                  | Connection                          | Notes                                                                                                                     |
| ------------------------------------------- | ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **web** (Next.js)                           | `app_user`               | `APP_DATABASE_URL`                  | RLS-scoped via `withTenant`                                                                                               |
| **worker** (NestJS + Graphile)              | `app_user` **and** owner | `APP_DATABASE_URL` + `DATABASE_URL` | `app_user` for handlers (RLS); owner drives Graphile's own `graphile_worker` schema, migrated on boot                     |
| **migrate** (pre-deploy job)                | owner                    | `DATABASE_URL`                      | runs Drizzle migrations: DDL + GRANTs + RLS policies                                                                      |
| **Postgres** (DO Managed, PG 16 + pgvector) | —                        | —                                   | two roles: an **owner** (DO's `doadmin`, or a dedicated owner) and **`app_user`** (the RLS-respecting login the app uses) |

The worker needs **both** connection strings.

---

## One-time DO setup

In this order — the order matters:

1. **Provision** DO Managed Postgres (PG 16). Enable the **pgvector** extension (confirm it's offered for your version/region).
2. **Bootstrap the database once** (as the admin, `doadmin`):
   - `CREATE EXTENSION IF NOT EXISTS vector;`
   - `CREATE ROLE app_user WITH LOGIN PASSWORD '<strong-secret>';` plus any baseline `GRANT CONNECT` / schema `USAGE` your local docker init grants. **Mirror whatever creates `app_user` locally** so the environments match. The numbered migrations handle table-level GRANTs and RLS policies, but the **role must exist first**.
3. **Set app env / secrets** (App Platform → app settings):
   - `DATABASE_URL` — owner, **direct** connection
   - `APP_DATABASE_URL` — `app_user`, **direct** connection
   - `AUTH0_*` — **web only** (the worker env schema excludes these as of I11)
   - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
   - `RESEARCH_MODE` (`demo` for the public demo; `live` only for internal testing), `AI_MODE`, `EMBEDDING_MODE`
4. **Deploy.** The **pre-deploy migrate job** applies the Drizzle app migrations; the **worker migrates the Graphile schema on boot** (I11 runs `migrate()` before `run()`).
5. **Seed once** — see _Running seed / embed on DO_ below.

After this the app is live with the full demo schema **and** data.

---

## The deploy pipeline (ongoing schema)

Add a `PRE_DEPLOY` job component to `.do/app.yaml` whose run command applies the Drizzle migrations on the owner connection. _(Wired in I13.)_

- Every push → **migrate (pre-deploy) → roll out** web + worker on the new schema.
- **Idempotent**: a no-op when nothing is pending; applies only new migrations otherwise.
- Schema is always in lockstep with the deployed code. Once this exists you stop thinking about schema deployment.
- Only the **app** schema needs the pre-deploy job; the worker self-migrates the **Graphile** schema on boot.

---

## Seeding & reset (ongoing)

Seed is **never** in the pipeline. Three deliberate operations:

- **Initial seed** — once, at setup (step 5).
- **Refresh** — re-run the idempotent `seed` (+ `embed`) to update the canonical demo rows. **Safe**: it upserts/reconciles, so no duplicates. Does **not** remove data created ad hoc through the UI.
- **Reset to pristine demo** — wipe + reseed. A managed DB can't be `down -v`'d, so this is a **truncate-and-reseed** operation (`packages/db/src/reset.ts`). It is **guarded by three independent conditions that must ALL hold**, so it is impossible to fire by accident:
  1. `ALLOW_DESTRUCTIVE_RESET=true` in the environment (set app-level in `.do/app.yaml` for the demo app; never set it on a database holding real data),
  2. `RESEARCH_MODE` is **not** `live` (live mode implies real OSINT data — the reset refuses), and
  3. the process is invoked with an explicit `--confirm` flag.

  Run it locally or from a DO Console shell (web or worker component, which already carries the env):

  ```bash
  ALLOW_DESTRUCTIVE_RESET=true RESEARCH_MODE=demo \
    pnpm --filter @95forward/db reset --confirm
  ```

  It truncates every tenant-scoped table (the set is derived dynamically from the live DB, so a new table can never be silently missed), clears the Graphile job queue, and re-runs the idempotent seed — restoring the pristine Water For People demo. After a reset, re-run `embed` if you need live/mock embeddings repopulated.

Refresh updates canonical rows and leaves ad-hoc data; reset gives a clean slate.

---

## Demo AI configuration

The deployed demo runs **`AI_MODE=live` + `EMBEDDING_MODE=live` + `RESEARCH_MODE=demo`** (set on both the web and worker components in `.do/app.yaml`):

- **`AI_MODE=live`** — real model reasoning (copilot drafts, QPI rationale). Requires `ANTHROPIC_API_KEY`.
- **`EMBEDDING_MODE=live`** — real embeddings for hybrid retrieval. Requires `OPENAI_API_KEY`. Run `embed` once after the first seed to populate the vector columns.
- **`RESEARCH_MODE=demo`** — research/discovery operate on **seeded** data only. This is a deliberate **responsible-AI guardrail**: live OSINT on real individuals is forbidden in the demo. Keep this `demo` even in production; do not flip it to `live`.

CI and the Playwright suite stay **key-free** — they run entirely on `mock`/`demo` providers (no paid calls, no secrets). Only the deployed demo uses live keys.

`databases.production: false` in `.do/app.yaml` is **intentional**: the demo database is disposable (reproducible from seed), keeping it on the dev tier avoids managed-DB cost/locks and is what makes the guarded reset safe to offer.

---

## Running seed / embed on DO

Concrete options, simplest first:

1. **From your machine against the prod DB (easiest for the initial seed).** Add your IP to the DB's **trusted sources**, then run the seed/embed locally pointed at the prod connection strings:
   ```bash
   DATABASE_URL='<prod-owner-uri>' \
   APP_DATABASE_URL='<prod-app_user-uri>' \
   OPENAI_API_KEY='<key>' \
   pnpm --filter @95forward/db seed && pnpm --filter @95forward/ai embed
   ```
   (SSL is required; the DO connection string includes `sslmode=require`.) Remove your IP from trusted sources afterward if you prefer.
2. **App Platform Console tab (ad hoc, in-container).** Open a console into the **web** (or **worker**) component and run the same `seed` / `embed` commands there — it already has the env vars. Requires the seed/embed tooling (drizzle-kit, the scripts, their deps) to be present in the runtime image (i.e. not pruned by a production-only build) — worth confirming when we wire the build.
3. **A triggerable Job component (cleanest repeatable path).** Wire a job in `.do/app.yaml` whose command is the seed/embed (or the I13 reset tool) and trigger it on demand from the dashboard / `doctl`. Pairs naturally with the I13 reset mechanism. _(Recommended once I13 lands.)_

> **On a DigitalOcean MCP server:** if/when one is available, it could let an assistant _trigger_ these for you. But running commands against a live database is an action that needs **explicit, per-action confirmation**, and an assistant can't enter credentials/secrets itself. Treat an MCP as a convenience for triggering a **guarded, pre-built** operation (e.g. the I13 reset tool), not for ad-hoc prod surgery.

---

## Migration discipline (going forward)

- **Migrations are the only way schema changes** — never hand-edit the DO schema. Once a migration is merged, treat it as **immutable**; new changes are new migration files.
- **Additive-first (expand → migrate data → contract).** This matters the moment prod holds data you can't regenerate. Today all demo data is reproducible from seed, so destructive migrations are low-risk (the `asks.frame` drop in I10 was safe for exactly this reason). Adopt the discipline before the demo ever holds anything precious.
- The **same migration files run locally and on DO** — that is what guarantees parity.

---

## Known cosmetic deferrals (intentionally left)

These are non-blocking polish items knowingly deferred after I13; none affect the demo click-path or correctness:

- **"Overdue by 1h" follow-up label** — relative-time copy is coarse near the boundary; acceptable for the demo.
- **`completedOnTime` metric naming** — internal field name reads awkwardly in code; the UI label is fine.
- **`bigint` cents annotation** — amounts are stored/handled as integer cents; no precision risk at demo scale.
- **`Avatar` `<img>`** — uses a plain `<img>` (one ESLint `next/image` warning, 0 errors); intentional for the tiny static avatars.
- **Webpack "Critical dependency" build warnings** — emitted by `graphile-worker` / `auth0` dynamic requires; benign and upstream.

---

## Gotchas

- **`app_user` must exist before migrations.** One-time bootstrap per environment (you don't want a prod password baked into a committed migration).
- **pgvector** must be enabled by the owner; confirm availability for your PG version.
- **Connection pooling.** For the demo, use **direct connections everywhere and skip PgBouncer** — fewer moving parts. If you add the pooler later: the web app may use it, but the **worker (Graphile: LISTEN/NOTIFY + session locks) and the migrate job must stay on a direct connection**, and confirm **`withTenant` sets the tenant via `SET LOCAL` inside a transaction** — a session-level `SET` would leak the tenant across pooled connections and silently break RLS. (A quick one-line check regardless, since RLS is load-bearing.)
- **Connection limits.** Small managed plans have low limits; watch web + worker instance counts. Revisit pooling only if you hit them.

---

## Local ↔ DO parity

| Operation        | Local                                                                    | DigitalOcean                                                                                                           |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Apply app schema | `pnpm db:migrate`                                                        | `PRE_DEPLOY` migrate job (automatic on deploy)                                                                         |
| Graphile schema  | `worker migrate:jobs` / on boot                                          | worker migrates on boot                                                                                                |
| Seed + embed     | `pnpm --filter @95forward/db seed && pnpm --filter @95forward/ai embed`  | manual (machine→prod, Console, or Job)                                                                                 |
| Reset to clean   | `docker compose down -v` → migrate → seed → embed (or the guarded reset) | guarded reset: `ALLOW_DESTRUCTIVE_RESET=true RESEARCH_MODE=demo pnpm --filter @95forward/db reset --confirm` (Console) |

---

## Command reference (canonical local sequence)

```bash
docker compose down -v && pnpm db:up && pnpm db:wait && pnpm db:migrate
pnpm --filter @95forward/worker migrate:jobs        # install graphile schema
pnpm --filter @95forward/db seed && pnpm --filter @95forward/ai embed
pnpm dev                                            # web :3000 + worker
```

On DO the first two lines become the pre-deploy job + worker-boot migrate; the seed line is run deliberately (see above).

---

## Live AI smoke (operator — run once with real keys)

CI and the test suites never touch live providers, so the **operator** verifies live AI once, after supplying the keys. Run from a machine pointed at the demo DB (or a DO Console shell):

1. **Live embeddings (OpenAI).** Re-embed the seed against the live provider and confirm it completes without error:
   ```bash
   AI_MODE=live EMBEDDING_MODE=live \
   OPENAI_API_KEY='<key>' ANTHROPIC_API_KEY='<key>' \
   DATABASE_URL='<prod-owner-uri>' \
     pnpm --filter @95forward/ai embed -- --force
   ```
   A clean run means the live embedding provider authenticated and wrote vectors for every seeded constituent / KB entry / interaction.
2. **Live reasoning (Anthropic).** With `AI_MODE=live` on the deployed web app, open **`/95-forward/copilot-lab`** (non-prod harness) or ask the copilot to draft a KB/strategy field on a prospect, and confirm a real grounded suggestion returns. If the model key is missing or wrong, the env schema rejects boot (live mode requires the key), so a green deploy already proves the key is present and valid.

If keys are not yet available, the demo still runs on `mock`/`demo` — but the live smoke must be completed before presenting the live-AI configuration.

---

## Pre-demo checklist (night-before sanity)

- Deploy is green and the **pre-deploy migrate job succeeded** (latest migrations applied on DO).
- **`RESEARCH_MODE=demo`** on the deployed app (not `live`) — the demo uses **fictional seeded candidates only** (the I12 responsible-AI guardrail).
- **Live AI smoke done** (above) — embeddings re-embed cleanly with `EMBEDDING_MODE=live`; the copilot returns a real suggestion with `AI_MODE=live`.
- Demo data present / refreshed — run the guarded reset if you want a pristine slate (`ALLOW_DESTRUCTIVE_RESET=true RESEARCH_MODE=demo pnpm --filter @95forward/db reset --confirm`).
- **Auth0 callback / logout URLs** include the deployed domain.
- A smoke pass of the full demo click-path against the deployed URL.

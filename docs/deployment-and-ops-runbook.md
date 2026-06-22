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
- **Reset to pristine demo** — wipe + reseed. A managed DB can't be `down -v`'d, so this is a **truncate-and-reseed** operation. This is the **I13 seed/reset mechanism**, which must be **environment-aware and guarded**: runnable against DO, but unable to fire by accident (e.g. requires an explicit confirm/flag and refuses on a DB not tagged as a demo).

Refresh updates canonical rows and leaves ad-hoc data; reset gives a clean slate.

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

## Gotchas

- **`app_user` must exist before migrations.** One-time bootstrap per environment (you don't want a prod password baked into a committed migration).
- **pgvector** must be enabled by the owner; confirm availability for your PG version.
- **Connection pooling.** For the demo, use **direct connections everywhere and skip PgBouncer** — fewer moving parts. If you add the pooler later: the web app may use it, but the **worker (Graphile: LISTEN/NOTIFY + session locks) and the migrate job must stay on a direct connection**, and confirm **`withTenant` sets the tenant via `SET LOCAL` inside a transaction** — a session-level `SET` would leak the tenant across pooled connections and silently break RLS. (A quick one-line check regardless, since RLS is load-bearing.)
- **Connection limits.** Small managed plans have low limits; watch web + worker instance counts. Revisit pooling only if you hit them.

---

## Local ↔ DO parity

| Operation        | Local                                                                   | DigitalOcean                                   |
| ---------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Apply app schema | `pnpm db:migrate`                                                       | `PRE_DEPLOY` migrate job (automatic on deploy) |
| Graphile schema  | `worker migrate:jobs` / on boot                                         | worker migrates on boot                        |
| Seed + embed     | `pnpm --filter @95forward/db seed && pnpm --filter @95forward/ai embed` | manual (machine→prod, Console, or Job)         |
| Reset to clean   | `docker compose down -v` → migrate → seed → embed                       | I13 reset tool (truncate + reseed), guarded    |

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

## Pre-demo checklist (night-before sanity)

- Deploy is green and the **pre-deploy migrate job succeeded** (latest migrations applied on DO).
- **`RESEARCH_MODE=demo`** on the deployed app (not `live`) — the demo uses **fictional seeded candidates only** (the I12 responsible-AI guardrail).
- Demo data present / refreshed — run the reset tool if you want a pristine slate.
- **Auth0 callback / logout URLs** include the deployed domain.
- A smoke pass of the full demo click-path against the deployed URL.

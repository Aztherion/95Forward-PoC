# 95 Forward — PoC

An opinionated, AI-guided **major-gifts workspace** for nonprofit fundraising, embedded as an
add-on inside a thin host CRM called **Keystone CRM** (a stand-in for Raiser's Edge NXT). The
demo customer org is **Water For People**.

**Initiatives 0–2 are complete:** the monorepo + design system + app shell + infra/CI/test
harness (I0); Auth0 auth + the full tenant-scoped relational schema + seed (I1); and the **host
CRM records core** — Constituents, Revenue/Gifts, Funds/Campaigns/Appeals, Lists, and the Home
dashboard — with real CRUD on real Water-For-People-shaped data, enforced by Postgres Row-Level
Security (I2). The 95 Forward product and the remaining host modules (Major Giving, Analysis,
Marketing, Events, Volunteers, Memberships) are still placeholders; later initiatives build them
on this base.

## What's built

- **Monorepo** (I0): pnpm + Turborepo (Node 22, TS strict); `apps/web` (Next.js App Router,
  design system, app shell, the two emphasis registers, `/styleguide`); `apps/worker` (NestJS
  `/health` scaffold); `packages/shared` (Zod env + types + form validation); `packages/db`
  (Drizzle + pgvector); docker-compose, GitHub Actions CI, DigitalOcean spec.
- **Auth & data backbone** (I1): Auth0 (App Router), the complete relational schema with
  `tenant_id` on every table, the tenancy helpers, and the seed (Water For People + 3 users).
- **Host CRM records core** (I2): Constituents (list + record + full CRUD + saved views),
  Revenue/Gifts (list + record/edit, simulated receipting), Funds/Campaigns/Appeals management,
  Lists (saved filter builder), and the Home dashboard (live tiles + a deliberately opaque
  "major-gift likelihood" foil). Tenant isolation for every read/write — **including JOINs** — is
  enforced by Postgres RLS (see "Database, schema & tenancy").

**Still placeholders / out of scope:** the 95 Forward product (I6+), host Major Giving + Analysis
(I3), Marketing + Events (I4), Volunteers + Memberships (I5), the editable Settings page (I7),
background jobs (I11), AI / embeddings (I6).

## Tech stack

| Area        | Choice                                              |
| ----------- | --------------------------------------------------- |
| Monorepo    | pnpm workspaces + Turborepo                         |
| Runtime     | Node 22 LTS                                         |
| Web         | Next.js 15 (App Router), React 19, TypeScript       |
| Worker      | NestJS 11, TypeScript                               |
| Database    | PostgreSQL 16 + pgvector, Drizzle ORM + drizzle-kit |
| Shared      | TypeScript types + Zod (env schema)                 |
| Styling     | Design-system tokens (CSS variables), Lucide icons  |
| Unit test   | Vitest                                              |
| E2E test    | Playwright (authored/run with the Playwright skill) |
| Lint/format | ESLint (flat) + Prettier                            |
| CI          | GitHub Actions                                      |
| Deploy      | DigitalOcean App Platform (`.do/app.yaml`)          |

## Repository structure

```
.
├── apps/
│   ├── web/                      # Next.js App Router app (design system + shell + placeholders)
│   │   ├── src/app/              # routes: (host)/* and 95-forward/* + /styleguide
│   │   ├── src/components/ds/    # design-system primitives (ported from the handoff)
│   │   ├── src/components/shell/ # AppShell, Sidebar, Topbar, nav.ts (single source of nav order)
│   │   ├── src/styles/           # ported tokens + register.css + ds.css
│   │   ├── src/lib/auth.ts       # getCurrentUser() stub (Dana Reese) — I1 replaces with Auth0
│   │   └── e2e/                  # Playwright specs
│   └── worker/                   # NestJS scaffold (boots + /health)
├── packages/
│   ├── shared/                   # @95forward/shared — Zod env schema, resolveRegister, types
│   └── db/                       # @95forward/db — Drizzle client, migrate runner, pgvector migration
├── 95-forward-design-system-handoff/  # authoritative design handoff (read-only source of truth)
├── .opencode/skills/95-forward-design/ # the design system added as an opencode skill
├── .do/app.yaml                  # DigitalOcean App Platform spec
├── docker-compose.yml            # local Postgres + pgvector
├── turbo.json, tsconfig.base.json, eslint.config.mjs, .prettierrc.json
└── .env.example
```

## Prerequisites

- **Node 22** (`nvm use` reads `.nvmrc`).
- **pnpm 9.15.4** — enable via Corepack: `corepack enable && corepack prepare pnpm@9.15.4 --activate`.
- **Docker** (for local Postgres + pgvector).

## Quick start

```bash
# 1. Install dependencies
corepack enable
pnpm install

# 2. Create your env file
cp .env.example .env

# 3. Start Postgres + pgvector, migrate, and seed
pnpm db:up                          # docker compose up -d
pnpm db:wait                        # waits until Postgres accepts connections
pnpm db:migrate                     # enables pgvector + creates the schema
pnpm --filter @95forward/db seed    # Water For People tenant + the three users

# 4. Run the apps (web on :3000, worker on :3001)
pnpm dev
```

For local development without a live Auth0 tenant, set `AUTH_DEV_LOGIN=true` in `.env` and use the
gated dev-login seam (see Authentication below). Production requires real Auth0 credentials.

Open <http://localhost:3000> for the app and <http://localhost:3000/styleguide> for the design
gallery. The worker health check is at <http://localhost:3001/health>.

> Make sure `.env` is populated (and exported into your shell, or use a dotenv runner) before
> `pnpm dev`. The host CRM now reads/writes the database at runtime, so the web app needs both
> `DATABASE_URL` and `APP_DATABASE_URL` and an up-to-date, seeded database (`pnpm db:migrate` then
> `pnpm --filter @95forward/db seed`). The worker validates its env on boot and requires `DATABASE_URL`.

## Scripts (run from the repo root)

| Script                   | What it does                                            |
| ------------------------ | ------------------------------------------------------- |
| `pnpm dev`               | Run web + worker (and watch the packages) via Turborepo |
| `pnpm build`             | Build every package and app                             |
| `pnpm lint`              | ESLint across the repo (flat config)                    |
| `pnpm typecheck`         | `tsc --noEmit` across every package/app                 |
| `pnpm test`              | Vitest unit tests across the workspace                  |
| `pnpm test:e2e`          | Playwright E2E tests (web)                              |
| `pnpm format`            | Prettier write                                          |
| `pnpm format:check`      | Prettier check                                          |
| `pnpm db:up` / `db:down` | Start / stop the local Postgres+pgvector container      |
| `pnpm db:wait`           | Block until Postgres is ready                           |
| `pnpm db:migrate`        | Run drizzle migrations (enables pgvector)               |
| `pnpm db:generate`       | Generate a new drizzle migration (later initiatives)    |

## The two emphasis registers

The product renders in **two emphasis registers**, driven by route:

- **Host register (quiet/grey)** — the Keystone host chrome and host routes (`/`, `/constituents`,
  `/revenue`, `/major-giving`, `/lists`, `/marketing`, `/events`, `/volunteers`, `/memberships`,
  `/analysis`, `/settings`). Muted ink accents; deliberately recessive.
- **95 Forward register (alive/full-color)** — the `/95-forward/*` routes. The full "Altitude"
  palette (horizon blue, dawn gold, sage, reserved iris).

The route's register is resolved by `resolveRegister(pathname)` in `@95forward/shared` and applied
by route-group layouts (`app/(host)/layout.tsx` vs `app/95-forward/layout.tsx`), which set
`data-register="host" | "95-forward"` on the shell root. `apps/web/src/styles/register.css` maps the
`--reg-*` semantic variables per register.

## Design system

The authoritative design system lives in `95-forward-design-system-handoff/` (read-only). Its tokens
(color, type, spacing, elevation, motion) are ported verbatim into `apps/web/src/styles/`, and the
component primitives are implemented in `apps/web/src/components/ds/`. **Do not invent design
tokens** — implement what the handoff defines; where this README and the handoff differ on a design
specific, the handoff wins.

The handoff `SKILL.md` is added as an opencode skill at
`.opencode/skills/95-forward-design/SKILL.md` (name `95-forward-design`); load it for all UI work in
this and later initiatives.

## Database, schema & tenancy

Local Postgres uses the `pgvector/pgvector:pg16` image. Migrations live in `packages/db/drizzle/`:
`0000` enables pgvector; `0001` creates the full schema; `0002`/`0003` add integrity constraints,
the host foil + archive columns, and the `saved_lists` table; **`0004` enables Row-Level Security**.
**Every table carries a NOT NULL `tenant_id` FK to `tenants`**, plus `created_at`/`updated_at`. Apply
with `pnpm db:migrate` (idempotent); seed Water For People + the three users + a realistic records-core
dataset with `pnpm --filter @95forward/db seed` (idempotent).

**Tenant scoping is enforced by Postgres RLS.** Two database roles:

- **Owner** (`DATABASE_URL`, `forward`) — runs migrate/seed and the `getCurrentUser()` auth lookup;
  bypasses RLS.
- **App** (`APP_DATABASE_URL`, `app_user`, non-superuser) — used by **all feature data access**;
  subject to RLS.

Migration `0004` creates `app_user` and a `tenant_isolation` policy on every `tenant_id` table.
Feature code wraps queries in `withTenant(getAppDb(), tenantId, (tx) => …)`, which opens a transaction
and `set_config('app.tenant_id', …)`; RLS then filters **every** row the transaction touches — so
JOINs and Drizzle relational (`with: { … }`) queries are auto-scoped and an unscoped JOIN is impossible.
`tenantId` always comes from `getCurrentUser()`, never from user input. Feature reads live in
`apps/web/src/server/data/*` and mutations (Server Actions, Zod-validated via `@95forward/shared`) in
`apps/web/src/server/actions/*`. Isolation is proven by `packages/db/src/rls-isolation.test.ts` (and
the app-layer helper by `tenancy.test.ts`).

## Authentication (Auth0)

Auth is the official **`@auth0/nextjs-auth0` v4** SDK (App Router). `apps/web/src/middleware.ts`
mounts the `/auth/*` routes and redirects unauthenticated requests to `/login`. On a request,
`getCurrentUser()` (server-only) reads the Auth0 session, resolves the **email** to a local `users`
row (yielding the user's `role` and `tenant_id`), and links `auth0_subject` on first login. The
shell's user chip shows the real signed-in user.

**Auth0 setup (one-time).** In the Auth0 dashboard create a **Regular Web Application** and set:

- Allowed Callback URLs: `http://localhost:3000/auth/callback` (and your deployed URL).
- Allowed Logout URLs: `http://localhost:3000` (and your deployed URL).
- Create three test users whose emails match the seed: `dana.reese@waterforpeople.org`,
  `priya.nair@waterforpeople.org`, `ruth.castellanos@waterforpeople.org`.
- Put `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`
  (`openssl rand -hex 32`), and `APP_BASE_URL` in `.env` (see `.env.example`).

**Dev/test login (no live Auth0 needed).** When `AUTH_DEV_LOGIN=true` and `NODE_ENV != production`,
`POST /api/test-login` mints a session cookie for a seeded email. This is how local dev and the
Playwright suite authenticate deterministically; it is disabled in production.

## Testing

- **Unit (Vitest):** `pnpm test`. Covers the Zod env + form-validation schemas, the register helper,
  roles/QPI defaults (`packages/shared`); **RLS tenant isolation on JOINs**, the app-layer tenancy
  helper, and seed correctness (`packages/db` — run against a migrated DB; the RLS suite connects as
  `app_user` and skips with a warning if `APP_DATABASE_URL` is unreachable); the host CRM list/format
  helpers + nav contract (`apps/web`); and the worker health logic.
- **E2E (Playwright):** `pnpm --filter @95forward/web test:e2e` (requires the DB up, migrated, and
  seeded). Authored/run with the Playwright skill. Covers the **auth flow** (redirect/login/logout/
  protected routes), the shell/register behavior, the `/styleguide` gallery, and the **host CRM
  workflows**: browse/filter/search constituents + save a view, the constituent record (giving
  history, relationships, actions, tags, the opaque foil), create/edit a constituent, record a gift
  and see it appear on the donor + the gifts list, build/save/run a list, and the Home dashboard.

CI (`.github/workflows/ci.yml`) runs install → build → lint → typecheck → **DB migrate + seed** →
unit tests → Playwright E2E (against a Postgres service; auth uses the dev-login seam, no live Auth0).

## Environment variables

See `.env.example`. **Required:** `DATABASE_URL` (owner role — migrate/seed/auth),
**`APP_DATABASE_URL`** (the `app_user` role used by all RLS-scoped feature data access), and the
Auth0 vars (`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL`).
Also used: `NODE_ENV`, `APP_ENV`, `LOG_LEVEL`, `WORKER_PORT`, `AUTH_DEV_LOGIN` (dev/test only), and the
`NEXT_PUBLIC_*` web vars. `DATABASE_URL`/Auth0 are validated in `packages/shared/src/env.ts`;
`APP_DATABASE_URL` is read directly by the web app's data layer. Placeholders for later initiatives
(AI in I6, jobs in I11) remain documented in `.env.example`.

## Deployment (DigitalOcean App Platform)

`.do/app.yaml` defines a **web** service, a **worker** service, a **managed Postgres** database, and
a `PRE_DEPLOY` migration job. Before deploying, set `github.repo`, adjust `region`/instance sizes,
and confirm the managed database allows the `vector` extension. Deploy with:

```bash
doctl apps create --spec .do/app.yaml
```

`DATABASE_URL` is wired from the managed database (`${forward-db.DATABASE_URL}`); the pre-deploy job
runs the pgvector migration before each release.

# Demo runbook

**Two commands before a demo, and one document if something looks wrong.**

This covers the deployed DigitalOcean instance. For architecture, roles and one-time setup see
`docs/deployment-and-ops-runbook.md`; for what is knowingly broken or deferred see
`docs/known-issues.md`.

---

## The short version

```bash
# 1. Restore pristine demo state (destructive — truncates and reseeds)
ALLOW_DESTRUCTIVE_RESET=true RESEARCH_MODE=demo \
  pnpm --filter @95forward/db reset --confirm

# 2. Check the numbers tie
pnpm --filter @95forward/db verify
```

Run both from a **DigitalOcean Console shell** on the `web` or `worker` component, which already
carries `DATABASE_URL`, `APP_DATABASE_URL` and `ALLOW_DESTRUCTIVE_RESET`. `verify` also runs from a
laptop with `DATABASE_URL` pointed at the deployed database.

`verify` exits non-zero if any invariant fails, so it can gate a step.

---

## Before a demo

### 1. Reset

Do this **after** anyone has clicked around, not before — the reset is what returns the portfolio
to the state the story is written about.

```bash
ALLOW_DESTRUCTIVE_RESET=true RESEARCH_MODE=demo \
  pnpm --filter @95forward/db reset --confirm
```

It truncates every tenant-scoped table — the set is derived from the **live** database, so a table
added later can never be silently missed — clears the job queue, and re-runs the idempotent seed.

**Four guards, all of which must hold.** It is meant to be hard to fire by accident:

| Guard                                       | What it establishes                              |
| ------------------------------------------- | ------------------------------------------------ |
| `ALLOW_DESTRUCTIVE_RESET=true`              | this environment is a disposable demo            |
| `RESEARCH_MODE` ≠ `live`                    | this database holds no live OSINT on real people |
| `--confirm` on the command line             | a human typed it, not a script or a cron         |
| `DEMO_DATABASE_NAME` matches `DATABASE_URL` | **which** database — see below                   |

The fourth was added in D1 and closes the gap the other three leave. They say _some_ database may
be reset; they say nothing about _which_. An operator with a Console shell open here and a
`DATABASE_URL` from somewhere else exported in their own shell satisfies all three. Set
`DEMO_DATABASE_NAME` to the demo database's name in `.do/app.yaml` and the reset refuses to run
anywhere else, naming both databases so you can see which shell is wrong.

Running it twice produces the same state. The seed upserts on stable ids.

> If you only want to refresh canonical rows without losing anything a stakeholder created, run
> `pnpm --filter @95forward/db seed` instead. It is idempotent and non-destructive.

### 2. Verify

```bash
pnpm --filter @95forward/db verify
```

Prints the tie-out at **both** scopes side by side, the straddle verdict, and I30's six invariants.

It uses the same arithmetic as the app — `checkInvariants` in `@95forward/shared` — rather than a
second definition of "the numbers tie", which is the drift this codebase spends its life avoiding.

### 3. Expected figures

After a clean reset, `verify` should print:

|                    |              ALL |       Dana Reese |
| ------------------ | ---------------: | ---------------: |
| goal               | $2,700,000 (org) | $1,600,000 (rep) |
| won                |         $469,200 |         $291,200 |
| qualified asks     |       $1,720,000 |         $925,000 |
| pre-close total    |       $3,708,000 |       $2,163,000 |
| basis (goal − won) |       $2,230,800 |       $1,308,800 |
| coverage           |            0.77× |            0.71× |
| coverage gap       |      −$4,972,400 |      −$3,001,400 |
| BMW best           |       $2,839,200 |       $1,721,200 |
| BMW most likely    |       $2,429,200 |       $1,496,200 |
| BMW worst          |       $1,764,200 |         $881,200 |
| queue items        |                7 |                7 |
| below cut          |     9 · $540,000 |     5 · $260,000 |
| fix-first findings |                3 |                1 |
| scenario badges    |                4 |                4 |

**Both scopes straddle**: best reaches the goal, most likely falls short. The demo runs as Dana, so
hers is the one that matters — before D1 she carried the org's $2,700,000 goal against a $1.72M
best case, and the only screen a stakeholder ever saw said _even flawless execution misses by a
million_.

If a figure differs, something has been edited through the UI and not reset. If the _shape_
differs — a scope that no longer straddles, a missing scenario badge — the seed has changed and
the goldens need re-checking.

---

## The story, in six beats

Run as **Dana Reese** at **1280×800**.

| #   | Beat                            | Where                                     | What it says                                                                           |
| --- | ------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Goal and gap                    | The Board                                 | $925,000 qualified · 0.71× coverage against a 3× rule · gap −$3,001,400                |
| 2   | What is actually qualified      | Forecast Room → stage board               | $2,163,000 pre-close, of which $925,000 is qualified                                   |
| 3   | Who can close it, by name       | Forecast Room → names ledger              | 16 named opportunities, all four scenario badges, _"Most likely lands $103,800 short"_ |
| 4   | What to do next                 | The Board → a queue card's primary action | a drafted artifact, grounded in the record, that the product will not send             |
| 5   | Whether it moved                | Hallworth's detail                        | 81 days silent · close date moved 3× · **all three moves were made by us**             |
| 6   | _"What if we qualified these?"_ | Forecast Room → **Explore a what-if**     | qualified asks +$320,000, coverage 0.71× → 0.95×, **most likely unchanged**            |

**Beat 6 is the strongest single moment.** Qualifying the best-only asks moves what you can
_claim_ and not what will _happen_, because the simulation already includes unqualified deals — an
unqualified ask can still close. The most-likely curve staying completely still while the coverage
ratio jumps is the methodology arguing for itself. It is pinned by a test
(`e2e/what-if.spec.ts` → _"qualifying the best-only asks moves the CLAIM and not the FORECAST"_)
precisely because a future change could break it without looking wrong.

---

## If something looks wrong

**Every relative figure is wrong by the same amount** — the clock. The app computes "today" from
`DEMO_TODAY` (`2026-09-12`), which must match the seed's anchor. Check it is set on both the `web`
and `worker` components. A malformed value fails at boot rather than silently reverting to wall
time; an _absent_ one falls back to the compiled-in constant, which is also `2026-09-12`.

**The war room is empty** — the login resolved to a tenant with no data. RLS means a user in the
wrong tenant sees a working product with nothing in it. Check the Auth0 user's email matches a
seeded user (`dana.reese@waterforpeople.org`).

**Drafts are slow, or a draft says something surprising** — `AI_MODE` should be `mock`. The fixture
drafts are composed from the record in front of them, so they are what you want on screen anyway,
and they cannot invent a fact mid-demo.

**A number disagrees between two screens** — run `verify`. If it passes, the data ties and the
disagreement is a rendering bug; if it fails, it names the invariant and prints the arithmetic.

---

## What the operator must run, and what is already verified

`verify` and `reset` are **verified locally** against a production-shaped path: the same code,
the same guards, a real Postgres. Nothing in this repository has reached the deployed instance from
here.

**The operator runs, against the deployed database:**

1. Set `DEMO_DATABASE_NAME` in `.do/app.yaml` to the demo database's name and redeploy (it is
   `REPLACE_ME_WITH_THE_DEMO_DB_NAME` until then, which leaves the fourth guard inactive — the
   other three still hold).
2. Confirm `DEMO_TODAY=2026-09-12` and `AI_MODE=mock` took effect on both components.
3. Open a Console shell and run the reset, then `verify`.
4. Check the six beats in a browser at 1280×800.

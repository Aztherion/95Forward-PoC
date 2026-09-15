# Known issues, deferrals and accepted trade-offs

**95 Forward · proof of concept.** Written at the close of I30, the last initiative in the build
plan. This is the document for the go/no-go conversation: everything below was found deliberately,
recorded deliberately, and left alone deliberately.

It is meant to be readable by someone who has not followed the build. Where a decision looks odd,
the reason is stated rather than assumed.

**Nothing here is a surprise, and nothing here is unknown.** The point of the list is that the
things we chose not to do are written down in the same place as the things that are broken.

---

## 1. Live defects

Things that are wrong today. None of them blocks a demo; all of them would need fixing before real
users.

### 1.1 `pg` DeprecationWarning on every page that loads a snapshot

> `(node:NNNN) DeprecationWarning: Calling client.query() when the client is already executing a
query is deprecated and will be removed in pg@9.0.`

Process-level, pre-existing, and visible in the dev overlay as an "issue" badge. It fires on The
Board, the Forecast Room and the Opportunities grid — every screen that loads a metrics snapshot —
and **not** on screens that do not. It is a warning, not an error: nothing misbehaves.

**Why it is not fixed:** it predates the war-room work and lives in how the shared connection pool
is driven, which is inside the tenancy helper — the safety boundary `AGENTS.md` says not to touch
for a routine fix. It needs its own change with its own review.

**Impact if ignored:** cosmetic now; a hard error on the day the project takes `pg@9`.

### 1.2 Two prospect screens still read wall time

`apps/web/src/app/95-forward/prospects/page.tsx` (`pickNextMove`) and `.../prospects/[id]/page.tsx`
(`relativeDate`) default their `now` to `new Date()`, so "3 days ago" on those screens is measured
from the real date while every seeded write is stamped **2026-09-12**. The gap grows by a day
every day.

I30 fixed the Green Sheet and the what-if chart divider; **D1 fixed the two that could write or
mislead** — `debriefVisit`, which stamped `occurred_at` and the 24-hour follow-up SLA with wall
time, and the follow-up heartbeat that read it back (§4.5). These two remain because they are
display-only, on the pre-I18 prospect-centric screens the six-surface product does not lead with.

**Impact if ignored:** relative dates on two secondary screens drift further from the demo's
arithmetic the longer the PoC sits. They are reachable from the demo nav, so a stakeholder who
wanders there sees dates that disagree with every other screen. **Decision for the demo walk: they
are not on the route, and the drift is currently three days.** Worth fixing before any demo more
than a month out.

### 1.3 Running `pnpm test` straight after `pnpm test:e2e` fails one assertion

`seed.test.ts` → _"seeds logged hours that roll up per volunteer and per opportunity"_ expects 18
hours and finds 21.5. The extra 3.5 are what `volunteers.spec.ts` logs through the UI. `seed()` is
idempotent for counts but does not remove rows the e2e suite added, so the unit suite reads a
mutated database.

**Not a regression, and not something to "fix" by loosening the assertion.** Reset first:

```
ALLOW_DESTRUCTIVE_RESET=true pnpm --filter @95forward/db reset --confirm
```

---

## 2. Deferred features

Decided against for the PoC, with a home if the project continues.

### 2.1 Creating an opportunity has no home anywhere in the product

The largest gap on the list. You can edit eight fields of an opportunity on the grid, confirm its
milestones on the detail screen, draft its next action and simulate its future — but there is no
screen in 95 Forward that creates one. The seed makes them; a user cannot.

I29 considered and refused the obvious home: _"DO NOT create new opportunities or delete existing
opportunities… even in the real PoC, this is not the place to delete or create"_ — creation and
deletion carry consequences a grid cell cannot express. That refusal was right and it left the gap
open.

**It deserves its own initiative**, because creation is where the qualification model gets its
first values and where a bad default would propagate everywhere.

### 2.2 A commit path from the what-if sandbox

I31's sandbox writes nothing, structurally — there is no code path from a hypothesis to the
database, which is what makes the guarantee unbreakable rather than merely followed. A user who
likes what they see leaves the mode and makes the changes normally, where every per-edit guard
applies.

A commit path may be worth adding once the sandbox is trusted and the shape of real use is clear.
It would be its own initiative, with its own review of the guards it has to respect — the
close-date prospect-confirmed question and the milestone `confirmedBy` requirement, both of which a
bulk apply could trivially bypass.

### 2.3 Saved or named what-ifs

What-ifs are session-only by design: a reload clears them, because state that survives a reload is
state that can be mistaken for real. Named scenarios are a genuine feature and a genuine scope.

### 2.4 `All reps` / `Team` views, shipped hidden

The toggles exist in the UI and are disabled. They were never designed, and improvising a leader
view would be inventing a screen nobody specified. Shipping them visible-but-empty would be worse
than shipping them off.

The Green Sheet is the exception — it _does_ have a working Team scope, gated by role.

### 2.5 `amount_note` is not editable in the grid

The model carries the qualifier that makes a figure legible — Hallworth's $250,000 is _"over three
years"_ — and the grid's amount column shows only `$250,000`. It is tracked in the event log and
editable nowhere.

Left out because a note is prose and a grid cell is not the place to edit prose. A real, small loss
of fidelity.

### 2.6 Gift-level reconciliation against opportunity-derived `won`

`won` is derived from opportunities with `status = 'won'`. The host CRM also holds gifts. Nothing
reconciles the two, so a gift recorded in Keystone without a corresponding won opportunity is
invisible to every 95 Forward figure.

Fine for a PoC seeded from one dataset. Not fine against a real CRM.

### 2.7 Document management

Milestones carry a `document_url` and a checkbox. There is no upload, no storage, no viewer. Stated
as out of scope from I18 onward.

---

## 3. Accepted trade-offs

Deliberate, with the reasoning, so nobody "fixes" them by accident.

### 3.1 The CI e2e step is off

Not an oversight. One developer, who runs the full suite locally before every commit; ~290 specs
against a live Postgres on a billed runner is a second execution of a suite that already passed.
The reasoning and the two triggers that would reverse it are recorded inline in `ci.yml` and in
`AGENTS.md`.

**The merge gate is a local full-suite run at `workers: 2` with retries off** — retries off,
because a flaky pass is not green.

### 3.2 Derived columns do not move in the what-if sandbox

With a hypothesis pending, the grid's rank, next action, impact, flags, scenario and group
subtotals still show **baseline** figures, while the chart and metric panel show the hypothesis.

Recomputing them client-side would mean a second implementation of I23's ranking and I19's
qualified predicate living in a browser component — the exact drift this codebase has spent its
life avoiding. I30 marked them `BASELINE` instead, which turns an invisible inconsistency into a
stated one. It is still an inconsistency.

### 3.3 Four progress-bar treatments, three of them inconsistent

Three pre-existing bar implementations clamp differently; I17b's `ProgressBar` is deliberately a
fourth rather than a retrofit of the other three, because converting them was a bigger change than
the initiative that needed one bar.

### 3.4 `.f95-deflist__desc--empty` used as muted text at 41 sites

`.f95-muted` exists and is the right class. The 41 call sites were never converted. Cosmetically
identical; semantically wrong; a pure find-and-replace that nobody has had a reason to spend a PR
on.

### 3.5 `Topbar` emits the page `<h1>`

I26 fixed the double-`<h1>` by letting pages own their heading and passing `heading={false}` to the
topbar — but the topbar can still emit one, and chrome outranking content is semantically backwards
whichever way the flag is set. The right fix is for the topbar never to emit an `h1`; that is a
change to every screen's header.

### 3.6 ~34 remaining I17 inconsistencies and 33 dead tokens

Catalogued in the I17 audit. None is user-visible. The dead tokens are defined and unreferenced;
`css-contract.test.ts` catches _invented_ tokens and _fallbacks on real ones_, which is the failure
that actually bites, but does not fail on an unused definition.

### 3.7 70 `<Link><Button/></Link>` sites and six invalid-ARIA `*Nav` copies

Left alone by design. Both are pre-existing patterns with a lot of call sites and no user-visible
defect; converting them is a mechanical change that would touch most of the app and review as
noise.

### 3.8 The drafter's model predates the current `ModelId` union

`packages/ai` pins `claude-haiku-4-5 | claude-sonnet-4-6 | claude-opus-4-8`, and I28's drafter
defaults to Sonnet 4.6. The union predates the initiative. **Every test and the whole demo run on
`AI_MODE=mock`**, so this affects only a live-mode run, but a live demo would be worth pointing at
a current model first.

### 3.9 The mock suite is not the whole story

The e2e suite runs against the mock AI provider and the dev-login seam. A green suite means the UI
and data flows work deterministically. It does **not** prove live AI behaviour, which is a separate
human-operated gate (see the runbook).

---

## 4. Gaps with no home

Found late, belonging to no initiative.

### 4.1 The Green Sheet was reading the wrong week — fixed in I30

Recorded because of what it says about the class. `getGreenSheetMetrics` defaulted its `now` to
wall time, so "Visits this week" was computed over the real week while the seed is anchored at
2026-09-12. On the day it was found those were different weeks entirely (w/c 7 Sep against w/c 14
Sep) and the panel read **0**. It now reads **1**.

**Nothing caught it** because the test asserted the four labels were present and never asserted a
figure. I30 added the value assertions. The lesson generalises: a panel test that checks labels
proves the panel rendered, not that it is right.

### 4.2 Milestone editing is only on Opportunity Detail

By design — confirming needs `confirmedBy`, `prospectSourced` and evidence, and I26 rejects a
they-said claim with nobody named. But it means bulk qualification work is one record at a time,
which is slow in exactly the moment (sitting with a rep) the grid was built for. The what-if
sandbox can _try_ it in bulk and cannot commit it.

### 4.3 Scenario membership is conditional, and can move for reasons that are not your change

A badge answers "does this deal appear in the trials near the most-likely total". Remove the
largest deal and that total moves, so the neighbourhood is a different set of trials and other
deals' badges can change — even though every random draw is identical (I31 seeds from the
baseline). This is correct and it is surprising. It is asserted as correct in
`forward-simulation.test.ts` so nobody "fixes" it.

### 4.5 The visit debrief stamped wall time — fixed in D1

`debriefVisit` set `occurred_at` and started the 24-hour follow-up SLA from `new Date()`, and no
caller injected a clock. A visit debriefed during a demo therefore landed **days in the future**
relative to everything around it, and the Green Sheet — which D1's predecessor had just corrected
to read the demo's week — could not see it.

Recorded because of the shape: it was a **write** path, so the damage would have persisted in the
database rather than merely rendering oddly, and nothing caught it because no test debriefs a visit
and then reads the date back.

### 4.6 A rep whose goal is not seeded degrades to the no-goal path

Correct behaviour for an absent goal, and the wrong thing to show for a rep who simply was not
seeded one. Before D1 only Dana had a rep goal, so any other rep's Forecast Room rendered "no goal
defined for this view". D1 seeds every rep a goal proportionate to their portfolio, and a test
asserts the rep goals sum to the org goal exactly — but **the model still has no opinion about a
rep added later**, who will silently get the no-goal path.

### 4.4 No test covers the host CRM's own screens beyond smoke

Constituents, Revenue, Lists, Events, Volunteers, Memberships, Marketing and Analysis have a spec
each, mostly asserting the page renders and one interaction works. They are the foil, not the
product, and thin coverage there is a deliberate allocation — but a regression in the host shell
would surface as a 95 Forward bug report.

---

## 5. What would block a go decision

Stated plainly, in order.

1. **Nothing on this list blocks a demo.** The six surfaces work, the numbers reconcile, and the
   invariants suite proves the reconciliation rather than asserting it.
2. **§2.1 (no way to create an opportunity) blocks a pilot**, not a demo. The moment a real user
   wants to put their own deal in, the product has no answer.
3. **§2.6 (no gift reconciliation) blocks anything touching real money.** A figure that silently
   omits gifts recorded in the host CRM is the one class of error this product cannot afford,
   because its entire claim is that its numbers tie out.
4. **§3.8 (model pin) blocks a live-mode demo** until it is pointed at a current model — a
   one-line change, listed so it is not discovered on the day. **D1 set the deployed app to
   `AI_MODE=mock`**, which sidesteps it for the demo entirely.
5. **The fourth reset guard is inactive until an operator fills it in.** `.do/app.yaml` ships
   `DEMO_DATABASE_NAME: REPLACE_ME_WITH_THE_DEMO_DB_NAME`, so the "which database" check does not
   yet apply. The other three guards still hold; this one is the difference between "a demo
   database may be reset" and "_this_ demo database may be reset". Fill it in before anyone with a
   second `DATABASE_URL` in their shell opens a Console.

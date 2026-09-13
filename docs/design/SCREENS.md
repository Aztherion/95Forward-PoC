# 95 Forward — Screen Specifications

Build-facing spec for the three redesigned screens. Companion to the Claude Design export and screenshots in this folder.

**Status:** design closed, not yet built. These screens replace the prospect-centric PoC screens.

---

## How to use this folder

| Artifact | Use it for | Do NOT use it for |
| --- | --- | --- |
| `SCREENS.md` (this file) | The buildable description: anatomy, computed-vs-stored, interactions, copy | — |
| Claude Design HTML export | Exact copy strings, information hierarchy, layout structure, spacing relationships | CSS, class names, markup — never lift these |
| Screenshots | Visual reference while building; compare your build against them | Pixel-matching |
| `docs/design-system.md` | **All** components, tokens, type, color, spacing | — |

**Hard rules**

1. Build with the components and tokens in `docs/design-system.md`. The export is standalone markup with its own styles — if you import from it you bypass the design system and create a second source of truth.
2. **Copy is specified, not suggested.** The strings in the designs took several rounds to land and carry the methodology. Transcribe them exactly from the export. Do not paraphrase, "improve", or regenerate them. Where this file quotes a string, that string is the requirement.
3. If the design and the design system conflict on a visual detail, **the design system wins** — unless you consciously decide otherwise, in which case update `docs/design-system.md` in the same PR.
4. Real name lengths and live numbers will shift layout. Take hierarchy and structure; hold pixel details loosely.

---

## Shared conventions

### The CRM shell (important)

The designs render as a standalone app. **They are not.** 95 Forward is an add-on that lives inside the "Keystone CRM" shell — this is a deliberate product-positioning decision, and the demo depends on it.

- Keep Keystone's own nav sections, visually muted and non-functional.
- The **95 Forward** section holds: The Board · Opportunities · Prospects · Initiatives · Forecast · Green Sheet. This section is the visually active one.
- `Enter visit mode` and the user block sit **inside** the 95 Forward section, not in global chrome.
- Do **not** auto-collapse the Keystone nav on 95 Forward screens — that undoes the "lives inside a CRM" impression.
- **Vertical budget:** if Keystone has a top bar, that height was not accounted for in the designs. The constraint that must survive: on The Board, **item #1 of the queue is visible without scrolling at 1280×800** — not merely at 1440×900.
  _(Amended by I17b, from I24's measurement against the real shell. The header block plus item #1 **fails at 1280×800 by ~66px** and is marginal at 1440×900, and both figures are optimistic: a real queue card runs 160–190px against the 134px floor used, and the Fix-first estimate assumed a two-line analogue where the design specifies 3–4 lines. See "Fix first" below for the fix, which recovers ~210px and clears both viewports on its own. Keystone's 92px topbar stays as it is — trimming the host's chrome works against the argument the shell exists to make.)_
- Add a small number of `Open in Keystone →` links where the boundary is real (full giving history, pledge schedule on opportunity detail). Cheap, and demonstrates the boundary rather than asserting it.

### Naming and vocabulary

Vocabulary consistency is a stakeholder requirement, not a style preference.

- **"The gap"** alone = goal minus expected revenue. Never use it for coverage shortfall.
- **"Coverage gap"** = qualified asks missing to reach the coverage multiple. Always labelled in full.
- **"Qualified asks on the table"** = the headline metric. Never abbreviate.
- **BMW** = Best / Most likely / Worst.
- Stages, in order: `Get the visit` · `Prep the visit` · `Visit & ask` · `Follow up & close` · `Celebrate / steward` · `Repeat`.

### Never display

- **Probability-weighted amounts.** No "$1M × 50% = $500K", no expected-value column, anywhere. A deal closes in full or not at all; ranges come from the simulation. This is a hard methodology constraint.
- **Aggregate forecast-vintage / forecast-reliability charts.** The data accumulates (see event log) but is not surfaced in the PoC. Name-level slippage flags carry that job instead.
- The **debug/parameter bar** visible at the top of the screenshots (`defaultScope`, `coverageMultiple`, `goalAmount`, `weeksLeft`) is Claude Design's harness, not a product feature. `coverageMultiple` belongs in the Rules of Robb layer; goals belong in initiative settings.

### Rule chips

Every AI-derived ranking, flag or verdict shows the rule that produced it, as a monospace chip: `RULE · live-ask-silence > 30d`.

- Rule identifiers come from the **Rules of Robb** layer — never hardcoded in the component.
- Chips are **clickable**: open the rule, show every opportunity it is currently firing on, allow edit/disable.
- This is the no-black-box guarantee. A screen that ranks without showing its reason is incorrect.

### Computed vs stored

Every displayed number is either **stored** (a field on an entity) or **computed** (derived server-side). Computed values are read-only in the UI and recomputed on any edit. Each screen below marks which is which. No number is computed in more than one place — one service, one definition, reused.

---

## Screen 1 — The Board

**Route:** landing screen for 95 Forward. Replaces the old prospect-centric dashboard, which is **deleted, not parked**.

**Purpose:** what to do next, by name, ranked. Not a dashboard. A user should be able to act on item #1 within seconds of landing and understand why it is #1 without asking.

### Header

- Eyebrow: `95 FORWARD · THURSDAY 12 SEPTEMBER` (product + today's date)
- Title: **The Board**
- Subtitle — generated summary, pattern: *"3 broken forecasts, then 7 moves that change the number today. Item #1 is 81 days idle."*
- Scope toggle, right: `My board` / `Team` — **Team is undesigned**; ship the toggle disabled or hidden rather than improvising a leader view.

### Metric block

One dominant metric, three subordinate. Item #1 of the queue must remain above the fold **at 1280×800**.

Per I24's measurements, the page container on The Board runs `padding-top: 24px` (not the standard 40) and a stack gap of 12px (not 16). Those two trims plus the collapsed Fix-first block below are what buy the constraint; do not spend the recovered space on something else.

**Primary — QUALIFIED ASKS ON THE TABLE**
- Value: sum of `Sale` across opportunities that are *qualified* and in a pre-close stage. **Computed.**
- Benchmark chip, monospace: `1.3× COVERAGE · 3× IS THE RULE` — a bare number invites complacency; the chip makes it a verdict. Multiple comes from the rules layer.
- Link: `Show the 11 opportunities behind it` → filtered Opportunities list.

**Supporting**

| Label | Value | Computed as |
| --- | --- | --- |
| `NEEDED AT 3× COVERAGE` | $4,500,000 | `coverageMultiple × (goal − won)` |
| `COVERAGE GAP` | computed | `qualifiedAsks − needed`; **negative means short**, alert treatment when negative |
| `NEW ASKS TO QUALIFY` | computed | `|coverageGap| ÷ weeksLeft`; sub-line `<perDay> a day · <weeksLeft> weeks left` |

Sub-lines must state the basis (e.g. `to land the $2,700,000 FY26 goal`, `of qualified asks missing to reach 3×`). Never show a ratio without its denominator — see the Forecast Room for the fuller treatment.

> **Figures here are illustrative, not targets.** The values in this table were plugged during design and were computed from the superseded $1,500,000 goal. Every one of them is now derived by the metrics service (I19) — render what it returns. `weeksLeft` in particular is computed from the clock and the scope's fiscal period; the `19 weeks left` above and the `WEEK 38 OF 52` on the Forecast Room were both plugs and disagree with each other. Neither is authoritative.

### Section — "Fix first"

Data-integrity items rank above all relationship work: bad data undermines every other number, and these are quick.

**Collapsed by default.** _(Amended by I17b.)_ The section renders as a **compact summary line plus one review action**, and expands on demand:

> *"3 forecasts contradict themselves · clear them in under three minutes"* + `Review`

Two reasons, and the second is the better one. It recovers ~210px — Fix-first is 52% of the header block, and its removal alone fixes both viewports. And the count and the time cost are what persuade; the detail belongs one click away, at the moment you act on it. Expanded, it renders exactly what follows.

Header when expanded: **Fix first** · *"3 forecasts contradict themselves. They feed every number above — clear them in under three minutes."*

Each item (numbered `01`, `02`, `03`):
- `Prospect · Initiative · Amount`
- The contradiction, plainly: *"Amount agreed, but no close date confirmed by the prospect."*
- **Consequence + effort**, monospace: `EXCLUDED FROM THE FORECAST · ~30 SEC` / `DISTORTS BEST/WORST BY $60,000 · ~1 MIN` / `INFLATES ASKS ON THE TABLE BY $25,000 · ~1 MIN`
- One resolving action: `Confirm close date` · `Re-date or close out` · `Attach or uncheck`

Consequence is **computed** — the actual effect of this record on the actual numbers, not a generic warning.

### Section — "Then the money"

Header: **Then the money** · *"Ranked by what a move today does to qualified asks on the table."*

Ranked cards. Per card:
- Rank `#1`, and a **status label** beneath it: `AT RISK` · `BLOCKED` · `UNASKED` · `ON TRACK` · `CLOSING` · `DECAYING` · `COLD`
  - **This must be a closed enum**, each member mapped to one of Moving/Slowing/Stuck (green/amber/red). Free-text generation drifts between runs and destroys the colour vocabulary.
- Prospect name (dominant) + type (`Foundation` · `Organization` · `Individual`)
- **Amount** (dominant) · initiative chip · stage with colour dot
- Next action title + evidence: *"Follow up to close"* / *"Ask made Jun 12. Amount agreed. No contact for 81 days."*
- One-sentence rationale: *"The largest live ask in your portfolio has gone silent longest — and it is 42 days past its close date."*
- `RULE · live-ask-silence > 30d` · close date · slippage state (`slipped 42 days` / `on time` / `not yet qualified` / `date never set with her`)
- Actions: **primary, specific** (`Review drafted follow-up` · `Send to Priya for approval` · `Draft the $500,000 ask` · `Open the prep brief` · `Draft the confirmation letter` · `Draft the ask to Tom`), plus `Open opportunity` and `Why it ranks here`

**Hierarchy requirement:** name and amount dominate; action verbs are subordinate. If the cards read as a task list rather than a board, it is wrong.

Footer — **conditional on what the engine returns**, not a fixed string. _(Amended by I17b.)_ The designed copy assumed the remainder is always inert; against I18b's expanded seed the ranking engine computes `belowCut.changesTheNumber: true` — 9 items holding $540,000 demonstrably would change it. Render the branch:

| `belowCut.changesTheNumber` | Copy |
| --- | --- |
| `false` | *"9 more opportunities are ranked below the cut — none of them change this week's number."* |
| `true` | *"9 more opportunities are ranked below the cut — together they hold $540,000."* |
| `null` | *"9 more opportunities are ranked below the cut — together they hold $540,000."* — the amount, with **no verdict**. Null means no goal is defined for the scope, so there is nothing to measure "changes the number" against and neither claim has been earned. |

The `true` branch is arguably the more useful one: it tells a rep there is real money below the fold, rather than reassuring them there isn't. Counts and amounts are the engine's (`belowCut.count`, `belowCut.cents`); the figures above are illustrative.

Plus `See the full portfolio`

### Interactions

- `Why it ranks here` → the rule(s) and inputs that produced the rank.
- Primary action → drafted artifact for **review before send**. Never auto-send.
- Per-item pin / dismiss, and a visible "ranked at 06:00 · adjust rules" affordance. Humans own AI guidance; the board must be overridable.

---

## Screen 2 — The Forecast Room

**Route:** `Forecast`.

**Purpose:** the Monday-meeting screen. Maximum factual density that still ends in *"I need to call someone."* If the reaction after ten seconds is "huh, interesting" rather than a name, it is wrong.

### Header

- Eyebrow: `95 FORWARD · <weekday> <day> <month> · WEEK <n> OF <total>` — **rendered from the clock**, not hardcoded. The day name and week number in the design are illustrative and do not correspond to the demo anchor; `weeksLeft` and the week number both come from the metrics service (I19).
- Title: **The Forecast Room**
- Subtitle: *"Everything · most likely $1.86M against a $2.70M goal — $845K short on today's numbers."*
- Scope toggle: `My portfolio` / `All reps` — **All reps is undesigned**; disable or hide.
- **Initiative tabs:** `Everything` · `Kamuli 2026` · `Bolivia Scale-Up` · `Forever Promise` · `Unrestricted`, each with its colour dot. Selecting one re-scopes **the entire screen** — metrics, simulation, stage board, movement panels. This is Robb's *"forget the goal, show me Rwanda"* requirement.
  - If a scoped view has no goal defined, show **"no goal defined for this view"** — never silently fall back to the total goal.

### Metric row (5)

| Label | Value | Notes |
| --- | --- | --- |
| `WON SO FAR` | $385,200 | **Stored.** Link: `6 closed this year · see them` — _(relabelled by I17b; see below)_ |
| `QUALIFIED ASKS ON THE TABLE` | $1,695,000 | **Computed.** Link: `10 opportunities · see the names` |
| `DANA'S FY26 GOAL · ALL INITIATIVES` | $2,700,000 | **Stored.** Scope named explicitly in the label |
| `COVERAGE GAP` | −$5,249,400 | **Computed.** Link: `who could close it` |
| `NEW ASKS NEEDED` | $350,000 | **Computed**, per week |

> **`WON SO FAR` is opportunity-derived, and the link counts opportunities.** _(Amended by I17b.)_ A won opportunity produces many gift records — Hallworth's ask is "$250,000 over three years": one commitment and a schedule of payments — so "17 closed gifts" counts the wrong universe and will disagree with the figure above it. `won` stays opportunity-derived so the coverage arithmetic stays inside one universe, and because the forecast asks *"did we secure it,"* not *"has the cash arrived."* The seed currently holds **6** won opportunities; render the live count. Gift-level reconciliation is **deferred** — it is a finance view, not a war-room one.

**Show the basis — this is the fix that matters most here.** Coverage is measured against goal *minus won*, not the goal. Because the goal is the number displayed directly above it, a reader doing mental arithmetic gets a different ratio and concludes the tool is broken. So:

- Goal card sub-line: *"0.7× coverage of the $2,314,800 still to raise"*, plus monospace `$2,700,000 GOAL − $385,200 WON = $2,314,800 BASIS`
- Coverage gap sub-line, monospace: `3× × $2,314,800 REMAINING = $6,944,400 NEEDED`
- New asks sub-line: *"per week · $70,000 a day · $17,500 an hour in the chair"* — the in-the-chair figure assumes 5 days × 4 selling hours; keep those factors in the rules layer.

### BMW simulation panel

Title: **BMW forecast · everything** · *"10,000 simulated years. Every dollar closes in full or not at all."*

That subtitle is load-bearing — it answers the half-pregnant objection in the interface, before anyone raises it. Keep it.

- Legend: `Actual` · `Most likely` · `Best–Worst` · `Goal`
- Cumulative curve, Jan–Dec, with a vertical divider at today; actuals solid to date, band forward
- In-chart labels: `GOAL $2,700,000` (dashed) · `BEST $2.08M` · `MOST LIKELY $1.86M` · `WORST $1.04M`
- Verdict beneath: *"Most likely lands $845K short. Only $225K of best-case sits outside it — and it is all unqualified."*
- Action: `Qualify the best-case asks`

**Simulation contract (server-side):**
- Per trial: each opportunity closes **in full or at zero** (never `Sale × Prob`), and its close date varies by the date-uncertainty band.
- B / M / W are percentiles of trial totals (default 90 / 50 / 5), configurable in the rules layer.
- **Seed deterministically** from a hash of (portfolio state + vintage date). Identical inputs must produce an identical curve — re-seeding randomly makes the chart wiggle between page loads and users stop trusting it.
- Scoped by the active filter; cache on (filter signature + data version); bump data version on any edit.
- Cost is trivial (10k × ~50 ≈ 500k draws). Compute server-side on change, not per render.

### Names ledger — "What the simulation stands on"

*"Every opportunity, and which scenario it lands in."* Each row: prospect name · scenario badge · amount.

Badges: `IN ALL THREE` (green) · `MOST LIKELY +` (red) · `BEST ONLY` (amber).

Footer: *"3 of these 9 only appear in Best. $225,000 of hope, nothing prospect-confirmed behind it."*

> **Open implementation decision — define scenario membership before building.** A Monte Carlo worst case is a *percentile of the total*, not a specific trial, so "appears in Worst" is not well-defined by default. Recommended definition: take trials whose total lands near P5, and mark an opportunity as in-Worst if it closes in the majority of them. Same for P50/P90. This is conditional probability over trials you already have — cheap, and it survives *"what does that badge actually mean?"* Do **not** implement it as probability banding dressed up as simulation output.

### Stage board

Title: **Stage board · everything** · *"Every open opportunity, one chip, colored by health. Left is work; right is money."*
Legend: `Moving` (green) · `Slowing` (amber) · `Stuck` (red).

Six columns in stage order. Column header: name, then `count · total`, then a qualification subtitle:
- Get the visit · Prep the visit · Visit & ask · Follow up & close → `COUNTS AS QUALIFIED ASKS`
- **[visual divider]**
- Celebrate / steward · Repeat → `OUTSIDE THE HEADLINE` (muted treatment)

Chips: prospect name · amount · staleness (`15d ago` · `38d silent` · `pushed 2×`), left border coloured by health.

Reconciliation footer — keep both halves:
- Left: *"Get the visit → Follow up & close = **$1,695,000** — the qualified asks on the table above."*
- Right, monospace: `CLOSED WORK RIGHT OF THE DIVIDER · $48,000 · NOT IN THE HEADLINE NUMBER`

Without this, summing all six columns appears to contradict the header.

### Movement panels (2)

These carry the forecast-reliability job at name level, replacing the aggregate vintage chart.

**Untouched 30+ days** — `2 opportunities · $340,000 frozen`
Rows: prospect · initiative · stage · `81d silent` · action (`Draft follow-up`, `Write the prep brief`).

**Close date pushed twice or more** — `3 opportunities · $380,000 slipping`
Rows: prospect · initiative · amount · date chain `Jun → Aug → Oct 31` (mark `(past)` where applicable) · action `Re-date with them`.

Both are **computed from the event log** — see the Opportunity model. Thresholds (30 days, 2 pushes) live in the rules layer.

---

## Screen 3 — Opportunity Detail

**Route:** `Opportunities / {id}`. Breadcrumb preserves queue position: `The Board · #1 of 7 · Opportunity`.

**Purpose:** where a rep prepares and records reality. Form-shaped, but it must not feel like a form — **it opens with a verdict, not with fields.**

### Header

`The Hallworth Family Foundation` · `$250,000` · initiative chip · stage · `Close date Oct 31, 2026`
Actions: `Log what happened` · `Enter visit mode`

> **Do not "fix" this back to `42 days past`.** The original header read `Close date Oct 31, 2026 · 42 days past`, which is internally contradictory: the slippage chain quoted below (`JUL 29 → AUG 31 → SEP 30 → OCT 31`) ends at Oct 31, which is in the **future** relative to the demo anchor — and that anchor is pinned exactly by the 81-day silence (last contact 23 June + 81 days = 12 September). The chain is load-bearing copy and was kept; I18 moved the past-close-date pathology to a different seeded opportunity instead. Hallworth's close date is ahead of today, and the story — largest live ask, silent longest, pushed three times by us, never confirmed by them — is unaffected.

### Verdict row (3 panels)

**QUALIFICATION STATE**
- Verdict headline: **"Not a real ask yet"**
- Counter, monospace: `1/4 they said · 2/2 we said` + progress bar
- *"Missing: close date confirmed by the prospect and confirmed in writing. Everything else is us talking to ourselves."*

**WHAT THIS ASK COUNTS AS** — connects this record to the portfolio numbers:
| Qualified asks on the table | `not counted` |
| In Most likely | `not counted` |
| In Worst | `$0` |
*"Until the prospect confirms a date, this amount is a claim, not an ask."*

**NEXT ACTION**
- *"Get a date out of Ellen Hallworth"*
- *"One call. Ask her when the board decides, and write down her answer — not ours."*
- `Review drafted follow-up script` + `RULE · live-ask-silence > 30d`

### "Is this ask real?" — the milestone model

*"Six objective milestones. Only what the prospect said makes it real."* · `TAP TO RECORD · 2 BLOCKING`

Two sections, and the asymmetry is **structural, not decorative**:

**`THEY SAID — THIS IS WHAT COUNTS`**
| Milestone | State | Badge | Evidence | Action |
| --- | --- | --- | --- | --- |
| Close date confirmed by the prospect | unchecked | `BLOCKING` | *"Never given. All three close dates were set by us."* | `Record their date` |
| Amount agreed | ✅ | `THEY SAID` | *"Jun 23 · Ellen Hallworth, verbally — nothing in writing"* | — |
| Confirmed in writing | unchecked | `BLOCKING` | *"81 days since the verbal yes. No letter, no email, no signature."* | `Draft the letter` |
| Permission to share publicly | unchecked | `NOT ASKED` | *"Not asked. Not blocking the gift."* | `Ask at close` |

**`WE SAID — OUR OWN CLAIMS, WORTH NOTHING ALONE`**
| Ask approved by leader | ✅ | `WE SAID` | *"Jun 2 · Priya Nair approved $250,000 over three years"* |
| Specific ask made | ✅ | `WE SAID` | *"Jun 12 · $250,000 over three years, Denver visit"* |

Footer: *"2 unconfirmed milestones hold $250,000 out of the numbers your leader reads on Monday."*

**Model requirements**
- Each milestone carries: `source` (they-said | we-said), `blocking` (bool), `confirmedAt`, `confirmedBy`, `evidence` (free text + optional document link).
- **Blocking ≠ they-said.** `Permission to share publicly` is they-said but non-blocking. Qualification = all *blocking* milestones confirmed. Keep these independent or the counter misleads as the milestone set evolves.
- Qualification state is **computed** from milestones — never a stored status field, never free-typed.

### Side panels

**THE FACTS** — Prospect · Initiative · Ask amount (`$250,000 over three years`) · Close date (`Oct 31, 2026 · 42 days past, set by us`) · Stage · Relationship mgr · Natural partner (`Tom Bradley · board member`) · Last contact. Actions: `Change amount` · `Move close date`. Add `Open in Keystone →` for full giving history.

**WHERE THIS SITS IN KAMULI 2026** — share + bar + coverage consequence + `See Kamuli 2026 forecast`. **Computed.**

> **Both lines are conditional on qualification, and the designed copy is only the qualified branch.** _(Amended by I17b, from I19's finding.)_ `coverageWithout()` returns a delta of **zero** for an unqualified opportunity — it was never in the numerator — so *"Lose this one and Kamuli drops from 1.4× to 0.9×"*, written about Hallworth, **cannot be true**: Hallworth is not a real ask yet, which is the whole argument of the screen above it. Likewise `58% of the initiative's qualified asks` is **0%** for an unqualified record. Invert by state — I19 already returns `counted` for exactly this:
>
> | | Coverage line | Share line |
> | --- | --- | --- |
> | **Unqualified** | *"Qualify this and Kamuli goes from 0.61× to 0.87×."* | *"Would be the largest single qualified ask in it."* |
> | **Qualified** | *"Lose this and Kamuli drops from X to Y."* | *"58% of the initiative's qualified asks — the largest single ask in it."* + bar |
>
> The unqualified framing is the better of the two: forward-looking, actionable, and exactly the argument this screen exists to make — *this isn't real yet, here's what it's worth if you make it real.*
>
> **I26 needs a `coverageWith(opportunityId)` inverse** on the metrics service. `coverageWithout()` answers the qualified branch; nothing today answers *"what would coverage be if this one qualified."*

**SILENCE** — `81 days` · *"Last contact Jun 23 — the verbal agreement call. Longest silence on any live ask in your portfolio."* · `CADENCE FOR THIS STAGE · EVERY 14 DAYS` (cadence from the rules layer).

### Movement

*"What changed, when, and who moved it."* · `Show all 10 changes`

Highlighted slippage block:
- **"Close date moved 3 times · +94 days"**
- Monospace chain: `JUL 29 → AUG 31 → SEP 30 → OCT 31 · ALL THREE MOVES MADE BY US`
- *"Hallworth has never given a date. A date we invent is not a date."*
- Action: `Ask them for a date`

Timeline entries — date · health dot · what changed · **who moved it and whether the prospect was involved**:
- `Sep 12` 🔴 *81 days of silence — cadence for this stage is 14 days.* / `No contact logged`
- `Aug 21` 🟠 *Close date moved Sep 30 → Oct 31 (+31 days).* / `Dana Reese · no prospect input`
- `Jul 30` 🟠 *Close date moved Aug 31 → Sep 30 (+30 days).* / `Dana Reese · no prospect input`
- `Jun 29` 🟠 *Close date moved Jul 29 → Aug 31 (+33 days).* / `Dana Reese · no prospect input`
- `Jun 23` 🟢 *Amount agreed verbally — $250,000 over three years.* / `Ellen Hallworth, on a call with Priya Nair`

**Event log requirement (build this in the first increment).** Every field change is stored with **field, old value, new value, actor, timestamp, and whether the prospect was the source**. Everything above — the slippage chain, `no prospect input`, silence duration, both Forecast Room movement panels — is a read over this log. Without it, these features cannot exist until months of usage accumulate. It is nearly free to add with the model; expensive to retrofit.

---

## Cross-screen invariants

Verify these after building; they are what make the numbers credible under demo scrutiny.

1. `Qualified asks on the table` is identical on The Board and the Forecast Room for the same scope, and equals the **qualified** portion of the stage board's four pre-close columns. The pre-close total and the qualified total are different numbers; the stage board shows both and the reconciliation footer states both.
   _(Amended by I18: qualification is milestone-derived, so an opportunity can sit in a pre-close column and still not count. The original wording — "equals the sum of the first four columns" — is false by construction.)_
2. `Coverage gap = qualifiedAsks − coverageMultiple × (goal − won)`, everywhere. **Signed: negative means short.**
   _(Amended by I19: the original was written the other way round and so produced a positive number for a shortfall, contradicting the negative figures the designs themselves display. The service returns the signed value; the UI renders the sign.)_
3. BMW figures decompose against the names ledger: Worst = won + IN ALL THREE; Most likely = + MOST LIKELY&nbsp;+; Best = + BEST ONLY.
4. An opportunity's "what this ask counts as" agrees with its membership in the ledger and its stage-board column.
5. A milestone recorded on detail immediately changes qualification, the headline metric, the simulation, and the board ranking. One edit, one recompute, all surfaces.
6. Every rank, flag and verdict shows a rule chip.

---

## Seed data

Seed from the dataset in the designs — it is arithmetically coherent and tells the story the copy was written around, which makes built screens directly comparable to the screenshots.

**Fix before seeding:**
- **Tom Bradley appears in two roles** — as a prospect with his own opportunity, and as the natural partner on Hallworth. Realistic, but it reads as a bug in a demo. Split into two names.
- **Goal mismatch:** The Board shows a `$1,500,000` FY26 goal; the Forecast Room shows `$2,700,000`. Decide whether these are rep-level and org-level (then label both explicitly) or mock drift (then reconcile), before anyone sees both screens in one sitting.
- Known and acceptable: **Sofia Lin** appears on The Board's "Fix first" *and* in Untouched 30+ days. Same opportunity surfacing through two lenses — consistent, and arguably a feature.

---

## Deferred — not in these screens

`Team` / `All reps` leader views (toggles exist, undesigned — disable or hide) · calendar integration beyond the auto-created 24-hour follow-up task · approval permission model (leader approval is a milestone checkbox only) · document management (link + checkbox only) · pledge payment schedules (explicitly Keystone's job) · board/CEO/CFO views · capacity modelling · vocabulary customisation · alternative chart types.
